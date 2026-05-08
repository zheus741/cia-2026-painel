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
    supabase.from('conteudos')
      .select('id, status, tipo, titulo, dia_id, canal_publicacao, patrocinador_id')
      .not('status', 'in', '(arquivado,cancelado)'),
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
    capturasRes,
  ] = await Promise.all([
    supabase.from('jogos')
      .select('id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, dia_id, status, placar_a, placar_b')
      .order('inicio'),
    supabase.from('shows').select('id, nome, inicio, fim_previsto, dia_id').order('inicio'),
    supabase.from('festas').select('id, nome, inicio, fim_previsto, dia_id').order('inicio'),
    diaId
      ? supabase.from('turnos')
          .select('user_id, setor_id, status_escala, user:profiles!user_id(nome), setor:setores(id, nome)')
          .eq('dia_id', diaId)
      : Promise.resolve({ data: [] }),
    diaId
      ? supabase.from('checklist_instancias').select('id').eq('dia_id', diaId)
      : Promise.resolve({ data: [] }),
    diaId
      ? supabase.from('conteudos')
          .select('id')
          .eq('dia_id', diaId)
          .eq('status', 'rascunho')
          .not('midia_draft_url', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const ckInstIds = (ckInstsRes.data ?? []).map((ci: { id: string }) => ci.id)
  const ckItensRes = ckInstIds.length > 0
    ? await supabase.from('checklist_itens').select('id, status').in('instancia_id', ckInstIds)
    : { data: [] }

  // ── Process conteúdos ─────────────────────────────────────────────────────
  const allConteudos = (conteudosTodosRes.data ?? []) as {
    id: string; status: string; tipo: string; titulo: string | null
    dia_id: string | null; canal_publicacao: string | null; patrocinador_id: string | null
  }[]

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

  // Pipeline stats
  const pipelineStats = {
    total:        allConteudos.length,
    rascunho:     allConteudos.filter(c => c.status === 'rascunho').length,
    em_producao:  allConteudos.filter(c => ['em_andamento', 'pendente', 'pausado'].includes(c.status)).length,
    pronto:       allConteudos.filter(c => c.status === 'pronto').length,
    publicado:    allConteudos.filter(c => c.status === 'publicado').length,
  }

  // ── Process turnos ────────────────────────────────────────────────────────
  type RawTurno = {
    user_id: string | null; setor_id: string | null; status_escala: string | null
    user: unknown; setor: unknown
  }
  const rawTurnos = (turnosRes.data ?? []) as RawTurno[]
  const turnos = rawTurnos.map(r => ({
    user_id:       r.user_id,
    setor_id:      r.setor_id,
    status_escala: r.status_escala,
    user:  (Array.isArray(r.user)  ? r.user[0]  : r.user)  as { nome: string | null } | null,
    setor: (Array.isArray(r.setor) ? r.setor[0] : r.setor) as { id: string; nome: string | null } | null,
  }))

  const equipeAtiva     = new Set(turnos.map(t => t.user_id).filter(Boolean)).size
  const setoresCobertos = new Set(turnos.map(t => t.setor_id).filter(Boolean)).size

  // Em campo agora
  const emCampo = turnos
    .filter(t => t.status_escala === 'em_campo' && t.user?.nome)
    .map(t => ({ nome: t.user!.nome!, setor: t.setor?.nome ?? '—' }))

  // Setores frios: têm turno hoje mas nenhum em_campo
  const setoresComTurno  = new Set(turnos.map(t => t.setor_id).filter(Boolean) as string[])
  const setoresEmCampoSet = new Set(
    turnos.filter(t => t.status_escala === 'em_campo').map(t => t.setor_id).filter(Boolean) as string[]
  )
  const setoresFrios = [...setoresComTurno]
    .filter(id => !setoresEmCampoSet.has(id))
    .map(id => turnos.find(t => t.setor_id === id)?.setor?.nome ?? id)
    .filter((v, i, a) => a.indexOf(v) === i)

  // Capturas pendentes
  const capturasCount = (capturasRes.data ?? []).length

  // Velocidade: publicados hoje / horas desde meia-noite SP
  const publicadosHojeCount = conteudosPorDia.find(d => dias[d.idx - 1]?.id === diaId)?.publicados ?? 0
  const midnightMs   = new Date(todaySP + 'T00:00:00-03:00').getTime()
  const hoursElapsed = Math.max(1, (Date.now() - midnightMs) / 3_600_000)
  const velocidade   = parseFloat((publicadosHojeCount / hoursElapsed).toFixed(1))

  // Ticker: últimos publicados hoje
  const recentPublicados = allConteudos
    .filter(c => c.status === 'publicado' && c.dia_id === diaId)
    .slice(-12)
    .map(c => ({ id: c.id, titulo: c.titulo, canal: c.canal_publicacao }))

  // ── Checklist ─────────────────────────────────────────────────────────────
  const ckItens  = (ckItensRes.data ?? []) as { id: string; status: string }[]
  const ckTotal  = ckItens.length
  const ckFeitos = ckItens.filter(i => i.status === 'feito').length

  // ── Jogos ─────────────────────────────────────────────────────────────────
  const jogos = (jogosRes.data ?? []) as {
    id: string; equipe_a_nome: string | null; equipe_b_nome: string | null
    inicio: string | null; fim_previsto: string | null; dia_id: string | null
    status: string | null; placar_a: number | null; placar_b: number | null
  }[]
  const jogosAoVivo = jogos.filter(j => j.status === 'ao_vivo')
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
      emCampo={emCampo}
      setoresFrios={setoresFrios}
      capturasCount={capturasCount}
      velocidade={velocidade}
      recentPublicados={recentPublicados}
    />
  )
}
