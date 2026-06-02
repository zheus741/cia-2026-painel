// ─────────────────────────────────────────────────────────────────────────────
// reimport-jogos.mjs — wipe + reload limpo dos jogos a partir da planilha fonte.
//
// Replica FIELMENTE a lógica de src/app/api/import-tabela/route.ts, com o fix
// de mapeamento de data ("TABELA DIA N" → N-ésimo dia OFICIAL do evento).
//
// Uso:  node scripts/reimport-jogos.mjs <caminho.xlsx> [--apply]
//       Sem --apply = dry-run (só mostra o que faria). Com --apply = executa.
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Env ──────────────────────────────────────────────────────────────────────
const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'
const ANO = 2026
// Dias oficiais do evento (IDs sentinela) — "TABELA DIA N" → diasOficiais[N-1]
const DIAS_OFICIAIS = [
  { id: '00000000-0000-0001-0000-000000000001', data: '2026-06-04' },
  { id: '00000000-0000-0001-0000-000000000002', data: '2026-06-05' },
  { id: '00000000-0000-0001-0000-000000000003', data: '2026-06-06' },
  { id: '00000000-0000-0001-0000-000000000004', data: '2026-06-07' },
]

// ── MODALIDADE_MAP (verbatim do route) ───────────────────────────────────────
const MODALIDADE_MAP = {
  FF:{nome:'Futsal Feminino',icone:'⚽',duracao_min:50}, FM:{nome:'Futsal Masculino',icone:'⚽',duracao_min:50},
  HM:{nome:'Handebol Masculino',icone:'🤾',duracao_min:60}, HF:{nome:'Handebol Feminino',icone:'🤾',duracao_min:60},
  VM:{nome:'Vôlei Masculino',icone:'🏐',duracao_min:90}, VF:{nome:'Vôlei Feminino',icone:'🏐',duracao_min:90},
  VPM:{nome:'Vôlei de Praia Masc.',icone:'🏖️',duracao_min:60}, VPF:{nome:'Vôlei de Praia Fem.',icone:'🏖️',duracao_min:60},
  BM:{nome:'Basquete Masculino',icone:'🏀',duracao_min:60}, BF:{nome:'Basquete Feminino',icone:'🏀',duracao_min:60},
  FC:{nome:'Futebol de Campo',icone:'🏟️',duracao_min:90},
  F7M:{nome:'Futebol 7 Masculino',icone:'🥅',duracao_min:60}, F7:{nome:'Futebol 7 Masculino',icone:'🥅',duracao_min:60},
  F7F:{nome:'Futebol 7 Feminino',icone:'🥅',duracao_min:60},
  PM:{nome:'Peteca Masculino',icone:'🏸',duracao_min:60}, PF:{nome:'Peteca Feminino',icone:'🏸',duracao_min:60},
  PETM:{nome:'Peteca Masculino',icone:'🏸',duracao_min:60}, PETF:{nome:'Peteca Feminino',icone:'🏸',duracao_min:60},
  TCM:{nome:'Tênis de Campo Masc.',icone:'🎾',duracao_min:60}, TCF:{nome:'Tênis de Campo Fem.',icone:'🎾',duracao_min:60},
  TMSM:{nome:'Tênis de Mesa Masc.',icone:'🏓',duracao_min:45}, TMSF:{nome:'Tênis de Mesa Fem.',icone:'🏓',duracao_min:45},
}

function normalizarDivisao(raw) {
  const v = raw.trim(); const u = v.toUpperCase()
  if (['CYBERC','CYBERCOTY','CYBER','CYBER CITY'].includes(u)) return 'CYBER CITY'
  if (['ATHEMP','ATHEMPURA'].includes(u)) return 'ATHEMPURA'
  if (['ELDORA','ELDORADO'].includes(u)) return 'ELDORADO'
  if (['ESPETA','ESPETÁ','ESPETACULO','ESPETÁCULO'].includes(u)) return 'ESPETÁCULO'
  if (['ALLURA','KAZURA','URAH','RANACH'].includes(u)) return u
  return v
}
function toSlug(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function parseTime(val){
  if(val==null)return null
  if(val instanceof Date)return `${String(val.getUTCHours()).padStart(2,'0')}:${String(val.getUTCMinutes()).padStart(2,'0')}`
  if(typeof val==='number'){const t=Math.round(val*24*60);return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`}
  if(typeof val==='string'){const m=val.trim().match(/^(\d{1,2}):(\d{2})/);if(m)return `${m[1].padStart(2,'0')}:${m[2]}`}
  return null
}
function parseDate(val){
  if(val instanceof Date && val.getUTCFullYear()>1900){
    return `${val.getUTCFullYear()}-${String(val.getUTCMonth()+1).padStart(2,'0')}-${String(val.getUTCDate()).padStart(2,'0')}`
  }
  return null
}
function parseTimeCompact(val){
  if(typeof val!=='string')return null
  const s=val.trim().toUpperCase(); const std=parseTime(s); if(std)return std
  const m=s.match(/^(\d{1,2})\s*H\s*(\d{2})?$/); if(!m)return null
  return `${m[1].padStart(2,'0')}:${(m[2]??'00').padStart(2,'0')}`
}
function parseDateHeaderAdiantados(val,ano){
  if(typeof val!=='string')return null
  const m=val.trim().match(/^(\d{1,2})\/(\d{1,2})\s*-/); if(!m)return null
  return `${ano}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
}

// ── parseSheet0 (verbatim, com diasEvento já filtrado p/ oficiais) ───────────
function parseSheet0(ws, sheetName, diasEvento) {
  const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true})
  let date_str=''
  if(rows.length>0){const d=parseDate(rows[0][0]);if(d)date_str=d}
  if(!date_str){
    const m=sheetName.match(/^TABELA\s+DIA\s+(\d{1,2})/i)
    if(m){const n=parseInt(m[1],10);if(n>=1&&n<=diasEvento.length)date_str=diasEvento[n-1].data}
  }
  if(!date_str){console.warn(`[skip] aba "${sheetName}": sem data`);return{date_str:'',games:[]}}
  let currentSport=''; const games=[]
  for(const row of rows){
    if(parseDate(row[0]))continue
    const nonNull=row.filter(v=>v!=null)
    if(nonNull.length>=1&&nonNull.length<=4&&typeof nonNull[0]==='string'){
      const s=nonNull[0].trim()
      if(s.length>=3&&!s.includes('—')&&!s.includes('JOGOS')&&s!=='HORA'&&s!=='X'&&!/\d/.test(s)&&parseTime(row[0])===null){currentSport=s;continue}
    }
    if(!currentSport)continue
    for(let g=0;g<3;g++){
      const o=g*10; if(o+8>=row.length)continue
      const hora=parseTime(row[o]),div=row[o+1],mod=row[o+2],quad=row[o+3],tA=row[o+4],tB=row[o+8]
      if(!hora||!tA||!tB)continue
      if(tA==='ATLÉTICA'||tB==='ATLÉTICA')continue
      if(typeof tA!=='string'||typeof tB!=='string')continue
      const modCode=mod?String(mod).trim():''
      if(!MODALIDADE_MAP[modCode])continue
      games.push({date_str,hora,divisao:div?normalizarDivisao(String(div)):'',mod_code:modCode,quadra:quad?String(quad).trim():'',equipe_a:tA.trim(),equipe_b:tB.trim()})
    }
  }
  return{date_str,games}
}

function parseSheetAdiantados(ws,ano){
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true})
  const games=[]; let dateLeft='',dateRight=''
  for(const row of rows){
    const dL=parseDateHeaderAdiantados(row[0],ano); if(dL)dateLeft=dL
    const dR=parseDateHeaderAdiantados(row[10],ano); if(dR)dateRight=dR
    const sides=[{off:0,date_str:dateLeft,skip:!!dL},{off:10,date_str:dateRight,skip:!!dR}]
    for(const{off,date_str,skip}of sides){
      if(skip||!date_str)continue
      const quadRaw=row[off],horaRaw=row[off+1],divRaw=row[off+2],modRaw=row[off+3],tARaw=row[off+4],tBRaw=row[off+8]
      let quadra=''
      if(typeof quadRaw==='string'){quadra=quadRaw.trim();if(quadra==='UBERLÂNDIA'||quadra==='UBERABA')continue}
      else if(quadRaw!=null)continue
      const hora=parseTimeCompact(horaRaw)??parseTime(horaRaw); if(!hora)continue
      const modCode=modRaw?String(modRaw).trim():''; if(!modCode||!MODALIDADE_MAP[modCode])continue
      if(typeof tARaw!=='string'||typeof tBRaw!=='string')continue
      const equipe_a=tARaw.trim(),equipe_b=tBRaw.trim()
      if(!equipe_a||!equipe_b||equipe_a==='ATLÉTICA'||equipe_b==='ATLÉTICA')continue
      games.push({date_str,hora,divisao:divRaw?normalizarDivisao(String(divRaw)):'',mod_code:modCode,quadra,equipe_a,equipe_b})
    }
  }
  return games
}

// ── Main ─────────────────────────────────────────────────────────────────────
const xlsxPath = process.argv[2]
const APPLY = process.argv.includes('--apply')
if(!xlsxPath){console.error('Uso: node scripts/reimport-jogos.mjs <xlsx> [--apply]');process.exit(1)}

const wb = XLSX.read(readFileSync(xlsxPath),{type:'buffer',cellDates:true})
const sheet0Name = wb.SheetNames[0]
const { games: gamesMain } = parseSheet0(wb.Sheets[sheet0Name], sheet0Name, DIAS_OFICIAIS)
const gamesAdi = wb.Sheets['JOGOS ADIANTADOS'] ? parseSheetAdiantados(wb.Sheets['JOGOS ADIANTADOS'], ANO) : []
const games = [...gamesMain, ...gamesAdi]

// Resumo
const byDate = {}
for(const g of games)(byDate[g.date_str]??=[]).push(g)
console.log(`\n═══ PARSE ═══`)
console.log(`Aba principal "${sheet0Name}": ${gamesMain.length} jogos`)
console.log(`JOGOS ADIANTADOS: ${gamesAdi.length} jogos`)
console.log(`TOTAL: ${games.length} jogos`)
console.log(`\nPor data:`)
for(const d of Object.keys(byDate).sort())console.log(`  ${d}: ${byDate[d].length}`)

if(!APPLY){
  console.log(`\n[DRY-RUN] Nada foi escrito. Rode com --apply para executar.`)
  process.exit(0)
}

console.log(`\n═══ APLICANDO ═══`)

// 1. Wipe TODOS os jogos da edição
const { error: delErr, count } = await supabase.from('jogos').delete({count:'exact'}).eq('edicao_id',EDICAO_ID)
if(delErr){console.error('Erro ao apagar:',delErr.message);process.exit(1)}
console.log(`Apagados: ${count} jogos`)

// 2. Mapas de modalidade e setor
const { data: mods } = await supabase.from('modalidades').select('id,slug').eq('edicao_id',EDICAO_ID)
const modMap={}; for(const m of mods??[])modMap[m.slug]=m.id
const { data: sets } = await supabase.from('setores').select('id,nome').eq('edicao_id',EDICAO_ID)
const setorMap={}; for(const s of sets??[])setorMap[s.nome.toLowerCase()]=s.id

// Cria setores faltantes
const uniqueQuadras=[...new Set(games.map(g=>g.quadra).filter(Boolean))]
let setoresCriados=0
for(const nome of uniqueQuadras){
  const key=nome.toLowerCase()
  if(!setorMap[key]){
    const{data:c}=await supabase.from('setores').insert({edicao_id:EDICAO_ID,nome,tipo:'esportivo'}).select('id').single()
    if(c){setorMap[key]=c.id;setoresCriados++}
  }
}
console.log(`Setores criados: ${setoresCriados}`)

// Cria modalidades faltantes
let modsCriadas=0
for(const code of [...new Set(games.map(g=>g.mod_code))]){
  const info=MODALIDADE_MAP[code]; if(!info)continue
  const slug=toSlug(info.nome)
  if(!modMap[slug]){
    const{data:c}=await supabase.from('modalidades').insert({edicao_id:EDICAO_ID,nome:info.nome,slug,icone:info.icone}).select('id').single()
    if(c){modMap[slug]=c.id;modsCriadas++}
  }
}
console.log(`Modalidades criadas: ${modsCriadas}`)

// 3. Garante dias_evento das datas adiantadas
const diaIdByDate={}
for(const d of DIAS_OFICIAIS)diaIdByDate[d.data]=d.id
const WEEKDAY=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
for(const data of Object.keys(byDate)){
  if(diaIdByDate[data])continue
  let{data:dia}=await supabase.from('dias_evento').select('id').eq('edicao_id',EDICAO_ID).eq('data',data).maybeSingle()
  if(!dia){
    const wd=WEEKDAY[new Date(data+'T12:00:00Z').getUTCDay()]
    const{data:nd}=await supabase.from('dias_evento').insert({edicao_id:EDICAO_ID,data,nome_dia:wd}).select('id').single()
    dia=nd
  }
  diaIdByDate[data]=dia.id
}

// 4. Insere jogos
function categoriaDe(code){
  const u=code.toUpperCase()
  if(u==='FC'||u==='F7M')return 'Masculino'
  if(u.endsWith('F'))return 'Feminino'
  return 'Masculino'
}
let inseridos=0
for(const data of Object.keys(byDate).sort()){
  const dia_id=diaIdByDate[data]
  const toInsert=byDate[data].map(g=>{
    const info=MODALIDADE_MAP[g.mod_code]
    const modId=modMap[toSlug(info.nome)]
    const setorId=g.quadra?setorMap[g.quadra.toLowerCase()]??null:null
    const inicio=new Date(`${data}T${g.hora}:00-03:00`).toISOString()
    const fim=new Date(new Date(inicio).getTime()+info.duracao_min*60000).toISOString()
    return{edicao_id:EDICAO_ID,modalidade_id:modId,dia_id,setor_id:setorId,divisao:g.divisao||null,
      categoria:categoriaDe(g.mod_code),equipe_a_nome:g.equipe_a,equipe_b_nome:g.equipe_b,
      inicio,fim_previsto:fim,status:'agendado'}
  })
  for(let i=0;i<toInsert.length;i+=50){
    const{error}=await supabase.from('jogos').insert(toInsert.slice(i,i+50))
    if(error){console.error(`Erro insert ${data}:`,error.message)}
    else inseridos+=Math.min(50,toInsert.length-i)
  }
}
console.log(`\n✅ Inseridos: ${inseridos} jogos`)
