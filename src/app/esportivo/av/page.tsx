import { requireProfile } from '@/lib/auth/current-user'
import { createClient } from '@/lib/supabase/server'
import { AVGuiaClient } from './AVGuiaClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Guia AV · CIA 2026' }

const DIAS = [
  { id: '00000000-0000-0001-0000-000000000001', label: 'Quinta',  date: '2026-06-04', short: 'Qui 04/06' },
  { id: '00000000-0000-0001-0000-000000000002', label: 'Sexta',   date: '2026-06-05', short: 'Sex 05/06' },
  { id: '00000000-0000-0001-0000-000000000003', label: 'Sábado',  date: '2026-06-06', short: 'Sáb 06/06' },
  { id: '00000000-0000-0001-0000-000000000004', label: 'Domingo', date: '2026-06-07', short: 'Dom 07/06' },
]

export interface AVEvento {
  id: string
  nome: string
  tipo: 'individual' | 'coletivo'
  inicio: string
  fim: string | null
  setor_nome: string | null
  setor_id: string | null
  tem_live: boolean
  divisao?: string | null
  modalidade?: string | null
  equipe_a?: string | null
  equipe_b?: string | null
  dia_id: string
}

export interface AVPraca {
  setor_id: string | null
  setor_nome: string
  tem_live: boolean
  eventos: AVEvento[]
}

export default async function AVGuiaPage() {
  await requireProfile()
  const supabase = await createClient()

  const [showsRes, jogosRes, setoresRes] = await Promise.all([
    // Só modalidades individuais (tipo=null, marcadas com emoji no nome)
    supabase.from('shows').select('id, nome, inicio, fim_previsto, dia_id, setor:setores(id, nome, tem_youtube_live)').is('tipo', null).order('inicio'),
    supabase.from('jogos').select('id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, dia_id, divisao, modalidade:modalidades(nome), setor:setores(id, nome, tem_youtube_live)').not('setor_id', 'is', null).order('inicio'),
    supabase.from('setores').select('id, nome, tem_youtube_live, endereco, notas_acesso').eq('tipo', 'esportivo').order('nome'),
  ])

  const eventos: AVEvento[] = []

  // Modalidades individuais (shows com tipo=null — Natação, Judô, Peteca…)
  for (const s of showsRes.data ?? []) {
    if (!s.inicio || !s.dia_id) continue
    const set = (Array.isArray(s.setor) ? s.setor[0] : s.setor) as { id: string; nome: string; tem_youtube_live: boolean } | null
    eventos.push({
      id: s.id, nome: s.nome,
      tipo: 'individual',
      inicio: s.inicio, fim: s.fim_previsto,
      setor_nome: set?.nome ?? null,
      setor_id: set?.id ?? null,
      tem_live: set?.tem_youtube_live ?? false,
      dia_id: s.dia_id,
    })
  }

  for (const j of jogosRes.data ?? []) {
    if (!j.inicio || !j.dia_id) continue
    const set = (Array.isArray(j.setor) ? j.setor[0] : j.setor) as { id: string; nome: string; tem_youtube_live: boolean } | null
    const mod = (Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade) as { nome: string } | null
    eventos.push({
      id: j.id,
      nome: mod?.nome ?? 'Jogo',
      tipo: 'coletivo',
      inicio: j.inicio, fim: j.fim_previsto,
      setor_nome: set?.nome ?? null,
      setor_id: set?.id ?? null,
      tem_live: set?.tem_youtube_live ?? false,
      divisao: j.divisao,
      equipe_a: j.equipe_a_nome,
      equipe_b: j.equipe_b_nome,
      modalidade: mod?.nome,
      dia_id: j.dia_id,
    })
  }

  const setores = (setoresRes.data ?? []) as {
    id: string; nome: string; tem_youtube_live: boolean
    endereco: string | null; notas_acesso: string | null
  }[]

  return (
    <AVGuiaClient
      eventos={eventos}
      setores={setores}
      dias={DIAS}
    />
  )
}
