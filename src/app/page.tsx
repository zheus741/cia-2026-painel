import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { AppShell } from '@/components/app-shell'
import { HomeClient } from './HomeClient'
import { HomeEsportivo } from './HomeEsportivo'
import type {
  CoordConteudoHoje,
  CoordJogo,
  CoordShow,
  CoordFesta,
  CoordTurnoCount,
  CoordPatrocinador,
} from './CoordDashboard'

// ── WMO weather codes ─────────────────────────────────────────────────────────

function weatherInfo(code: number): { label: string; emoji: string } {
  if (code === 0)  return { label: 'Céu limpo',           emoji: '☀️' }
  if (code <= 2)   return { label: 'Parcialmente nublado', emoji: '🌤️' }
  if (code <= 3)   return { label: 'Nublado',              emoji: '☁️' }
  if (code <= 48)  return { label: 'Névoa',                emoji: '🌫️' }
  if (code <= 57)  return { label: 'Garoa',                emoji: '🌦️' }
  if (code <= 67)  return { label: 'Chuva',                emoji: '🌧️' }
  if (code <= 77)  return { label: 'Neve',                 emoji: '❄️' }
  if (code <= 82)  return { label: 'Pancadas',             emoji: '🌦️' }
  return { label: 'Tempestade', emoji: '⛈️' }
}

interface WeatherDaily {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_probability_max: number[]
  weathercode: number[]
}

async function fetchWeather(): Promise<WeatherDaily | null> {
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
    return json.daily as WeatherDaily
  } catch {
    return null
  }
}

const EVENT_START  = new Date('2026-06-04T00:00:00-03:00')
const DAY_LABELS   = ['Qui 04/06', 'Sex 05/06', 'Sáb 06/06', 'Dom 07/06']

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  // PERF: requireProfile() cacheado — economiza 240ms vs auth.getUser separado
  const profile = await requireProfile()
  const user = { id: profile.id }
  const supabase = await createClient()

  const isEsportivoRole = profile.role === 'coordenador_esportivo' || profile.role === 'operador_esportivo'

  // Early return para roles esportivos — home minimalista, sem buscar dados pesados
  if (isEsportivoRole) {
    const now        = new Date()
    const diffMs     = EVENT_START.getTime() - now.getTime()
    const diffDays   = Math.max(0, Math.ceil(diffMs / 86_400_000))
    const eventActive = now >= EVENT_START && now <= new Date('2026-06-08T00:00:00-03:00')

    return (
      <HomeEsportivo
        nome={profile.nome}
        role={profile.role}
        isCoordEsportivo={profile.role === 'coordenador_esportivo'}
        diffDays={diffDays}
        eventActive={eventActive}
      />
    )
  }

  const isOperador = profile.role === 'operador'
  const isCoord    = ['coordenacao', 'admin', 'lider_area'].includes(profile.role)
  // Centro de Comandos (seção 04) visível para TODOS — dados sempre buscados

  // "Today" in Sao Paulo time; fall back to event day 1 during pre-event
  const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const today   = new Date().toISOString().slice(0, 10)

  // Fetch all data in parallel
  const [conteudosRes, diasRes, turnosRes, checklistsRes, weather] = await Promise.all([
    // All active conteudos — inclui campos de análise
    supabase
      .from('conteudos')
      .select('id, status, tipo, dia_id, jogo_id, responsavel_captacao_id, responsavel_edicao_id')
      .not('status', 'in', '(arquivado,cancelado)'),

    // Event days to map dia_id → day index 1–4
    supabase
      .from('dias_evento')
      .select('id, data')
      .order('data'),

    // Operator: turnos today
    isOperador
      ? supabase
          .from('turnos')
          .select('id, inicio, fim, funcao, setor:setores(nome)')
          .eq('user_id', user.id)
          .gte('inicio', today + 'T00:00:00')
          .lte('inicio', today + 'T23:59:59')
          .order('inicio')
      : Promise.resolve({ data: [] as unknown[] }),

    // Operator: recent checklists
    isOperador
      ? supabase
          .from('checklist_instancias')
          .select(`
            id, nome_override,
            show:shows(nome), jogo:jogos(equipe_a_nome, equipe_b_nome),
            checklist_itens(id, status)
          `)
          .order('criado_em', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as unknown[] }),

    fetchWeather(),
  ])

  // ── Coord-only data ───────────────────────────────────────────────────────

  let coordConteudosHoje:         CoordConteudoHoje[]                                     = []
  let coordJogosHoje:             CoordJogo[]                                              = []
  let coordShowsHoje:             CoordShow[]                                              = []
  let coordFestasHoje:            CoordFesta[]                                             = []
  let coordTurnosHoje:            CoordTurnoCount[]                                        = []
  let coordPatrocinadores:        CoordPatrocinador[]                                      = []
  let coordConteudosPorPatroc:    { patrocinador_id: string | null; status: string }[]     = []
  let coordChecklistItens:        { id: string; status: string }[]                         = []
  let coordDiaAtualId:            string | null                                            = null
  let coordTurnosCoberturaAV:     { setor_id: string; funcao: string; dia_id: string }[]  = []
  let coordYoutubeSetorIds:       string[]                                                 = []

  // ── Analytics ─────────────────────────────────────────────────────────────
  let analyticsRanking:       { id: string; nome: string; total: number; publicados: number; funcao: string | null }[] = []
  let analyticsLacunas:       { id: string; label: string; hora: string; modalidade: string }[]                       = []
  let analyticsVolumePorHora: { hora: number; count: number }[]                                                       = []
  let analyticsAtleticas:     { nome: string; jogos: number; coberta: boolean }[]                                     = []

  {
    // Resolve dia_id for today (Sao Paulo). Fall back to first event day if not found.
    const { data: diasAll } = await supabase
      .from('dias_evento')
      .select('id, data')
      .order('data')

    const diasList = (diasAll ?? []) as { id: string; data: string }[]
    const todayDia = diasList.find(d => d.data === todaySP) ?? diasList[0] ?? null
    const diaId    = todayDia?.id ?? null
    coordDiaAtualId = diaId

    if (diaId) {
      const [
        contHojeRes,
        jogosRes,
        showsRes,
        festasRes,
        turnosRes,
        patrocinadoresRes,
        contPatrocRes,
        ckItensRes,
        turnosCoberturaAVRes,
        youtubeSetoresRes,
      ] = await Promise.all([
        // 1. Conteudos today by canal + status
        supabase
          .from('conteudos')
          .select('id, status, canal_publicacao')
          .eq('dia_id', diaId)
          .not('status', 'in', '(arquivado,cancelado)'),

        // 2. Jogos — todos os 4 dias do evento
        supabase
          .from('jogos')
          .select('id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, dia_id, modalidade_id, setor_id')
          .order('inicio'),

        // 3. Shows — todos os 4 dias do evento
        supabase
          .from('shows')
          .select('id, nome, inicio, fim_previsto, dia_id, setor_id')
          .order('inicio'),

        // 4. Festas — todos os 4 dias do evento
        supabase
          .from('festas')
          .select('id, nome, inicio, fim_previsto, dia_id, setor_id')
          .order('inicio'),

        // 5. Turnos today (distinct user_ids + setor_ids)
        supabase
          .from('turnos')
          .select('user_id, setor_id')
          .eq('dia_id', diaId),

        // 6. Patrocinadores
        supabase
          .from('patrocinadores')
          .select('id, nome, ativo')
          .eq('ativo', true),

        // 7. Conteudos linked to patrocinadores (for patrocinio card)
        supabase
          .from('conteudos')
          .select('patrocinador_id, status')
          .not('patrocinador_id', 'is', null)
          .not('status', 'in', '(arquivado,cancelado)'),

        // 8. Checklist items (all instancias for today's dia_id)
        supabase
          .from('checklist_itens')
          .select('id, status')
          .in(
            'instancia_id',
            await supabase
              .from('checklist_instancias')
              .select('id')
              .eq('dia_id', diaId)
              .then(r => (r.data ?? []).map((ci: { id: string }) => ci.id)),
          ),

        // 9. Turnos foto/video (todos os dias) — para indicadores de cobertura
        supabase
          .from('turnos')
          .select('setor_id, funcao, dia_id')
          .in('funcao', ['foto', 'video'])
          .not('setor_id', 'is', null),

        // 10. Setores com YouTube ao vivo
        supabase
          .from('setores')
          .select('id')
          .eq('tem_youtube_live', true),
      ])

      coordConteudosHoje      = (contHojeRes.data   ?? []) as CoordConteudoHoje[]
      coordJogosHoje          = (jogosRes.data       ?? []) as CoordJogo[]
      coordShowsHoje          = (showsRes.data       ?? []) as CoordShow[]
      coordFestasHoje         = (festasRes.data      ?? []) as CoordFesta[]
      coordTurnosHoje         = (turnosRes.data      ?? []) as CoordTurnoCount[]
      coordPatrocinadores     = (patrocinadoresRes.data ?? []) as CoordPatrocinador[]
      coordConteudosPorPatroc = (contPatrocRes.data  ?? []) as { patrocinador_id: string | null; status: string }[]
      coordChecklistItens     = (ckItensRes.data     ?? []) as { id: string; status: string }[]
      coordTurnosCoberturaAV  = (turnosCoberturaAVRes.data ?? []) as { setor_id: string; funcao: string; dia_id: string }[]
      coordYoutubeSetorIds    = ((youtubeSetoresRes.data ?? []) as { id: string }[]).map(s => s.id)

      // ── Analytics queries (paralelas) ────────────────────────────────────
      const [profilesRes, ckInstsComJogoRes, modalidadesRes] = await Promise.all([
        // Perfis para ranking de produtividade
        supabase.from('profiles').select('id, nome, funcao_principal').order('nome'),
        // Checklist instancias de hoje com jogo_id (para lacunas)
        supabase.from('checklist_instancias').select('jogo_id').eq('dia_id', diaId).not('jogo_id', 'is', null),
        // Modalidades para label dos jogos
        supabase.from('modalidades').select('id, nome'),
      ])

      const profilesList = (profilesRes.data ?? []) as { id: string; nome: string; funcao_principal: string | null }[]
      const profilesMap  = new Map(profilesList.map(p => [p.id, p]))
      const modalMap     = new Map(((modalidadesRes.data ?? []) as { id: string; nome: string }[]).map(m => [m.id, m.nome]))
      const allJogos     = coordJogosHoje  // já temos todos

      // 1. Ranking de produtividade
      const rankAccum = new Map<string, { total: Set<string>; publicados: Set<string> }>()
      for (const c of (conteudosRes.data ?? []) as { id: string; status: string; responsavel_captacao_id: string | null; responsavel_edicao_id: string | null }[]) {
        const ids = [c.responsavel_captacao_id, c.responsavel_edicao_id].filter(Boolean) as string[]
        const unique = new Set(ids)  // evita double-count se mesma pessoa em dois papéis
        for (const uid of unique) {
          if (!rankAccum.has(uid)) rankAccum.set(uid, { total: new Set(), publicados: new Set() })
          const entry = rankAccum.get(uid)!
          entry.total.add(c.id)
          if (c.status === 'publicado') entry.publicados.add(c.id)
        }
      }
      analyticsRanking = Array.from(rankAccum.entries())
        .map(([id, sets]) => {
          const p = profilesMap.get(id)
          return {
            id,
            nome:       p?.nome       ?? 'Desconhecido',
            funcao:     p?.funcao_principal ?? null,
            total:      sets.total.size,
            publicados: sets.publicados.size,
          }
        })
        .filter(r => r.total > 0)
        .sort((a, b) => b.publicados - a.publicados || b.total - a.total)
        .slice(0, 12)

      // 2. Lacunas de cobertura — jogos sem checklist hoje
      const jogosComCk = new Set((ckInstsComJogoRes.data ?? []).map((ci: { jogo_id: string }) => ci.jogo_id))
      const jogosHojeList = allJogos.filter(j => j.dia_id === diaId)
      analyticsLacunas = jogosHojeList
        .filter(j => !jogosComCk.has(j.id))
        .slice(0, 15)
        .map(j => {
          const hora = j.inicio ? new Date(j.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—'
          return {
            id:         j.id,
            label:      `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
            hora,
            modalidade: j.modalidade_id ? (modalMap.get(j.modalidade_id) ?? '') : '',
          }
        })

      // 3. Volume de jogos por hora
      const horaAccum = new Map<number, number>()
      for (const j of jogosHojeList) {
        if (!j.inicio) continue
        const h = new Date(j.inicio).getHours()
        horaAccum.set(h, (horaAccum.get(h) ?? 0) + 1)
      }
      analyticsVolumePorHora = Array.from(horaAccum.entries())
        .map(([hora, count]) => ({ hora, count }))
        .sort((a, b) => a.hora - b.hora)

      // 4. Cobertura por atlética
      const conteudoComJogo = (conteudosRes.data ?? []) as { id: string; status: string; jogo_id: string | null }[]
      const jogosComConteudo = new Set(conteudoComJogo.filter(c => c.jogo_id).map(c => c.jogo_id!))
      const atleticaJogos   = new Map<string, number>()
      const atleticaCoberta = new Set<string>()
      for (const j of allJogos) {
        if (j.equipe_a_nome) atleticaJogos.set(j.equipe_a_nome, (atleticaJogos.get(j.equipe_a_nome) ?? 0) + 1)
        if (j.equipe_b_nome) atleticaJogos.set(j.equipe_b_nome, (atleticaJogos.get(j.equipe_b_nome) ?? 0) + 1)
        if (jogosComConteudo.has(j.id)) {
          if (j.equipe_a_nome) atleticaCoberta.add(j.equipe_a_nome)
          if (j.equipe_b_nome) atleticaCoberta.add(j.equipe_b_nome)
        }
      }
      analyticsAtleticas = Array.from(atleticaJogos.entries())
        .map(([nome, jogos]) => ({ nome, jogos, coberta: atleticaCoberta.has(nome) }))
        .sort((a, b) => Number(b.coberta) - Number(a.coberta) || b.jogos - a.jogos)
    }
  }

  // ── Process content stats ─────────────────────────────────────────────────

  const allConteudos = (conteudosRes.data ?? []) as {
    id: string
    status: string
    tipo: string
    dia_id: string | null
  }[]

  const contentStats = {
    total:       allConteudos.length,
    rascunho:    allConteudos.filter(c => c.status === 'rascunho').length,
    em_producao: allConteudos.filter(c => c.status === 'em_producao').length,
    publicado:   allConteudos.filter(c => c.status === 'publicado').length,
  }

  // ── Build heatmap data (tipo × event-day index) ───────────────────────────

  const diasSorted = (diasRes.data ?? []) as { id: string; data: string }[]
  // Sort by data just in case
  diasSorted.sort((a, b) => a.data.localeCompare(b.data))
  const diaMap = new Map(diasSorted.map((d, i) => [d.id, i + 1]))

  const heatAccum = new Map<string, number>()
  for (const c of allConteudos) {
    if (!c.tipo || !c.dia_id) continue
    const dayIdx = diaMap.get(c.dia_id)
    if (!dayIdx) continue
    // tipo may be comma-separated (multi-tag), count each independently
    for (const t of c.tipo.split(',').map((s: string) => s.trim()).filter(Boolean)) {
      const key = `${t}|${dayIdx}`
      heatAccum.set(key, (heatAccum.get(key) ?? 0) + 1)
    }
  }

  const heatmapData = Array.from(heatAccum.entries()).map(([key, count]) => {
    const [tipo, diaStr] = key.split('|')
    return { tipo, dia: Number(diaStr), count }
  })

  // ── Process weather ───────────────────────────────────────────────────────

  const weatherDays = weather
    ? DAY_LABELS.map((label, i) => ({
        label,
        tMax:  Math.round(weather.temperature_2m_max[i]               ?? 0),
        tMin:  Math.round(weather.temperature_2m_min[i]               ?? 0),
        rain:  weather.precipitation_probability_max[i]               ?? 0,
        emoji: weatherInfo(weather.weathercode[i]                     ?? 0).emoji,
      }))
    : null

  // ── Countdown ─────────────────────────────────────────────────────────────

  const now      = new Date()
  const diffMs   = EVENT_START.getTime() - now.getTime()
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const eventActive = diffDays === 0

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppShell fullWidth>
    <div className="relative flex flex-1 flex-col overflow-hidden cia-bg">

      {/* Dot grid — very subtle */}
      <div className="cia-dot-grid pointer-events-none absolute inset-0 opacity-100" />

      {/* Giroscópio watermark */}
      <div className="pointer-events-none absolute -right-28 -top-28 select-none">
        <div className="cia-spin-slow cia-pulse-glow">
          <Image
            src="/assets/giroscopio.png"
            alt=""
            width={480}
            height={480}
            style={{
              filter: 'invert(1) hue-rotate(100deg) saturate(1.5)',
              mixBlendMode: 'screen',
              opacity: 0.04,
            }}
          />
        </div>
      </div>

      {/* ── Main interactive content (header agora vem do AppShell) ─────── */}
      <HomeClient
        profile={profile}
        contentStats={contentStats}
        heatmapData={heatmapData}
        turnosHoje={(turnosRes.data ?? []) as Parameters<typeof HomeClient>[0]['turnosHoje']}
        checklistsAtivos={(checklistsRes.data ?? []) as Parameters<typeof HomeClient>[0]['checklistsAtivos']}
        diffDays={diffDays}
        eventActive={eventActive}
        weatherDays={weatherDays}
        isCoord={isCoord}
        isOperador={isOperador}
        coordConteudosHoje={coordConteudosHoje}
        coordJogosHoje={coordJogosHoje}
        coordShowsHoje={coordShowsHoje}
        coordFestasHoje={coordFestasHoje}
        coordTurnosHoje={coordTurnosHoje}
        coordPatrocinadores={coordPatrocinadores}
        coordConteudosPorPatrocinador={coordConteudosPorPatroc}
        coordChecklistItens={coordChecklistItens}
        coordDiasEvento={diasSorted}
        coordDiaAtualId={coordDiaAtualId}
        coordTurnosCoberturaAV={coordTurnosCoberturaAV}
        coordYoutubeSetorIds={coordYoutubeSetorIds}
        analyticsRanking={analyticsRanking}
        analyticsLacunas={analyticsLacunas}
        analyticsVolumePorHora={analyticsVolumePorHora}
        analyticsAtleticas={analyticsAtleticas}
      />
    </div>
    </AppShell>
  )
}
