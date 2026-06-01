import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { createServiceClient } from '@/lib/supabase/service'
import { TermometroClient } from './TermometroClient'
import { PROGRAMA_INICIAL, type ProgramaConfig, type GradeItem, type ChecklistItem, type EquipeItem } from '../types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Termômetro · Broadcast CIA 2026' }

const PAPEIS = ['admin', 'coordenacao', 'lider_fv', 'lider_area', 'coordenador_esportivo']

export default async function TermometroPage() {
  const profile = await requireProfile()
  if (!PAPEIS.includes(profile.role ?? '')) redirect('/')

  const sb = createServiceClient()
  const [{ data: cfg }, { data: grade }, { data: checklist }, { data: equipe }] = await Promise.all([
    sb.from('broadcast_estado').select('id, ao_vivo, youtube_url, youtube_video_id, programa_titulo').eq('id', 'palco-principal').maybeSingle(),
    sb.from('broadcast_escaleta').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('broadcast_checklist').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('broadcast_equipe').select('*').eq('canal', 'palco-principal').order('ordem'),
  ])

  return (
    <TermometroClient
      config={(cfg as ProgramaConfig) ?? PROGRAMA_INICIAL}
      grade={(grade as GradeItem[]) ?? []}
      checklist={(checklist as ChecklistItem[]) ?? []}
      equipe={(equipe as EquipeItem[]) ?? []}
    />
  )
}
