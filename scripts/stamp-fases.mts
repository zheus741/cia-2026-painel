// ─────────────────────────────────────────────────────────────────────────────
// stamp-fases.mts — carimba fase + bracket_num em TODOS os jogos das 110 chaves.
//
// Replica src/lib/chaveamento/avanco.ts::stampFasesNaChave, mas em lote e com
// service client. Roda com: node --experimental-strip-types scripts/stamp-fases.mts [--apply]
//
// Importa as funções PURAS de bracket-builder.ts (buildGames, canonTeamName,
// fuzzyMatchTeam) para garantir fidelidade exata ao algoritmo da app.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildGames, canonTeamName, fuzzyMatchTeam } from '../src/lib/chaveamento/bracket-builder.ts'

const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Verbatim de avanco.ts
const ROUND_TO_FASE: Record<string, string> = { oitava: 'oitavas', quarta: 'quartas', semi: 'semifinal', final: 'final' }
const normDivisao = (d: string | null | undefined) =>
  (d ?? '').trim().toLowerCase().replace(/divis[ãa]o/g, '').replace(/[\s\-_·.]+/g, '')
const normCategoria = (c: string | null | undefined): string | null => {
  const v = (c ?? '').trim(); return v === '' || v === '—' ? null : v
}

const APPLY = process.argv.includes('--apply')

// Carrega chaves + modalidades (slug) + todos os jogos
const { data: configs } = await sb.from('chave_config').select('modalidade_id, categoria, divisao, num_teams, seeds')
const { data: mods } = await sb.from('modalidades').select('id, slug')
const slugById: Record<string, string> = {}; for (const m of mods!) slugById[m.id] = m.slug
// modalidade_ids que compartilham o mesmo slug (cobre duplicata cross-edição)
const idsBySlug: Record<string, string[]> = {}
for (const m of mods!) (idsBySlug[m.slug] ??= []).push(m.id)

const { data: jogos } = await sb.from('jogos')
  .select('id, modalidade_id, categoria, divisao, fase, bracket_num, equipe_a_nome, equipe_b_nome')

let totalStamp = 0, chavesComStamp = 0, chavesSemMatch = 0
const updates: { id: string; fase: string; num: number }[] = []

for (const cfg of configs!) {
  if (!cfg.seeds?.length) continue
  const slug = slugById[cfg.modalidade_id]
  const modIds = new Set(idsBySlug[slug] ?? [cfg.modalidade_id])
  const wantCat = normCategoria(cfg.categoria), wantDiv = normDivisao(cfg.divisao)

  // 1º round (2 seeds diretos)
  const bracket = buildGames(cfg.num_teams)
  const firstRound: { fase: string; num: number; nA: string; nB: string }[] = []
  for (const g of bracket) {
    const seeds = g.slots.filter(s => s.type === 'direct' && s.pos).map(s => s.pos as number)
    if (seeds.length !== 2) continue
    const nA = cfg.seeds[seeds[0] - 1], nB = cfg.seeds[seeds[1] - 1]
    const fase = ROUND_TO_FASE[g.round]
    if (nA && nB && fase) firstRound.push({ fase, num: g.num, nA, nB })
  }
  if (!firstRound.length) continue

  // jogos da chave
  const jogosChave = jogos!.filter(j =>
    modIds.has(j.modalidade_id) &&
    normCategoria(j.categoria) === wantCat &&
    normDivisao(j.divisao) === wantDiv,
  )

  let stampChave = 0
  for (const j of jogosChave) {
    if (!j.equipe_a_nome || !j.equipe_b_nome) continue
    const ja = canonTeamName(j.equipe_a_nome), jb = canonTeamName(j.equipe_b_nome)
    const eq = (x: string, y: string) => !!x && !!y && (x === y || fuzzyMatchTeam(x, y))
    const m = firstRound.find(fr => {
      const a = canonTeamName(fr.nA), b = canonTeamName(fr.nB)
      return (eq(ja, a) && eq(jb, b)) || (eq(ja, b) && eq(jb, a))
    })
    if (!m) continue
    if (j.fase === m.fase && j.bracket_num === m.num) continue
    updates.push({ id: j.id, fase: m.fase, num: m.num })
    stampChave++
  }
  if (stampChave > 0) { chavesComStamp++; totalStamp += stampChave }
  else chavesSemMatch++
}

console.log(`Chaves: ${configs!.length} | com carimbo: ${chavesComStamp} | sem match: ${chavesSemMatch}`)
console.log(`Jogos a carimbar (1º round): ${totalStamp}`)

if (!APPLY) { console.log('\n[DRY-RUN] rode com --apply'); process.exit(0) }

let ok = 0
for (const u of updates) {
  const { error } = await sb.from('jogos').update({ fase: u.fase, bracket_num: u.num }).eq('id', u.id)
  if (!error) ok++
}
console.log(`\nCarimbados: ${ok}/${updates.length}`)
