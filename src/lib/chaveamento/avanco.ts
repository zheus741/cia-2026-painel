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
  type BracketGame,
  type BracketSlot,
} from './bracket-builder'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface JogoMin {
  id: string
  modalidade_id: string | null
  categoria: string | null
  divisao: string | null
  fase: string | null
  status: string | null
  wo: 'a' | 'b' | 'duplo' | null
  equipe_a_id: string | null
  equipe_b_id: string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  placar_a: number | null
  placar_b: number | null
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
  // Empate: sem vencedor pra avançar (regulamento prevê desempate por critérios — fora do MVP)
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

  // Fallback restrito: match com pelo menos UM nome
  for (const candidate of candidatesByPhase) {
    const expected = getExpectedNames(candidate.id, bracketGames, configSeeds)
    if ((nameA && expected.has(nameA)) || (nameB && expected.has(nameB))) {
      return candidate
    }
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
export async function propagarVencedorNaChave(jogoId: string): Promise<AvancoResult> {
  const supabase = await createClient()

  // 1. Carrega o jogo encerrado
  const { data: jogoRaw, error: jogoErr } = await supabase
    .from('jogos')
    .select('id, modalidade_id, categoria, divisao, fase, status, wo, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, placar_a, placar_b')
    .eq('id', jogoId)
    .single()
  if (jogoErr || !jogoRaw) return { ok: false, reason: 'jogo-nao-encontrado' }
  const jogo = jogoRaw as JogoMin

  if (jogo.status !== 'encerrado') return { ok: false, reason: 'jogo-nao-encerrado' }
  if (!jogo.modalidade_id || !jogo.categoria || !jogo.divisao || !jogo.fase) {
    return { ok: false, reason: 'campos-essenciais-faltando' }
  }
  if (jogo.fase === 'final') return { ok: false, reason: 'ja-e-final' }

  // 2. Determina vencedor
  const winner = determinarVencedor(jogo)
  if (!winner) return { ok: false, reason: 'sem-vencedor' }

  // 3. Carrega a chave_config
  const { data: configRaw } = await supabase
    .from('chave_config')
    .select('modalidade_id, categoria, divisao, num_teams, seeds')
    .eq('modalidade_id', jogo.modalidade_id)
    .eq('categoria', jogo.categoria)
    .eq('divisao', jogo.divisao)
    .single()
  if (!configRaw) return { ok: false, reason: 'chave-config-ausente' }
  const config = configRaw as ChaveConfig

  // 4. Constrói estrutura lógica do bracket
  const bracketGames = buildGames(config.num_teams)

  // 5. Identifica BracketGame logical correspondente ao jogo encerrado
  const logicalGame = findLogicalGameForDb(jogo, bracketGames, config.seeds)
  if (!logicalGame) return { ok: false, reason: 'logical-game-nao-encontrado' }

  // 6. Encontra parent lógico
  const parentInfo = findParent(logicalGame.id, bracketGames)
  if (!parentInfo) return { ok: false, reason: 'sem-parent' }
  const { parent, slotIndex } = parentInfo

  // 7. Carrega jogos do banco da mesma chave (modalidade+categoria+divisão)
  const { data: jogosChaveRaw } = await supabase
    .from('jogos')
    .select('id, modalidade_id, categoria, divisao, fase, status, wo, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, placar_a, placar_b')
    .eq('modalidade_id', jogo.modalidade_id)
    .eq('categoria', jogo.categoria)
    .eq('divisao', jogo.divisao)
  if (!jogosChaveRaw) return { ok: false, reason: 'jogos-chave-vazios' }
  const jogosChave = jogosChaveRaw as JogoMin[]

  // 8. Identifica o jogo do banco correspondente ao parent
  const parentDbGame = findDbGameForLogical(parent, bracketGames, config.seeds, jogosChave)
  if (!parentDbGame) return { ok: false, reason: 'parent-db-game-nao-encontrado' }

  // 9. Verifica se já está propagado (idempotência)
  const targetField    = slotIndex === 0 ? 'equipe_a_id'   : 'equipe_b_id'
  const targetNomField = slotIndex === 0 ? 'equipe_a_nome' : 'equipe_b_nome'
  const currentIdInSlot   = slotIndex === 0 ? parentDbGame.equipe_a_id   : parentDbGame.equipe_b_id
  const currentNomeInSlot = slotIndex === 0 ? parentDbGame.equipe_a_nome : parentDbGame.equipe_b_nome

  // Se já está com o vencedor correto, no-op
  if (winner.equipeId && currentIdInSlot === winner.equipeId) {
    return { ok: true, reason: 'already', parentJogoId: parentDbGame.id, parentSlot: slotIndex === 0 ? 'a' : 'b', vencedorNome: winner.equipeNome ?? undefined }
  }
  if (!winner.equipeId && winner.equipeNome && currentNomeInSlot === winner.equipeNome) {
    return { ok: true, reason: 'already', parentJogoId: parentDbGame.id, parentSlot: slotIndex === 0 ? 'a' : 'b', vencedorNome: winner.equipeNome }
  }

  // 10. Atualiza o slot do parent com o vencedor
  const updatePayload: Record<string, string | null> = {
    [targetField]:    winner.equipeId,
    [targetNomField]: winner.equipeNome,
  }
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
    parentSlot:   slotIndex === 0 ? 'a' : 'b',
    vencedorNome: winner.equipeNome ?? undefined,
  }
}

// ── Recálculo em batch (pra debug/reset) ─────────────────────────────────────

export interface RecalcResult {
  total: number
  propagados: number
  pulados: number
  errors: Array<{ jogoId: string; reason: string }>
}

/**
 * Reprocessa TODOS os jogos encerrados de uma chave (modalidade+categoria+divisão),
 * em ordem de fase (oitavas → quartas → semi → final).
 * Útil quando o usuário declarou WO e quer rever a propagação, ou quando importou
 * resultados em lote sem ter triggered o avanço.
 */
export async function recalcularChave(
  modalidadeId: string,
  categoria: string,
  divisao: string,
): Promise<RecalcResult> {
  const supabase = await createClient()

  const { data: jogosRaw } = await supabase
    .from('jogos')
    .select('id, fase, status')
    .eq('modalidade_id', modalidadeId)
    .eq('categoria', categoria)
    .eq('divisao', divisao)
    .eq('status', 'encerrado')
  if (!jogosRaw) return { total: 0, propagados: 0, pulados: 0, errors: [] }

  // Ordem: oitavas → quartas → semifinal → final
  const ORDER: Record<string, number> = { oitavas: 1, quartas: 2, semifinal: 3, final: 4 }
  const jogos = (jogosRaw as Array<{ id: string; fase: string | null }>)
    .filter(j => j.fase && ORDER[j.fase])
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
