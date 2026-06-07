// Injeta pontos das COLETIVAS decididas (matriz oficial da intraconferência) como
// resultados_externos — viram a fonte de verdade (o de-dup ignora a chave). (B): só decididas.
//   DRY:   node --experimental-strip-types scripts/import-matriz-coletivas.mts <CONF|ALL>
//   APLICA:... <CONF|ALL> --apply
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { resolveEquipeId, canonTeamName, fuzzyMatchTeam } from '../src/lib/chaveamento/bracket-builder.ts'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
const sb:any=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
async function rt<T>(fn:()=>Promise<T>){let e;for(let i=0;i<40;i++){try{return await fn()}catch(x){e=x;if(!/fetch|timeout|socket|EAI/i.test(String((x as any)?.message)))throw x;await new Promise(r=>setTimeout(r,2000))}}throw e}
const args=process.argv.slice(2)
const APPLY=args.includes('--apply')
const CONF=(args.find(a=>a!=='--apply')||'ALL').toUpperCase()
const matrix=JSON.parse(readFileSync('/tmp/matrix_full.json','utf8')) as any[]
const rows=matrix.filter(r=>CONF==='ALL'||r.conf.toUpperCase()===CONF)

const norm=(s:string)=>(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()
const{data:mods}=await rt(async()=>{const r=await sb.from('modalidades').select('id,nome');if(r.error)throw r.error;return r})
const modId=(nome:string)=>{const e=(mods||[]).find((m:any)=>norm(m.nome)===norm(nome));return e?.id}
const{data:reA}=await rt(async()=>{const r=await sb.from('resultados_externos').select('edicao_id').limit(1);if(r.error)throw r.error;return r})
const edicao=reA?.[0]?.edicao_id
const{data:eqs}=await rt(async()=>{const r=await sb.from('equipes').select('id,nome,edicao_id');if(r.error)throw r.error;return r})
const pool=(eqs||[]).filter((e:any)=>e.edicao_id===edicao)
const resolve=(n:string)=>{let id=resolveEquipeId(n,pool as any[]);if(!id){const cn=canonTeamName(n);const hit=pool.find((e:any)=>{const ce=canonTeamName(e.nome);return ce===cn||ce.startsWith(cn+' ')||cn.startsWith(ce+' ')||fuzzyMatchTeam(ce,cn)});id=hit?.id??null}const e=(eqs||[]).find((x:any)=>x.id===id);return{id,nome:e?.nome}}

let semMod=0,semEq=0;const payload:any[]=[]
const byConf:Record<string,number>={}
for(const r of rows){
  const mid=modId(r.mod); const eq=resolve(r.atletica)
  if(!mid){semMod++;console.log(`  ⚠️ modalidade não achada: ${r.mod}`);continue}
  if(!eq.id){semEq++;console.log(`  ⚠️ atlética não resolveu: ${r.atletica} (${r.conf})`);continue}
  payload.push({edicao_id:edicao,modalidade_id:mid,divisao:r.conf,equipe_id:eq.id,colocacao:r.colocacao,pontos:r.pontos,observacoes:null})
  byConf[r.conf]=(byConf[r.conf]||0)+1
}
console.log(`\nCONF=${CONF} · linhas=${rows.length} · resolvidas=${payload.length}${semMod?' · semMod '+semMod:''}${semEq?' · semEq '+semEq:''}`)
console.log('por conferência:',JSON.stringify(byConf))
if(APPLY){
  // idempotente por (conf, modalidade): apaga as coletivas dessa conf antes
  const keys=[...new Set(payload.map(p=>p.modalidade_id+'|'+p.divisao))]
  for(const k of keys){const[m,d]=k.split('|');await rt(async()=>{const{error}=await sb.from('resultados_externos').delete().eq('modalidade_id',m).eq('divisao',d);if(error)throw error})}
  // insere em lotes
  for(let i=0;i<payload.length;i+=200){const{error}=await rt(async()=>await sb.from('resultados_externos').insert(payload.slice(i,i+200)));if(error){console.log('ERRO insert:',error.message);break}}
  console.log(`✅ inseridos ${payload.length}`)
}
