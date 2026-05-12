/**
 * Helpers de cálculo para a Liga Super 8 — playoff entre os 8 campeões
 * de conferência. Pontos corridos, 7 rodadas, todos contra todos.
 *
 * Regra de pontuação (Art. 57 do regulamento):
 *   • Vitória  = 13 pts
 *   • Empate   = 0 pts (em modalidades onde empate é possível, decide-se
 *                       por tiebreaker — pênaltis/prorrogação — antes do
 *                       resultado entrar na liga)
 *   • Derrota  = 0 pts
 *   • W.O.     = vencedor leva 13, perdedor leva 0 + penalidade da
 *               modalidade (-13 pts geral, aplicado em queries.ts)
 *
 * Tiebreakers para a classificação final (Art. 56):
 *   1. Confronto direto
 *   2. Saldo de partidas vencidas
 *   3. Saldo de pontos (gols pró - gols contra)
 *   4. Sorteio
 */

import 'server-only'
import { createClient } from '@/lib/supabase/server'

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface Super8Row {
  id:              string
  edicao_id:       string
  rodada:          number
  atletica_a_id:   string
  atletica_b_id:   string
  modalidade_id:   string
  categoria:       string
  jogo_id:         string | null
  posicao_a:       number | null
  posicao_b:       number | null
  observacoes:     string | null
  atletica_a?:     { id: string; nome: string; slug: string | null; conferencia: string | null; cor_primaria: string | null } | null
  atletica_b?:     { id: string; nome: string; slug: string | null; conferencia: string | null; cor_primaria: string | null } | null
  modalidade?:     { id: string; nome: string; icone: string | null } | null
  jogo?:           { id: string; status: string; placar_a: number | null; placar_b: number | null; wo: 'a'|'b'|'duplo'|null; inicio: string | null } | null
}

export interface Super8Participante {
  /** Posição A1-A8 atribuída no sorteio. */
  posicao:           number
  atletica_id:       string
  nome:              string
  slug:              string | null
  conferencia:       string | null
  cor_primaria:      string | null
}

export interface Super8Standing {
  atletica_id:       string
  nome:              string
  slug:              string | null
  conferencia:       string | null
  cor_primaria:      string | null
  posicao_sorteio:   number | null
  /** Total de pontos: 13 × vitórias. */
  pontos:            number
  /** Jogos disputados (encerrados ou com W.O.). */
  jogados:           number
  vitorias:          number
  derrotas:          number
  empates:           number
  /** Saldo de pontos da modalidade (gols/sets/etc. pró - contra). */
  saldo:             number
  pontos_pro:        number
  pontos_contra:     number
  /** W.O. tomados (perdedor por não-comparecimento). */
  wos:               number
}

/** Pontuação por vitória na Liga Super 8 (Art. 57). */
export const PONTOS_VITORIA_SUPER8 = 13

// ── Queries ─────────────────────────────────────────────────────────────────

/**
 * Carrega a tabela completa da Liga Super 8 da edição ativa,
 * com joins de atléticas, modalidades e jogos.
 *
 * Devolve array vazio se a edição ainda não montou a liga.
 */
export async function getSuper8Rows(edicaoId: string): Promise<Super8Row[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('super8_liga')
    .select(`
      id, edicao_id, rodada, atletica_a_id, atletica_b_id, modalidade_id,
      categoria, jogo_id, posicao_a, posicao_b, observacoes,
      atletica_a:atletica_a_id (id, nome, slug, conferencia, cor_primaria),
      atletica_b:atletica_b_id (id, nome, slug, conferencia, cor_primaria),
      modalidade:modalidade_id (id, nome, icone),
      jogo:jogo_id (id, status, placar_a, placar_b, wo, inicio)
    `)
    .eq('edicao_id', edicaoId)
    .order('rodada')
    .order('posicao_a', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[super8] getSuper8Rows error:', error.message)
    return []
  }
  return (data ?? []) as unknown as Super8Row[]
}

/**
 * Extrai os 8 participantes a partir das rows da liga.
 *
 * Cada atlética aparece em várias rows (uma por rodada). Esta função:
 *   • Coleta as 8 atléticas únicas
 *   • Pega a `posicao_a`/`posicao_b` de qualquer row pra cada atlética
 *   • Ordena por posição (A1 → A8)
 *
 * Se a liga tem 0 rows, retorna array vazio.
 */
export function deriveParticipantes(rows: Super8Row[]): Super8Participante[] {
  const map = new Map<string, Super8Participante>()

  for (const r of rows) {
    if (r.atletica_a && !map.has(r.atletica_a_id)) {
      map.set(r.atletica_a_id, {
        posicao:      r.posicao_a ?? 99,
        atletica_id:  r.atletica_a_id,
        nome:         r.atletica_a.nome,
        slug:         r.atletica_a.slug,
        conferencia:  r.atletica_a.conferencia,
        cor_primaria: r.atletica_a.cor_primaria,
      })
    }
    if (r.atletica_b && !map.has(r.atletica_b_id)) {
      map.set(r.atletica_b_id, {
        posicao:      r.posicao_b ?? 99,
        atletica_id:  r.atletica_b_id,
        nome:         r.atletica_b.nome,
        slug:         r.atletica_b.slug,
        conferencia:  r.atletica_b.conferencia,
        cor_primaria: r.atletica_b.cor_primaria,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.posicao - b.posicao)
}

/**
 * Calcula a classificação da liga a partir das rows e dos jogos vinculados.
 *
 * Para cada participante:
 *   • Soma vitórias × 13 = pontos
 *   • Conta jogados (jogos com status='encerrado' ou com wo!=null)
 *   • Computa saldo de pontos (placar_a - placar_b para A; inverso para B)
 *   • Conta W.O. tomados
 *
 * Empate desempata por: pontos → vitórias → saldo → nome.
 */
export function computeSuper8Standings(rows: Super8Row[]): Super8Standing[] {
  const participantes = deriveParticipantes(rows)
  if (participantes.length === 0) return []

  // Inicializa stats zerados
  const stats = new Map<string, Super8Standing>(
    participantes.map(p => [p.atletica_id, {
      atletica_id:      p.atletica_id,
      nome:             p.nome,
      slug:             p.slug,
      conferencia:      p.conferencia,
      cor_primaria:     p.cor_primaria,
      posicao_sorteio:  p.posicao === 99 ? null : p.posicao,
      pontos:           0,
      jogados:          0,
      vitorias:         0,
      derrotas:         0,
      empates:          0,
      saldo:            0,
      pontos_pro:       0,
      pontos_contra:    0,
      wos:              0,
    }]),
  )

  // Acumula resultados dos jogos vinculados
  for (const r of rows) {
    const j = r.jogo
    if (!j) continue

    const statA = stats.get(r.atletica_a_id)
    const statB = stats.get(r.atletica_b_id)
    if (!statA || !statB) continue

    // W.O. tem precedência sobre placar
    if (j.wo) {
      statA.jogados += 1
      statB.jogados += 1
      if (j.wo === 'duplo') {
        // Ambas perdem — sem vitória, ambas levam penalidade
        statA.derrotas += 1
        statB.derrotas += 1
        statA.wos += 1
        statB.wos += 1
      } else if (j.wo === 'a') {
        // A não veio → B vence
        statB.vitorias += 1
        statB.pontos   += PONTOS_VITORIA_SUPER8
        statA.derrotas += 1
        statA.wos      += 1
      } else if (j.wo === 'b') {
        statA.vitorias += 1
        statA.pontos   += PONTOS_VITORIA_SUPER8
        statB.derrotas += 1
        statB.wos      += 1
      }
      continue
    }

    // Jogo normal encerrado
    if (j.status !== 'encerrado' || j.placar_a == null || j.placar_b == null) continue

    statA.jogados += 1
    statB.jogados += 1
    statA.pontos_pro    += j.placar_a
    statA.pontos_contra += j.placar_b
    statB.pontos_pro    += j.placar_b
    statB.pontos_contra += j.placar_a
    statA.saldo = statA.pontos_pro - statA.pontos_contra
    statB.saldo = statB.pontos_pro - statB.pontos_contra

    if (j.placar_a > j.placar_b) {
      statA.vitorias += 1; statA.pontos += PONTOS_VITORIA_SUPER8
      statB.derrotas += 1
    } else if (j.placar_b > j.placar_a) {
      statB.vitorias += 1; statB.pontos += PONTOS_VITORIA_SUPER8
      statA.derrotas += 1
    } else {
      statA.empates += 1
      statB.empates += 1
    }
  }

  // Ordenação por tiebreaker do Art. 56 (sem confronto direto v1 — adicionar depois)
  return Array.from(stats.values()).sort((a, b) =>
    b.pontos   - a.pontos    ||
    b.vitorias - a.vitorias  ||
    b.saldo    - a.saldo     ||
    a.nome.localeCompare(b.nome),
  )
}

/**
 * Resumo agregado do estado da liga — útil pra decisões de UI
 * (mostrar empty state, "em curso", "finalizada", etc.).
 */
export interface Super8Resumo {
  total_jogos:        number
  jogos_agendados:    number
  jogos_encerrados:   number
  jogos_com_wo:       number
  participantes:      number
  rodadas_montadas:   number    // 0-7
  liga_montada:       boolean   // true se todas as 7 rodadas têm 4 jogos
  liga_finalizada:    boolean   // true se todos os 28 jogos têm resultado
}

export function summarizeSuper8(rows: Super8Row[]): Super8Resumo {
  const rodadasSet = new Set(rows.map(r => r.rodada))
  const totalJogos = rows.length
  const encerrados = rows.filter(r => r.jogo?.status === 'encerrado').length
  const wos        = rows.filter(r => !!r.jogo?.wo).length
  const agendados  = totalJogos - encerrados

  return {
    total_jogos:      totalJogos,
    jogos_agendados:  agendados,
    jogos_encerrados: encerrados,
    jogos_com_wo:     wos,
    participantes:    deriveParticipantes(rows).length,
    rodadas_montadas: rodadasSet.size,
    liga_montada:     rodadasSet.size === 7 && totalJogos === 28,
    liga_finalizada:  totalJogos > 0 && encerrados === totalJogos,
  }
}
