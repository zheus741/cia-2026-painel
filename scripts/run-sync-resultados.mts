// ─────────────────────────────────────────────────────────────────────────────
// run-sync-resultados.mts — roda o MOTOR REAL do app (buscarResultadosDasAbas +
// casarResultados + aplicarResultadoNoJogo, que PROPAGA a chave) via CLI, com
// service client. Replica sincronizarPlanilhaAgora (placar/actions.ts) num loop.
//
// Rodar (DRY, só conta):   node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/run-sync-resultados.mts
// Aplicar de verdade:      ... scripts/run-sync-resultados.mts --apply
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'
import { createClient as createSb } from '@supabase/supabase-js'
import {
  buscarResultadosDasAbas, casarResultados, aplicarResultadoNoJogo, JOGO_SELECT_COLS,
} from '../src/lib/planilha/sync-core.ts'

const APPLY = process.argv.includes('--apply')
const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]
}
const sb: any = createSb(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

console.log(`\n🔄 Sync resultados — modo: ${APPLY ? 'APLICAR (escreve!)' : 'DRY-RUN'}\n`)
const { resultados, abasComErro } = await buscarResultadosDasAbas()
console.log(`   Lidos da planilha: ${resultados.length}${abasComErro.length ? ` (abas c/ erro: ${abasComErro.join(', ')})` : ''}`)

let aplicados = 0, erros = 0, jaIguais = 0, semCasar = 0, ambiguos = 0
let naoCasados: string[] = []
for (let iter = 0; iter < 8; iter++) {
  const { data: jogosRaw } = await sb.from('jogos').select(JOGO_SELECT_COLS)
  const jogos = (jogosRaw ?? []) as any[]
  const itens = casarResultados(jogos, resultados)
  let aplicadosRodada = 0
  jaIguais = 0; semCasar = 0; ambiguos = 0; naoCasados = []
  for (const it of itens) {
    if (it.status === 'sem_jogo' || it.status === 'sem_modalidade' || it.status === 'ambiguo') {
      if (it.status === 'ambiguo') ambiguos++; else semCasar++
      const motivo = it.status === 'ambiguo' ? 'ambíguo' : it.status === 'sem_modalidade' ? 'modalidade?' : 'sem jogo'
      naoCasados.push(`${it.res.timeA} ${it.res.placarA}×${it.res.placarB} ${it.res.timeB} · ${it.res.modalidadeLabel} · ${it.res.aba} (${motivo})`)
      continue
    }
    if (it.status === 'igual') { jaIguais++; continue }
    if (!APPLY) { aplicados++; continue }   // dry: conta o que aplicaria, não escreve
    const r = await aplicarResultadoNoJogo(sb, it)
    if (r === 'aplicado') { aplicados++; aplicadosRodada++ }
    else if (r === 'erro') erros++
    else jaIguais++
  }
  console.log(`   rodada ${iter + 1}: aplicados=${aplicados} jaIguais=${jaIguais} semCasar=${semCasar} ambiguos=${ambiguos} erros=${erros}`)
  if (!APPLY) break
  if (aplicadosRodada === 0) break
}

console.log(`\n📋 RESULTADO ${APPLY ? '(aplicado)' : '(dry)'}: lidos=${resultados.length} aplicados=${aplicados} jaIguais=${jaIguais} semCasar=${semCasar} ambiguos=${ambiguos} erros=${erros}`)
if (naoCasados.length) {
  console.log(`\n── NÃO CASARAM (${naoCasados.length}) ──`)
  for (const s of naoCasados) console.log('   •', s)
}
