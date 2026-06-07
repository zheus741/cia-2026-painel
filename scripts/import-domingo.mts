// Importa os jogos de Domingo 07/06 (finais 1ª/2ª + Super 08) → dia_id Domingo + hora.
// Existentes: atualiza dia/hora. Faltantes: cria. S8 = Super 08 (divisão "Super 08").
//   DRY:    node --experimental-strip-types scripts/import-domingo.mts
//   APLICA: ... --apply
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { canonTeamName, fuzzyMatchTeam, resolveEquipeId } from '../src/lib/chaveamento/bracket-builder.ts'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
const sb:any=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));async function rt<T>(fn:()=>Promise<T>):Promise<T>{let e;for(let i=0;i<80;i++){try{return await fn()}catch(x){e=x;await sleep(1500)}}throw e}
const all=async(t:string,s:string)=>{const o:any[]=[];let off=0;while(true){const{data,error}=await rt(async()=>await sb.from(t).select(s).range(off,off+999));if(error)throw error;if(!data?.length)break;o.push(...data);if(data.length<1000)break;off+=1000}return o}
const DOMINGO='00000000-0000-0001-0000-000000000004'
const MM:Record<string,[string,string]>={BM:['Basquete Masculino','Masculino'],BF:['Basquete Feminino','Feminino'],FM:['Futsal Masculino','Masculino'],FF:['Futsal Feminino','Feminino'],HM:['Handebol Masculino','Masculino'],HF:['Handebol Feminino','Feminino'],VM:['Vôlei Masculino','Masculino'],VF:['Vôlei Feminino','Feminino'],VPM:['Vôlei de Praia Masc.','Masculino'],VPF:['Vôlei de Praia Fem.','Feminino'],FC:['Futebol de Campo','Masculino'],F7:['Futebol 7 Masculino','Masculino']}
const DV:Record<string,string>={'1':'1ª','2':'2ª','S8':'Super 08'}
// [hora, div(1/2/S8), modCode, a, b]
const G:[string,string,string,string,string][]=[
['11:45','2','BM','FAEFI UFU','ENG PUC'],['13:45','1','BF','HUMANAS UFU','MED UNIUBE'],['15:30','1','BM','ENG UFMG','ENG UFU'],['17:00','2','BF','MED UNIFENAS','UNIFRAM'],
['11:00','2','FF','FAEFI UFU','LAU UNIPAM'],['12:45','1','FM','EDUCA UNIUBE','UNIFEI'],['14:15','1','FF','ENGENHARIA UFU','EDUCA UNIUBE'],['16:00','S8','FM','DIREITO UNIUBE','MED PUC'],
['12:00','2','HM','UNICAMP LIMEIRA','FAEFI UFU'],['13:00','2','HF','MED UNIFENAS','LAUNAERP'],['14:30','1','HM','ENG UFMG','EDUCA UNIUBE'],['16:30','1','HF','ENG UFU','MED UNIUBE'],
['10:00','S8','BM','LIGA CEM','TOUROS PUC'],['11:00','S8','BM','DIREITO UNIUBE','ARARAS'],['12:00','S8','BM','DIREITO UNIUBE','COMP UFU'],['15:00','S8','BM','LAU UFLA','COMP UFU'],['16:00','S8','BF','ARARAS','MED PUC'],
['11:30','2','FM','FACE UFMG','CAAP UFABC'],['13:00','S8','FF','DIREITO UNIUBE','LAU UFLA'],['14:00','S8','FM','LAU UFLA','FACECA'],['15:00','S8','FF','FACECA','ARARAS'],['16:00','S8','FF','COMP UFU','LIGA CEM'],['17:00','S8','FF','TOUROS PUC','MED PUC'],
['09:00','S8','HF','ARARAS','LAU UFLA'],['11:00','S8','HM','LIGA CEM','LAU UFLA'],['12:00','S8','HM','FACECA','TOUROS PUC'],['13:00','S8','HF','MED PUC','FACECA'],['14:00','S8','HM','MED PUC','COMP UFU'],['15:00','S8','HF','DIREITO UNIUBE','TOUROS PUC'],
['10:00','2','VM','ENG PUC','FAEFI UFU'],['12:00','1','VM','EEFFTO UFMG','EDUCA UNIUBE'],['14:00','2','VF','ENG PUC','UNIFRAM'],
['10:00','S8','VM','COMP UFU','ARARAS'],['11:00','S8','VF','FACECA','COMP UFU'],['12:00','S8','VF','LAU UFLA','MED PUC'],['13:00','S8','VF','LIGA CEM','DIREITO UNIUBE'],
['13:00','S8','VM','FACECA','DIREITO UNIUBE'],['14:00','1','VF','GLORIOSA UFTM','EEFFTO UFMG'],
['11:00','1','VPF','GLORIOSA UFTM','ENG UFTM'],['16:30','1','VPM','EEFFTO UFMG','EDUCA UNIUBE'],['16:00','2','VPM','UNIFRAM','BRUTUS UFSJ'],
['09:00','S8','VPF','LIGA CEM','FACECA'],['11:00','S8','VPF','LAUCB','UNIFRAM'],['14:00','S8','VPF','ARARAS','TOUROS PUC'],['15:00','S8','VPM','MED PUC','LIGA CEM'],['16:00','S8','VPM','TOUROS PUC','LAU UFLA'],
['14:00','2','FC','BRUTUS UFSJ','UNIFRAM'],['16:00','1','FC','EDUCA UNIUBE','EEFFTO UFMG'],
['12:00','S8','F7','LIGA CEM','ARARAS'],['13:00','S8','F7','TOUROS PUC','COMP UFU'],
]
const norm=(s:string)=>(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()
const normDiv=(d:string)=>norm(d).replace(/divis[ãa]o/g,'').replace(/super0?8?/,'super08').replace(/[\s\-_·.ª°º]+/g,'')
const modNome=(j:any)=>{const m=Array.isArray(j.modalidade)?j.modalidade[0]:j.modalidade;return m?.nome??''}
const teamEq=(x:string,y:string)=>{const a=canonTeamName(x),b=canonTeamName(y);return !!a&&!!b&&(a===b||fuzzyMatchTeam(a,b))}
const{data:mods}=await rt(async()=>await sb.from('modalidades').select('id,nome'))
const modId=(nome:string)=>(mods||[]).find((m:any)=>norm(m.nome)===norm(nome))?.id
const eqs=await all('equipes','id,nome,edicao_id')
const edicao=(()=>{const c:Record<string,number>={};for(const e of eqs)if(e.edicao_id)c[e.edicao_id]=(c[e.edicao_id]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]})()
const pool=eqs.filter((e:any)=>e.edicao_id===edicao)
const resolve=(n:string)=>{let id=resolveEquipeId(n,pool as any[]);if(!id){const cn=canonTeamName(n);const h=pool.find((e:any)=>{const ce=canonTeamName(e.nome);return ce===cn||ce.startsWith(cn+' ')||cn.startsWith(ce+' ')||fuzzyMatchTeam(ce,cn)});id=h?.id??null}const e=eqs.find((x:any)=>x.id===id);return{id,nome:e?.nome}}
const jogos=await all('jogos','id,modalidade_id,edicao_id,categoria,divisao,fase,status,dia_id,equipe_a_nome,equipe_b_nome,modalidade:modalidades(nome)')
const claimed=new Set<string>()
let upd=0,cre=0,err=0;const plan:any[]=[];const semNome:string[]=[]
for(const [hora,divc,code,a,b] of G){
  const [mod,cat]=MM[code];const div=DV[divc]
  const inicio=`2026-06-07T${hora}:00-03:00`
  const cand=jogos.find((j:any)=>!claimed.has(j.id)&&norm(modNome(j))===norm(mod)&&norm(j.categoria||'')===norm(cat)&&normDiv(j.divisao||'')===normDiv(div)&&((teamEq(j.equipe_a_nome,a)&&teamEq(j.equipe_b_nome,b))||(teamEq(j.equipe_a_nome,b)&&teamEq(j.equipe_b_nome,a))))
  if(cand){claimed.add(cand.id);plan.push({act:'UPD',id:cand.id,inicio,fase:divc==='S8'?cand.fase:'final'});continue}
  const ra=resolve(a),rb=resolve(b)
  if(!ra.id||!rb.id){semNome.push(`${mod} ${div}: ${a}(${ra.id?'ok':'✗'}) x ${b}(${rb.id?'ok':'✗'})`)}
  const sib=jogos.find((j:any)=>norm(modNome(j))===norm(mod)&&norm(j.categoria||'')===norm(cat))
  const mid=modId(mod)??sib?.modalidade_id
  plan.push({act:'CRE',mod,div,cat,inicio,fase:divc==='S8'?null:'final',ra,rb,a,b,mid,edic:sib?.edicao_id??edicao})
}
console.log(`Domingo 07/06 — ${G.length} jogos: UPD=${plan.filter(p=>p.act==='UPD').length} CRE=${plan.filter(p=>p.act==='CRE').length}`)
if(semNome.length){console.log('⚠️ nomes não resolvidos:');semNome.forEach(s=>console.log('  '+s))}else console.log('todos os nomes resolveram ✓')
if(APPLY){
  for(const p of plan){try{
    if(p.act==='UPD'){await rt(async()=>{const{error}=await sb.from('jogos').update({dia_id:DOMINGO,inicio:p.inicio,fase:p.fase}).eq('id',p.id);if(error)throw error});upd++}
    else{if(!p.mid){err++;continue}await rt(async()=>{const{error}=await sb.from('jogos').insert({edicao_id:p.edic,modalidade_id:p.mid,categoria:p.cat,divisao:p.div,fase:p.fase,status:'agendado',dia_id:DOMINGO,inicio:p.inicio,bracket_num:null,equipe_a_id:p.ra.id,equipe_a_nome:p.ra.nome??p.a,equipe_b_id:p.rb.id,equipe_b_nome:p.rb.nome??p.b});if(error)throw error});cre++}
  }catch(e:any){err++;console.log('erro:',e?.message?.slice(0,60))}}
  console.log(`✅ atualizados=${upd} criados=${cre} erros=${err}`)
}
