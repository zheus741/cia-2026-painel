import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { resolveEquipeId, canonTeamName, fuzzyMatchTeam } from '../src/lib/chaveamento/bracket-builder.ts'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
const sb:any=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
async function rt<T>(fn:()=>Promise<T>){let e;for(let i=0;i<40;i++){try{return await fn()}catch(x){e=x;if(!/fetch|timeout|socket|EAI/i.test(String((x as any)?.message)))throw x;await new Promise(r=>setTimeout(r,2000))}}throw e}
const PTS:Record<number,number>={1:13,2:10,3:7,4:6,5:4,6:3,7:2,8:1}
// (modalidade_id, divisao, label, [atléticas em ordem 1º..8º])
const TABELAS:[string,string,string,string[]][]=[
  ['1f164aa3-42d8-4b0f-a59e-3bcff4d8b598','Conferências','TM Fem Conf',['IFTM','X DE OUTUBRO','FILUS','PUC POÇOS','MED PUC','UNIFESP','ODONTO UFU','XARADA UFLA']],
  ['62aba979-27c1-4c5e-a4a4-33c860dfba97','Conferências','TM Masc Conf',['LAU UFLA','GUAXINIM','ARARAS','LIGA CEM','DIREITO FDF','ECAD','FEA USP','FILUS']],
  ['fcbba93e-2f55-4894-ac7e-78ccc382eb0d','Conferências','Natação Fem Conf',['AAAJAS-S JOSE','COMP UFU','FZEA USP','LIGA CEM','MAQUINADA UNB','FILOS','IF SUL DE MINAS','FEARP USP']],
  ['d035bafd-21a5-4a97-ab95-b9ab43041ea2','Conferências','Natação Masc Conf',['FACECA','COMP UFU','ODONTO UFU','LIGA CEM','X DE OUTUBRO','AAAJA S JOSE','URSÃO','MIASMA']],
]
const{data:reAmostra}=await rt(async()=>{const r=await sb.from('resultados_externos').select('edicao_id').limit(1);if(r.error)throw r.error;return r})
const edicao=reAmostra?.[0]?.edicao_id
const{data:eqs}=await rt(async()=>{const r=await sb.from('equipes').select('id,nome,edicao_id,divisao,conferencia');if(r.error)throw r.error;return r})
const pool=(eqs||[]).filter((e:any)=>e.edicao_id===edicao)
// nomes que NÃO devem auto-casar (atlética não cadastrada — aguardando confirmação)
const BLOCK=new Set(['AAAJAS-S JOSE','AAAJA S JOSE','FILOS'])
// aliases confirmados pelo usuário
const ALIAS:Record<string,string>={'FEARP USP':'FEA USP'}
const resolve=(n0:string)=>{
  const n=ALIAS[n0]??n0
  if(BLOCK.has(n0)) return {id:null,nome:undefined}
  let id=resolveEquipeId(n,pool as any[])
  if(!id){const cn=canonTeamName(n);const hit=pool.find((e:any)=>{const ce=canonTeamName(e.nome);return ce===cn||ce.startsWith(cn+' ')||cn.startsWith(ce+' ')||fuzzyMatchTeam(ce,cn)});id=hit?.id??null}
  const e=(eqs||[]).find((x:any)=>x.id===id);return{id,nome:e?.nome}
}
let semId=0;const all:any[]=[]
for(const[mod,div,label,lista]of TABELAS){
  console.log(`\n${label}:`)
  lista.forEach((nome,i)=>{const col=i+1;const r=resolve(nome);if(!r.id)semId++;console.log(`  ${col}º ${PTS[col]}pt "${nome}" ${r.id?'→ '+r.nome:'✗ NÃO RESOLVEU'}`);all.push({mod,div,col,pts:PTS[col],nome,equipe_id:r.id})})
}
console.log(`\nresolvidos: ${all.length-semId}/${all.length}${semId?' ⚠️ '+semId+' sem id':''}`)
if(APPLY){
  const mods=[...new Set(TABELAS.map(t=>t[0]+'|'+t[1]))]
  for(const mk of mods){const[m,d]=mk.split('|');await rt(async()=>{const{error}=await sb.from('resultados_externos').delete().eq('modalidade_id',m).eq('divisao',d);if(error)throw error})}
  // só os resolvidos (pula os sem equipe_id — pendentes)
  const payload=all.filter(r=>r.equipe_id).map(r=>({edicao_id:edicao,modalidade_id:r.mod,divisao:r.div,equipe_id:r.equipe_id,colocacao:r.col,pontos:r.pts,observacoes:null}))
  const{error}=await rt(async()=>await sb.from('resultados_externos').insert(payload))
  console.log(error?'ERRO: '+error.message:`✅ inseridos ${payload.length} (pulados ${all.length-payload.length} sem cadastro)`)
}
