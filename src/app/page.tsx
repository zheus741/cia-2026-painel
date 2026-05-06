import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from './actions'
import {
  Calendar, Map, Users, Trophy, Music, Camera, Swords,
  Network, BookOpen, Cloud, Lightbulb, Heart,
  ChevronRight, LogOut, Droplets, CheckSquare, ClipboardList,
  AlertCircle, TrendingUp, Zap,
} from 'lucide-react'

// ── WMO weather codes ────────────────────────────────────────────────────────
function weatherInfo(code: number): { label: string; emoji: string } {
  if (code === 0)  return { label: 'Céu limpo',          emoji: '☀️' }
  if (code <= 2)   return { label: 'Parcialmente nublado', emoji: '🌤️' }
  if (code <= 3)   return { label: 'Nublado',             emoji: '☁️' }
  if (code <= 48)  return { label: 'Névoa',               emoji: '🌫️' }
  if (code <= 57)  return { label: 'Garoa',               emoji: '🌦️' }
  if (code <= 67)  return { label: 'Chuva',               emoji: '🌧️' }
  if (code <= 77)  return { label: 'Neve',                emoji: '❄️' }
  if (code <= 82)  return { label: 'Pancadas',            emoji: '🌦️' }
  return { label: 'Tempestade', emoji: '⛈️' }
}

const EVENT_START = new Date('2026-06-04T00:00:00-03:00')
const DAY_LABELS  = ['Qui 04/06', 'Sex 05/06', 'Sáb 06/06', 'Dom 07/06']

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
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (!json?.daily?.time?.length) return null
    return json.daily as WeatherDaily
  } catch {
    return null
  }
}

// ── Modules ──────────────────────────────────────────────────────────────────
const modules = [
  { icon: Camera,       label: 'Conteúdos',     desc: 'Kanban da produção — 500+ cards', href: '/conteudos',           ready: true  },
  { icon: CheckSquare,  label: 'Checklists',    desc: 'Cobertura por jogo/show/festa',   href: '/checklist',           ready: true  },
  { icon: ClipboardList,label: 'Escala',        desc: 'Pessoa × função × turno',         href: '/admin/escala',        ready: true  },
  { icon: Swords,       label: 'Jogos',         desc: 'Tabela e placar ao vivo',         href: '/admin/jogos',         ready: true  },
  { icon: Map,          label: 'Mapa',          desc: 'Setores e equipe em campo',       href: '/mapa',                ready: true  },
  { icon: Music,        label: 'Shows & Festas',desc: 'Rundown ao vivo',                 href: '/admin/shows',         ready: true  },
  { icon: Heart,        label: 'Patrocinadores',desc: 'Escopo e entregas',               href: '/admin/patrocinadores',ready: true  },
  { icon: Trophy,       label: 'Modalidades',   desc: 'Esportivas + cheer + bateria',    href: '/admin/modalidades',   ready: true  },
  { icon: Lightbulb,    label: 'Pautas',        desc: 'Roaming e ideias do campo',       href: '/pautas',              ready: true  },
  { icon: BookOpen,     label: 'Wiki',          desc: 'Briefings por função',            href: '/wiki',                ready: true  },
  { icon: Calendar,     label: 'Cronograma',    desc: 'Programação completa do evento',  href: '/cronograma',          ready: true  },
  { icon: Network,      label: 'Redes',         desc: 'Dashboard real-time',             href: '/redes',               ready: true  },
  { icon: Cloud,        label: 'Clima',         desc: 'Previsão por dia de evento',      href: null,                   ready: false },
]

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, funcao_principal')
    .eq('id', user.id)
    .maybeSingle()

  const isOperador = profile?.role === 'operador'
  const isCoord    = profile?.role === 'coordenacao' || profile?.role === 'admin' || profile?.role === 'lider_area'

  // Dados para dashboard operador
  const today = new Date().toISOString().slice(0, 10)
  const [turnosHoje, checklistsAtivos, statsConteudo] = await Promise.all([
    isOperador
      ? supabase.from('turnos').select('id, inicio, fim, funcao, setor:setores(nome)')
          .eq('user_id', user.id)
          .gte('inicio', today + 'T00:00:00')
          .lte('inicio', today + 'T23:59:59')
          .order('inicio')
      : Promise.resolve({ data: [] }),
    isOperador
      ? supabase.from('checklist_instancias').select(`
          id, nome_override,
          show:shows(nome), jogo:jogos(equipe_a_nome, equipe_b_nome),
          checklist_itens(id, status)
        `).order('criado_em', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    isCoord
      ? supabase.from('conteudos').select('id, status', { count: 'exact' })
      : Promise.resolve({ data: [], count: 0 }),
  ])

  const roleLabel: Record<string, string> = {
    admin:        'Admin',
    coordenacao:  'Coordenação',
    lider_area:   'Líder de área',
    operador:     'Operador',
  }

  // Countdown
  const now         = new Date()
  const diffMs      = EVENT_START.getTime() - now.getTime()
  const diffDays    = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const eventActive = diffDays === 0

  // Weather
  const weather = await fetchWeather()

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden cia-bg">

      {/* ── Atmosfera de fundo ─────────────────────────────────────────── */}
      <div className="cia-dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="cia-bg-stars pointer-events-none absolute inset-0 opacity-50" />

      {/* Giroscópio watermark */}
      <div className="pointer-events-none absolute -right-32 -top-32 select-none">
        <div className="cia-spin-slow cia-pulse-glow">
          <Image src="/assets/giroscopio.png" alt="" width={520} height={520}
            style={{ filter: 'invert(1) hue-rotate(100deg) saturate(1.5)', mixBlendMode: 'screen', opacity: 0.10 }} />
        </div>
      </div>

      {/* Torres */}
      <div className="pointer-events-none absolute bottom-0 right-0 select-none">
        <Image src="/assets/torres.png" alt="" width={180} height={440}
          className="opacity-[0.12]"
          style={{ filter: 'brightness(0.5) saturate(0.7)' }} />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-6"
        style={{ background: 'rgba(6,12,7,0.85)', backdropFilter: 'blur(20px)' }}>
        <CiaLogo />

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {profile?.nome ?? user.email}
            </p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              {profile?.role ? roleLabel[profile.role] : 'aguardando perfil'}
            </p>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--gold-dim)] bg-[var(--gold-dim)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--gold)] transition-all hover:bg-[var(--gold-dim)]/25 hover:border-[var(--gold)]"
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

      {/* ── Conteúdo principal ──────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 px-6 py-10">
        <div className="mx-auto max-w-6xl">

          {/* Hero */}
          <div className="mb-8 cia-fade-in">
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--gold)' }}>
              Copa Inter Atléticas 2026 · Uberaba/MG
            </p>
            <h1
              className="mt-2 text-4xl font-bold tracking-tight cia-gold-text"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Painel da CIA
            </h1>
            <div className="cia-gold-rule mt-3 w-48" />
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              04–07 de junho · Central de comando da cobertura audiovisual
            </p>
          </div>

          {/* ── Widgets row ─────────────────────────────────────────────── */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">

            {/* Countdown */}
            <div className="cia-glass rounded-xl border border-[var(--border)] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Contagem regressiva
              </p>
              {eventActive ? (
                <p className="mt-2 text-2xl font-bold cia-green-text" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  🟢 AO VIVO
                </p>
              ) : (
                <>
                  <p className="mt-1 text-4xl font-bold cia-gold-text" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {diffDays}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {diffDays === 1 ? 'dia para o evento' : 'dias para o evento'}
                  </p>
                </>
              )}
              <div className="mt-3 cia-gold-rule" />
              <p className="mt-2 text-[10px] text-[var(--muted-foreground)]/70">
                04 jun 2026 · Uberaba, MG
              </p>
            </div>

            {/* Weather */}
            <div className="cia-glass col-span-2 rounded-xl border border-[var(--border)] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Previsão · Uberaba/MG — dias do evento
              </p>
              {weather ? (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {DAY_LABELS.map((day, i) => {
                    const code  = weather.weathercode[i] ?? 0
                    const info  = weatherInfo(code)
                    const tMax  = Math.round(weather.temperature_2m_max[i] ?? 0)
                    const tMin  = Math.round(weather.temperature_2m_min[i] ?? 0)
                    const rain  = weather.precipitation_probability_max[i] ?? 0
                    return (
                      <div key={day} className="rounded-lg border border-[var(--border)] bg-[var(--card)]/60 p-2.5 text-center">
                        <p className="text-[10px] font-semibold text-[var(--muted-foreground)]">{day}</p>
                        <p className="my-1 text-xl">{info.emoji}</p>
                        <p className="text-xs font-semibold text-[var(--foreground)]">{tMax}° / {tMin}°</p>
                        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                          <Droplets className="h-2.5 w-2.5" />
                          {rain}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                  <Cloud className="h-8 w-8 opacity-40" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Previsão indisponível</p>
                    <p className="text-xs opacity-70">Modelos meteorológicos cobrem até ~14 dias. Disponível a partir de 21/mai.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Perfil do usuário ────────────────────────────────────────── */}
          {profile && (
            <div className="mb-8 flex items-center gap-4 rounded-xl border border-[var(--green-dim)]/30 bg-[var(--card)]/40 px-5 py-3.5 backdrop-blur-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--green-dim)] bg-[var(--green-dim)]/20 text-sm font-bold text-[var(--green-bright)]">
                {(profile.nome ?? user.email ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{profile.nome ?? user.email}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {profile.role ? roleLabel[profile.role] : '—'}
                  {profile.funcao_principal ? ` · ${profile.funcao_principal}` : ''}
                </p>
              </div>
              <Link
                href="/admin"
                className="ml-auto flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Área admin <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* ── Dashboard Operador ──────────────────────────────────────── */}
          {isOperador && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">

              {/* Minha escala hoje */}
              <div className="cia-glass rounded-xl border border-[var(--border)] px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-3">
                  Minha escala hoje
                </p>
                {(turnosHoje.data ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Sem turnos agendados para hoje.</p>
                ) : (
                  <ul className="space-y-2">
                    {(turnosHoje.data as {
                      id: string; inicio: string; fim: string;
                      funcao: string; setor: { nome: string } | null
                    }[]).map((t) => (
                      <li key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2">
                        <div className="h-2 w-2 rounded-full bg-[var(--green-bright)] shadow-[0_0_6px_rgba(106,184,126,0.8)]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold capitalize">{t.funcao.replace(/_/g, ' ')}</p>
                          {t.setor && <p className="text-[10px] text-[var(--muted-foreground)]">{t.setor.nome}</p>}
                        </div>
                        <p className="text-[10px] tabular-nums text-[var(--muted-foreground)]">
                          {new Date(t.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–
                          {new Date(t.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Checklists ativos */}
              <div className="cia-glass rounded-xl border border-[var(--border)] px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Checklists ativos
                  </p>
                  <Link href="/checklist" className="text-[10px] text-[var(--accent)] hover:underline">
                    Ver todos
                  </Link>
                </div>
                {(checklistsAtivos.data ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Nenhum checklist criado.</p>
                ) : (
                  <ul className="space-y-2">
                    {(checklistsAtivos.data as {
                      id: string; nome_override: string | null;
                      show: { nome: string } | null;
                      jogo: { equipe_a_nome: string; equipe_b_nome: string } | null;
                      checklist_itens: { id: string; status: string }[]
                    }[]).map((inst) => {
                      const itens = inst.checklist_itens ?? []
                      const feitos = itens.filter((i) => i.status === 'feito').length
                      const pct = itens.length > 0 ? Math.round((feitos / itens.length) * 100) : 0
                      const titulo = inst.nome_override
                        ?? inst.show?.nome
                        ?? (inst.jogo ? `${inst.jogo.equipe_a_nome} × ${inst.jogo.equipe_b_nome}` : null)
                        ?? 'Checklist'
                      return (
                        <li key={inst.id}>
                          <Link href={`/checklist/${inst.id}`} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2 hover:border-[var(--accent)] transition-colors">
                            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                            <span className="flex-1 truncate text-xs font-medium">{titulo}</span>
                            <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]">{pct}%</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── Dashboard Coordenação / Admin ────────────────────────────── */}
          {isCoord && (() => {
            const todos = (statsConteudo.data ?? []) as { id: string; status: string }[]
            const total = todos.length
            const publicados = todos.filter((c) => c.status === 'publicado').length
            const em_producao = todos.filter((c) => c.status === 'em_producao').length
            const rascunho = todos.filter((c) => c.status === 'rascunho').length
            const pct = total > 0 ? Math.round((publicados / total) * 100) : 0
            const health =
              pct >= 70 ? { label: 'Cobertura saudável', color: 'text-[var(--green-bright)]', icon: TrendingUp } :
              pct >= 40 ? { label: 'Atenção necessária', color: 'text-yellow-400', icon: AlertCircle } :
                          { label: 'Risco de entrega',   color: 'text-red-400',    icon: Zap }

            return (
              <div className="mb-8 grid gap-4 sm:grid-cols-3">

                {/* Health Score */}
                <div className="cia-glass rounded-xl border border-[var(--border)] px-5 py-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-3">
                    Health Score
                  </p>
                  <div className="flex items-center gap-2">
                    <health.icon className={`h-5 w-5 ${health.color}`} />
                    <p className={`text-sm font-semibold ${health.color}`}>{health.label}</p>
                  </div>
                  <p className={`mt-1 text-3xl font-bold tabular-nums ${health.color}`}
                     style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {pct}%
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 70 ? 'var(--green-bright)' : pct >= 40 ? '#FACC15' : '#F87171',
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                    {publicados}/{total} conteúdos publicados
                  </p>
                </div>

                {/* Kanban summary */}
                <div className="cia-glass rounded-xl border border-[var(--border)] px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      Kanban
                    </p>
                    <Link href="/conteudos" className="text-[10px] text-[var(--accent)] hover:underline">
                      Abrir
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Rascunho',     count: rascunho,    color: 'bg-gray-500'   },
                      { label: 'Em produção',  count: em_producao, color: 'bg-blue-500'   },
                      { label: 'Publicados',   count: publicados,  color: 'bg-[var(--green-bright)]' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${color}`} />
                        <span className="flex-1 text-xs text-[var(--muted-foreground)]">{label}</span>
                        <span className="text-sm font-bold tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklists */}
                <div className="cia-glass rounded-xl border border-[var(--border)] px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      Checklists
                    </p>
                    <Link href="/checklist" className="text-[10px] text-[var(--accent)] hover:underline">
                      Ver todos
                    </Link>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-[var(--muted-foreground)]"
                     style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    0
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">instâncias ativas</p>
                  <p className="mt-3 text-[10px] text-[var(--muted-foreground)]/60">
                    Crie instâncias de checklist ao vincular jogos e shows.
                  </p>
                </div>
              </div>
            )
          })()}

          {/* ── Grid de módulos ──────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map(({ icon: Icon, label, desc, href, ready }, i) => {
              const card = (
                <div
                  key={label}
                  className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
                    ready
                      ? 'border-[var(--border)] bg-[var(--card)]/60 hover:border-[var(--green)] hover:bg-[var(--card)] hover:shadow-[0_0_20px_rgba(74,138,92,0.12)] cursor-pointer'
                      : 'border-[var(--border)]/50 bg-[var(--card)]/30 opacity-50 cursor-default'
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {ready && (
                    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--green)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-10" />
                  )}

                  <div className="mb-3 flex items-center justify-between">
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${
                      ready
                        ? 'bg-[var(--green-dim)]/30 text-[var(--green-bright)] group-hover:bg-[var(--green)]/20 group-hover:shadow-[0_0_12px_rgba(74,138,92,0.3)]'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {ready && (
                      <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 transition-all group-hover:opacity-100 group-hover:text-[var(--green)]" />
                    )}
                  </div>

                  <h3 className={`text-sm font-semibold ${ready ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                    {label}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{desc}</p>

                  {!ready && (
                    <span className="mt-2 inline-block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/60">
                      Em breve
                    </span>
                  )}
                </div>
              )

              return href ? (
                <Link key={label} href={href}>{card}</Link>
              ) : (
                <div key={label}>{card}</div>
              )
            })}
          </div>

          {/* Status bar */}
          <div className="mt-10 flex items-center gap-3 rounded-xl border border-[var(--green-dim)]/30 bg-[var(--card)]/40 px-5 py-3.5 text-xs backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-[var(--green-bright)] shadow-[0_0_8px_rgba(106,184,126,0.8)]" />
            <span className="text-[var(--green-bright)] font-semibold">Conectado ao Supabase</span>
            <span className="text-[var(--muted-foreground)]">·</span>
            <span className="text-[var(--muted-foreground)]">RLS ativo · Magic-link configurado</span>
            <div className="ml-auto text-[var(--muted-foreground)]">04–07 jun 2026</div>
          </div>
        </div>
      </main>
    </div>
  )
}
