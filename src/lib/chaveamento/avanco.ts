/**
 * Propagação de vencedor na chave eliminatória.
 *
 * Quando um jogo encerra (placar final ou WO declarado), identifica
 * o jogo da PRÓXIMA fase (parent no bracket-builder) e escreve o
 * vencedor no slot correspondente.
 *
 * Algoritmo:
 *  1. Carrega o jogo + chave_config + jogos da mesma chave
 *  2. Roda buildGames(num_teams) → estrutura lógica
 *  3. Identifica qual BracketGame corresponde ao jogo encerrado (match por nomes canônicos)
 *  4. Encontra o parent lógico (que tem este como feeder)
 *  5. Identifica qual jogo do banco corresponde ao parent (match por conjunto de seeds descendentes)
 *  6. Atualiza equipe_a_id/nome ou equipe_b_id/nome no parent do banco
 *
 * Idempotente: roda sem efeito se o vencedor já está propagado.
 */

import { createClient } from '@/lib/supabase/server'
import {
  buildGames,
  canonTeamName,
  fuzzyMatchTeam,
  resolveEquipeId,
  type BracketGame,
  type BracketSlot,
  type EquipeRef,
} from './bracket-builder'

// Colunas lidas/escritas em todas as queries de jogo da chave.
const JOGO_COLS =
  'id, edicao_id, modalidade_id, categoria, divisao, fase, bracket_num, status, wo, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, placar_a, placar_b, penaltis_a, penaltis_b'

// ── Matching tolerante de chave ──────────────────────────────────────────────
// O banco tem variações: categoria nula renderizada como "—", divisão como
// "1ª Divisão" vs "1ª", e modalidade_id duplicado entre edições (mesmo slug).
// Filtrar por .eq exato erra silenciosamente. Estes normalizadores + o fetcher
// por slug casam os jogos do MESMO jeito que a tela faz.

function normDivisao(d: string | null | undefined): string {
  return (d ?? '').trim().toLowerCase()
    .replace(/divis[ãa]o/g, '')
    .replace(/[\s\-_·.]+/g, '')
}

function normCategoria(c: string | null | undefined): string | null {
  const v = (c ?? '').trim()
  return v === '' || v === '—' ? null : v
}

/** Resolve todos os modalidade_id que compartilham o slug (cobre duplicata cross-edição). */
async function modalidadeIdsPorSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  modalidadeSlug: string,
): Promise<string[]> {
  const { data } = await supabase.from('modalidades').select('id').eq('slug', modalidadeSlug)
  return (data ?? []).map(m => (m as { id: string }).id)
}

/**
 * Carrega os jogos de uma chave por (slug, categoria, divisão) com matching
 * tolerante — o mesmo critério da UI. Evita o filtro exato que retornava 0.
 */
async function fetchJogosDaChave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  modalidadeSlug: string,
  categoria: string | null,
  divisao: string,
): Promise<JogoMin[]> {
  const modIds = await modalidadeIdsPorSlug(supabase, modalidadeSlug)
  if (modIds.length === 0) return []
  const { data } = await supabase.from('jogos').select(JOGO_COLS).in('modalidade_id', modIds)
  const wantCat = normCategoria(categoria)
  const wantDiv = normDivisao(divisao)
  return ((data ?? []) as JogoMin[]).filter(j =>
    normCategoria(j.categoria) === wantCat && normDivisao(j.divisao) === wantDiv,
  )
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface JogoMin {
  id: string
  edicao_id: string | null
  modalidade_id: string | null
  categoria: string | null
  divisao: string | null
  fase: string | null
  bracket_num: number | null
  status: string | null
  wo: 'a' | 'b' | 'duplo' | null
  equipe_a_id: string | null
  equipe_b_id: string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  placar_a: number | null
  placar_b: number | null
  penaltis_a: number | null
  penaltis_b: number | null
}

interface ChaveConfig {
  modalidade_id: string
  categoria: string
  divisao: string
  num_teams: number
  seeds: string[]
}

// ── Mapping round (bracket-builder) → fase (DB) ──────────────────────────────

const ROUND_TO_FASE: Record<string, string> = {
  oitava: 'oitavas',
  quarta: 'quartas',
  semi:   'semifinal',
  final:  'final',
}

// ── Vencedor ─────────────────────────────────────────────────────────────────

interface Winner {
  equipeId:   string | null
  equipeNome: string | null
  side:       'a' | 'b'
}

function determinarVencedor(jogo: JogoMin): Winner | null {
  // WO: o vencedor é o LADO OPOSTO de quem não compareceu
  if (jogo.wo === 'a') {
    return { equipeId: jogo.equipe_b_id, equipeNome: jogo.equipe_b_nome, side: 'b' }
  }
  if (jogo.wo === 'b') {
    return { equipeId: jogo.equipe_a_id, equipeNome: jogo.equipe_a_nome, side: 'a' }
  }
  if (jogo.wo === 'duplo') {
    // Ambas não compareceram — sem vencedor pra avançar
    return null
  }
  // Placar normal
  if (jogo.placar_a == null || jogo.placar_b == null) return null
  if (jogo.placar_a > jogo.placar_b) {
    return { equipeId: jogo.equipe_a_id, equipeNome: jogo.equipe_a_nome, side: 'a' }
  }
  if (jogo.placar_b > jogo.placar_a) {
    return { equipeId: jogo.equipe_b_id, equipeNome: jogo.equipe_b_nome, side: 'b' }
  }
  // Empate no tempo normal → desempate por pênaltis (futsal/futebol no mata-mata)
  if (jogo.penaltis_a != null && jogo.penaltis_b != null && jogo.penaltis_a !== jogo.penaltis_b) {
    if (jogo.penaltis_a > jogo.penaltis_b) {
      return { equipeId: jogo.equipe_a_id, equipeNome: jogo.equipe_a_nome, side: 'a' }
    }
    return { equipeId: jogo.equipe_b_id, equipeNome: jogo.equipe_b_nome, side: 'b' }
  }
  // Empate sem pênaltis registrados — sem vencedor pra avançar
  return null
}

// ── Seeds descendentes ──────────────────────────────────────────────────────

/** Retorna o conjunto de seeds (1..N) que eventualmente jogam neste bracket-game. */
function getSeedsDescendentes(gameId: string, bracketGames: BracketGame[]): Set<number> {
  const seeds = new Set<number>()
  const game = bracketGames.find(g => g.id === gameId)
  if (!game) return seeds

  for (const slot of game.slots) {
    if (slot.type === 'direct' && slot.pos) {
      seeds.add(slot.pos)
    } else if (slot.type === 'feeder' && slot.gameId) {
      for (const s of getSeedsDescendentes(slot.gameId, bracketGames)) {
        seeds.add(s)
      }
    }
  }
  return seeds
}

/** Conjunto de nomes canônicos esperados naquele bracket-game (via seeds config). */
function getExpectedNames(
  gameId: string,
  bracketGames: BracketGame[],
  configSeeds: string[],
): Set<string> {
  const seedSet = getSeedsDescendentes(gameId, bracketGames)
  const names = new Set<string>()
  for (const n of seedSet) {
    const seedName = configSeeds[n - 1]
    if (seedName) names.add(canonTeamName(seedName))
  }
  return names
}

// ── Identificação de jogos ──────────────────────────────────────────────────

/** Acha qual BracketGame corresponde ao jogo do banco. Match por nomes canônicos. */
function findLogicalGameForDb(
  dbJogo: JogoMin,
  bracketGames: BracketGame[],
  configSeeds: string[],
): BracketGame | null {
  if (!dbJogo.fase) return null
  const targetRound = Object.entries(ROUND_TO_FASE).find(([, fase]) => fase === dbJogo.fase)?.[0]
  if (!targetRound) return null

  const candidatesByPhase = bracketGames.filter(g => g.round === targetRound)
  const nameA = canonTeamName(dbJogo.equipe_a_nome)
  const nameB = canonTeamName(dbJogo.equipe_b_nome)
  if (!nameA && !nameB) return null

  // Pra cada candidato, verifica se as equipes do DB estão no conjunto esperado
  for (const candidate of candidatesByPhase) {
    const expected = getExpectedNames(candidate.id, bracketGames, configSeeds)
    const matchA = nameA && expected.has(nameA)
    const matchB = nameB && expected.has(nameB)
    if (matchA && matchB) return candidate
    // Quando só um nome está preenchido (caso de propagação parcial), aceita também
    if ((matchA || matchB) && candidatesByPhase.length === 1) return candidate
  }

  // Fallback restrito: match com pelo menos UM nome (exato)
  for (const candidate of candidatesByPhase) {
    const expected = getExpectedNames(candidate.id, bracketGames, configSeeds)
    if ((nameA && expected.has(nameA)) || (nameB && expected.has(nameB))) {
      return candidate
    }
  }

  // Fallback fuzzy: abreviação vs nome completo (ENG UFMG ↔ ENGENHARIA UFMG)
  for (const candidate of candidatesByPhase) {
    const expected = getExpectedNames(candidate.id, bracketGames, configSeeds)
    const fuzzyA = nameA && [...expected].some(e => fuzzyMatchTeam(nameA, e))
    const fuzzyB = nameB && [...expected].some(e => fuzzyMatchTeam(nameB, e))
    if (fuzzyA && fuzzyB) return candidate
    if ((fuzzyA || fuzzyB) && candidatesByPhase.length === 1) return candidate
  }

  return null
}

/** Acha qual BracketGame é o PARENT (que recebe vencedor) do logical game. */
function findParent(
  logicalGameId: string,
  bracketGames: BracketGame[],
): { parent: BracketGame; slotIndex: 0 | 1 } | null {
  for (const candidate of bracketGames) {
    for (let i = 0; i < candidate.slots.length; i++) {
      const slot = candidate.slots[i]
      if (slot.type === 'feeder' && slot.gameId === logicalGameId) {
        return { parent: candidate, slotIndex: i as 0 | 1 }
      }
    }
  }
  return null
}

/** Acha qual jogo do banco corresponde a um BracketGame parent. */
function findDbGameForLogical(
  logicalGame: BracketGame,
  bracketGames: BracketGame[],
  configSeeds: string[],
  candidateDbGames: JogoMin[],
): JogoMin | null {
  const phase = ROUND_TO_FASE[logicalGame.round]
  if (!phase) return null

  // 0) Âncora estável: bracket_num. Imune a nomes vazios — resolve o caso em que
  //    a fase seguinte está toda "A definir" e o match por nome é impossível.
  const byNum = candidateDbGames.find(j => j.bracket_num === logicalGame.num)
  if (byNum) return byNum

  const candidates = candidateDbGames.filter(j => j.fase === phase)
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]  // Só um jogo dessa fase — direto

  const expectedNames = getExpectedNames(logicalGame.id, bracketGames, configSeeds)

  // Match: jogo do banco onde pelo menos uma equipe está no conjunto esperado
  for (const c of candidates) {
    const nA = canonTeamName(c.equipe_a_nome)
    const nB = canonTeamName(c.equipe_b_nome)
    const matchA = nA && expectedNames.has(nA)
    const matchB = nB && expectedNames.has(nB)
    if (matchA || matchB) return c
  }

  // Fallback: nenhum dos jogos da fase tem equipe preenchida —
  // não dá pra identificar qual é qual. Retorna null.
  return null
}

// ── Função principal ────────────────────────────────────────────────────────

export interface AvancoResult {
  ok:              boolean
  reason?:         string
  parentJogoId?:   string
  parentSlot?:     'a' | 'b'
  vencedorNome?:   string
}

/**
 * Tenta propagar o vencedor do jogo encerrado para o jogo da próxima fase.
 * Retorna metadata sobre o que foi feito (ou por que não foi possível).
 *
 * Idempotente: se o slot do parent já tem o vencedor, retorna { ok: true, reason: 'already' }.
 */
/** Cliente Supabase (server ou service) — service usado no webhook sem sessão. */
type DbClient = Awaited<ReturnType<typeof createClient>>

export async function propagarVencedorNaChave(
  jogoId: string,
  dbOverride?: DbClient,
): Promise<AvancoResult> {
  const supabase = dbOverride ?? await createClient()

  // 1. Carrega o jogo encerrado
  const { data: jogoRaw, error: jogoErr } = await supabase
    .from('jogos')
    .select(JOGO_COLS)
    .eq('id', jogoId)
    .single()
  if (jogoErr || !jogoRaw) return { ok: false, reason: 'jogo-nao-encontrado' }
  const jogo = jogoRaw as JogoMin

  if (jogo.status !== 'encerrado') return { ok: false, reason: 'jogo-nao-encerrado' }
  // categoria pode ser nula (chave sem categoria) — não é campo essencial.
  if (!jogo.modalidade_id || !jogo.divisao || !jogo.fase) {
    return { ok: false, reason: 'campos-essenciais-faltando' }
  }
  if (jogo.fase === 'final') return { ok: false, reason: 'ja-e-final' }

  // 2. Determina vencedor
  const winner = determinarVencedor(jogo)
  if (!winner) return { ok: false, reason: 'sem-vencedor' }

  // 3. Carrega a chave_config — match tolerante (slug + categoria/divisão normalizadas)
  //    pra cobrir modalidade_id de edição diferente e variações de string.
  const slugRow = await supabase.from('modalidades').select('slug').eq('id', jogo.modalidade_id).single()
  const modalidadeSlug = (slugRow.data as { slug: string } | null)?.slug ?? null
  const modIds = modalidadeSlug ? await modalidadeIdsPorSlug(supabase, modalidadeSlug) : [jogo.modalidade_id]
  const { data: configsRaw } = await supabase
    .from('chave_config')
    .select('modalidade_id, categoria, divisao, num_teams, seeds')
    .in('modalidade_id', modIds.length ? modIds : [jogo.modalidade_id])
  const wantCat = normCategoria(jogo.categoria)
  const wantDiv = normDivisao(jogo.divisao)
  const config = ((configsRaw ?? []) as ChaveConfig[]).find(c =>
    normCategoria(c.categoria) === wantCat && normDivisao(c.divisao) === wantDiv,
  )
  if (!config) return { ok: false, reason: 'chave-config-ausente' }

  // 4. Constrói estrutura lógica do bracket
  const bracketGames = buildGames(config.num_teams)

  // 5. Identifica BracketGame logical correspondente ao jogo encerrado
  const logicalGame = findLogicalGameForDb(jogo, bracketGames, config.seeds)
  if (!logicalGame) return { ok: false, reason: 'logical-game-nao-encontrado' }

  // 6. Encontra parent lógico
  const parentInfo = findParent(logicalGame.id, bracketGames)
  if (!parentInfo) return { ok: false, reason: 'sem-parent' }
  const { parent, slotIndex } = parentInfo

  // 7. Carrega jogos do banco da mesma chave (matching tolerante)
  const jogosChave = modalidadeSlug
    ? await fetchJogosDaChave(supabase, modalidadeSlug, jogo.categoria, jogo.divisao)
    : []
  if (jogosChave.length === 0) return { ok: false, reason: 'jogos-chave-vazios' }

  // 8. Resolve o id do vencedor pelo nome se ele não veio preenchido.
  //    Jogos importados do XLSX trazem só `equipe_*_nome` (id null) — sem isso,
  //    a chave e a apuração de pontos propagariam adiante sempre sem id.
  let winnerId = winner.equipeId
  if (!winnerId && winner.equipeNome && jogo.edicao_id) {
    const { data: equipesRaw } = await supabase
      .from('equipes')
      .select('id, nome')
      .eq('edicao_id', jogo.edicao_id)
    winnerId = resolveEquipeId(winner.equipeNome, (equipesRaw ?? []) as EquipeRef[])
  }

  const targetField    = slotIndex === 0 ? 'equipe_a_id'   : 'equipe_b_id'
  const targetNomField = slotIndex === 0 ? 'equipe_a_nome' : 'equipe_b_nome'
  const parentSlot: 'a' | 'b' = slotIndex === 0 ? 'a' : 'b'

  // 9. Identifica o jogo do banco correspondente ao parent — ou cria se não existe.
  let parentDbGame = findDbGameForLogical(parent, bracketGames, config.seeds, jogosChave)

  if (!parentDbGame) {
    // A fase seguinte ainda não existe no banco (ex: importaram só as oitavas).
    // Cria a linha já com o vencedor no slot e o bracket_num como âncora, pra
    // que o outro feeder ache ESTA mesma linha ao encerrar.
    const novaFase = ROUND_TO_FASE[parent.round]
    const insertPayload: Record<string, unknown> = {
      edicao_id:        jogo.edicao_id,
      modalidade_id:    jogo.modalidade_id,
      categoria:        jogo.categoria,
      divisao:          jogo.divisao,
      fase:             novaFase,
      bracket_num:      parent.num,
      status:           'agendado',
      [targetField]:    winnerId,
      [targetNomField]: winner.equipeNome,
    }
    const { data: created, error: insErr } = await supabase
      .from('jogos')
      .insert(insertPayload)
      .select('id')
      .single()

    if (!insErr && created) {
      return { ok: true, reason: 'created', parentJogoId: created.id, parentSlot, vencedorNome: winner.equipeNome ?? undefined }
    }

    // Corrida com outra propagação (índice único bracket_num): relê e segue p/ update.
    const { data: reread } = await supabase
      .from('jogos')
      .select(JOGO_COLS)
      .eq('modalidade_id', jogo.modalidade_id)
      .eq('categoria', jogo.categoria)
      .eq('divisao', jogo.divisao)
      .eq('bracket_num', parent.num)
      .maybeSingle()
    if (!reread) {
      console.error('[propagarVencedor] erro ao criar parent', insErr)
      return { ok: false, reason: 'erro-criar-parent' }
    }
    parentDbGame = reread as JogoMin
  }

  // 10. Idempotência — se o slot já tem o vencedor correto, no-op.
  const currentIdInSlot   = slotIndex === 0 ? parentDbGame.equipe_a_id   : parentDbGame.equipe_b_id
  const currentNomeInSlot = slotIndex === 0 ? parentDbGame.equipe_a_nome : parentDbGame.equipe_b_nome
  if (winnerId && currentIdInSlot === winnerId) {
    return { ok: true, reason: 'already', parentJogoId: parentDbGame.id, parentSlot, vencedorNome: winner.equipeNome ?? undefined }
  }
  if (!winnerId && winner.equipeNome && currentNomeInSlot === winner.equipeNome) {
    return { ok: true, reason: 'already', parentJogoId: parentDbGame.id, parentSlot, vencedorNome: winner.equipeNome }
  }

  // 11. Atualiza o slot do parent com o vencedor (+ ancora bracket_num se faltava).
  const updatePayload: Record<string, string | number | null> = {
    [targetField]:    winnerId,
    [targetNomField]: winner.equipeNome,
  }
  if (parentDbGame.bracket_num == null) updatePayload.bracket_num = parent.num

  const { error: updErr } = await supabase
    .from('jogos')
    .update(updatePayload)
    .eq('id', parentDbGame.id)
  if (updErr) {
    console.error('[propagarVencedor] erro ao atualizar parent', updErr)
    return { ok: false, reason: 'erro-update-parent' }
  }

  return {
    ok: true,
    parentJogoId: parentDbGame.id,
    parentSlot,
    vencedorNome: winner.equipeNome ?? undefined,
  }
}

// ── Vinculação equipe_nome → equipe_id ───────────────────────────────────────

export interface VinculoResult {
  total:        number
  vinculados:   number   // jogos onde preenchemos ao menos um id que faltava
  naoResolvidos: string[] // nomes que não casaram com nenhuma equipe
}

/**
 * Resolve `equipe_a_id`/`equipe_b_id` a partir dos nomes em todos os jogos de
 * uma chave. Jogos importados do XLSX vêm só com nome (id null) — sem o id, a
 * apuração de pontos (que filtra por id) ignora a atlética e a previsão fica
 * zerada mesmo após vitórias.
 *
 * Não-destrutivo: só preenche ids que estão NULL; nunca sobrescreve um id
 * existente nem mexe em nomes.
 */
export async function vincularEquipesNaChave(
  modalidadeSlug: string,
  categoria: string | null,
  divisao: string,
): Promise<VinculoResult> {
  const supabase = await createClient()

  const jogos = await fetchJogosDaChave(supabase, modalidadeSlug, categoria, divisao)
  if (jogos.length === 0) {
    return { total: 0, vinculados: 0, naoResolvidos: [] }
  }

  const edicaoId = jogos[0].edicao_id
  const { data: equipesRaw } = await supabase
    .from('equipes')
    .select('id, nome')
    .eq('edicao_id', edicaoId ?? '')
  const equipes = (equipesRaw ?? []) as EquipeRef[]

  let vinculados = 0
  const naoResolvidos = new Set<string>()

  for (const j of jogos) {
    const patch: Record<string, string> = {}

    if (!j.equipe_a_id && j.equipe_a_nome) {
      const id = resolveEquipeId(j.equipe_a_nome, equipes)
      if (id) patch.equipe_a_id = id
      else naoResolvidos.add(j.equipe_a_nome)
    }
    if (!j.equipe_b_id && j.equipe_b_nome) {
      const id = resolveEquipeId(j.equipe_b_nome, equipes)
      if (id) patch.equipe_b_id = id
      else naoResolvidos.add(j.equipe_b_nome)
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('jogos').update(patch).eq('id', j.id)
      if (!error) vinculados++
    }
  }

  return { total: jogos.length, vinculados, naoResolvidos: [...naoResolvidos] }
}

// ── Recálculo em batch (pra debug/reset) ─────────────────────────────────────

export interface RecalcResult {
  total: number
  propagados: number
  pulados: number
  errors: Array<{ jogoId: string; reason: string }>
}

/**
 * Carimba `fase` + `bracket_num` nos jogos da chave casando cada jogo com a
 * posição do bracket pelos NOMES dos seeds. Essencial: a planilha não traz fase,
 * e sem fase nem a propagação nem a projeção de pontos funcionam.
 *
 * Só carimba o 1º round (bracket games com 2 seeds diretos). Fases seguintes
 * são preenchidas pela propagação.
 */
export async function stampFasesNaChave(
  modalidadeSlug: string,
  categoria: string | null,
  divisao: string,
): Promise<{ carimbados: number }> {
  const supabase = await createClient()

  const modIds = await modalidadeIdsPorSlug(supabase, modalidadeSlug)
  if (modIds.length === 0) return { carimbados: 0 }
  const { data: configsRaw } = await supabase
    .from('chave_config')
    .select('categoria, divisao, num_teams, seeds')
    .in('modalidade_id', modIds)
  const wantCat = normCategoria(categoria), wantDiv = normDivisao(divisao)
  const config = ((configsRaw ?? []) as ChaveConfig[]).find(c =>
    normCategoria(c.categoria) === wantCat && normDivisao(c.divisao) === wantDiv,
  )
  if (!config || !config.seeds?.length) return { carimbados: 0 }

  // 1º round = bracket games com 2 seeds diretos.
  const bracket = buildGames(config.num_teams)
  const firstRound: { fase: string; num: number; nA: string; nB: string }[] = []
  for (const g of bracket) {
    const seeds = g.slots.filter(s => s.type === 'direct' && s.pos).map(s => s.pos as number)
    if (seeds.length !== 2) continue
    const nA = config.seeds[seeds[0] - 1], nB = config.seeds[seeds[1] - 1]
    const fase = ROUND_TO_FASE[g.round]
    if (nA && nB && fase) firstRound.push({ fase, num: g.num, nA, nB })
  }
  if (firstRound.length === 0) return { carimbados: 0 }

  const jogos = await fetchJogosDaChave(supabase, modalidadeSlug, categoria, divisao)
  let carimbados = 0
  for (const j of jogos) {
    if (!j.equipe_a_nome || !j.equipe_b_nome) continue
    const ja = canonTeamName(j.equipe_a_nome), jb = canonTeamName(j.equipe_b_nome)
    const eq = (x: string, y: string) => !!x && !!y && (x === y || fuzzyMatchTeam(x, y))
    const m = firstRound.find(fr => {
      const a = canonTeamName(fr.nA), b = canonTeamName(fr.nB)
      return (eq(ja, a) && eq(jb, b)) || (eq(ja, b) && eq(jb, a))
    })
    if (!m) continue
    if (j.fase === m.fase && j.bracket_num === m.num) continue
    const { error } = await supabase.from('jogos').update({ fase: m.fase, bracket_num: m.num }).eq('id', j.id)
    if (!error) carimbados++
  }
  return { carimbados }
}

/**
 * Reprocessa TODOS os jogos encerrados de uma chave (modalidade+categoria+divisão),
 * em ordem de fase (oitavas → quartas → semi → final).
 * Útil quando o usuário declarou WO e quer rever a propagação, ou quando importou
 * resultados em lote sem ter triggered o avanço.
 */
export async function recalcularChave(
  modalidadeSlug: string,
  categoria: string | null,
  divisao: string,
): Promise<RecalcResult> {
  const supabase = await createClient()

  const todos = await fetchJogosDaChave(supabase, modalidadeSlug, categoria, divisao)

  // Ordem: oitavas → quartas → semifinal → final
  const ORDER: Record<string, number> = { oitavas: 1, quartas: 2, semifinal: 3, final: 4 }
  const jogos = todos
    .filter(j => j.status === 'encerrado' && j.fase && ORDER[j.fase])
    .sort((a, b) => (ORDER[a.fase!] ?? 99) - (ORDER[b.fase!] ?? 99))

  let propagados = 0
  let pulados = 0
  const errors: Array<{ jogoId: string; reason: string }> = []
  for (const j of jogos) {
    const result = await propagarVencedorNaChave(j.id)
    if (result.ok && result.reason !== 'already') propagados++
    else if (result.ok && result.reason === 'already') pulados++
    else errors.push({ jogoId: j.id, reason: result.reason ?? 'desconhecido' })
  }

  return { total: jogos.length, propagados, pulados, errors }
}
