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
}

// ── Constants ────────────────────────────────────────────────────────────────

export const PONTOS_VITORIA = 3
export const PONTOS_EMPATE  = 1

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
      inicio, fim_previsto, status, placar_a, placar_b,
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
