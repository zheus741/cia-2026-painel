// ─────────────────────────────────────────────────────────────────────────────
// sync-resultados-live.mts — DRY-RUN da sincronização de resultados (placares)
// a partir da planilha LIVE do Google (gviz CSV, 10 abas).
//
// Importa parseAba + canonTeamName + fuzzyMatchTeam REAIS (módulos puros) e
// replica casarResultados (verbatim de sync-core.ts) pra fidelidade total ao app.
// NÃO escreve nada — só relata casar/não-casar. (apply fica pelo sync do app,
// que propaga a chave corretamente em loop.)
//
// Rodar: node --experimental-strip-types scripts/sync-resultados-live.mts
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { parseAba, type ResultadoPlanilha } from '../src/lib/planilha/parse-resultados.ts'
import { canonTeamName, fuzzyMatchTeam } from '../src/lib/chaveamento/bracket-builder.ts'

const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const SHEET_ID = '11JjjaVLMitlr185DOCQAYtDiq48Z7UOy'
const ABAS = ['1ª Div', '2ª Div', 'ATHEMPURA', 'ALLURA', 'CYBER CITY', 'ELDORADO', 'ESPETÁCULO', 'KAZURA', 'RANACH', 'URAH']
const gvizUrl = (aba: string) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(aba)}`

// ── fetch + parse das abas (espelha buscarResultadosDasAbas) ─────────────────
const resultados: ResultadoPlanilha[] = []
const abasComErro: string[] = []
await Promise.all(ABAS.map(async (aba) => {
  try {
    const resp = await fetch(gvizUrl(aba), { signal: AbortSignal.timeout(15_000) })
    if (!resp.ok) { abasComErro.push(aba); return }
    resultados.push(...parseAba(await resp.text(), aba))
  } catch { abasComErro.push(aba) }
}))

// ── carrega jogos (mesmas colunas do JOGO_SELECT_COLS) ───────────────────────
type JogoRow = {
  id: string; modalidade_id: string; categoria: string | null; divisao: string | null
  fase: string | null; status: string; placar_a: number | null; placar_b: number | null
  penaltis_a: number | null; penaltis_b: number | null
  equipe_a_nome: string | null; equipe_b_nome: string | null
  modalidade: { slug: string; nome: string } | { slug: string; nome: string }[] | null
}
const jogos: JogoRow[] = []
for (let off = 0; ; off += 1000) {
  const { data, error } = await sb.from('jogos')
    .select('id, modalidade_id, categoria, divisao, fase, status, placar_a, placar_b, penaltis_a, penaltis_b, equipe_a_nome, equipe_b_nome, modalidade:modalidades(slug, nome)')
    .range(off, off + 999)
  if (error) throw error
  if (!data || data.length === 0) break
  jogos.push(...(data as any))
  if (data.length < 1000) break
}

// ── casarResultados (verbatim de sync-core.ts) ───────────────────────────────
const modNome = (j: JogoRow): string => {
  const m = Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade
  return m?.nome ?? ''
}
const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const normCat = (c: string | null | undefined): string => norm((c ?? '').trim())
function paresCasam(jA: string | null, jB: string | null, pA: string, pB: string): 'direto' | 'invertido' | null {
  const ja = canonTeamName(jA), jb = canonTeamName(jB)
  const pa = canonTeamName(pA), pb = canonTeamName(pB)
  const eq = (x: string, y: string) => !!x && !!y && (x === y || fuzzyMatchTeam(x, y))
  if (eq(ja, pa) && eq(jb, pb)) return 'direto'
  if (eq(ja, pb) && eq(jb, pa)) return 'invertido'
  return null
}
type Status = 'novo' | 'igual' | 'conflito' | 'sem_jogo' | 'ambiguo' | 'sem_modalidade'
const items = resultados.map((res) => {
  if (res.inc.length === 0) return { res, status: 'sem_modalidade' as Status, jogoLabel: null as string | null }
  const candidatos = jogos.filter(j => {
    const nome = norm(modNome(j))
    if (!res.inc.every(k => nome.includes(k))) return false
    if (res.exc.some(k => nome.includes(k))) return false
    return normCat(j.categoria) === normCat(res.categoria)
  })
  const casados: { j: JogoRow; orient: 'direto' | 'invertido' }[] = []
  for (const j of candidatos) {
    const orient = paresCasam(j.equipe_a_nome, j.equipe_b_nome, res.timeA, res.timeB)
    if (orient) casados.push({ j, orient })
  }
  if (casados.length === 0) return { res, status: 'sem_jogo' as Status, jogoLabel: null }
  if (casados.length > 1) return { res, status: 'ambiguo' as Status, jogoLabel: null }
  const { j, orient } = casados[0]
  const swapped = orient === 'invertido'
  const aplicA = swapped ? res.placarB : res.placarA
  const aplicB = swapped ? res.placarA : res.placarB
  const penA = swapped ? res.penB : res.penA
  const penB = swapped ? res.penA : res.penB
  const jaIgual = j.status === 'encerrado' && j.placar_a === aplicA && j.placar_b === aplicB &&
    (j.penaltis_a ?? null) === (penA ?? null) && (j.penaltis_b ?? null) === (penB ?? null)
  const status: Status = jaIgual ? 'igual' : (j.status === 'encerrado' ? 'conflito' : 'novo')
  return { res, status, jogoLabel: `${j.equipe_a_nome} × ${j.equipe_b_nome}` }
})

// ── relatório ────────────────────────────────────────────────────────────────
const by = (s: Status) => items.filter(i => i.status === s)
console.log(`\n📊 DRY-RUN resultados (planilha LIVE)\n`)
console.log(`   Lidos:          ${resultados.length}`)
console.log(`   ✅ já ok:        ${by('igual').length}`)
console.log(`   🟢 aplicar novo: ${by('novo').length}`)
console.log(`   🟡 conflito:     ${by('conflito').length}  (já encerrado, placar diferente)`)
console.log(`   ❌ sem jogo:     ${by('sem_jogo').length}`)
console.log(`   ⚠️  ambíguo:      ${by('ambiguo').length}`)
console.log(`   ⚪ sem modalid.: ${by('sem_modalidade').length}`)
if (abasComErro.length) console.log(`   🔌 abas c/ erro: ${abasComErro.join(', ')}`)

const aplicaveis = by('novo').length + by('conflito').length
console.log(`\n   ➡️  Aplicaria agora (novo+conflito): ${aplicaveis}\n`)

const fmt = (i: typeof items[number]) => `   • [${i.res.aba}] ${i.res.modalidadeLabel} ${i.res.categoria ?? ''} ${i.res.fase ?? ''} :: ${i.res.timeA} ${i.res.placarA}x${i.res.placarB} ${i.res.timeB}`
const semjogo = by('sem_jogo')
if (semjogo.length) {
  console.log(`── SEM JOGO (${semjogo.length}) ──`)
  for (const i of semjogo) console.log(fmt(i))
}
const amb = by('ambiguo')
if (amb.length) {
  console.log(`\n── AMBÍGUO (${amb.length}) ──`)
  for (const i of amb) console.log(fmt(i))
}

// ── DIAGNÓSTICO dos sem_jogo: por que não casou? ─────────────────────────────
console.log(`\n\n══════ DIAGNÓSTICO SEM-JOGO ══════`)
type Diag = 'sem_modalidade_no_banco' | 'todos_candidatos_tbd' | 'nome_diferente' | 'placar_ja_em_outro'
const diagCount: Record<string, number> = {}
const exemplos: Record<string, string[]> = {}
const TBD = (n: string | null) => {
  const s = (n ?? '').toUpperCase()
  return !s || /VENCEDOR|PERDEDOR|A DEFINIR|TBD|JG ?\d|JOGO ?\d|^WO$|^—$|^-$/.test(s)
}
for (const i of items.filter(x => x.status === 'sem_jogo')) {
  const res = i.res
  const cand = jogos.filter(j => {
    const nome = norm(modNome(j))
    if (!res.inc.every(k => nome.includes(k))) return false
    if (res.exc.some(k => nome.includes(k))) return false
    return normCat(j.categoria) === normCat(res.categoria)
  })
  let d: Diag
  if (cand.length === 0) d = 'sem_modalidade_no_banco'
  else if (cand.every(j => TBD(j.equipe_a_nome) || TBD(j.equipe_b_nome))) d = 'todos_candidatos_tbd'
  else d = 'nome_diferente'
  diagCount[d] = (diagCount[d] ?? 0) + 1
  ;(exemplos[d] ??= [])
  if (exemplos[d].length < 6) {
    if (d === 'nome_diferente') {
      // mostra os candidatos com nomes reais pra comparar
      const reais = cand.filter(j => !TBD(j.equipe_a_nome) && !TBD(j.equipe_b_nome)).slice(0, 3)
        .map(j => `${j.equipe_a_nome}/${j.equipe_b_nome}[${j.fase ?? '?'}/${j.status}]`).join('  ')
      exemplos[d].push(`PLAN: ${res.timeA}/${res.timeB} (${res.modalidadeLabel} ${res.categoria} ${res.fase}) → BANCO: ${reais || '(só TBD)'}`)
    } else {
      exemplos[d].push(`${res.modalidadeLabel} ${res.categoria} ${res.fase} :: ${res.timeA} x ${res.timeB} (${cand.length} cand)`)
    }
  }
}
for (const [d, n] of Object.entries(diagCount).sort((a,b)=>b[1]-a[1])) {
  console.log(`\n  ${d}: ${n}`)
  for (const ex of exemplos[d]) console.log(`     ${ex}`)
}
