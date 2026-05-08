import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WarRoomClient, type TurnoRow, type CapturaRow } from './WarRoomClient'

const DIAS = [
  { id: '00000000-0000-0001-0000-000000000001', label: 'D1', full: 'Quinta 04/jun',  data: '2026-06-04' },
  { id: '00000000-0000-0001-0000-000000000002', label: 'D2', full: 'Sexta 05/jun',   data: '2026-06-05' },
  { id: '00000000-0000-0001-0000-000000000003', label: 'D3', full: 'Sábado 06/jun',  data: '2026-06-06' },
  { id: '00000000-0000-0001-0000-000000000004', label: 'D4', full: 'Domingo 07/jun', data: '2026-06-07' },
]

function getDefaultDiaId(): string {
  const hoje = new Date().toISOString().slice(0, 10)
  const found = DIAS.find((d) => d.data === hoje)
  if (found) return found.id
  const futuro = DIAS.find((d) => d.data > hoje)
  return futuro?.id ?? DIAS[0]!.id
}

export default async function WarRoomPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'coordenacao'].includes(profile.role ?? '')) {
    redirect('/')
  }

  const defaultDiaId = getDefaultDiaId()

  // Fetch inicial do dia padrão
  const [turnosRes, conteudosRes, capturasRes] = await Promise.all([
    supabase
      .from('turnos')
      .select(`
        id, funcao, inicio, fim, status_escala, prioridade,
        user_id,
        user:profiles!user_id(id, nome, funcao_principal),
        setor:setores(id, nome)
      `)
      .eq('dia_id', defaultDiaId)
      .order('inicio'),

    supabase
      .from('conteudos')
      .select('id, status')
      .eq('dia_id', defaultDiaId),

    supabase
      .from('conteudos')
      .select('id, titulo, tipo, midia_draft_url, midia_draft_tipo, criado_em, criado_por, user:profiles!criado_por(nome)')
      .eq('dia_id', defaultDiaId)
      .eq('status', 'rascunho')
      .not('midia_draft_url', 'is', null)
      .order('criado_em', { ascending: false })
      .limit(20),
  ])

  function normTurno(r: Record<string, unknown>): TurnoRow {
    const u = Array.isArray(r.user) ? r.user[0] : r.user
    const s = Array.isArray(r.setor) ? r.setor[0] : r.setor
    return { ...r, user: u ?? null, setor: s ?? null } as unknown as TurnoRow
  }
  function normCaptura(r: Record<string, unknown>): CapturaRow {
    const u = Array.isArray(r.user) ? r.user[0] : r.user
    return { ...r, user: u ?? null } as unknown as CapturaRow
  }

  return (
    <WarRoomClient
      dias={DIAS}
      defaultDiaId={defaultDiaId}
      initialTurnos={(turnosRes.data ?? []).map(normTurno as never) as TurnoRow[]}
      initialConteudos={conteudosRes.data ?? []}
      initialCapturas={(capturasRes.data ?? []).map(normCaptura as never) as CapturaRow[]}
    />
  )
}
