import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env:Record<string,string>={};for(const l of readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2]}
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));async function rt<T>(fn:()=>Promise<T>){let e;for(let i=0;i<40;i++){try{return await fn()}catch(x){e=x;if(!/fetch failed|timeout|socket|EAI/i.test(String((x as any)?.message)))throw x;await sleep(2000)}}throw e}
const APPLY=process.argv.includes('--apply')
const snap4=new Set(JSON.parse(readFileSync('/tmp/jogos_snapshot4.json','utf8')).map((j:any)=>j.id))
const snap5=new Set(JSON.parse(readFileSync('/tmp/jogos_snapshot5.json','utf8')).map((j:any)=>j.id))
const jogos:any[]=[];let o=0;while(true){const p:any=await rt(async()=>{const{data,error}=await sb.from('jogos').select('id,status,bracket_num,fase,divisao,dia_id,criado_em,equipe_a_nome,equipe_b_nome,placar_a,placar_b').range(o,o+499);if(error)throw error;return data});if(!p?.length)break;jogos.push(...p);if(p.length<500)break;o+=500}
console.log('total atual:',jogos.length)
// candidatos: NÃO em snapshot4 (criados depois do tabelamento) + encerrado + bnum null
const cand=jogos.filter(j=>!snap4.has(j.id)&&j.status==='encerrado'&&j.bracket_num==null)
const naoSnap4=jogos.filter(j=>!snap4.has(j.id))
console.log('jogos NÃO no snapshot4:',naoSnap4.length,'| destes encerrado+bnum-null (a apagar):',cand.length)
// quebra por: dos candidatos, quantos via fix-todas (não snap5) vs 2ªdiv (em snap5 mas não snap4)
const viaFix=cand.filter(j=>!snap5.has(j.id)).length, via2a=cand.filter(j=>snap5.has(j.id)).length
console.log('  via fix-todas (não snap5):',viaFix,'| via 2ª-div results (snap5):',via2a)
// segurança: algum candidato criado por coordenador? (criado_em hoje E não-bnum-null já excluído). Mostra amostra criado_em
const datas:Record<string,number>={};for(const j of cand){const d=(j.criado_em||'?').slice(0,10);datas[d]=(datas[d]||0)+1}
console.log('  criado_em (dia):',JSON.stringify(datas))
if(APPLY){
  let del=0;for(const j of cand){await rt(async()=>{const{error}=await sb.from('jogos').delete().eq('id',j.id);if(error)throw error});del++}
  console.log('APAGADOS:',del)
}
