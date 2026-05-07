'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineStats {
  total: number; rascunho: number; em_producao: number; pronto: number; publicado: number
}

interface DiaStat {
  idx: number; total: number; publicados: number; label: string
}

interface CanalStat {
  canal: string; total: number; publicados: number
}

interface PatrocStat {
  id: string; nome: string; total: number; publicados: number
}

interface Jogo {
  id: string; equipe_a_nome: string | null; equipe_b_nome: string | null
  inicio: string | null; fim_previsto: string | null; dia_id: string | null; status: string | null
}

interface EventItem {
  id: string; nome?: string; equipe_a_nome?: string | null; equipe_b_nome?: string | null
  inicio: string | null; fim_previsto: string | null; dia_id: string | null
}

interface WeatherDay {
  date: string; tMax: number; tMin: number; rain: number; emoji: string
}

interface Props {
  pipelineStats:   PipelineStats
  conteudosPorDia: DiaStat[]
  canalBreakdown:  CanalStat[]
  patrocStats:     PatrocStat[]
  equipeAtiva:     number
  setoresCobertos: number
  ckTotal:         number
  ckFeitos:        number
  jogosHoje:       Jogo[]
  jogosAoVivo:     Jogo[]
  showsHoje:       EventItem[]
  festasHoje:      EventItem[]
  diasEvento:      { id: string; data: string }[]
  diaAtualId:      string | null
  weatherData:     WeatherDay[] | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CANAL_LABELS: Record<string, string> = {
  instagram_cia:       'IG · CIA',
  tiktok_cia:          'TK · CIA',
  instagram_exp:       'IG · EXP',
  instagram_grupo_exp: 'IG · Grupo',
  tiktok_exp:          'TK · EXP',
  instagram_nix:       'IG · NIX',
  x_cia:               'X · CIA',
  youtube_exp:         'YT · EXP',
  outro:               'Outros',
}

const CANAL_COLOR: Record<string, string> = {
  instagram_cia:       '#E1306C',
  tiktok_cia:          '#69C9D0',
  instagram_exp:       '#A855F7',
  instagram_grupo_exp: '#7C3AED',
  tiktok_exp:          '#EE1D52',
  instagram_nix:       '#F97316',
  x_cia:               '#94A3B8',
  youtube_exp:         '#EF4444',
  outro:               '#6B7280',
}

const TIMELINE_START_H = 7
const TIMELINE_END_H   = 24

function timeToFrac(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const h = d.getHours() + d.getMinutes() / 60
  return Math.max(0, Math.min(1, (h - TIMELINE_START_H) / (TIMELINE_END_H - TIMELINE_START_H)))
}

function fracToHM(frac: number): string {
  const total = TIMELINE_START_H + frac * (TIMELINE_END_H - TIMELINE_START_H)
  const h = Math.floor(total) % 24
  const m = Math.round((total % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Clock
// ─────────────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-right">
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 700, color: '#4aa06a', letterSpacing: '0.05em', lineHeight: 1 }}>
        {time}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(150,200,160,0.55)', marginTop: 3, textTransform: 'capitalize', letterSpacing: '0.08em' }}>
        {date}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline donut (SVG)
// ─────────────────────────────────────────────────────────────────────────────

function PipelineDonut({ stats }: { stats: PipelineStats }) {
  const segments = [
    { label: 'Publicado',  value: stats.publicado,   color: '#2e6b42' },
    { label: 'Pronto',     value: stats.pronto,       color: '#4aa06a' },
    { label: 'Produção',   value: stats.em_producao,  color: '#3b82f6' },
    { label: 'Rascunho',   value: stats.rascunho,     color: 'rgba(150,200,160,0.20)' },
  ]

  const total = stats.total || 1
  const R = 52, CX = 64, CY = 64, stroke = 14
  const C = 2 * Math.PI * R

  let cumulative = 0
  const arcs = segments.map(seg => {
    const frac = seg.value / total
    const dashArray = `${frac * C} ${C}`
    const dashOffset = -cumulative * C
    cumulative += frac
    return { ...seg, dashArray, dashOffset }
  })

  const pct = Math.round((stats.publicado / total) * 100)

  return (
    <div className="flex items-center gap-4">
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={128} height={128} viewBox="0 0 128 128">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(46,107,66,0.10)" strokeWidth={stroke} />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              transform="rotate(-90 64 64)"
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          ))}
          <text x={CX} y={CY - 8}  textAnchor="middle" fontSize={20} fontWeight={700} fontFamily="Orbitron,monospace" fill="#4aa06a">{pct}</text>
          <text x={CX} y={CY + 8}  textAnchor="middle" fontSize={9}  fill="rgba(150,200,160,0.50)" letterSpacing={2}>%</text>
          <text x={CX} y={CY + 20} textAnchor="middle" fontSize={7.5} fill="rgba(150,200,160,0.40)" letterSpacing={1}>SAÚDE</text>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {segments.filter(s => s.value > 0).map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'rgba(150,200,160,0.60)', letterSpacing: '0.05em' }}>{seg.label}</span>
            </div>
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 12, fontWeight: 700, color: seg.color }}>{seg.value}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(46,107,66,0.15)', paddingTop: 5, marginTop: 5, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'rgba(150,200,160,0.40)' }}>Total</span>
          <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 12, color: 'rgba(150,200,160,0.70)' }}>{stats.total}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4-Day Bar Chart
// ─────────────────────────────────────────────────────────────────────────────

function FourDayChart({ dias }: { dias: DiaStat[] }) {
  const maxTotal = Math.max(...dias.map(d => d.total), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, height: '100%' }}>
      {dias.map(d => {
        const barH = (d.total / maxTotal) * 100
        const pubH = d.total > 0 ? (d.publicados / d.total) * barH : 0
        const pct  = d.total > 0 ? Math.round((d.publicados / d.total) * 100) : 0
        return (
          <div key={d.idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            {/* Bar */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 64, height: 80, display: 'flex', alignItems: 'flex-end' }}>
              {/* Background track */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${barH}%`, minHeight: d.total > 0 ? 4 : 0,
                background: 'rgba(46,107,66,0.12)',
                borderRadius: '6px 6px 0 0',
              }} />
              {/* Published fill */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${pubH}%`, minHeight: d.publicados > 0 ? 4 : 0,
                background: 'linear-gradient(180deg, #4aa06a 0%, #2e6b42 100%)',
                borderRadius: '6px 6px 0 0',
                boxShadow: d.publicados > 0 ? '0 0 12px rgba(74,160,106,0.35)' : 'none',
                transition: 'height 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            </div>
            {/* Stats */}
            <div style={{ marginTop: 6, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 13, fontWeight: 700, color: '#4aa06a', lineHeight: 1 }}>
                {d.publicados}<span style={{ fontSize: 9, color: 'rgba(74,160,106,0.5)' }}>/{d.total}</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(150,200,160,0.40)', marginTop: 2 }}>{pct}%</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(150,200,160,0.55)', marginTop: 3, lineHeight: 1.2 }}>
                {d.label.split('·')[0].trim()}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Canal Breakdown Chart
// ─────────────────────────────────────────────────────────────────────────────

function CanalChart({ canais }: { canais: CanalStat[] }) {
  const maxTotal = Math.max(...canais.map(c => c.total), 1)

  if (canais.length === 0) {
    return <p style={{ fontSize: 11, color: 'rgba(150,200,160,0.30)', textAlign: 'center', marginTop: 16 }}>Sem conteúdos hoje</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {canais.map(c => {
        const color = CANAL_COLOR[c.canal] ?? '#6b7280'
        const label = CANAL_LABELS[c.canal] ?? c.canal
        const barW  = (c.total / maxTotal) * 100
        const pubW  = c.total > 0 ? (c.publicados / c.total) * barW : 0
        const pct   = c.total > 0 ? Math.round((c.publicados / c.total) * 100) : 0
        return (
          <div key={c.canal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
              <span style={{ fontSize: 9.5, color: 'rgba(200,220,205,0.65)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 10, color, fontWeight: 700 }}>
                {c.publicados}<span style={{ color: 'rgba(200,220,205,0.30)', fontWeight: 400 }}>/{c.total}</span>
              </span>
            </div>
            <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(46,107,66,0.08)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${barW}%`, background: 'rgba(46,107,66,0.12)', borderRadius: 3 }} />
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pubW}%`, background: color, borderRadius: 3, opacity: 0.85, boxShadow: `0 0 6px ${color}60` }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 8, color: 'rgba(150,200,160,0.30)', marginTop: 1 }}>{pct}%</div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Gantt (TV version — dark theme, compact)
// ─────────────────────────────────────────────────────────────────────────────

interface TLEvent {
  id: string; label: string; start: number; end: number
  color: string; bg: string
}

function packRows(events: TLEvent[]): { ev: TLEvent; row: number }[] {
  const sorted = [...events].sort((a, b) => a.start - b.start)
  const rowEnds: number[] = []
  const result: { ev: TLEvent; row: number }[] = []
  for (const ev of sorted) {
    let placed = false
    for (let r = 0; r < rowEnds.length; r++) {
      if (ev.start >= rowEnds[r] + 0.003) { rowEnds[r] = ev.end; result.push({ ev, row: r }); placed = true; break }
    }
    if (!placed) { rowEnds.push(ev.end); result.push({ ev, row: rowEnds.length - 1 }) }
  }
  return result
}

function TVTimeline({ jogos, shows, festas }: {
  jogos: Jogo[]; shows: EventItem[]; festas: EventItem[]
}) {
  const [nowFrac, setNowFrac] = useState<number | null>(null)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const h   = now.getHours() + now.getMinutes() / 60
      const f   = (h - TIMELINE_START_H) / (TIMELINE_END_H - TIMELINE_START_H)
      setNowFrac(f >= 0 && f <= 1 ? f : null)
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  function toEvents<T extends { id: string; inicio: string | null; fim_previsto: string | null }>(
    items: T[], getLabel: (t: T) => string, color: string, bg: string,
  ): TLEvent[] {
    return items.flatMap(item => {
      const s = timeToFrac(item.inicio)
      if (s === null) return []
      const e = timeToFrac(item.fim_previsto) ?? Math.min(s + 0.06, 1)
      return [{ id: item.id, label: getLabel(item), start: s, end: e, color, bg }]
    })
  }

  const lanes = [
    {
      icon: '🏆', label: 'Esportivo', color: '#2e6b42',
      events: toEvents(jogos, j => `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`, '#4aa06a', 'rgba(46,107,66,0.12)'),
    },
    {
      icon: '🎤', label: 'Shows', color: '#7c3aed',
      events: toEvents(shows as Jogo[], s => (s as EventItem).nome ?? '', '#a855f7', 'rgba(124,58,237,0.12)'),
    },
    {
      icon: '🎉', label: 'Festas', color: '#be185d',
      events: toEvents(festas as Jogo[], f => (f as EventItem).nome ?? '', '#f472b6', 'rgba(190,24,93,0.10)'),
    },
  ]

  const axisH: number[] = []
  for (let h = TIMELINE_START_H; h <= TIMELINE_END_H; h += 3) axisH.push(h)

  const ROW_H  = 28
  const ROW_G  = 3
  const PAD    = 6
  const LABEL  = 90

  const allEmpty = lanes.every(l => l.events.length === 0)
  if (allEmpty) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
      <p style={{ color: 'rgba(150,200,160,0.25)', fontSize: 12 }}>Sem eventos programados para hoje</p>
    </div>
  )

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* Hour axis */}
      <div style={{ display: 'flex', paddingLeft: LABEL, marginBottom: 4 }}>
        {axisH.map(h => (
          <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'rgba(150,200,160,0.30)', fontFamily: 'Orbitron,monospace' }}>
            {h < 24 ? `${String(h).padStart(2,'0')}h` : `${String(h-24).padStart(2,'0')}h`}
          </div>
        ))}
      </div>

      {/* Lanes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lanes.map(lane => {
          const packed   = packRows(lane.events)
          const rowCount = Math.max(...packed.map(p => p.row), 0) + 1
          const trackH   = rowCount * (ROW_H + ROW_G) - ROW_G + PAD * 2

          return (
            <div key={lane.label} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Label */}
              <div style={{ width: LABEL, flexShrink: 0, paddingRight: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', minHeight: trackH }}>
                <span style={{ fontSize: 9 }}>{lane.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: lane.color, lineHeight: 1.2, textAlign: 'right' }}>{lane.label}</span>
                <span style={{ fontSize: 8, color: 'rgba(150,200,160,0.30)', marginTop: 1 }}>{lane.events.length}ev</span>
              </div>

              {/* Track */}
              <div style={{
                flex: 1, position: 'relative', height: trackH, borderRadius: 8,
                background: `linear-gradient(180deg, ${lane.color}08 0%, ${lane.color}04 100%)`,
                border: `1px solid ${lane.color}18`,
                overflow: 'visible',
              }}>
                {/* Grid lines every 3h */}
                {axisH.slice(1,-1).map(h => {
                  const f = (h - TIMELINE_START_H) / (TIMELINE_END_H - TIMELINE_START_H)
                  return <div key={h} style={{ position: 'absolute', top: 0, height: '100%', left: `${f*100}%`, width: 1, background: `${lane.color}14`, pointerEvents: 'none' }} />
                })}

                {/* Events */}
                {packed.map(({ ev, row }) => (
                  <div key={ev.id} title={ev.label} style={{
                    position: 'absolute',
                    left: `${ev.start * 100}%`,
                    width: `${Math.max((ev.end - ev.start), 0.018) * 100}%`,
                    top: PAD + row * (ROW_H + ROW_G),
                    height: ROW_H,
                    background: ev.bg,
                    border: `1px solid ${ev.color}45`,
                    borderRadius: 5,
                    overflow: 'hidden',
                    cursor: 'default',
                  }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: 3, height: '100%', background: `linear-gradient(180deg, ${ev.color}, ${ev.color}88)`, borderRadius: '5px 0 0 5px' }} />
                    <div style={{ paddingLeft: 7, paddingRight: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: ev.color, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.label}</span>
                      <span style={{ fontSize: 8, color: `${ev.color}80`, marginTop: 1 }}>{fracToHM(ev.start)} – {fracToHM(ev.end)}</span>
                    </div>
                  </div>
                ))}

                {/* Now line */}
                {nowFrac !== null && (
                  <div style={{ position: 'absolute', top: -8, left: `${nowFrac * 100}%`, width: 2, height: trackH + 16, background: '#ef4444', zIndex: 20, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: '#fff', fontSize: 7, fontFamily: 'Orbitron,monospace', fontWeight: 700, padding: '1px 3px', borderRadius: 2, whiteSpace: 'nowrap' }}>
                      AGORA
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KPI({ value, label, sub, color = '#4aa06a' }: { value: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(15, 28, 18, 0.70)',
      border: '1px solid rgba(46,107,66,0.18)',
      borderRadius: 10,
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 3,
    }}>
      <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(150,200,160,0.50)' }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: 9, color: 'rgba(150,200,160,0.30)' }}>{sub}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TV Card wrapper
// ─────────────────────────────────────────────────────────────────────────────

function TVCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(10, 20, 12, 0.85)',
      border: '1px solid rgba(46,107,66,0.18)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      <p style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'rgba(74,160,106,0.45)', marginBottom: 10, flexShrink: 0 }}>
        {title}
      </p>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TVDisplay
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_START = new Date('2026-06-04T00:00:00-03:00')

export function TVDisplay({
  pipelineStats,
  conteudosPorDia,
  canalBreakdown,
  patrocStats,
  equipeAtiva,
  setoresCobertos,
  ckTotal,
  ckFeitos,
  jogosHoje,
  jogosAoVivo,
  showsHoje,
  festasHoje,
  diasEvento,
  diaAtualId,
  weatherData,
}: Props) {
  const router = useRouter()
  const [fullscreen, setFullscreen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [refreshIn, setRefreshIn] = useState(60)

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
      setLastRefresh(Date.now())
      setRefreshIn(60)
    }, 60_000)
    return () => clearInterval(interval)
  }, [router])

  // Countdown to next refresh
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRefresh) / 1000)
      setRefreshIn(Math.max(0, 60 - elapsed))
    }, 1000)
    return () => clearInterval(tick)
  }, [lastRefresh])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setFullscreen(false)
    }
  }, [])

  useEffect(() => {
    function onFSChange() { setFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  // Request fullscreen on first load
  useEffect(() => {
    const t = setTimeout(() => {
      document.documentElement.requestFullscreen().catch(() => {})
      setFullscreen(true)
    }, 800)
    return () => clearTimeout(t)
  }, [])

  const now = new Date()
  const diffMs = EVENT_START.getTime() - now.getTime()
  const diffDays = Math.max(0, Math.ceil(diffMs / 86_400_000))
  const eventActive = diffDays === 0

  const healthPct   = pipelineStats.total > 0 ? Math.round((pipelineStats.publicado / pipelineStats.total) * 100) : 0
  const checklistPct = ckTotal > 0 ? Math.round((ckFeitos / ckTotal) * 100) : 0

  // Current event day index
  const diaIdx = diaAtualId ? (diasEvento.findIndex(d => d.id === diaAtualId) + 1) : 0

  const totalHoje    = diaAtualId ? conteudosPorDia.find(d => diasEvento[d.idx - 1]?.id === diaAtualId) : undefined
  const publicadosHoje = totalHoje?.publicados ?? 0
  const totalConteudosHoje = totalHoje?.total ?? 0

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#060c07',
      color: 'rgba(200, 220, 205, 0.90)',
      fontFamily: 'var(--font-dm-sans), "Rajdhani", system-ui, sans-serif',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr auto',
      gap: 10,
      padding: '12px 14px',
      boxSizing: 'border-box',
      position: 'relative',
    }}>

      {/* ── Dot grid bg ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(46,107,66,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* ── Glow orb top-left ── */}
      <div style={{
        position: 'absolute', top: -80, left: -60, width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(46,107,66,0.10) 0%, transparent 65%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ═══════════════════════════════════════════
          ROW 1 — HEADER
          ═══════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(46,107,66,0.14)',
        paddingBottom: 10, zIndex: 1, position: 'relative',
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a3d24, #2e6b42)',
            border: '1px solid rgba(74,160,106,0.30)',
            borderRadius: 10,
            padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 18, fontWeight: 700, color: '#4aa06a', letterSpacing: '0.05em' }}>CIA</span>
            <div style={{ width: 1, height: 18, background: 'rgba(74,160,106,0.25)' }} />
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 13, color: 'rgba(74,160,106,0.60)', letterSpacing: '0.05em' }}>2026</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(150,200,160,0.40)' }}>
              Centro de Comandos · Cobertura
            </div>
            <div style={{ fontSize: 10, color: 'rgba(150,200,160,0.25)', letterSpacing: '0.10em' }}>
              Copa Inter Atléticas · Uberaba, MG · 04–07 jun 2026
            </div>
          </div>
        </div>

        {/* Status + event indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {eventActive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {diaIdx > 0 && (
                <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 11, color: 'rgba(150,200,160,0.40)', letterSpacing: '0.08em' }}>
                  DIA {diaIdx} DE 4
                </span>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(46,107,66,0.15)',
                border: '1px solid rgba(74,160,106,0.35)',
                borderRadius: 20, padding: '4px 12px',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4aa06a', display: 'inline-block', boxShadow: '0 0 8px rgba(74,160,106,0.8)', animation: 'ping 2s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 12, fontWeight: 700, color: '#4aa06a', letterSpacing: '0.08em' }}>AO VIVO</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 28, fontWeight: 700, color: '#2e6b42' }}>{diffDays}</span>
              <span style={{ fontSize: 10, color: 'rgba(150,200,160,0.35)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>dias</span>
            </div>
          )}

          <Clock />

          {/* Controls */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { router.refresh(); setLastRefresh(Date.now()); setRefreshIn(60) }}
              title="Atualizar agora"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(46,107,66,0.10)', border: '1px solid rgba(46,107,66,0.20)',
                color: 'rgba(74,160,106,0.60)', cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={toggleFullscreen}
              title={fullscreen ? 'Sair do fullscreen' : 'Fullscreen'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(46,107,66,0.10)', border: '1px solid rgba(46,107,66,0.20)',
                color: 'rgba(74,160,106,0.60)', cursor: 'pointer',
              }}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          ROW 2 — KPI BAR
          ═══════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 8, zIndex: 1, position: 'relative' }}>
        <KPI value={equipeAtiva} label="Equipe Ativa" sub="pessoas" color="#4aa06a" />
        <KPI value={setoresCobertos} label="Setores" sub="cobertos" color="#60a5fa" />
        <KPI value={`${publicadosHoje}/${totalConteudosHoje}`} label="Publicados Hoje" color="#4aa06a" />
        <KPI value={pipelineStats.total} label="Total Conteúdos" color="rgba(150,200,160,0.70)" />
        <KPI
          value={`${healthPct}%`}
          label="Saúde Pipeline"
          color={healthPct >= 70 ? '#4aa06a' : healthPct >= 40 ? '#e8b94f' : '#f87171'}
        />
        <KPI
          value={`${checklistPct}%`}
          label="Checklist"
          sub={`${ckFeitos}/${ckTotal}`}
          color={checklistPct >= 70 ? '#4aa06a' : '#e8b94f'}
        />
        {jogosAoVivo.length > 0 && (
          <KPI value={jogosAoVivo.length} label="Jogos Ao Vivo" color="#f87171" />
        )}
      </div>

      {/* ═══════════════════════════════════════════
          ROW 3 — MAIN CONTENT
          ═══════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr 220px',
        gap: 10,
        minHeight: 0,
        zIndex: 1, position: 'relative',
      }}>

        {/* LEFT: Pipeline + Clima */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TVCard title="Pipeline · Total" style={{ flex: '0 0 auto' }}>
            <PipelineDonut stats={pipelineStats} />
          </TVCard>

          <TVCard title="Clima · 4 Dias" style={{ flex: 1 }}>
            {weatherData ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {weatherData.map(day => (
                  <div key={day.date} style={{
                    background: 'rgba(46,107,66,0.06)',
                    border: '1px solid rgba(46,107,66,0.12)',
                    borderRadius: 8, padding: '6px 8px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 7.5, color: 'rgba(150,200,160,0.40)', marginBottom: 3, letterSpacing: '0.05em' }}>
                      {day.date.slice(8, 10)}/06
                    </div>
                    <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 3 }}>{day.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(200,220,205,0.80)' }}>
                      {day.tMax}°<span style={{ fontSize: 9, color: 'rgba(150,200,160,0.40)' }}>/{day.tMin}°</span>
                    </div>
                    <div style={{ fontSize: 8, color: 'rgba(150,200,160,0.35)', marginTop: 2 }}>💧{day.rain}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 10, color: 'rgba(150,200,160,0.25)', textAlign: 'center', marginTop: 12 }}>Sem previsão disponível</p>
            )}
          </TVCard>
        </div>

        {/* CENTER: Timeline */}
        <TVCard title={`Timeline de Hoje · ${jogosHoje.length} jogos · ${showsHoje.length} shows · ${festasHoje.length} festas`}>
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <TVTimeline jogos={jogosHoje} shows={showsHoje} festas={festasHoje} />
          </div>
        </TVCard>

        {/* RIGHT: Canais + Patrocínio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TVCard title="Canais · Hoje" style={{ flex: 1 }}>
            <CanalChart canais={canalBreakdown} />
          </TVCard>

          {patrocStats.length > 0 && (
            <TVCard title="Patrocínio" style={{ flex: '0 0 auto' }}>
              {patrocStats.slice(0, 4).map((p, i) => {
                const pct = p.total > 0 ? Math.round((p.publicados / p.total) * 100) : 0
                return (
                  <div key={p.id} style={{ marginBottom: i < patrocStats.length - 1 ? 8 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 9.5, color: 'rgba(200,220,205,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.nome}</span>
                      <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, color: pct >= 70 ? '#4aa06a' : '#e8b94f' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(46,107,66,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? '#2e6b42' : '#d97706', borderRadius: 2, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                )
              })}
            </TVCard>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          ROW 4 — 4-DAY BAR CHART + FOOTER
          ═══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, zIndex: 1, position: 'relative' }}>
        <TVCard title="Conteúdos por Dia do Evento" style={{ padding: '10px 16px' }}>
          <div style={{ height: 110 }}>
            <FourDayChart dias={conteudosPorDia} />
          </div>
        </TVCard>

        {/* Footer info */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end',
          gap: 4, padding: '8px 0',
        }}>
          <div style={{ fontSize: 8, color: 'rgba(150,200,160,0.20)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
            CIA 2026 · v0.6 · painel.cia
          </div>
          <div style={{ fontSize: 8, color: 'rgba(150,200,160,0.20)', letterSpacing: '0.05em' }}>
            atualiza em {refreshIn}s
          </div>
        </div>
      </div>

      {/* Pulse animation for AO VIVO dot */}
      <style>{`
        @keyframes ping {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
