import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('./.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('missing env vars')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

const REF_TABLES = [
  { table: 'jogos', col: 'modalidade_id' },
  { table: 'chave_config', col: 'modalidade_id' },
  { table: 'conteudos', col: 'modalidade_id' },
  { table: 'escopo_itens', col: 'vinculado_a_modalidade_id' },
  { table: 'inscricoes', col: 'modalidade_id' },
  { table: 'super8_liga', col: 'modalidade_id' },
  { table: 'resultados_externos', col: 'modalidade_id' },
  { table: 'resultados_externos_anexos', col: 'modalidade_id' },
]

async function countRefs(table, col, id) {
  const { count, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(col, id)
  if (error) {
    // table may not exist in this env — surface as null
    return { count: null, error: error.message }
  }
  return { count: count ?? 0 }
}

const { data: mods, error: modErr } = await sb
  .from('modalidades')
  .select('id, nome, slug, edicao_id, icone, categorias, divisoes')
  .order('nome', { ascending: true })

if (modErr) {
  console.error('erro listando modalidades:', modErr.message)
  process.exit(1)
}

console.log(`Total modalidades: ${mods.length}\n`)

const groups = new Map()
for (const m of mods) {
  const key = `${m.nome}::${m.edicao_id}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(m)
}

const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1)

if (dupGroups.length === 0) {
  console.log('Nenhuma duplicata encontrada.')
  process.exit(0)
}

console.log(`Grupos com duplicatas: ${dupGroups.length}\n`)

const plan = []

for (const [key, arr] of dupGroups) {
  const [nome] = key.split('::')
  console.log(`━━ ${nome} (${arr.length} entradas) ━━`)

  const enriched = []
  for (const m of arr) {
    const refs = {}
    for (const { table, col } of REF_TABLES) {
      const { count, error } = await countRefs(table, col, m.id)
      refs[table] = { count, error }
    }
    const total = Object.values(refs).reduce((s, r) => s + (r.count ?? 0), 0)
    enriched.push({ ...m, refs, total })
  }

  // canônica: mais jogos, depois mais chave_config, depois slug mais curto
  enriched.sort((a, b) => {
    const aj = a.refs.jogos.count ?? 0
    const bj = b.refs.jogos.count ?? 0
    if (aj !== bj) return bj - aj
    const ac = a.refs.chave_config.count ?? 0
    const bc = b.refs.chave_config.count ?? 0
    if (ac !== bc) return bc - ac
    return a.slug.length - b.slug.length
  })

  const canonica = enriched[0]
  const duplicadas = enriched.slice(1)

  for (const m of enriched) {
    const tag = m.id === canonica.id ? '✓ CANÔNICA' : '✗ remover'
    const refStr = Object.entries(m.refs)
      .filter(([, r]) => (r.count ?? 0) > 0 || r.error)
      .map(([t, r]) => (r.error ? `${t}=ERR(${r.error})` : `${t}=${r.count}`))
      .join(' ')
    console.log(`  ${tag}  ${m.id}  slug=${m.slug}  ${refStr || '(sem refs)'}`)
  }
  console.log()

  plan.push({ nome, canonica, duplicadas })
}

console.log('\n=== PLANO ===')
for (const p of plan) {
  console.log(`${p.nome}: manter ${p.canonica.id} (slug=${p.canonica.slug}), remover ${p.duplicadas.length}`)
  for (const d of p.duplicadas) {
    const migr = Object.entries(d.refs)
      .filter(([, r]) => (r.count ?? 0) > 0)
      .map(([t, r]) => `${t}:${r.count}`)
      .join(', ')
    console.log(`  - ${d.id} (slug=${d.slug}) migrar: ${migr || '(nada)'}`)
  }
}
