/**
 * Queries de competição — leitura de atléticas, inscrições, jogos e stats agregados.
 *
 * Tudo derivado de:
 *   - `equipes` (com `divisao`, `conferencia`, `seed`)
 *   - `inscricoes` (com `cabeca_chave`)
 *   - `jogos` (com `status='encerrado'`, `placar_a`, `placar_b`)
 *   - `modalidades`
 *
 * Sem view materializada por enquanto — se ficar lento, materializa em SQL depois.
 */

import { createClient } from '@/lib/supabase/server'
import type { ConferenciaNome, DivisaoNome } from '@/lib/conferencias'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Atletica {
  id:           string
  nome:         string
  slug:         string
  divisao:      DivisaoNome | null
  conferencia:  ConferenciaNome | null
  seed:         number | null
  universidade: string | null
  logo_url:     string | null
  cor_primaria: string | null
}

export interface AtleticaStats {
  jogados:     number
  vitorias:    number
  empates:     number
  derrotas:    number
  gols_pro:    number
  gols_contra: number
  saldo:       number
  pontos:      number      // 3·V + 1·E (regra padrão, ajustável)
}

export interface InscricaoDetalhe {
  inscricao_id:    string
  modalidade_id:   string
  modalidade_nome: string
  modalidade_slug: string
  modalidade_icone: string | null
  categoria:       string
  divisao:         string
  conferencia:     string | null
  cabeca_chave:    1 | 2 | null
}

export interface JogoDetalhe {
  id:                string
  modalidade_id:     string
  modalidade_nome:   string | null
  modalidade_icone:  string | null
  categoria:         string | null
  divisao:           string | null
  fase:              string | null
  inicio:            string | null
  fim_previsto:      string | null
  status:            string | null
  placar_a:          number | null
  placar_b:          number | null
  equipe_a_id:       string | null
  equipe_b_id:       string | null
  equipe_a_nome:     string | null
  equipe_b_nome:     string | null
  /** W.O. (Art. 58-65). 'a'=A não compareceu (perdeu), 'b'=B, 'duplo'=ambas. */
  wo?:               'a' | 'b' | 'duplo' | null
}

// ── Constants ────────────────────────────────────────────────────────────────

// ── Constantes de pontuação ──────────────────────────────────────────────────

/**
 * Pontuação por colocação final na modalidade (Art. 44 da 1ª Divisão,
 * Art. 46 das Divisões de Acesso). Vale também para o campeonato geral.
 *
 *   1º = 13 pts · 2º = 10 · 3º = 7 · 4º = 6
 *   5º = 4 pts  · 6º = 3  · 7º = 2 · 8º = 1
 *   9º+ = 0 pts (constam só para fins de classificação interna)
 *
 * Modalidades INTRACONFERÊNCIA premiam apenas 1º-4º (Art. 46 inciso I).
 */
export const PONTOS_POR_COLOCACAO: Record<number, number> = {
  1: 13, 2: 10, 3: 7, 4: 6,
  5: 4,  6: 3,  7: 2, 8: 1,
}

/** Penalidade automática por W.O. — Art. 59 inciso I. */
export const PENALIDADE_WO = -13

/**
 * @deprecated Regra de Brasileirão (3·V + 1·E) — não se aplica à CIA.
 * Mantido apenas para `computeStats` legado. Use `derivarColocacao()` para
 * apurar a pontuação real da CIA, baseada na fase em que a atlética parou.
 */
export const PONTOS_VITORIA = 3
/** @deprecated ver PONTOS_VITORIA */
export const PONTOS_EMPATE  = 1


// ── Tipos de fase ────────────────────────────────────────────────────────────

/**
 * Fases reconhecidas para apuração de colocação por eliminatória simples.
 * Valores espelham o que pode aparecer em `jogos.fase`.
 */
export type FaseEliminatoria =
  | 'oitavas'
  | 'quartas'
  | 'semi' | 'semifinal'
  | 'final'
  | '3lugar' | 'terceiro'    // disputa de 3º lugar quando houver

const FASE_OITAVAS  = ['oitavas']
const FASE_QUARTAS  = ['quartas']
const FASE_SEMI     = ['semi', 'semifinal']
const FASE_FINAL    = ['final']
const FASE_3LUGAR   = ['3lugar', 'terceiro']


// ── Atléticas ────────────────────────────────────────────────────────────────

export async function getAllAtleticas(): Promise<Atletica[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipes')
    .select('id, nome, slug, divisao, conferencia, seed, universidade, logo_url, cor_primaria')
    .eq('tipo', 'atletica')
    .order('divisao', { ascending: true, nullsFirst: false })
    .order('conferencia', { ascending: true, nullsFirst: true })
    .order('seed', { ascending: true, nullsFirst: false })
    .order('nome', { ascending: true })

  if (error) throw error
  return (data ?? []) as Atletica[]
}

export async function getAtleticaBySlug(slug: string): Promise<Atletica | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipes')
    .select('id, nome, slug, divisao, conferencia, seed, universidade, logo_url, cor_primaria')
    .eq('tipo', 'atletica')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data as Atletica | null
}

// ── Inscrições ───────────────────────────────────────────────────────────────

export async function getInscricoesByEquipe(equipeId: string): Promise<InscricaoDetalhe[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inscricoes')
    .select(`
      id,
      modalidade_id,
      categoria,
      divisao,
      conferencia,
      cabeca_chave,
      modalidades:modalidade_id (id, nome, slug, icone)
    `)
    .eq('equipe_id', equipeId)

  if (error) throw error

  type Mod = { id: string; nome: string; slug: string; icone: string | null }
  type Row = {
    id: string
    modalidade_id: string
    categoria: string
    divisao: string
    conferencia: string | null
    cabeca_chave: 1 | 2 | null
    modalidades: Mod | Mod[] | null
  }

  return (data ?? []).map((r: Row): InscricaoDetalhe => {
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    return {
      inscricao_id:     r.id,
      modalidade_id:    r.modalidade_id,
      modalidade_nome:  mod?.nome ?? '?',
      modalidade_slug:  mod?.slug ?? '',
      modalidade_icone: mod?.icone ?? null,
      categoria:        r.categoria,
      divisao:          r.divisao,
      conferencia:      r.conferencia,
      cabeca_chave:     r.cabeca_chave,
    }
  })
}

// ── Jogos ────────────────────────────────────────────────────────────────────

export async function getJogosByEquipe(equipeId: string): Promise<JogoDetalhe[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jogos')
    .select(`
      id, modalidade_id, categoria, divisao, fase,
      inicio, fim_previsto, status, placar_a, placar_b, wo,
      equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome,
      modalidades:modalidade_id (nome, icone)
    `)
    .or(`equipe_a_id.eq.${equipeId},equipe_b_id.eq.${equipeId}`)
    .order('inicio', { ascending: true, nullsFirst: false })

  if (error) throw error

  type Mod = { nome: string; icone: string | null }
  type Row = {
    id: string
    modalidade_id: string
    categoria: string | null
    divisao: string | null
    fase: string | null
    inicio: string | null
    fim_previsto: string | null
    status: string | null
    placar_a: number | null
    placar_b: number | null
    wo: 'a' | 'b' | 'duplo' | null
    equipe_a_id: string | null
    equipe_b_id: string | null
    equipe_a_nome: string | null
    equipe_b_nome: string | null
    modalidades: Mod | Mod[] | null
  }

  return (data ?? []).map((r: Row): JogoDetalhe => {
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    return {
      id:               r.id,
      modalidade_id:    r.modalidade_id,
      modalidade_nome:  mod?.nome ?? null,
      modalidade_icone: mod?.icone ?? null,
      categoria:        r.categoria,
      divisao:          r.divisao,
      fase:             r.fase,
      inicio:           r.inicio,
      fim_previsto:     r.fim_previsto,
      status:           r.status,
      placar_a:         r.placar_a,
      placar_b:         r.placar_b,
      wo:               r.wo,
      equipe_a_id:      r.equipe_a_id,
      equipe_b_id:      r.equipe_b_id,
      equipe_a_nome:    r.equipe_a_nome,
      equipe_b_nome:    r.equipe_b_nome,
    }
  })
}

// ── Stats agregados (computados em JS — barato no volume atual) ──────────────

export function computeStats(jogos: JogoDetalhe[], equipeId: string): AtleticaStats {
  const stats: AtleticaStats = {
    jogados: 0, vitorias: 0, empates: 0, derrotas: 0,
    gols_pro: 0, gols_contra: 0, saldo: 0, pontos: 0,
  }
  for (const j of jogos) {
    if (j.status !== 'encerrado') continue
    if (j.placar_a == null || j.placar_b == null) continue
    const isA = j.equipe_a_id === equipeId
    const isB = j.equipe_b_id === equipeId
    if (!isA && !isB) continue

    const meu  = isA ? j.placar_a : j.placar_b
    const dele = isA ? j.placar_b : j.placar_a

    stats.jogados      += 1
    stats.gols_pro     += meu
    stats.gols_contra  += dele

    if      (meu > dele) { stats.vitorias += 1; stats.pontos += PONTOS_VITORIA }
    else if (meu < dele) { stats.derrotas += 1 }
    else                 { stats.empates  += 1; stats.pontos += PONTOS_EMPATE }
  }
  stats.saldo = stats.gols_pro - stats.gols_contra
  return stats
}

// Calcula forma recente (últimos N jogos: V/E/D)
export function getForma(jogos: JogoDetalhe[], equipeId: string, limite = 5): ('V'|'E'|'D')[] {
  const recentes = jogos
    .filter(j => j.status === 'encerrado' && j.placar_a != null && j.placar_b != null)
    .slice(-limite)

  return recentes.map(j => {
    const isA = j.equipe_a_id === equipeId
    const meu  = isA ? j.placar_a! : j.placar_b!
    const dele = isA ? j.placar_b! : j.placar_a!
    if (meu > dele) return 'V'
    if (meu < dele) return 'D'
    return 'E'
  })
}


// ────────────────────────────────────────────────────────────────────────────
// Pontuação real da CIA — derivada da fase em que a atlética parou
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tipo estendido de Jogo que inclui flag de W.O. — espelha a coluna
 * `jogos.wo` adicionada na migration 0024.
 */
export interface JogoComWO extends JogoDetalhe {
  wo?: 'a' | 'b' | 'duplo' | null
}

/**
 * Resultado da apuração de colocação de uma atlética numa modalidade.
 */
export interface ColocacaoModalidade {
  /** Posição final (1..N). NULL se a atlética não jogou nenhum jogo da modalidade. */
  colocacao:       number | null
  /** Pontos auferidos pela colocação (Tabela PONTOS_POR_COLOCACAO). */
  pontos:          number
  /** Penalidades adicionais (W.O. = -13). Soma-se a `pontos` para total. */
  penalidades:     number
  /** Total final (pontos + penalidades). */
  total:           number
  /** Fase em que foi eliminada ('campeao' / 'vice' / 'semi' / etc.). */
  fase_eliminada:  'campeao' | 'vice' | 'semi' | 'quartas' | 'oitavas' | 'wo' | 'sem_jogos'
}

const isFase = (jogo: { fase: string | null }, lista: string[]): boolean =>
  !!jogo.fase && lista.includes(jogo.fase.toLowerCase().trim())

const venceu = (j: JogoDetalhe, equipeId: string): boolean => {
  if (j.placar_a == null || j.placar_b == null) return false
  const isA = j.equipe_a_id === equipeId
  return isA ? j.placar_a > j.placar_b : j.placar_b > j.placar_a
}

const oponenteDe = (j: JogoDetalhe, equipeId: string): string | null => {
  if (j.equipe_a_id === equipeId) return j.equipe_b_id
  if (j.equipe_b_id === equipeId) return j.equipe_a_id
  return null
}

/**
 * Apura a colocação final de uma atlética numa modalidade específica.
 *
 * Lê a sequência de jogos eliminatórios e determina:
 *   - Onde a atlética parou (campeão / vice / semi / quartas / oitavas)
 *   - Quem foi quem a derrotou (para rastrear "perdeu para o 1º colocado" etc.)
 *   - A colocação final segundo Art. 44 §§2-5 do regulamento
 *
 * Lógica:
 *   • Se ganhou a final → 1º (13 pts)
 *   • Se perdeu a final → 2º (10 pts)
 *   • Se parou em fase eliminatória anterior:
 *     - Identifica o adversário que a derrotou
 *     - Rastreia até onde ESSE adversário foi (caminho do 1º/2º/3º/4º)
 *     - Aplica a tabela: semi do 1º → 3º · semi do 2º → 4º
 *                       quartas do 1º/2º/3º/4º → 5º/6º/7º/8º
 *                       oitavas do 1º/2º/3º/4º → 9º/10º/11º/12º
 *
 * @param jogos      Todos os jogos da modalidade+categoria (não só da atlética).
 * @param equipeId   Atlética cuja colocação queremos apurar.
 * @returns          Colocação, pontos e fase de eliminação.
 */
export function derivarColocacao(
  jogos: JogoComWO[],
  equipeId: string,
): ColocacaoModalidade {
  // Filtra apenas jogos encerrados envolvendo a equipe
  const meusJogos = jogos.filter(j =>
    j.status === 'encerrado' &&
    (j.equipe_a_id === equipeId || j.equipe_b_id === equipeId),
  )

  // Sem jogos = sem colocação (não disputou ou ainda não começou)
  if (meusJogos.length === 0) {
    return { colocacao: null, pontos: 0, penalidades: 0, total: 0, fase_eliminada: 'sem_jogos' }
  }

  // 1) Pegou W.O.? — perde todos os pontos da modalidade + penalidade
  const perdeuPorWO = meusJogos.some(j => {
    if (!j.wo) return false
    if (j.wo === 'duplo')             return true
    if (j.wo === 'a' && j.equipe_a_id === equipeId) return true
    if (j.wo === 'b' && j.equipe_b_id === equipeId) return true
    return false
  })

  if (perdeuPorWO) {
    return {
      colocacao:      null,        // posição vaga (Art. 64 I b)
      pontos:         0,
      penalidades:    PENALIDADE_WO,
      total:          PENALIDADE_WO,
      fase_eliminada: 'wo',
    }
  }

  // 2) Ordena os jogos da equipe em ordem de fase (oitavas → final)
  const ordemFase = (j: JogoComWO): number => {
    if (isFase(j, FASE_OITAVAS))  return 1
    if (isFase(j, FASE_QUARTAS))  return 2
    if (isFase(j, FASE_SEMI))     return 3
    if (isFase(j, FASE_FINAL))    return 4
    if (isFase(j, FASE_3LUGAR))   return 3.5
    return 0
  }
  const ordenados = [...meusJogos].sort((a, b) => ordemFase(a) - ordemFase(b))
  const ultimo    = ordenados[ordenados.length - 1]

  // 3) Disputa de 3º lugar — quem vence é 3º, perde é 4º
  if (isFase(ultimo, FASE_3LUGAR)) {
    if (venceu(ultimo, equipeId)) {
      return { colocacao: 3, pontos: PONTOS_POR_COLOCACAO[3], penalidades: 0, total: PONTOS_POR_COLOCACAO[3], fase_eliminada: 'semi' }
    }
    return   { colocacao: 4, pontos: PONTOS_POR_COLOCACAO[4], penalidades: 0, total: PONTOS_POR_COLOCACAO[4], fase_eliminada: 'semi' }
  }

  // 4) Jogou a final?
  if (isFase(ultimo, FASE_FINAL)) {
    if (venceu(ultimo, equipeId)) {
      return { colocacao: 1, pontos: PONTOS_POR_COLOCACAO[1], penalidades: 0, total: PONTOS_POR_COLOCACAO[1], fase_eliminada: 'campeao' }
    }
    return   { colocacao: 2, pontos: PONTOS_POR_COLOCACAO[2], penalidades: 0, total: PONTOS_POR_COLOCACAO[2], fase_eliminada: 'vice' }
  }

  // 5) Foi eliminada antes da final — descobre quem a derrotou e rastreia
  //    até onde aquele adversário foi (caminho do 1º/2º/3º/4º)
  const oponente = oponenteDe(ultimo, equipeId)
  if (!oponente) {
    // jogo sem oponente registrado — degrada para "fase de eliminação"
    return { colocacao: null, pontos: 0, penalidades: 0, total: 0, fase_eliminada: 'sem_jogos' }
  }

  const rankConquistador = rastrearVencedor(jogos, oponente)

  // 6) Aplica a tabela do Art. 44 §§2-5
  if (isFase(ultimo, FASE_SEMI)) {
    // Perdeu na semi: 3º (perdeu pro 1º) ou 4º (perdeu pro 2º)
    const pos = rankConquistador === 1 ? 3 : 4
    return { colocacao: pos, pontos: PONTOS_POR_COLOCACAO[pos], penalidades: 0, total: PONTOS_POR_COLOCACAO[pos], fase_eliminada: 'semi' }
  }
  if (isFase(ultimo, FASE_QUARTAS)) {
    // 5º (perdeu pro 1º), 6º (pro 2º), 7º (pro 3º), 8º (pro 4º)
    const pos = 4 + (rankConquistador ?? 4)  // fallback: 8º se não conseguir rastrear
    const ponto = PONTOS_POR_COLOCACAO[pos] ?? 0
    return { colocacao: pos, pontos: ponto, penalidades: 0, total: ponto, fase_eliminada: 'quartas' }
  }
  if (isFase(ultimo, FASE_OITAVAS)) {
    // 9º/10º/11º/12º — fora da tabela de pontos (0 pts)
    const pos = 8 + (rankConquistador ?? 4)
    return { colocacao: pos, pontos: 0, penalidades: 0, total: 0, fase_eliminada: 'oitavas' }
  }

  // Fase desconhecida — fallback seguro
  return { colocacao: null, pontos: 0, penalidades: 0, total: 0, fase_eliminada: 'sem_jogos' }
}

/**
 * Rastreia até onde uma equipe foi no chaveamento — retorna 1, 2, 3 ou 4.
 *   1 = campeão da modalidade
 *   2 = vice
 *   3 = 3º colocado (perdeu na semi para o campeão)
 *   4 = 4º colocado (perdeu na semi para o vice)
 *
 * Usado pela `derivarColocacao` para calcular a colocação de quem foi
 * eliminado em fases anteriores.
 */
function rastrearVencedor(jogos: JogoComWO[], equipeId: string): 1 | 2 | 3 | 4 | null {
  const recursivo = derivarColocacao(jogos, equipeId)
  if (recursivo.colocacao == null) return null
  if (recursivo.colocacao <= 4)    return recursivo.colocacao as 1 | 2 | 3 | 4
  return null
}

/**
 * Soma toda a pontuação CIA de uma atlética — considera todas as modalidades
 * em que ela disputou, aplicando colocação + W.O.
 *
 * @param todosJogos    Todos os jogos da edição (ou da divisão da atlética).
 * @param equipeId      Atlética alvo.
 * @returns             Resumo com total e quebra por modalidade.
 */
export interface PontuacaoAtletica {
  total:        number
  por_modalidade: Array<{
    modalidade_id:   string
    modalidade_nome: string | null
    categoria:       string | null
    colocacao:       number | null
    pontos:          number
    penalidades:     number
    total:           number
    fase_eliminada:  string
  }>
}

export function computePontuacaoAtletica(
  todosJogos: JogoComWO[],
  equipeId: string,
): PontuacaoAtletica {
  // Agrupa jogos por modalidade+categoria
  const grupos = new Map<string, JogoComWO[]>()
  for (const j of todosJogos) {
    const key = `${j.modalidade_id}::${j.categoria ?? ''}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(j)
  }

  const por_modalidade: PontuacaoAtletica['por_modalidade'] = []
  let total = 0

  for (const [, jogosMod] of grupos) {
    // A atlética jogou algum jogo desta modalidade?
    const participou = jogosMod.some(j => j.equipe_a_id === equipeId || j.equipe_b_id === equipeId)
    if (!participou) continue

    const apurada = derivarColocacao(jogosMod, equipeId)
    const ref = jogosMod[0]
    por_modalidade.push({
      modalidade_id:   ref.modalidade_id,
      modalidade_nome: ref.modalidade_nome,
      categoria:       ref.categoria,
      colocacao:       apurada.colocacao,
      pontos:          apurada.pontos,
      penalidades:     apurada.penalidades,
      total:           apurada.total,
      fase_eliminada:  apurada.fase_eliminada,
    })
    total += apurada.total
  }

  // Ordena por pontos descrescente (mais valiosas primeiro)
  por_modalidade.sort((a, b) => b.total - a.total)

  return { total, por_modalidade }
}


// ────────────────────────────────────────────────────────────────────────────
// Previsão Mín/Máx — projeção de pontuação considerando jogos restantes
// ────────────────────────────────────────────────────────────────────────────

/**
 * Detecta se a modalidade é "prova" (natação, atletismo, etc.) onde a
 * pontuação só é conhecida ao final do evento, não dá pra prever min/max
 * por chaveamento.
 */
function isModalidadeProva(modalidadeNome: string | null | undefined): boolean {
  if (!modalidadeNome) return false
  return /natação|atletismo|nat\.|atl\./i.test(modalidadeNome)
}

/**
 * Piso garantido (pontuação MÍNIMA se a atlética perder o próximo jogo).
 *
 * Diferencia eliminatórias normais (1ª/2ª Div, top 8 pontuam) de
 * intraconferências (Super 08, top 4 pontuam).
 */
function pisoSePerderProxima(proximaFase: string, isIntraConf: boolean): number {
  if (isIntraConf) {
    // Acesso: só 1-4º pontuam. Eliminada antes do top 4 → 0 pts.
    if (proximaFase === 'quartas') return 0   // 5-8º (intraconf = 0 pts)
    if (proximaFase === 'semi')    return 6   // 3-4º
    if (proximaFase === 'final')   return 10  // 2º
    return 0
  }
  // 1ª/2ª Div: 1-8º pontuam.
  if (proximaFase === 'oitavas') return 0   // 9-12º
  if (proximaFase === 'quartas') return 1   // 5-8º (mín = 8º = 1 pt)
  if (proximaFase === 'semi')    return 6   // 3-4º (mín = 4º)
  if (proximaFase === 'final')   return 10  // 2º
  return 0
}

const FASE_ORDEM_PESO: Record<string, number> = {
  oitavas: 1, quartas: 2, semi: 3, semifinal: 3, '3lugar': 3.5, terceiro: 3.5, final: 4,
}

export type EstadoModalidade =
  | 'campeao' | 'vice'
  | 'eliminada'
  | 'viva'
  | 'wo'
  | 'sem_jogos'
  | 'prova'

export interface PrevisaoModalidade {
  modalidade_id:    string
  modalidade_nome:  string | null
  modalidade_icone: string | null
  categoria:        string | null
  divisao:          string | null
  estado:           EstadoModalidade
  /** Última fase jogada OU próxima fase a jogar (se viva). */
  fase_atual:       string | null
  /** Piso garantido (pontos se perder a próxima fase ou colocação final). */
  pontos_min:       number
  /** Teto possível (pontos se ganhar tudo até a final). */
  pontos_max:       number
  /** True se min === max (modalidade já decidida). */
  decidida:         boolean
}

export interface PrevisaoAtletica {
  /** Pontos garantidos AGORA (soma dos pisos + colocações fechadas). */
  atual:            number
  /** Sinônimo de `atual` — pior cenário possível daqui pra frente. */
  minimo:           number
  /** Melhor cenário possível se ganhar tudo. */
  maximo:           number
  /** Quantas modalidades ainda permitem variação (min < max). */
  vivas:            number
  /** Quantas modalidades já têm pontuação definitiva. */
  decididas:        number
  por_modalidade:   PrevisaoModalidade[]
}

/**
 * Computa previsão Mín/Máx da pontuação CIA total de uma atlética.
 *
 * Para cada modalidade onde a atlética está inscrita:
 *   • Prova (natação/atletismo): mostra pontos atuais (sem range)
 *   • Eliminada/W.O./campeão/vice: pontos fixos (min === max)
 *   • Ainda viva: min = piso da próxima fase, max = 13
 *
 * Para a Divisão de Acesso (Super 08), aplica tabela reduzida (só top 4).
 *
 * @param todosJogos   Jogos da atlética (de getJogosByEquipe — já filtrados)
 * @param inscricoes   Inscrições da atlética (de getInscricoesByEquipe)
 * @param equipeId     ID da atlética
 */
export function computePrevisaoAtletica(
  todosJogos: JogoDetalhe[],
  inscricoes: InscricaoDetalhe[],
  equipeId: string,
): PrevisaoAtletica {
  const por_modalidade: PrevisaoModalidade[] = []
  let totalMin = 0
  let totalMax = 0
  let vivas = 0
  let decididas = 0

  for (const insc of inscricoes) {
    // Jogos desta modalidade+categoria especificamente
    const jogosMod = todosJogos.filter(j =>
      j.modalidade_id === insc.modalidade_id && j.categoria === insc.categoria,
    )
    const isIntraConf = insc.divisao === 'Super 08'

    // Modalidade de prova (natação, atletismo) — sem range
    if (isModalidadeProva(insc.modalidade_nome)) {
      const dec = derivarColocacao(jogosMod, equipeId)
      const decidida = dec.colocacao != null
      por_modalidade.push({
        modalidade_id:    insc.modalidade_id,
        modalidade_nome:  insc.modalidade_nome ?? null,
        modalidade_icone: insc.modalidade_icone,
        categoria:        insc.categoria,
        divisao:          insc.divisao,
        estado:           'prova',
        fase_atual:       null,
        pontos_min:       dec.total,
        pontos_max:       dec.total,
        decidida,
      })
      totalMin += dec.total
      totalMax += dec.total
      if (decidida) decididas++
      else vivas++
      continue
    }

    // Modalidade eliminatória normal
    const prev = computePrevisaoEliminatoria(jogosMod, equipeId, isIntraConf)

    por_modalidade.push({
      modalidade_id:    insc.modalidade_id,
      modalidade_nome:  insc.modalidade_nome ?? null,
      modalidade_icone: insc.modalidade_icone,
      categoria:        insc.categoria,
      divisao:          insc.divisao,
      estado:           prev.estado,
      fase_atual:       prev.fase_atual,
      pontos_min:       prev.min,
      pontos_max:       prev.max,
      decidida:         prev.min === prev.max,
    })
    totalMin += prev.min
    totalMax += prev.max
    if (prev.min === prev.max) decididas++
    else vivas++
  }

  // Ordena: vivas primeiro (mais interessante), depois decididas por pts
  por_modalidade.sort((a, b) => {
    if (a.decidida !== b.decidida) return a.decidida ? 1 : -1
    return b.pontos_max - a.pontos_max
  })

  return { atual: totalMin, minimo: totalMin, maximo: totalMax, vivas, decididas, por_modalidade }
}

/**
 * Sub-rotina: previsão para uma única modalidade eliminatória.
 * Não trata prova — chamador é responsável por filtrar.
 */
function computePrevisaoEliminatoria(
  jogosMod: JogoDetalhe[],
  equipeId: string,
  isIntraConf: boolean,
): { estado: EstadoModalidade; fase_atual: string | null; min: number; max: number } {
  const meusJogos = jogosMod.filter(j =>
    (j.equipe_a_id === equipeId || j.equipe_b_id === equipeId),
  )
  const encerrados = meusJogos.filter(j => j.status === 'encerrado')

  // W.O. — penalidade fixa
  const tomouWO = encerrados.some(j => {
    if (!j.wo) return false
    if (j.wo === 'duplo') return true
    if (j.wo === 'a' && j.equipe_a_id === equipeId) return true
    if (j.wo === 'b' && j.equipe_b_id === equipeId) return true
    return false
  })
  if (tomouWO) {
    return { estado: 'wo', fase_atual: null, min: PENALIDADE_WO, max: PENALIDADE_WO }
  }

  // Sem jogos encerrados — vai entrar na primeira fase
  if (encerrados.length === 0) {
    // Heurística: intraconf → 8 atléticas → 1ª fase = quartas; senão oitavas
    const proxima = isIntraConf ? 'quartas' : 'oitavas'
    return { estado: 'sem_jogos', fase_atual: proxima, min: pisoSePerderProxima(proxima, isIntraConf), max: 13 }
  }

  // Pega o último jogo (maior peso de fase)
  const ordenados = [...encerrados].sort((a, b) =>
    (FASE_ORDEM_PESO[(a.fase ?? '').toLowerCase().trim()] ?? 0) -
    (FASE_ORDEM_PESO[(b.fase ?? '').toLowerCase().trim()] ?? 0),
  )
  const ultimo     = ordenados[ordenados.length - 1]
  const faseUlt    = (ultimo.fase ?? '').toLowerCase().trim()
  const isA        = ultimo.equipe_a_id === equipeId
  const meu        = isA ? ultimo.placar_a : ultimo.placar_b
  const dele       = isA ? ultimo.placar_b : ultimo.placar_a
  const venceu     = meu != null && dele != null && meu > dele

  if (!venceu) {
    // Perdeu o último → eliminada (ou vice se foi a final)
    const dec = derivarColocacao(jogosMod, equipeId)
    let estado: EstadoModalidade = 'eliminada'
    if (dec.fase_eliminada === 'campeao') estado = 'campeao'
    else if (dec.fase_eliminada === 'vice')    estado = 'vice'
    // Intraconf: posições > 4 não pontuam
    const pts = (isIntraConf && dec.colocacao != null && dec.colocacao > 4) ? 0 : dec.total
    return { estado, fase_atual: faseUlt, min: pts, max: pts }
  }

  // Venceu o último → próxima fase
  const proximaFase =
    faseUlt === 'oitavas'                              ? 'quartas' :
    faseUlt === 'quartas'                              ? 'semi'    :
    faseUlt === 'semi' || faseUlt === 'semifinal'      ? 'final'   :
    faseUlt === 'final'                                ? 'campea'  :
    faseUlt === '3lugar' || faseUlt === 'terceiro'     ? 'terceira':
    'quartas'  // fallback

  if (proximaFase === 'campea') {
    return { estado: 'campeao', fase_atual: 'final', min: 13, max: 13 }
  }
  if (proximaFase === 'terceira') {
    return { estado: 'eliminada', fase_atual: '3lugar', min: 7, max: 7 }
  }

  return {
    estado:     'viva',
    fase_atual: proximaFase,
    min:        pisoSePerderProxima(proximaFase, isIntraConf),
    max:        13,
  }
}
