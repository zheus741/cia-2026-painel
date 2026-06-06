// ─────────────────────────────────────────────────────────────────────────────
// run-repair-chaves.mts — repara o BYE travado: repropaga TODO jogo encerrado
// (com o avanco.ts corrigido, que agora preenche o slot do seed direto/bye) e
// re-aplica o sync de resultados, em loop até estabilizar.
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/run-repair-chaves.mts [--apply]
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'
import { createClient as createSb } from '@supabase/supabase-js'
import { propagarVencedorNaChave } from '../src/lib/chaveamento/avanco.ts'
import { buscarResultadosDasAbas, casarResultados, aplicarResultadoNoJogo, JOGO_SELECT_COLS } from '../src/lib/planilha/sync-core.ts'

const APPLY = process.argv.includes('--apply')
const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]
}
const sb: any = createSb(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const meio = async () => {
  const { data } = await sb.from('jogos').select('fase,equipe_a_nome,equipe_b_nome').in('fase', ['quartas', 'semifinal', 'final', '3lugar'])
  return (data ?? []).filter((j: any) => !!(j.equipe_a_nome || '').trim() !== !!(j.equipe_b_nome || '').trim()).length
}

console.log(`\n🔧 Reparo de chaves (BYE) — modo: ${APPLY ? 'APLICAR' : 'DRY (não escreve)'}`)
console.log(`   meio-preenchidos ANTES: ${await meio()}`)

const { resultados } = await buscarResultadosDasAbas()
let totalProp = 0, totalAplic = 0
for (let iter = 0; iter < 8; iter++) {
  // 1) repropaga todo jogo encerrado (preenche byes + vencedores)
  let propRodada = 0
  if (APPLY) {
    const { data: enc } = await sb.from('jogos').select('id').eq('status', 'encerrado')
    for (const j of (enc ?? [])) {
      try { const r = await propagarVencedorNaChave(j.id, sb); if (r.ok && (r.reason === 'created' || !r.reason)) propRodada++ } catch { /* segue */ }
    }
    totalProp += propRodada
  }
  // 2) aplica resultados que passaram a casar
  const { data: jogosRaw } = await sb.from('jogos').select(JOGO_SELECT_COLS)
  const itens = casarResultados((jogosRaw ?? []) as any[], resultados)
  let aplicRodada = 0, semCasar = 0
  for (const it of itens) {
    if (['sem_jogo', 'sem_modalidade', 'ambiguo'].includes(it.status)) { semCasar++; continue }
    if (it.status === 'igual') continue
    if (!APPLY) { aplicRodada++; continue }
    const r = await aplicarResultadoNoJogo(sb, it)
    if (r === 'aplicado') { aplicRodada++; totalAplic++ }
  }
  console.log(`   rodada ${iter + 1}: byes/parents propagados=${propRodada} · resultados aplicados=${aplicRodada} · semCasar=${semCasar}`)
  if (!APPLY) break
  if (propRodada === 0 && aplicRodada === 0) break
}

console.log(`\n   meio-preenchidos DEPOIS: ${await meio()}`)
console.log(`   total propagados=${totalProp} · total aplicados=${totalAplic}`)
