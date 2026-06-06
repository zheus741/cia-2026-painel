// ─────────────────────────────────────────────────────────────────────────────
// sync-csv.mts — sincroniza resultados a partir de um CSV LOCAL (export da
// planilha), usando o motor real (parseAba + casarResultados + aplicar). Para
// 'sem_jogo' (não vincula) CRIA a linha já encerrada com o placar.
//
//   DRY:    node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/sync-csv.mts "<arquivo.csv>" "<aba>"
//   APLICA: ... scripts/sync-csv.mts "<arquivo.csv>" "<aba>" --apply
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'
import { createClient as createSb } from '@supabase/supabase-js'
import { parseAba } from '../src/lib/planilha/parse-resultados.ts'
import { casarResultados, aplicarResultadoNoJogo, JOGO_SELECT_COLS } from '../src/lib/planilha/sync-core.ts'
import { resolveEquipeId } from '../src/lib/chaveamento/bracket-builder.ts'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const file = args.find(a => a.endsWith('.csv'))!
const aba = args.find(a => !a.endsWith('.csv') && a !== '--apply') ?? '2ª Div'
const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]
}
const sb: any = createSb(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function retry<T>(fn: () => Promise<T>, n = 30): Promise<T> { let e; for (let i = 0; i < n; i++) { try { return await fn() } catch (x) { e = x; await sleep(2000) } } throw e }

const resultados = parseAba(readFileSync(file, 'utf8'), aba)
// só os que têm placar de verdade (parseAba já filtra, mas garante)
console.log(`\n📄 ${file} [${aba}] — modo ${APPLY ? 'APLICAR' : 'DRY'}`)
console.log(`   resultados com placar: ${resultados.length}`)

const fetchJogos = () => retry(async () => {
  const j: any[] = []
  for (let o = 0; ; o += 500) { const { data, error } = await sb.from('jogos').select(JOGO_SELECT_COLS + ', edicao_id, dia_id').range(o, o + 499); if (error) throw error; if (!data?.length) break; j.push(...data); if (data.length < 500) break }
  return j
})
const { data: eqs } = await retry(async () => { const r = await sb.from('equipes').select('id,nome,edicao_id'); if (r.error) throw r.error; return r })

let aplicados = 0, jaIguais = 0, criados = 0, erros = 0
let semJogo: any[] = []
for (let iter = 0; iter < 6; iter++) {
  const jogos = await fetchJogos()
  const itens = casarResultados(jogos as any[], resultados)
  let mudou = 0
  jaIguais = 0; semJogo = []
  for (const it of itens) {
    if (it.status === 'igual') { jaIguais++; continue }
    if (it.status === 'sem_jogo' || it.status === 'sem_modalidade' || it.status === 'ambiguo') {
      if (it.status === 'sem_jogo') semJogo.push(it)
      continue
    }
    if (!APPLY) { aplicados++; continue }
    const r = await retry(() => aplicarResultadoNoJogo(sb, it))
    if (r === 'aplicado') { aplicados++; mudou++ } else if (r === 'erro') erros++; else jaIguais++
  }
  if (!APPLY) break
  if (mudou === 0) break
}

console.log(`   → casam/aplicam: ${aplicados} · já ok: ${jaIguais} · SEM JOGO (não vincula): ${semJogo.length}`)
console.log(`\n── SEM JOGO (${semJogo.length}) ──`)
for (const it of semJogo.slice(0, 60)) {
  const r = it.res
  const ind = / - /.test(r.timeA) ? ' [INDIVIDUAL]' : ''
  console.log(`   ${r.modalidadeLabel} ${r.categoria} ${r.fase} :: ${r.timeA} ${r.placarA}x${r.placarB} ${r.timeB}${ind}`)
}

if (APPLY && semJogo.length) {
  // CREATE os sem_jogo de TIME (ignora individuais por enquanto) com placar e encerrado
  console.log('\n⚙️  Criando linhas que faltam (times)...')
  const jogos = await fetchJogos()
  const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const normDiv = (d: string) => norm(d).replace(/divis[ãa]o/g, '').replace(/[\s\-_·.ª°º]+/g, '')
  const modNome = (j: any) => { const m = Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade; return m?.nome ?? '' }
  const ed = (() => { const c: Record<string, number> = {}; for (const j of jogos) if (j.edicao_id) c[j.edicao_id] = (c[j.edicao_id] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] })()
  const eqR = (n: string) => { const id = resolveEquipeId(n, (eqs || []).filter((e: any) => e.edicao_id === ed) as any[]); const e = (eqs || []).find((x: any) => x.id === id); return { id: id || null, nome: e?.nome || n } }
  const FASE: Record<string, string> = { oitavas: 'oitavas', quartas: 'quartas', semifinal: 'semifinal', final: 'final' }
  let ins = 0, skipInd = 0
  for (const it of semJogo) {
    const r = it.res
    if (/ - /.test(r.timeA) || /VENCEDOR/i.test(r.timeA)) { skipInd++; continue }
    // sibling p/ modalidade_id/edicao/divisao
    const sib = jogos.find((j: any) => r.inc.every((k: string) => norm(modNome(j)).includes(k)) && !r.exc.some((k: string) => norm(modNome(j)).includes(k)) && norm(j.categoria || '') === norm(r.categoria || ''))
    if (!sib) { console.log('   ⚠️ sem sibling:', r.modalidadeLabel, r.categoria); continue }
    const ra = eqR(r.timeA), rb = eqR(r.timeB)
    const payload: any = {
      edicao_id: sib.edicao_id, modalidade_id: sib.modalidade_id, categoria: sib.categoria,
      divisao: sib.divisao, fase: FASE[r.fase ?? ''] ?? r.fase ?? null, status: 'encerrado',
      equipe_a_id: ra.id, equipe_a_nome: ra.nome, equipe_b_id: rb.id, equipe_b_nome: rb.nome,
      placar_a: r.placarA, placar_b: r.placarB, dia_id: sib.dia_id,
      ...(r.penA != null && r.penB != null ? { penaltis_a: r.penA, penaltis_b: r.penB } : {}),
    }
    const { error } = await retry(async () => await sb.from('jogos').insert(payload))
    if (error) { erros++; console.log('   erro:', r.modalidadeLabel, error.message?.slice(0, 60)) } else ins++
  }
  console.log(`   criados=${ins} · individuais pulados=${skipInd}`)
  criados = ins
}

console.log(`\n📋 ${APPLY ? 'APLICADO' : 'DRY'}: aplicados=${aplicados} jaIguais=${jaIguais} criados=${criados} erros=${erros} semJogoRestante(individuais/vencedor)≈${semJogo.filter(it => / - /.test(it.res.timeA) || /VENCEDOR/i.test(it.res.timeA)).length}`)
