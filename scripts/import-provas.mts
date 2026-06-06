import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { resolveEquipeId, canonTeamName, fuzzyMatchTeam } from '../src/lib/chaveamento/bracket-builder.ts'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
const sb:any=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
async function rt<T>(fn:()=>Promise<T>){let e;for(let i=0;i<40;i++){try{return await fn()}catch(x){e=x;if(!/fetch|timeout|socket|EAI/i.test(String((x as any)?.message)))throw x;await new Promise(r=>setTimeout(r,2000))}}throw e}
const PTS:Record<number,number>={1:13,2:10,3:7,4:6,5:4,6:3,7:2,8:1}
// (modalidade_id, divisao, label, [atléticas em ordem 1º..8º])
const JIUF='8b4539b6-4970-4191-86a2-16d7bc2914c5', JIUM='f2d35b0e-0056-4384-a1f3-124e3539f70f'
const XADREZ='00000000-0000-0003-0000-000000000012'
const NATF='fcbba93e-2f55-4894-ac7e-78ccc382eb0d', NATM='d035bafd-21a5-4a97-ab95-b9ab43041ea2'
const TABELAS:[string,string,string,string[]][]=[
  ['1f164aa3-42d8-4b0f-a59e-3bcff4d8b598','Conferências','TM Fem Conf',['IFTM','X DE OUTUBRO','FILUS','PUC POÇOS','MED PUC','UNIFESP','ODONTO UFU','XARADA UFLA']],
  ['62aba979-27c1-4c5e-a4a4-33c860dfba97','Conferências','TM Masc Conf',['LAU UFLA','GUAXINIM','ARARAS','LIGA CEM','DIREITO FDF','ECAD','FEA USP','FILUS']],
  [NATF,'Conferências','Natação Fem Conf',['AAAJAS-S JOSE','COMP UFU','FZEA USP','LIGA CEM','MAQUINADA UNB','FILOS','IF SUL DE MINAS','FEARP USP']],
  [NATM,'Conferências','Natação Masc Conf',['FACECA','COMP UFU','ODONTO UFU','LIGA CEM','X DE OUTUBRO','AAAJA S JOSE','URSÃO','MIASMA']],
  // novas
  [JIUF,'Conferências','Jiu Fem Conf',['ARARAS','TOURO PUC','ALFA PUC','AAA IFTM','X DE OUTUBRO','FISIO UNIUBE','MED PUC','DIREITO UNIUBE']],
  [JIUM,'Conferências','Jiu Masc Conf',['FEA','TENEBROSA','COMP UFU','TOUROS PUC','MED PUC','ODONTO UFU','DIREITO UNIUBE','LAU UFLA']],
  [JIUF,'2ª Divisão','Jiu Fem 2ª',['FACE UFMG','DIREITO PUC','UNIFRAN','UNIPAM','DIREITO UFMG','LAUCB','AGRARIAS UFU','MED UNIFENAS']],
  [JIUF,'1ª Divisão','Jiu Fem 1ª',['MED UFMG','MED UFTM','MONETÁRIA UFU','EFFTTO UFMG','MED UNIUBE','ENG UFU','DIREITO UFU','ENG UFMG']],
  [XADREZ,'2ª Divisão','Xadrez 2ª',['FACE UFMG','DIREITO PUC','CAAP UFABC','DIREITO UFMG','LAUNAERP','AGRARIAS','UNICAMP','MED UNIFENAS']],
  [NATF,'2ª Divisão','Natação Fem 2ª',['LAUNAERP','UNIFRAN','FAEFI UFU','DIREITO UFMG','FACE UFMG','DIREITO USP','AGRÁRIA','LAU UNIPAM']],
  [NATM,'2ª Divisão','Natação Masc 2ª',['LAUNAERP','DIREITO USP','FACE UFMG','FAEFI UFU','UNIFRAN','AGRARIAS UFU','DIREITO UFMG','LAU UNIPAM']],
]
const{data:reAmostra}=await rt(async()=>{const r=await sb.from('resultados_externos').select('edicao_id').limit(1);if(r.error)throw r.error;return r})
const edicao=reAmostra?.[0]?.edicao_id
const{data:eqs}=await rt(async()=>{const r=await sb.from('equipes').select('id,nome,edicao_id,divisao,conferencia');if(r.error)throw r.error;return r})
const pool=(eqs||[]).filter((e:any)=>e.edicao_id===edicao)
// nomes que NÃO devem auto-casar (atlética não cadastrada — aguardando confirmação)
const BLOCK=new Set(['AAAJAS-S JOSE','AAAJA S JOSE'])
// aliases confirmados pelo usuário
const ALIAS:Record<string,string>={'FEARP USP':'FEA USP','FILOS':'FILUS','AAA IFTM':'IFTM','UNIPAM':'LAU UNIPAM','AGRÁRIA':'AGRÁRIAS UFU','EFFTTO UFMG':'EEFFTO UFMG'}
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
  // limpa entrada errada anterior (Jiu Fem foi importada como 1ª por engano)
  await rt(async()=>{const{error}=await sb.from('resultados_externos').delete().eq('modalidade_id',JIUF).eq('divisao','1ª Divisão');if(error)throw error})
  const mods=[...new Set(TABELAS.map(t=>t[0]+'|'+t[1]))]
  for(const mk of mods){const[m,d]=mk.split('|');await rt(async()=>{const{error}=await sb.from('resultados_externos').delete().eq('modalidade_id',m).eq('divisao',d);if(error)throw error})}
  // só os resolvidos (pula os sem equipe_id — pendentes)
  const payload=all.filter(r=>r.equipe_id).map(r=>({edicao_id:edicao,modalidade_id:r.mod,divisao:r.div,equipe_id:r.equipe_id,colocacao:r.col,pontos:r.pts,observacoes:null}))
  const{error}=await rt(async()=>await sb.from('resultados_externos').insert(payload))
  console.log(error?'ERRO: '+error.message:`✅ inseridos ${payload.length} (pulados ${all.length-payload.length} sem cadastro)`)
}
