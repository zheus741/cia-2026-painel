// fix-todas-divisoes.mts — aplica resultados de TIME como FONTE DE VERDADE em
// TODAS as abas da planilha live (gviz). Claim em 2 passadas (exatos→correções),
// sobrescreve Frankenstein, cria o que falta, e reverte órfãos no fim.
//   DRY:    node --experimental-strip-types scripts/fix-todas-divisoes.mts
//   APLICA: node --experimental-strip-types scripts/fix-todas-divisoes.mts --apply
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { parseAba } from '../src/lib/planilha/parse-resultados.ts'
import { canonTeamName, fuzzyMatchTeam, resolveEquipeId } from '../src/lib/chaveamento/bracket-builder.ts'

const APPLY = process.argv.includes('--apply')
const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2] }
const sb: any = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const isNet = (e: any) => /fetch failed|timeout|network|ENOTFOUND|EAI_AGAIN|ECONNRESET|socket/i.test(String(e?.message ?? e))
async function rt<T>(fn: () => Promise<T>): Promise<T> { let e; for (let i = 0; i < 40; i++) { try { return await fn() } catch (x) { e = x; if (!isNet(x)) throw x; await sleep(2000) } } throw e }

const SHEET = '11JjjaVLMitlr185DOCQAYtDiq48Z7UOy'
// aba → divisao no banco
const ABAS: [string, string][] = [['1ª Div', '1ª'], ['2ª Div', '2ª'], ['ATHEMPURA', 'ATHEMPURA'], ['ALLURA', 'ALLURA'], ['CYBER CITY', 'CYBER CITY'], ['ELDORADO', 'ELDORADO'], ['ESPETÁCULO', 'ESPETÁCULO'], ['KAZURA', 'KAZURA'], ['RANACH', 'RANACH'], ['URAH', 'URAH']]

const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const normDiv = (d: string) => norm(d).replace(/divis[ãa]o/g, '').replace(/[\s\-_·.ª°º]+/g, '')
const modNome = (j: any) => { const m = Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade; return m?.nome ?? '' }
const teamEq = (x: string, y: string) => { const a = canonTeamName(x), b = canonTeamName(y); return !!a && !!b && (a === b || fuzzyMatchTeam(a, b)) }
const TBD = (n: string) => !((n || '').trim())

// carrega jogos + equipes
let jogos = await rt(async () => { const j: any[] = []; for (let o = 0; ; o += 500) { const { data, error } = await sb.from('jogos').select('id,modalidade_id,edicao_id,dia_id,categoria,divisao,fase,status,placar_a,placar_b,penaltis_a,penaltis_b,equipe_a_id,equipe_a_nome,equipe_b_id,equipe_b_nome,modalidade:modalidades(nome)').range(o, o + 499); if (error) throw error; if (!data?.length) break; j.push(...data); if (data.length < 500) break } return j })
const { data: eqs } = await rt(async () => { const r = await sb.from('equipes').select('id,nome,edicao_id'); if (r.error) throw r.error; return r })
const { data: modsRaw } = await rt(async () => { const r = await sb.from('modalidades').select('id,nome'); if (r.error) throw r.error; return r })
const { data: diasRaw } = await rt(async () => { const r = await sb.from('dias_evento').select('id,data'); if (r.error) throw r.error; return r })
const dataById: Record<string, string> = {}; for (const d of diasRaw || []) dataById[d.id] = d.data
const createDiaTally: Record<string, number> = {}
const ed = (() => { const c: Record<string, number> = {}; for (const j of jogos) if (j.edicao_id) c[j.edicao_id] = (c[j.edicao_id] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] })()
// dia dominante por (modalidade,cat,div,fase) — pra dar data certa aos CREATE
const diaMap: Record<string, Record<string, number>> = {}   // (mod,cat,div,fase)
const diaMapDiv: Record<string, Record<string, number>> = {} // (div,fase) fallback
const SABADO = '00000000-0000-0001-0000-000000000003'
for (const j of jogos) { if (!j.dia_id) continue; const k = `${j.modalidade_id}|${norm(j.categoria || '')}|${normDiv(j.divisao || '')}|${j.fase || 'null'}`; (diaMap[k] ??= {})[j.dia_id] = (diaMap[k][j.dia_id] || 0) + 1; const kd = `${normDiv(j.divisao || '')}|${j.fase || 'null'}`; (diaMapDiv[kd] ??= {})[j.dia_id] = (diaMapDiv[kd][j.dia_id] || 0) + 1 }
const domOf = (m: Record<string, number> | undefined) => m ? Object.entries(m).sort((a, b) => b[1] - a[1])[0][0] : null
const diaDom = (modId: string, cat: string, divN: string, fase: string | null) =>
  domOf(diaMap[`${modId}|${norm(cat)}|${normDiv(divN)}|${fase || 'null'}`]) ?? domOf(diaMapDiv[`${normDiv(divN)}|${fase || 'null'}`]) ?? ((fase === 'semifinal' || fase === 'final' || fase === '3lugar') ? SABADO : null)
const eqR = (n: string) => { const id = resolveEquipeId(n, (eqs || []).filter((e: any) => e.edicao_id === ed) as any[]); const e = (eqs || []).find((x: any) => x.id === id); return { id: id || null, nome: e?.nome || n } }

const tot: Record<string, number> = { OK: 0, APPLY: 0, FIX: 0, FIX_ENC: 0, SETVAZIO: 0, CREATE: 0, CONFLITO_SKIP: 0 }
let totUpd = 0, totIns = 0, totErr = 0, totOrphan = 0

for (const [aba, divNome] of ABAS) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(aba)}`
  let csv = ''
  try { csv = await rt(async () => { const r = await fetch(url, { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error('http'); return r.text() }) } catch { console.log(`  [${aba}] ⚠️ não baixou`); continue }
  const res = parseAba(csv, aba).filter(r => !/ - /.test(r.timeA) && !/VENCEDOR/i.test(r.timeA) && !/VENCEDOR/i.test(r.timeB))
  const wantDiv = normDiv(divNome)
  const claimed = new Set<string>()
  const plan: any[] = []
  const candsFor = (r: any) => jogos.filter(j => !claimed.has(j.id) && r.inc.every((k: string) => norm(modNome(j)).includes(k)) && !r.exc.some((k: string) => norm(modNome(j)).includes(k)) && norm(j.categoria || '') === norm(r.categoria || '') && normDiv(j.divisao || '') === wantDiv && j.fase === r.fase)
  const orient = (j: any, r: any) => teamEq(j.equipe_b_nome, r.timeA) || teamEq(j.equipe_a_nome, r.timeB)
  const mkApply = (j: any, r: any) => { const sw = orient(j, r); return { pa: sw ? r.placarB : r.placarA, pb: sw ? r.placarA : r.placarB, pna: sw ? r.penB : r.penA, pnb: sw ? r.penA : r.penB } }
  const pend = [...res]
  // PASSADA 1: exatos (ov==2)
  for (const r of [...pend]) { const c = candsFor(r).map(j => ({ j, ov: (teamEq(j.equipe_a_nome, r.timeA) || teamEq(j.equipe_b_nome, r.timeA) ? 1 : 0) + (teamEq(j.equipe_a_nome, r.timeB) || teamEq(j.equipe_b_nome, r.timeB) ? 1 : 0) })).sort((a, b) => b.ov - a.ov); if (c[0]?.ov === 2) { const j = c[0].j; claimed.add(j.id); const ap = mkApply(j, r); if (j.status === 'encerrado' && j.placar_a === ap.pa && j.placar_b === ap.pb) plan.push({ a: 'OK' }); else plan.push({ a: 'APPLY', j, r, ...ap }); pend.splice(pend.indexOf(r), 1) } }
  // PASSADA 2: 1 lado (corrige slot, inclusive encerrado Frankenstein)
  for (const r of [...pend]) { const c = candsFor(r).map(j => ({ j, ov: (teamEq(j.equipe_a_nome, r.timeA) || teamEq(j.equipe_b_nome, r.timeA) ? 1 : 0) + (teamEq(j.equipe_a_nome, r.timeB) || teamEq(j.equipe_b_nome, r.timeB) ? 1 : 0), vaz: [j.equipe_a_nome, j.equipe_b_nome].filter(TBD).length })).sort((a, b) => b.ov - a.ov || b.vaz - a.vaz); if (c[0]?.ov === 1) { const j = c[0].j; claimed.add(j.id); plan.push({ a: j.status === 'encerrado' ? 'FIX_ENC' : 'FIX', j, r }); pend.splice(pend.indexOf(r), 1) } }
  // PASSADA 3: reaproveita QUALQUER slot agendado da mesma (mod,cat,div,fase),
  // mantendo o dia_id original; só cria se não houver slot livre.
  for (const r of [...pend]) {
    const c = candsFor(r).filter(j => j.status !== 'encerrado').sort((a, b) => ([b.equipe_a_nome, b.equipe_b_nome].filter(TBD).length) - ([a.equipe_a_nome, a.equipe_b_nome].filter(TBD).length))
    if (c.length) { claimed.add(c[0].id); plan.push({ a: 'CLAIMSLOT', j: c[0], r }) }
    else { const dd = diaDom('', r.categoria || '', divNome, r.fase); createDiaTally[dd ? (dataById[dd] || dd) : 'SEM DIA'] = (createDiaTally[dd ? (dataById[dd] || dd) : 'SEM DIA'] || 0) + 1; plan.push({ a: 'CREATE', r }) }
  }

  const by: Record<string, number> = {}; for (const p of plan) by[p.a] = (by[p.a] || 0) + 1
  for (const k in by) tot[k] = (tot[k] || 0) + by[k]
  console.log(`  [${aba}] res=${res.length} ${JSON.stringify(by)}`)

  if (APPLY) {
    for (const p of plan) {
      try {
        const r = p.r
        if (p.a === 'APPLY') { await rt(async () => { const { error } = await sb.from('jogos').update({ placar_a: p.pa, placar_b: p.pb, status: 'encerrado', ...(p.pna != null && p.pnb != null ? { penaltis_a: p.pna, penaltis_b: p.pnb } : {}) }).eq('id', p.j.id); if (error) throw error }); totUpd++; const j = jogos.find((x: any) => x.id === p.j.id); if (j) { j.status = 'encerrado'; j.placar_a = p.pa; j.placar_b = p.pb } }
        else if (p.a === 'FIX' || p.a === 'FIX_ENC' || p.a === 'SETVAZIO' || p.a === 'CLAIMSLOT' || p.a === 'CREATE') {
          const ra = eqR(r.timeA), rb = eqR(r.timeB)
          const body: any = { equipe_a_id: ra.id, equipe_a_nome: ra.nome, equipe_b_id: rb.id, equipe_b_nome: rb.nome, placar_a: r.placarA, placar_b: r.placarB, status: 'encerrado', ...(r.penA != null && r.penB != null ? { penaltis_a: r.penA, penaltis_b: r.penB } : {}) }
          if (p.a === 'CREATE') {
            const mMatch = (j: any) => r.inc.every((k: string) => norm(modNome(j)).includes(k)) && !r.exc.some((k: string) => norm(modNome(j)).includes(k)) && norm(j.categoria || '') === norm(r.categoria || '')
            const sib = jogos.find((j: any) => mMatch(j) && normDiv(j.divisao || '') === wantDiv) ?? jogos.find(mMatch) ?? jogos.find((j: any) => r.inc.every((k: string) => norm(modNome(j)).includes(k)) && !r.exc.some((k: string) => norm(modNome(j)).includes(k)))
            const modId = sib?.modalidade_id ?? (modsRaw || []).find((m: any) => r.inc.every((k: string) => norm(m.nome).includes(k)) && !r.exc.some((k: string) => norm(m.nome).includes(k)))?.id
            if (!modId) { totErr++; if (totErr <= 8) console.log('   ERR CREATE sem modalidade', r.modalidadeLabel, r.categoria); continue }
            const divisao = sib && normDiv(sib.divisao || '') === wantDiv ? sib.divisao : divNome
            const modalidadeRef = sib?.modalidade ?? (modsRaw || []).find((m: any) => m.id === modId)
            // dia: dominante da chave (mesma mod,cat,div,fase) — NÃO do sibling genérico
            const diaId = diaDom(modId, r.categoria || '', divisao, r.fase) ?? null
            await rt(async () => { const { data, error } = await sb.from('jogos').insert({ edicao_id: sib?.edicao_id ?? ed, modalidade_id: modId, categoria: r.categoria, divisao, fase: r.fase, dia_id: diaId, bracket_num: null, ...body }).select('id,modalidade_id,categoria,divisao,fase,dia_id').single(); if (error) throw error; if (data) jogos.push({ ...data, ...body, modalidade: modalidadeRef }) }); totIns++
          }
          else { await rt(async () => { const { error } = await sb.from('jogos').update(body).eq('id', p.j.id); if (error) throw error }); totUpd++; const j = jogos.find((x: any) => x.id === p.j.id); if (j) Object.assign(j, body) }
        }
      } catch (e: any) { totErr++; if (totErr <= 8) console.log('   ERR', p.a, p.r?.modalidadeLabel, p.r?.categoria, p.r?.fase, '·', e?.message?.slice(0, 140) ?? e) }
    }
  }
}
console.log('\nPLANO TOTAL:', JSON.stringify(tot))
console.log('CREATE → datas:', JSON.stringify(createDiaTally))
if (APPLY) console.log(`APLICADO: atualizados=${totUpd} criados=${totIns} erros=${totErr}`)
