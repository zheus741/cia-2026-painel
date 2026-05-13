import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireProfile } from '@/lib/auth/current-user'
import { AgendaClient } from './AgendaClient'

// ── Fetchers cacheados (service client — sem dependência de cookie) ───────────

const fetchDias = unstable_cache(
  async () => {
    const { data } = await createServiceClient()
      .from('dias_evento')
      .select('id, nome_dia, data')
      .order('data')
    return data ?? []
  },
  ['agenda-dias'],
  { revalidate: 300, tags: ['agenda-dias'] },
)

const fetchJogos = unstable_cache(
  async () => {
    const { data } = await createServiceClient()
      .from('jogos')
      .select(`
        id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto,
        status, placar_a, placar_b,
        categoria, divisao, fase, dia_id, setor_id,
        modalidade:modalidade_id (nome, icone),
        setor:setor_id (nome)
      `)
      .order('inicio')
    return data ?? []
  },
  ['agenda-jogos'],
  { revalidate: 30, tags: ['agenda-jogos'] },
)

const fetchShows = unstable_cache(
  async () => {
    const { data } = await createServiceClient()
      .from('shows')
      .select('id, nome, tipo, inicio, fim_previsto, dia_id, setor_id, setor:setor_id (nome)')
      .order('inicio')
    return data ?? []
  },
  ['agenda-shows'],
  { revalidate: 300, tags: ['agenda-shows'] },
)

const fetchFestas = unstable_cache(
  async () => {
    const { data } = await createServiceClient()
      .from('festas')
      .select('id, nome, tema, inicio, fim_previsto, dia_id, setor_id, setor:setor_id (nome)')
      .order('inicio')
    return data ?? []
  },
  ['agenda-festas'],
  { revalidate: 300, tags: ['agenda-festas'] },
)

const fetchSetores = unstable_cache(
  async () => {
    const { data } = await createServiceClient()
      .from('setores')
      .select('id, nome, tem_youtube_live')
      .order('nome')
    return data ?? []
  },
  ['agenda-setores'],
  { revalidate: 300, tags: ['agenda-setores'] },
)

const fetchTurnos = unstable_cache(
  async () => {
    const { data } = await createServiceClient()
      .from('turnos')
      .select('setor_id, funcao, dia_id')
      .in('funcao', ['foto', 'video'])
      .not('setor_id', 'is', null)
    return data ?? []
  },
  ['agenda-turnos'],
  { revalidate: 120, tags: ['agenda-turnos'] },
)

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AgendaPage() {
  const profile = await requireProfile()

  const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const [dias, jogos, shows, festas, setores, turnos] = await Promise.all([
    fetchDias(),
    fetchJogos(),
    fetchShows(),
    fetchFestas(),
    fetchSetores(),
    fetchTurnos(),
  ])

  const todayDia = (dias as { id: string; data: string }[]).find(d => d.data === todaySP)
    ?? (dias[0] ?? null)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AgendaClient
        dias={dias as unknown as Parameters<typeof AgendaClient>[0]['dias']}
        jogos={jogos as unknown as Parameters<typeof AgendaClient>[0]['jogos']}
        shows={shows as unknown as Parameters<typeof AgendaClient>[0]['shows']}
        festas={festas as unknown as Parameters<typeof AgendaClient>[0]['festas']}
        setores={setores as unknown as Parameters<typeof AgendaClient>[0]['setores']}
        turnosCoberturaAV={turnos as unknown as Parameters<typeof AgendaClient>[0]['turnosCoberturaAV']}
        todayDiaId={(todayDia as { id: string } | null)?.id ?? null}
        userRole={profile.role}
      />
    </div>
  )
}
