import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildLineupFromShows, EMPTY_LINEUP, type ShowRow, type DiaRow, type SetorRow } from '@/lib/lineup-data'
import { PlacarTVClient } from './PlacarTVClient'

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'CIA 2026 · Placar Ao Vivo' }

const JOGO_SELECT = `
  id, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome,
  placar_a, placar_b, status, inicio, fim_previsto, divisao, fase, categoria, teste,
  modalidade:modalidades(nome, icone),
  setor:setores(nome),
  equipe_a:equipe_a_id(slug, divisao, conferencia, cor_primaria, universidade),
  equipe_b:equipe_b_id(slug, divisao, conferencia, cor_primaria, universidade)
`

type RawEquipe = { slug: string; divisao: string | null; conferencia: string | null; cor_primaria: string | null; universidade: string | null }
type RawMod = { nome: string; icone: string }
type RawSetor = { nome: string }
interface RawJogo {
  id: string
  equipe_a_id: string | null; equipe_b_id: string | null
  equipe_a_nome: string | null; equipe_b_nome: string | null
  placar_a: number | null; placar_b: number | null
  status: string | null; inicio: string | null; fim_previsto: string | null
  divisao: string | null; fase: string | null; categoria: string | null; teste: boolean | null
  modalidade: RawMod | RawMod[] | null
  setor: RawSetor | RawSetor[] | null
  equipe_a: RawEquipe | RawEquipe[] | null
  equipe_b: RawEquipe | RawEquipe[] | null
}

function arr<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}

function normalize(jogos: RawJogo[] | null) {
  return (jogos ?? []).map(j => ({
    ...j,
    modalidade: arr(j.modalidade),
    setor:      arr(j.setor),
    equipe_a:   arr(j.equipe_a),
    equipe_b:   arr(j.equipe_b),
  }))
}

export default async function PlacarTVPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const startOfTodayISO = `${todaySP}T00:00:00-03:00`
  const nowISO = new Date().toISOString()

  const [aoVivoRes, encerradosRes, agendadosRes, showsRes, diasRes, setoresRes] = await Promise.all([
    supabase.from('jogos').select(JOGO_SELECT)
      .eq('status', 'ao_vivo')
      .order('inicio', { ascending: true, nullsFirst: false }),
    supabase.from('jogos').select(JOGO_SELECT)
      .eq('status', 'encerrado')
      .neq('teste', true)
      .gte('inicio', startOfTodayISO)
      .order('inicio', { ascending: false })
      .limit(10),
    supabase.from('jogos').select(JOGO_SELECT)
      .eq('status', 'agendado')
      .gte('inicio', nowISO)
      .order('inicio', { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from('shows')
      .select('id, nome, tipo, inicio, fim_previsto, duracao_minutos, dia_id, setor_id, ordem_no_palco, embaixador')
      .eq('edicao_id', EDICAO_ID),
    supabase.from('dias_evento')
      .select('id, data')
      .eq('edicao_id', EDICAO_ID),
    supabase.from('setores')
      .select('id, nome')
      .eq('edicao_id', EDICAO_ID)
      .eq('tipo', 'palco'),
  ])

  const lineup = (showsRes.data && diasRes.data && setoresRes.data)
    ? buildLineupFromShows(showsRes.data as ShowRow[], diasRes.data as DiaRow[], setoresRes.data as SetorRow[])
    : EMPTY_LINEUP

  return (
    <PlacarTVClient
      aoVivo={normalize(aoVivoRes.data as RawJogo[] | null)}
      encerrados={normalize(encerradosRes.data as RawJogo[] | null)}
      proximos={normalize(agendadosRes.data as RawJogo[] | null)}
      lineup={lineup}
    />
  )
}
