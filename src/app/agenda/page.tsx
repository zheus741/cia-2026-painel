import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { AgendaClient } from './AgendaClient'

export default async function AgendaPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const [diasRes, jogosRes, showsRes, festasRes, setoresRes, turnosRes] = await Promise.all([
    supabase
      .from('dias_evento')
      .select('id, nome_dia, data')
      .order('data'),

    supabase
      .from('jogos')
      .select(`
        id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto,
        status, placar_a, placar_b,
        categoria, divisao, fase, dia_id, setor_id,
        modalidade:modalidade_id (nome, icone),
        setor:setor_id (nome)
      `)
      .order('inicio'),

    supabase
      .from('shows')
      .select('id, nome, tipo, inicio, fim_previsto, dia_id, setor_id, setor:setor_id (nome)')
      .order('inicio'),

    supabase
      .from('festas')
      .select('id, nome, tema, inicio, fim_previsto, dia_id, setor_id, setor:setor_id (nome)')
      .order('inicio'),

    supabase
      .from('setores')
      .select('id, nome, tem_youtube_live')
      .order('nome'),

    // turnos foto/video para indicador de cobertura
    supabase
      .from('turnos')
      .select('setor_id, funcao, dia_id')
      .in('funcao', ['foto', 'video'])
      .not('setor_id', 'is', null),
  ])

  const dias         = (diasRes.data   ?? []) as { id: string; nome_dia: string; data: string }[]
  const todayDia     = dias.find(d => d.data === todaySP) ?? dias[0] ?? null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AgendaClient
        dias={dias}
        jogos={(jogosRes.data ?? []) as Parameters<typeof AgendaClient>[0]['jogos']}
        shows={(showsRes.data ?? []) as Parameters<typeof AgendaClient>[0]['shows']}
        festas={(festasRes.data ?? []) as Parameters<typeof AgendaClient>[0]['festas']}
        setores={(setoresRes.data ?? []) as Parameters<typeof AgendaClient>[0]['setores']}
        turnosCoberturaAV={(turnosRes.data ?? []) as Parameters<typeof AgendaClient>[0]['turnosCoberturaAV']}
        todayDiaId={todayDia?.id ?? null}
        userRole={profile.role}
      />
    </div>
  )
}
