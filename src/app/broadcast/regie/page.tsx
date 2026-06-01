import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { createServiceClient } from '@/lib/supabase/service'
import { RegieClient } from './RegieClient'
import { ESTADO_INICIAL, type BroadcastEstado, type PatrocinadorRef, type VT, type EscaletaItem } from '../types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Régie · Broadcast CIA 2026' }

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'
const PAPEIS = ['admin', 'coordenacao', 'lider_fv', 'lider_area', 'coordenador_esportivo']

export default async function RegiePage() {
  const profile = await requireProfile()
  if (!PAPEIS.includes(profile.role ?? '')) redirect('/')

  const sb = createServiceClient()
  const [{ data: estado }, { data: patrocs }, { data: shows }, { data: vts }, { data: escaleta }] = await Promise.all([
    sb.from('broadcast_estado').select('*').eq('id', 'palco-principal').maybeSingle(),
    sb.from('patrocinadores').select('id, nome, logo_url, cota, cor_marca').eq('ativo', true).eq('edicao_id', EDICAO_ID).order('cota'),
    sb.from('shows').select('id, nome, inicio, setor:setores(nome)').order('inicio'),
    sb.from('broadcast_vt').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('broadcast_escaleta').select('*').eq('canal', 'palco-principal').order('ordem'),
  ])

  // Filtra line-up do Palco Principal pra prefill rápido do GC
  type ShowRow = { id: string; nome: string; inicio: string | null; setor: { nome: string } | { nome: string }[] | null }
  const lineup = ((shows ?? []) as ShowRow[])
    .map(s => {
      const setor = Array.isArray(s.setor) ? s.setor[0] : s.setor
      return { id: s.id, nome: s.nome, inicio: s.inicio, setor: setor?.nome ?? '' }
    })
    .filter(s => /PALCO PRINCIPAL/i.test(s.setor) || /PALCO/i.test(s.setor))

  return (
    <RegieClient
      estadoInicial={(estado as BroadcastEstado) ?? ESTADO_INICIAL}
      patrocinadores={(patrocs as PatrocinadorRef[]) ?? []}
      lineup={lineup}
      vts={(vts as VT[]) ?? []}
      escaleta={(escaleta as EscaletaItem[]) ?? []}
    />
  )
}
