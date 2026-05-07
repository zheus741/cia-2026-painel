import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TVDisplay } from './TVDisplay'

// ── WMO weather codes ──────────────────────────────────────────────────────────
function weatherEmoji(code: number): string {
  if (code === 0)  return '☀️'
  if (code <= 2)   return '🌤️'
  if (code <= 3)   return '☁️'
  if (code <= 48)  return '🌫️'
  if (code <= 57)  return '🌦️'
  if (code <= 67)  return '🌧️'
  if (code <= 77)  return '❄️'
  if (code <= 82)  return '🌦️'
  return '⛈️'
}

async function fetchWeather() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-19.7477&longitude=-47.9333' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode' +
      '&timezone=America%2FSao_Paulo&start_date=2026-06-04&end_date=2026-06-07',
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    const json = await res.json()
    if (!json?.daily?.time?.length) return null
    const d = json.daily
    return d.time.map((t: string, i: number) => ({
      date:  t,
      tMax:  Math.round(d.temperature_2m_max[i] ?? 0),
      tMin:  Math.round(d.temperature_2m_min[i] ?? 0),
      rain:  d.precipitation_probability_max[i] ?? 0,
      emoji: weatherEmoji(d.weathercode[i] ?? 0),
    }))
  } catch { return null }
}

const DAY_LABELS: Record<string, string> = {
  '2026-06-04': 'Qui · 04/06',
  '2026-06-05': 'Sex · 05/06',
  '2026-06-06': 'Sáb · 06/06',
  '2026-06-07': 'Dom · 07/06',
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function TVPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [
    diasRes,
    conteudosTodosRes,
    patrocinadoresRes,
    weatherData,
  ] = await Promise.all([
    supabase.from('dias_evento').select('id, data').order('data'),
    supabase.from('conteudos').select('id, status, tipo, dia_id, canal_publicacao, patrocinador_id').not('status', 'in', '(arquivado,cancelado)'),
    supabase.from('patrocinadores').select('id, nome, ativo').eq('ativo', true),
    fetchWeather(),
  ])

  const dias = (diasRes.data ?? []) as { id: string; data: string }[]
  const todayDia = dias.find(d => d.data === todaySP) ?? dias[0] ?? null
  const diaId = todayDia?.id ?? null

  // ── Day-specific data ─────────────────────────────────────────────────────
  const [
    jogosRes,
    showsRes,
    festasRes,
    turnosRes,
    ckInstsRes,
  ] = await Promise.all([
    supabase.from('jogos').select('id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, dia_id, status').order('inicio'),
    supabase.from('shows').select('id, nome, inicio, fim_previsto, dia_id').order('inicio'),
    supabase.from('festas').select('id, nome, inicio, fim_previsto, dia_id').order('inicio'),
    diaId
      ? supabase.from('turnos').select('user_id, setor_id').eq('dia_id', diaId)
      : Promise.resolve({ data: [] }),
    diaId
      ? supabase.from('checklist_instancias').select('id').eq('dia_id', diaId)
      : Promise.resolve({ data: [] }),
  ])

  const ckInstIds = (ckInstsRes.data ?? []).map((ci: { id: string }) => ci.id)
  const ckItensRes = ckInstIds.length > 0
    ? await supabase.from('checklist_itens').select('id, status').in('instancia_id', ckInstIds)
    : { data: [] }

  // ── Process ───────────────────────────────────────────────────────────────
  const allConteudos = (conteudosTodosRes.data ?? []) as {
    id: string; status: string; tipo: string
    dia_id: string | null; canal_publicacao: string | null; patrocinador_id: string | null
  }[]

  const diaMap = new Map(dias.map((d, i) => [d.id, i + 1]))

  // Conteúdos por dia (índice 1–4)
  const conteudosPorDia = [1, 2, 3, 4].map(idx => {
    const diaId_ = dias[idx - 1]?.id
    if (!diaId_) return { idx, total: 0, publicados: 0, label: DAY_LABELS[dias[idx-1]?.data ?? ''] ?? `Dia ${idx}` }
    const list = allConteudos.filter(c => c.dia_id === diaId_)
    return {
      idx,
      total:      list.length,
      publicados: list.filter(c => c.status === 'publicado').length,
      label:      DAY_LABELS[dias[idx - 1]?.data ?? ''] ?? `Dia ${idx}`,
    }
  })

  // Heatmap tipo × dia
  const heatAccum = new Map<string, number>()
  for (const c of allConteudos) {
    if (!c.tipo || !c.dia_id) continue
    const dayIdx = diaMap.get(c.dia_id)
    if (!dayIdx) continue
    const key = `${c.tipo}|${dayIdx}`
    heatAccum.set(key, (heatAccum.get(key) ?? 0) + 1)
  }

  // Canal breakdown (today)
  const conteudosHoje = diaId ? allConteudos.filter(c => c.dia_id === diaId) : []
  const canalMap: Record<string, { total: number; publicados: number }> = {}
  for (const c of conteudosHoje) {
    const key = c.canal_publicacao ?? 'outro'
    if (!canalMap[key]) canalMap[key] = { total: 0, publicados: 0 }
    canalMap[key].total++
    if (c.status === 'publicado') canalMap[key].publicados++
  }
  const canalBreakdown = Object.entries(canalMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([canal, counts]) => ({ canal, ...counts }))

  // Patrocínio
  const patrocinadores = (patrocinadoresRes.data ?? []) as { id: string; nome: string; ativo: boolean }[]
  const patrocStats = patrocinadores.filter(p => p.ativo).map(p => {
    const list = allConteudos.filter(c => c.patrocinador_id === p.id)
    return {
      id: p.id, nome: p.nome,
      total: list.length,
      publicados: list.filter(c => c.status === 'publicado').length,
    }
  }).filter(p => p.total > 0)

  // Content pipeline stats
  const pipelineStats = {
    total:        allConteudos.length,
    rascunho:     allConteudos.filter(c => c.status === 'rascunho').length,
    em_producao:  allConteudos.filter(c => ['em_andamento', 'pendente', 'pausado'].includes(c.status)).length,
    pronto:       allConteudos.filter(c => c.status === 'pronto').length,
    publicado:    allConteudos.filter(c => c.status === 'publicado').length,
  }

  // Equipe + checklist
  const turnos          = (turnosRes.data ?? []) as { user_id: string | null; setor_id: string | null }[]
  const equipeAtiva     = new Set(turnos.map(t => t.user_id).filter(Boolean)).size
  const setoresCobertos = new Set(turnos.map(t => t.setor_id).filter(Boolean)).size

  const ckItens     = (ckItensRes.data ?? []) as { id: string; status: string }[]
  const ckTotal     = ckItens.length
  const ckFeitos    = ckItens.filter(i => i.status === 'feito').length

  // Jogos ao vivo
  const now = new Date().toISOString()
  const jogos = (jogosRes.data ?? []) as {
    id: string; equipe_a_nome: string | null; equipe_b_nome: string | null
    inicio: string | null; fim_previsto: string | null; dia_id: string | null; status: string | null
  }[]
  const jogosAoVivo = jogos.filter(j =>
    j.inicio && j.fim_previsto && j.inicio <= now && j.fim_previsto >= now
  )

  const jogosHoje   = diaId ? jogos.filter(j => j.dia_id === diaId) : []
  const showsHoje   = diaId ? (showsRes.data ?? []).filter((s: { dia_id: string | null }) => s.dia_id === diaId) : []
  const festasHoje  = diaId ? (festasRes.data ?? []).filter((f: { dia_id: string | null }) => f.dia_id === diaId) : []

  return (
    <TVDisplay
      pipelineStats={pipelineStats}
      conteudosPorDia={conteudosPorDia}
      canalBreakdown={canalBreakdown}
      patrocStats={patrocStats}
      equipeAtiva={equipeAtiva}
      setoresCobertos={setoresCobertos}
      ckTotal={ckTotal}
      ckFeitos={ckFeitos}
      jogosHoje={jogosHoje}
      jogosAoVivo={jogosAoVivo}
      showsHoje={showsHoje as { id: string; nome: string; inicio: string | null; fim_previsto: string | null; dia_id: string | null }[]}
      festasHoje={festasHoje as { id: string; nome: string; inicio: string | null; fim_previsto: string | null; dia_id: string | null }[]}
      diasEvento={dias}
      diaAtualId={diaId}
      weatherData={weatherData}
    />
  )
}
