import { createClient } from '@/lib/supabase/server'
import { computeStats } from '@/lib/competicao/queries'
import { CONFERENCIAS } from '@/lib/conferencias'
import { EsportivoClient } from './EsportivoClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Núcleo Esportivo · CIA 2026' }

export default async function EsportivoPage() {
  const supabase = await createClient()

  const [
    { data: rawAtleticas },
    { data: jogosEnc },
    { count: aoVivoCount },
    { data: rawUpcoming },
  ] = await Promise.all([
    supabase
      .from('equipes')
      .select('id, nome, slug, divisao, conferencia, seed, universidade, cor_primaria')
      .eq('tipo', 'atletica')
      .order('divisao', { ascending: true, nullsFirst: false })
      .order('seed', { ascending: true, nullsFirst: false })
      .order('nome'),
    supabase
      .from('jogos')
      .select('id, equipe_a_id, equipe_b_id, placar_a, placar_b, status, divisao, conferencia, fase, inicio')
      .eq('status', 'encerrado'),
    supabase
      .from('jogos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ao_vivo'),
    supabase
      .from('jogos')
      .select('id, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, inicio, fase, divisao, modalidades:modalidade_id(nome,icone)')
      .eq('status', 'agendado')
      .order('inicio', { ascending: true, nullsFirst: false })
      .limit(8),
  ])

  const atleticas = rawAtleticas ?? []
  const encerrados = jogosEnc ?? []

  // Compute stats for each atlética
  const atleticasWithStats = atleticas.map(a => {
    const myJogos = encerrados.filter(j => j.equipe_a_id === a.id || j.equipe_b_id === a.id).map(j => ({
      ...j,
      modalidade_id: '',
      modalidade_nome: null,
      modalidade_icone: null,
      categoria: null,
      divisao: j.divisao,
      fase: j.fase,
      fim_previsto: null,
      equipe_a_nome: null,
      equipe_b_nome: null,
    }))
    const stats = computeStats(myJogos as Parameters<typeof computeStats>[0], a.id)
    return { ...a, ...stats }
  })

  // Sort function: pontos desc → saldo desc → gols_pro desc → nome
  const sortByPoints = (list: typeof atleticasWithStats) =>
    [...list].sort((a, b) =>
      b.pontos - a.pontos || b.saldo - a.saldo || b.gols_pro - a.gols_pro || a.nome.localeCompare(b.nome)
    )

  const div1 = sortByPoints(atleticasWithStats.filter(a => a.divisao === '1ª Divisão'))
  const div2 = sortByPoints(atleticasWithStats.filter(a => a.divisao === '2ª Divisão'))

  const super08 = CONFERENCIAS.map(conf => ({
    conferencia: conf.nome,
    equipes: sortByPoints(atleticasWithStats.filter(a => a.conferencia === conf.nome)),
  }))

  // Normalize upcoming games
  type RawUpcoming = {
    id: string
    equipe_a_id: string | null; equipe_b_id: string | null
    equipe_a_nome: string | null; equipe_b_nome: string | null
    inicio: string | null; fase: string | null; divisao: string | null
    modalidades: { nome: string; icone: string | null } | { nome: string; icone: string | null }[] | null
  }

  const upcoming = (rawUpcoming ?? []).map((j: RawUpcoming) => {
    const mod = Array.isArray(j.modalidades) ? j.modalidades[0] : j.modalidades
    return {
      id: j.id,
      equipe_a_id: j.equipe_a_id, equipe_b_id: j.equipe_b_id,
      equipe_a_nome: j.equipe_a_nome, equipe_b_nome: j.equipe_b_nome,
      inicio: j.inicio, fase: j.fase, divisao: j.divisao,
      modalidade_nome: mod?.nome ?? null, modalidade_icone: mod?.icone ?? null,
    }
  })

  return (
    <EsportivoClient
      div1={div1}
      div2={div2}
      super08={super08}
      upcoming={upcoming}
      totalJogos={encerrados.length}
      totalAtleticas={atleticas.length}
      aoVivoCount={aoVivoCount ?? 0}
    />
  )
}
