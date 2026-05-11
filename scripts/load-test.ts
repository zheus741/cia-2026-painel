/**
 * Teste de carga — simula N inserts paralelos em `conteudos` para validar
 * se o banco aguenta o pico do D-Day (250 usuários, 100 cards/min em pico).
 *
 * Uso:
 *   npx tsx scripts/load-test.ts            # 100 inserts paralelos (default)
 *   npx tsx scripts/load-test.ts 250        # 250 inserts paralelos
 *   npx tsx scripts/load-test.ts 100 cleanup  # cria 100 e deleta no fim
 *
 * Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY de .env.local.
 *
 * Métricas exibidas:
 *   - latência total (wall clock)
 *   - p50/p95/p99 por insert
 *   - taxa de sucesso/erro
 *
 * IMPORTANTE: usa service role — bypassa RLS. Roda direto, não simula
 * carga de auth, mas é suficiente pra avaliar pool de conexões e índices.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── lê env.local manualmente (evita dep do dotenv) ───────────────────────────
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const [k, ...v] = l.split('=')
      return [k.trim(), v.join('=').trim()]
    }),
)

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Faltam env vars'); process.exit(1) }

const N = Number(process.argv[2] ?? 100)
const CLEANUP = process.argv[3] === 'cleanup'

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

async function main() {
  // pega edicao ativa
  const { data: edicao } = await supabase
    .from('edicoes').select('id').eq('ativa', true).maybeSingle()
  if (!edicao?.id) { console.error('Sem edicao ativa'); process.exit(1) }

  console.log(`\n🚀 Carga: ${N} inserts paralelos em \`conteudos\``)
  console.log(`   edicao_id: ${edicao.id}`)
  console.log(`   cleanup:   ${CLEANUP ? 'sim' : 'não (deixa no banco)'}\n`)

  const tag = `loadtest-${Date.now()}`
  const t0 = performance.now()

  const results = await Promise.all(
    Array.from({ length: N }, (_, i) => {
      const start = performance.now()
      return supabase.from('conteudos').insert({
        edicao_id: edicao.id,
        titulo:    `${tag} · #${i + 1}`,
        tipo:      'reels',
        status:    'rascunho',
        prioridade: 3,
      }).select('id').single().then(
        ({ error, data }) => ({ ok: !error, ms: performance.now() - start, error, id: data?.id }),
      )
    }),
  )

  const total = performance.now() - t0
  const okN = results.filter(r => r.ok).length
  const lats = results.filter(r => r.ok).map(r => r.ms).sort((a, b) => a - b)
  const p = (q: number) => lats[Math.floor(lats.length * q)]?.toFixed(0) ?? '—'

  console.log(`\n📊 Resultado`)
  console.log(`   sucesso:   ${okN}/${N}  (${((okN / N) * 100).toFixed(1)}%)`)
  console.log(`   wall time: ${total.toFixed(0)}ms`)
  console.log(`   p50:       ${p(0.5)}ms`)
  console.log(`   p95:       ${p(0.95)}ms`)
  console.log(`   p99:       ${p(0.99)}ms`)
  console.log(`   throughput: ${((okN / total) * 1000).toFixed(1)} insert/s\n`)

  if (results.some(r => !r.ok)) {
    console.log(`❌ Erros amostrais:`)
    results.filter(r => !r.ok).slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. ${(r.error as { message?: string })?.message}`)
    })
  }

  if (CLEANUP) {
    console.log(`\n🧹 Limpando ${okN} registros…`)
    const ids = results.filter(r => r.id).map(r => r.id) as string[]
    await supabase.from('conteudos').delete().in('id', ids)
    console.log(`   pronto.\n`)
  } else {
    console.log(`💡 Para limpar: \`delete from conteudos where titulo like '${tag}%';\`\n`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
