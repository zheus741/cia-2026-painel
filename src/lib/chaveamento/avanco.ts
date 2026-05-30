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
  'id, edicao_id, modalidade_id, categoria, divisao, fase, bracket_num, status, wo, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, placar_a, placar_b'

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
export async function propagarVencedorNaChave(jogoId: string): Promise<AvancoResult> {
  const supabase = await createClient()

  // 1. Carrega o jogo encerrado
  const { data: jogoRaw, error: jogoErr } = await supabase
    .from('jogos')
    .select(JOGO_COLS)
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
    .select(JOGO_COLS)
    .eq('modalidade_id', jogo.modalidade_id)
    .eq('categoria', jogo.categoria)
    .eq('divisao', jogo.divisao)
  if (!jogosChaveRaw) return { ok: false, reason: 'jogos-chave-vazios' }
  const jogosChave = jogosChaveRaw as JogoMin[]

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
  modalidadeId: string,
  categoria: string,
  divisao: string,
): Promise<VinculoResult> {
  const supabase = await createClient()

  const { data: jogosRaw } = await supabase
    .from('jogos')
    .select('id, edicao_id, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome')
    .eq('modalidade_id', modalidadeId)
    .eq('categoria', categoria)
    .eq('divisao', divisao)
  if (!jogosRaw || jogosRaw.length === 0) {
    return { total: 0, vinculados: 0, naoResolvidos: [] }
  }

  const edicaoId = (jogosRaw[0] as { edicao_id: string | null }).edicao_id
  const { data: equipesRaw } = await supabase
    .from('equipes')
    .select('id, nome')
    .eq('edicao_id', edicaoId ?? '')
  const equipes = (equipesRaw ?? []) as EquipeRef[]

  let vinculados = 0
  const naoResolvidos = new Set<string>()

  for (const j of jogosRaw as Array<{
    id: string
    equipe_a_id: string | null; equipe_b_id: string | null
    equipe_a_nome: string | null; equipe_b_nome: string | null
  }>) {
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

  return { total: jogosRaw.length, vinculados, naoResolvidos: [...naoResolvidos] }
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
