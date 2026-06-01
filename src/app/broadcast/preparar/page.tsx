import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { createServiceClient } from '@/lib/supabase/service'
import { PrepararClient } from './PrepararClient'
import type { VT, EscaletaItem, ChecklistItem, PatrocinadorRef } from '../types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Preparar · Broadcast CIA 2026' }

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'
const PAPEIS = ['admin', 'coordenacao', 'lider_fv', 'lider_area', 'coordenador_esportivo']

export default async function PrepararPage() {
  const profile = await requireProfile()
  if (!PAPEIS.includes(profile.role ?? '')) redirect('/')

  const sb = createServiceClient()
  const [{ data: escaleta }, { data: vts }, { data: checklist }, { data: patrocs }] = await Promise.all([
    sb.from('broadcast_escaleta').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('broadcast_vt').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('broadcast_checklist').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('patrocinadores').select('id, nome, logo_url, cota, cor_marca').eq('ativo', true).eq('edicao_id', EDICAO_ID).order('cota'),
  ])

  return (
    <PrepararClient
      escaleta={(escaleta as EscaletaItem[]) ?? []}
      vts={(vts as VT[]) ?? []}
      checklist={(checklist as ChecklistItem[]) ?? []}
      patrocinadores={(patrocs as PatrocinadorRef[]) ?? []}
    />
  )
}
