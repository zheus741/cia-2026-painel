import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from './actions'
import { LogOut, ChevronRight, Tv2 } from 'lucide-react'
import { HomeClient } from './HomeClient'
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

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  coordenacao: 'Coordenação',
  lider_area:  'Líder de área',
  operador:    'Operador',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, funcao_principal, foto_url')
    .eq('id', user.id)
    .maybeSingle()

  const isOperador = profile?.role === 'operador'
  const isCoord    = ['coordenacao', 'admin', 'lider_area'].includes(profile?.role ?? '')
  // Centro de Comandos (seção 04) visível para TODOS — dados sempre buscados

  // "Today" in Sao Paulo time; fall back to event day 1 during pre-event
  const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const today   = new Date().toISOString().slice(0, 10)

  // Fetch all data in parallel
  const [conteudosRes, diasRes, turnosRes, checklistsRes, weather] = await Promise.all([
    // All active conteudos (for health score + heatmap + bottleneck)
    supabase
      .from('conteudos')
      .select('id, status, tipo, dia_id')
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
          .select('id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, dia_id')
          .order('inicio'),

        // 3. Shows — todos os 4 dias do evento
        supabase
          .from('shows')
          .select('id, nome, inicio, fim_previsto, dia_id')
          .order('inicio'),

        // 4. Festas — todos os 4 dias do evento
        supabase
          .from('festas')
          .select('id, nome, inicio, fim_previsto, dia_id')
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
      ])

      coordConteudosHoje      = (contHojeRes.data   ?? []) as CoordConteudoHoje[]
      coordJogosHoje          = (jogosRes.data       ?? []) as CoordJogo[]
      coordShowsHoje          = (showsRes.data       ?? []) as CoordShow[]
      coordFestasHoje         = (festasRes.data      ?? []) as CoordFesta[]
      coordTurnosHoje         = (turnosRes.data      ?? []) as CoordTurnoCount[]
      coordPatrocinadores     = (patrocinadoresRes.data ?? []) as CoordPatrocinador[]
      coordConteudosPorPatroc = (contPatrocRes.data  ?? []) as { patrocinador_id: string | null; status: string }[]
      coordChecklistItens     = (ckItensRes.data     ?? []) as { id: string; status: string }[]
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

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-4 sm:px-6"
        style={{ background: 'var(--background)' }}
      >
        <CiaLogo />

        <div className="flex items-center gap-4">

          {/* Avatar → /perfil */}
          <Link href="/perfil" title="Meu perfil" className="group flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--green-bright)] transition-colors">
                {profile?.nome ?? user.email}
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                {profile?.role ? ROLE_LABEL[profile.role] : 'aguardando perfil'}
              </p>
            </div>
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--green-dim)] transition-all group-hover:ring-[var(--green)]"
              style={{ background: 'rgba(45,90,61,0.4)' }}>
              {profile?.foto_url ? (
                <Image
                  src={profile.foto_url}
                  alt={profile.nome ?? ''}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--green-bright)]">
                  {(profile?.nome ?? user.email ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>

          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-[rgba(46,107,66,0.10)]"
            style={{ borderColor: 'rgba(46,107,66,0.25)', color: '#2e6b42' }}
          >
            <Tv2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Modo TV</span>
          </a>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--gold-dim)] bg-[var(--gold-dim)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--gold)] transition-all hover:border-[var(--gold)] hover:bg-[var(--gold-dim)]/25"
          >
            Cadastros
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--destructive)]/50 hover:text-[var(--destructive)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* ── Main interactive content ─────────────────────────────────────── */}
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
      />
    </div>
  )
}
