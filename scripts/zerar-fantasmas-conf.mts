// Zera coletivas-fantasma das conferências: modalidade que a atlética disputa na
// CHAVE (jogos) mas que a matriz oficial NÃO pontua → injeta resultado_externo 0
// pra sobrescrever a chave bagunçada. Fecha divergências tipo LOBO DA SERRA.
//   node --experimental-strip-types scripts/zerar-fantasmas-conf.mts [--apply]
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fuzzyMatchTeam } from '../src/lib/chaveamento/bracket-builder.ts'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
void fuzzyMatchTeam
const sb:any=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));async function rt<T>(fn:()=>Promise<T>):Promise<T>{let e;for(let i=0;i<80;i++){try{return await fn()}catch(x){e=x;await sleep(1500)}}throw e}
const all=async(t:string,s:string)=>{const o:any[]=[];let off=0;while(true){const{data,error}=await rt(async()=>await sb.from(t).select(s).range(off,off+999));if(error)throw error;if(!data?.length)break;o.push(...data);if(data.length<1000)break;off+=1000}return o}
const norm=(s:string)=>(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()
const CONFS=new Set(['ALLURA','ESPETÁCULO','URAH','RANACH','KAZURA','ELDORADO','ATHEMPURA','CYBER CITY'])
const normDiv=(d:string)=>{const u=(d||'').toUpperCase();if(u.includes('CYBER'))return 'CYBER CITY';for(const c of CONFS)if(u.includes(c.replace(' ','')))return c;return u}
const COLET=new Set(['futsal','volei','voleipraia','handebol','basquete','fut7'])
const fam=(n:string)=>{const x=norm(n);if(x.includes('futsal'))return'futsal';if(x.includes('praia'))return'voleipraia';if((x.includes('futebol')||x.includes('fut'))&&x.includes('7'))return'fut7';if(x.includes('volei')||x.includes('vole'))return'volei';if(x.includes('hand'))return'handebol';if(x.includes('basquete'))return'basquete';return''}
const eqs=await all('equipes','id,edicao_id')
const edicao=(()=>{const c:Record<string,number>={};for(const e of eqs)if(e.edicao_id)c[e.edicao_id]=(c[e.edicao_id]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]})()
const jogos=await all('jogos','modalidade_id,categoria,divisao,equipe_a_id,equipe_b_id,modalidade:modalidades(nome)')
const reAll=await all('resultados_externos','modalidade_id,equipe_id,modalidades:modalidade_id(nome)')
const cobertos=new Set<string>()
for(const r of reAll){const m=Array.isArray(r.modalidades)?r.modalidades[0]:r.modalidades;const f=fam(m?.nome||'');if(!f)continue;const g=/fem/i.test(m?.nome||'')?'F':/masc/i.test(m?.nome||'')?'M':'-';cobertos.add(`${r.equipe_id}|${f}|${g}`)}
const want=new Map<string,any>()
for(const j of jogos){
  const m=Array.isArray(j.modalidade)?j.modalidade[0]:j.modalidade;const f=fam(m?.nome||'');if(!COLET.has(f))continue
  const div=normDiv(j.divisao||'');if(!CONFS.has(div))continue
  const g=(/fem/i.test(j.categoria||'')||/^f/i.test(j.categoria||''))?'F':'M'
  for(const id of [j.equipe_a_id,j.equipe_b_id]){if(!id)continue
    if(cobertos.has(`${id}|${f}|${g}`))continue
    want.set(`${id}|${j.modalidade_id}|${g}`,{modalidade_id:j.modalidade_id,equipe_id:id,divisao:div})
  }
}
const payload=[...want.values()].map(w=>({edicao_id:edicao,modalidade_id:w.modalidade_id,divisao:w.divisao,equipe_id:w.equipe_id,colocacao:9,pontos:0,observacoes:null}))
console.log(`coletivas-fantasma a zerar: ${payload.length}`)
const byDiv:Record<string,number>={};for(const p of payload)byDiv[p.divisao]=(byDiv[p.divisao]||0)+1
console.log('por conf:',JSON.stringify(byDiv))
if(APPLY&&payload.length){for(let i=0;i<payload.length;i+=200){const r=await rt(async()=>await sb.from('resultados_externos').insert(payload.slice(i,i+200)));if(r.error){console.log('ERRO:',r.error.message);break}}console.log('✅ zeros inseridos:',payload.length)}
