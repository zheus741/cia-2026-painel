import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { createServiceClient } from '@/lib/supabase/service'
import { PrepararClient } from './PrepararClient'
import type { VT, GradeItem, PatrocinadorRef, LineupShow } from '../types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Preparar · Broadcast CIA 2026' }

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'
const PAPEIS = ['admin', 'coordenacao', 'lider_fv', 'lider_area', 'coordenador_esportivo']

const DIAS = [
  { id: '00000000-0000-0001-0000-000000000001', label: 'Qui', data: '2026-06-04' },
  { id: '00000000-0000-0001-0000-000000000002', label: 'Sex', data: '2026-06-05' },
  { id: '00000000-0000-0001-0000-000000000003', label: 'Sáb', data: '2026-06-06' },
  { id: '00000000-0000-0001-0000-000000000004', label: 'Dom', data: '2026-06-07' },
]

export default async function PrepararPage() {
  const profile = await requireProfile()
  if (!PAPEIS.includes(profile.role ?? '')) redirect('/')

  const sb = createServiceClient()
  const [{ data: grade }, { data: vts }, { data: patrocs }, { data: cfg }, { data: shows }] = await Promise.all([
    sb.from('broadcast_escaleta').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('broadcast_vt').select('*').eq('canal', 'palco-principal').order('ordem'),
    sb.from('patrocinadores').select('id, nome, logo_url, cota, cor_marca').eq('ativo', true).eq('edicao_id', EDICAO_ID).order('cota'),
    sb.from('broadcast_estado').select('programa_titulo, youtube_url').eq('id', 'palco-principal').maybeSingle(),
    sb.from('shows').select('id, nome, inicio, fim_previsto, dia_id, embaixador, duracao_minutos, setor:setores(nome)').order('inicio'),
  ])

  // Line-up do Palco Principal
  type ShowRow = { id: string; nome: string; inicio: string | null; fim_previsto: string | null; dia_id: string | null; embaixador: boolean | null; duracao_minutos: number | null; setor: { nome: string } | { nome: string }[] | null }
  const lineup: LineupShow[] = ((shows ?? []) as ShowRow[])
    .filter(s => { const set = Array.isArray(s.setor) ? s.setor[0] : s.setor; return /PALCO PRINCIPAL/i.test(set?.nome ?? '') })
    .map(s => {
      const dur = s.inicio && s.fim_previsto ? Math.round((new Date(s.fim_previsto).getTime() - new Date(s.inicio).getTime()) / 1000) : (s.duracao_minutos ?? 30) * 60
      const diaIdx = DIAS.findIndex(d => d.id === s.dia_id) + 1
      return {
        id: s.id, nome: s.nome,
        horario: s.inicio ? new Date(s.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : null,
        duracao_seg: dur, embaixador: !!s.embaixador,
        dia: diaIdx > 0 ? diaIdx : 1,
      }
    })

  return (
    <PrepararClient
      grade={(grade as GradeItem[]) ?? []}
      vts={(vts as VT[]) ?? []}
      patrocinadores={(patrocs as PatrocinadorRef[]) ?? []}
      lineup={lineup}
      programaTitulo={(cfg?.programa_titulo as string) ?? ''}
      youtubeUrl={(cfg?.youtube_url as string) ?? ''}
    />
  )
}
