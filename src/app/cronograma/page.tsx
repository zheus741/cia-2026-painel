import { createClient } from '@/lib/supabase/server'
import { CronogramaClient, type Evento } from './CronogramaClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cronograma · CIA 2026' }

/** Dias do evento. ID conhecido + datas calendar pra cálculo de "hoje". */
const DIAS = [
  { id: '00000000-0000-0001-0000-000000000001', label: 'Quinta',   short: '04/jun', date: '2026-06-04' },
  { id: '00000000-0000-0001-0000-000000000002', label: 'Sexta',    short: '05/jun', date: '2026-06-05' },
  { id: '00000000-0000-0001-0000-000000000003', label: 'Sábado',   short: '06/jun', date: '2026-06-06' },
  { id: '00000000-0000-0001-0000-000000000004', label: 'Domingo',  short: '07/jun', date: '2026-06-07' },
]

export default async function CronogramaPage() {
  const supabase = await createClient()

  const [showsRes, jogosRes, festasRes] = await Promise.all([
    supabase.from('shows').select(`
      id, nome, tipo, inicio, fim_previsto, embaixador,
      dia_id, setor:setores(nome)
    `).order('inicio'),
    supabase.from('jogos').select(`
      id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto,
      categoria, divisao, fase, status,
      dia_id,
      modalidade:modalidades(nome, icone),
      setor:setores(nome)
    `).order('inicio'),
    supabase.from('festas').select(`
      id, nome, tema, inicio, fim_previsto, dia_id, setor:setores(nome)
    `).order('inicio'),
  ])

  const eventos: Evento[] = []

  for (const s of showsRes.data ?? []) {
    if (!s.inicio || !s.dia_id) continue
    const setor = s.setor as unknown as { nome: string } | null
    eventos.push({
      id:      s.id,
      nome:    s.nome,
      tipo:    'show',
      subtipo: s.tipo === 'dj_set' ? 'DJ Set' : 'Show',
      inicio:  s.inicio,
      fim:     s.fim_previsto,
      local:   setor?.nome ?? null,
      dia_id:  s.dia_id,
      destaque: !!s.embaixador,  // embaixador = visual mais forte
      badge:   s.embaixador ? 'Embaixador' : null,
    })
  }

  for (const j of jogosRes.data ?? []) {
    if (!j.inicio || !j.dia_id) continue
    const setor = j.setor as unknown as { nome: string } | null
    const mod   = j.modalidade as unknown as { nome: string; icone: string } | null
    const titulo = j.equipe_a_nome && j.equipe_b_nome
      ? `${j.equipe_a_nome} × ${j.equipe_b_nome}`
      : (mod?.nome ?? 'Jogo')
    eventos.push({
      id:      j.id,
      nome:    titulo,
      tipo:    'jogo',
      subtipo: mod?.nome ?? null,
      icone:   mod?.icone ?? null,
      inicio:  j.inicio,
      fim:     j.fim_previsto,
      local:   setor?.nome ?? null,
      detalhe: [j.categoria, j.fase].filter(Boolean).join(' · ') || null,
      dia_id:  j.dia_id,
      destaque: j.status === 'ao_vivo',
      badge:   j.status === 'ao_vivo' ? 'AO VIVO' : null,
      href:    `/placar?dia=${j.dia_id}#jogo-${j.id}`,
    })
  }

  for (const f of festasRes.data ?? []) {
    if (!f.inicio || !f.dia_id) continue
    const setor = f.setor as unknown as { nome: string } | null
    eventos.push({
      id:      f.id,
      nome:    f.nome,
      tipo:    'festa',
      subtipo: f.tema ?? null,
      inicio:  f.inicio,
      fim:     f.fim_previsto,
      local:   setor?.nome ?? null,
      dia_id:  f.dia_id,
    })
  }

  // ordenar por horário globalmente (CronogramaClient agrupa por dia internamente)
  eventos.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())

  return (
    <CronogramaClient
      dias={DIAS}
      eventos={eventos}
    />
  )
}
