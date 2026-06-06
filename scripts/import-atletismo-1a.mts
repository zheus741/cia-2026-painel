import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { resolveEquipeId, canonTeamName, fuzzyMatchTeam } from '../src/lib/chaveamento/bracket-builder.ts'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
const sb:any=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
async function rt<T>(fn:()=>Promise<T>){let e;for(let i=0;i<40;i++){try{return await fn()}catch(x){e=x;if(!/fetch|timeout|socket|EAI/i.test(String((x as any)?.message)))throw x;await new Promise(r=>setTimeout(r,2000))}}throw e}

const MOD_FEM='18db91e6-87fe-402d-a9d7-c8644dbf0664'
const MOD_MASC='e48363ec-e63e-4501-9f32-4dcf0f280d8b'
const PTS:Record<number,number>={1:13,2:10,3:7,4:6,5:4,6:3,7:2,8:1}
// do print (CLASSIFICAÇÃO GERAL = pontos CIA)
const FEM=['MED UFU','MED UFMG','MED UFTM','ENG UFMG','MED UNIUBE','ENG UFU','HUMANAS UFU','EEFFTO UFMG']
const MASC=['MED UFMG','MED UFTM','ENG UFMG','EEFFTO UFMG','MONETARIA UFU','MED UFU','ITA','GLORIOSA']

// edicao_id + equipes da 1ª (pega de RE existente / equipes)
const{data:reAmostra}=await rt(async()=>{const r=await sb.from('resultados_externos').select('edicao_id').limit(1);if(r.error)throw r.error;return r})
const edicao=reAmostra?.[0]?.edicao_id
const{data:eqs}=await rt(async()=>{const r=await sb.from('equipes').select('id,nome,edicao_id,divisao');if(r.error)throw r.error;return r})
const pool=(eqs||[]).filter((e:any)=>e.edicao_id===edicao)
const resolve=(n:string)=>{
  let id=resolveEquipeId(n,pool as any[])
  if(!id){const cn=canonTeamName(n);const hit=pool.find((e:any)=>{const ce=canonTeamName(e.nome);return ce===cn||ce.startsWith(cn+' ')||cn.startsWith(ce+' ')||fuzzyMatchTeam(ce,cn)});id=hit?.id??null}
  const e=(eqs||[]).find((x:any)=>x.id===id);return{id,nome:e?.nome,div:e?.divisao}
}

const rows:any[]=[]
for(const[mod,lista,gen]of [[MOD_FEM,FEM,'Fem'],[MOD_MASC,MASC,'Masc']] as any[]){
  lista.forEach((nome:string,i:number)=>{
    const col=i+1;const r=resolve(nome)
    rows.push({modalidade_id:mod,gen,colocacao:col,pontos:PTS[col],nomeXlsx:nome,equipe_id:r.id,equipeBanco:r.nome,div:r.div})
  })
}
console.log('Atletismo 1ª — resolução de nomes:')
let semId=0
for(const r of rows){const ok=r.equipe_id?`→ ${r.equipeBanco} [${r.div}]`:'✗ NÃO RESOLVEU';if(!r.equipe_id)semId++;console.log(`  ${r.gen} ${r.colocacao}º ${r.pontos}pt  "${r.nomeXlsx}" ${ok}`)}
console.log(`\nresolvidos: ${rows.length-semId}/${rows.length}${semId?' ⚠️ '+semId+' sem id':''}`)

if(APPLY){
  if(semId){console.log('Abortado: resolve os nomes faltantes antes.');process.exit(1)}
  // idempotente: apaga Atletismo 1ª existente, insere
  for(const mod of [MOD_FEM,MOD_MASC])await rt(async()=>{const{error}=await sb.from('resultados_externos').delete().eq('modalidade_id',mod).eq('divisao','1ª Divisão');if(error)throw error})
  const payload=rows.map(r=>({edicao_id:edicao,modalidade_id:r.modalidade_id,divisao:'1ª Divisão',equipe_id:r.equipe_id,colocacao:r.colocacao,pontos:r.pontos,observacoes:null}))
  const{error}=await rt(async()=>await sb.from('resultados_externos').insert(payload))
  console.log(error?'ERRO: '+error.message:`✅ inseridos ${payload.length} (Atletismo Fem+Masc 1ª)`)
}
