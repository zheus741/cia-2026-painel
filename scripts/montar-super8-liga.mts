// Monta a Liga Super 8 (round-robin dos 8 campeões de conferência) populando
// super8_liga com os 28 confrontos, vinculando os jogos (divisao='Super 08').
// Rodadas: método do círculo (7 rodadas × 4 jogos), numeradas por horário.
// Posições A1-A8: ordem alfabética de conferência.
//   DRY:    node --experimental-strip-types scripts/montar-super8-liga.mts
//   APLICA: ... --apply
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
const sb:any=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
async function rt<T>(fn:()=>Promise<T>):Promise<T>{let e;for(let i=0;i<80;i++){try{return await fn()}catch(x){e=x;await new Promise(r=>setTimeout(r,1500))}}throw e}
const all=async(t:string,s:string)=>{const o:any[]=[];let off=0;while(true){const{data,error}=await rt(async()=>await sb.from(t).select(s).range(off,off+999));if(error)throw error;if(!data?.length)break;o.push(...data);if(data.length<1000)break;off+=1000}return o}
const norm=(s:string)=>(s??'').toLowerCase()

// edição ativa (igual a página)
const ed=await rt(async()=>await sb.from('edicoes').select('id,nome,ativa').eq('ativa',true).maybeSingle())
const edicaoId=ed.data?.id
if(!edicaoId){console.log('❌ sem edição ativa');process.exit(1)}
console.log('edição ativa:',ed.data.nome,edicaoId)

const jogos=(await all('jogos','id,divisao,categoria,inicio,equipe_a_id,equipe_b_id,equipe_a_nome,equipe_b_nome,modalidade_id,modalidade:modalidades(nome)')).map((r:any)=>{const m=Array.isArray(r.modalidade)?r.modalidade[0]:r.modalidade;return{...r,mn:m?.nome??''}})
const s8all=jogos.filter((j:any)=>norm(j.divisao).includes('super'))

// 8 campeões = times com >=5 adversários distintos
const adv:Record<string,Set<string>>={}
for(const j of s8all){if(!j.equipe_a_id||!j.equipe_b_id)continue;(adv[j.equipe_a_id]??=new Set()).add(j.equipe_b_id);(adv[j.equipe_b_id]??=new Set()).add(j.equipe_a_id)}
const oito=new Set(Object.entries(adv).filter(([,s])=>s.size>=5).map(([id])=>id))
if(oito.size!==8){console.log('⚠️ esperava 8 times, achei',oito.size)}

const eqs=await all('equipes','id,nome,conferencia')
const eqById=(id:string)=>eqs.find((e:any)=>e.id===id)
// posições A1-A8 por ordem alfabética de conferência
const confs=[...oito].map(id=>({id,conf:eqById(id)?.conferencia??'',nome:eqById(id)?.nome??'?'})).sort((a,b)=>a.conf.localeCompare(b.conf))
const pos:Record<string,number>={};confs.forEach((c,i)=>pos[c.id]=i+1)
console.log('\nSorteio A1-A8 (por conferência):')
confs.forEach((c,i)=>console.log(`  A${i+1}  ${c.nome.padEnd(16)} (${c.conf})`))

// jogos da liga = ambos no 8 (exclui anomalia)
const ligaJogos=s8all.filter((j:any)=>oito.has(j.equipe_a_id)&&oito.has(j.equipe_b_id))
const fora=s8all.filter((j:any)=>!(oito.has(j.equipe_a_id)&&oito.has(j.equipe_b_id)))
console.log(`\njogos da liga: ${ligaJogos.length} · fora (anomalia): ${fora.length}`)
fora.forEach((j:any)=>console.log(`  ⚠️ fora: ${j.mn} ${j.equipe_a_nome} x ${j.equipe_b_nome}`))

// método do círculo: pair {posA-1,posB-1} → rodada canônica
let L=[0,1,2,3,4,5,6,7];const pairRound=new Map<string,number>()
for(let r=0;r<7;r++){for(let i=0;i<4;i++){const a=L[i],b=L[7-i];pairRound.set([a,b].sort((x,y)=>x-y).join(','),r)}L=[L[0],L[7],...L.slice(1,7)]}
const roundOf=(pa:number,pb:number)=>pairRound.get([pa-1,pb-1].sort((x,y)=>x-y).join(','))!

// mapa jogo→rodada canônica + horário pra renumerar
type Row={jogo:any;pa:number;pb:number;rc:number}
const linhas:Row[]=ligaJogos.map((j:any)=>{const pa=pos[j.equipe_a_id],pb=pos[j.equipe_b_id];return{jogo:j,pa,pb,rc:roundOf(pa,pb)}})
// renumera rodadas 1-7 por menor horário
const minHora:Record<number,string>={}
for(const l of linhas){const h=l.jogo.inicio||'~';if(!minHora[l.rc]||h<minHora[l.rc])minHora[l.rc]=h}
const ordem=[...new Set(linhas.map(l=>l.rc))].sort((a,b)=>(minHora[a]||'~').localeCompare(minHora[b]||'~'))
const rod:Record<number,number>={};ordem.forEach((rc,i)=>rod[rc]=i+1)

console.log('\nRodadas (numeradas por horário):')
for(const rc of ordem){const js=linhas.filter(l=>l.rc===rc).sort((a,b)=>(a.jogo.inicio||'').localeCompare(b.jogo.inicio||''))
  console.log(`\n  RODADA ${rod[rc]}:`)
  for(const l of js)console.log(`    ${(l.jogo.inicio||'').slice(11,16)} [${l.jogo.mn}] ${l.jogo.equipe_a_nome} x ${l.jogo.equipe_b_nome}`)}

const payload=linhas.map(l=>({edicao_id:edicaoId,rodada:rod[l.rc],atletica_a_id:l.jogo.equipe_a_id,atletica_b_id:l.jogo.equipe_b_id,modalidade_id:l.jogo.modalidade_id,categoria:l.jogo.categoria||'',jogo_id:l.jogo.id,posicao_a:l.pa,posicao_b:l.pb,observacoes:null}))
console.log(`\n→ ${payload.length} rows pra super8_liga`)

if(APPLY){
  await rt(async()=>{const{error}=await sb.from('super8_liga').delete().eq('edicao_id',edicaoId);if(error)throw error})
  for(let i=0;i<payload.length;i+=50){const{error}=await rt(async()=>await sb.from('super8_liga').insert(payload.slice(i,i+50)));if(error){console.log('ERRO insert:',error.message);process.exit(1)}}
  console.log('✅ super8_liga populada:',payload.length)
}
