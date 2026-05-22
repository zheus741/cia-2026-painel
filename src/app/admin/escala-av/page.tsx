import { createClient } from '@/lib/supabase/server'
import { EscalaAVGrid } from './EscalaAVGrid'
import type { Dia, Setor, Parceiro, ProfileAV, TurnoAV } from './EscalaAVGrid'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'

export const dynamic = 'force-dynamic'

export default async function EscalaAVPage() {
  const supabase = await createClient()

  const [
    { data: dias },
    { data: setores },
    { data: parceiros },
    { data: profiles },
    { data: turnos },
    { data: jogosSetores },
    { data: showsSetores },
    { data: festasSetores },
  ] = await Promise.all([
    supabase
      .from('dias_evento')
      .select('id, nome_dia, data')
      .order('data'),

    supabase
      .from('setores')
      .select('id, nome, tipo, nucleo, tem_wifi, tem_ponto_apoio, alimentacao, maps_url, notas_acesso')
      .order('nome'),

    supabase
      .from('parceiros')
      .select('id, nome, tipo, cor_hex')
      .eq('ativo', true)
      .order('nome'),

    // Colaboradores = operadores e líderes de Foto/Vídeo
    supabase
      .from('profiles')
      .select('id, nome, funcao_principal, empresa_cobertura, role')
      .in('role', ['operador_fv', 'lider_fv'])
      .eq('ativo', true)
      .order('nome'),

    supabase
      .from('turnos')
      .select(`
        id, dia_id, setor_id, funcao, user_id, prioridade, status_escala, parceiro_id,
        setor:setores(nome),
        user:profiles(id, nome, funcao_principal),
        parceiro:parceiros(nome, cor_hex)
      `)
      .in('funcao', ['foto', 'video']),

    supabase.from('jogos').select('dia_id, setor_id').not('setor_id', 'is', null),
    supabase.from('shows').select('dia_id, setor_id').not('setor_id', 'is', null),
    supabase.from('festas').select('dia_id, setor_id').not('setor_id', 'is', null),
  ])

  const eventosSetores = [
    ...(jogosSetores  ?? []),
    ...(showsSetores  ?? []),
    ...(festasSetores ?? []),
  ] as { dia_id: string; setor_id: string }[]

  return (
    <PageContainer size="wide" gap="default">
      <PageHeader
        eyebrow="Operacional · Mídia"
        title="Escala Foto & Vídeo"
        subtitle="Cobertura por setor — núcleos esportivo e festivo. O colaborador é notificado ao ser escalado."
      />

      <EscalaAVGrid
        dias={(dias ?? []) as Dia[]}
        setores={(setores ?? []) as Setor[]}
        parceiros={(parceiros ?? []) as Parceiro[]}
        profiles={(profiles ?? []) as ProfileAV[]}
        turnos={(turnos ?? []) as unknown as TurnoAV[]}
        eventosSetores={eventosSetores}
      />
    </PageContainer>
  )
}
