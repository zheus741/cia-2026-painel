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
// Timeline vertical — agenda por horário, mobile-friendly
// ─────────────────────────────────────────────────────────────────────────────

type TLEntry = {
  id: string; label: string; inicio: string | null; fim_previsto: string | null
  icon: string; color: string; bg: string; cat: string
}

function fmtTime(iso: string | null) {
  if (!iso) return '—:—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function durMin(s: string | null, e: string | null) {
  if (!s || !e) return null
  return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60_000)
}

function TVTimeline({ jogos, shows, festas }: {
  jogos: Jogo[]; shows: EventItem[]; festas: EventItem[]
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const all: TLEntry[] = [
    ...jogos.map(j => ({
      id: j.id,
      label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
      inicio: j.inicio, fim_previsto: j.fim_previsto,
      icon: '🏆', color: '#4aa06a', bg: 'rgba(46,107,66,0.12)', cat: 'Esportivo',
    })),
    ...shows.map(s => ({
      id: s.id, label: (s as EventItem).nome ?? '', inicio: s.inicio, fim_previsto: s.fim_previsto,
      icon: '🎤', color: '#a855f7', bg: 'rgba(124,58,237,0.10)', cat: 'Show',
    })),
    ...festas.map(f => ({
      id: f.id, label: (f as EventItem).nome ?? '', inicio: f.inicio, fim_previsto: f.fim_previsto,
      icon: '🎉', color: '#f472b6', bg: 'rgba(190,24,93,0.08)', cat: 'Festa',
    })),
  ].sort((a, b) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  if (all.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
      <p style={{ color: 'rgba(150,200,160,0.25)', fontSize: 12 }}>Sem eventos programados para hoje</p>
    </div>
  )

  // Where to insert "AGORA" — after last event that already started
  let nowAfterIdx = -1
  for (let i = 0; i < all.length; i++) {
    if (all[i].inicio && new Date(all[i].inicio!) <= now) nowAfterIdx = i
  }

  const nowStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingRight: 2 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {all.map((ev, i) => {
          const isLast   = i === all.length - 1
          const dur      = durMin(ev.inicio, ev.fim_previsto)
          const isActive = !!ev.inicio && !!ev.fim_previsto &&
            new Date(ev.inicio) <= now && new Date(ev.fim_previsto) >= now
          const isPast   = !!ev.fim_previsto && new Date(ev.fim_previsto) < now
          const showNowAfter = nowAfterIdx === i && !isLast &&
            !!all[i + 1]?.inicio && new Date(all[i + 1].inicio!) > now

          return (
            <div key={ev.id}>
              {/* Event row */}
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>

                {/* Time column */}
                <div style={{ width: 38, flexShrink: 0, paddingTop: 9, paddingRight: 6, textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'Orbitron,monospace', fontSize: 8, fontWeight: 700,
                    color: isActive ? ev.color : isPast ? 'rgba(150,200,160,0.22)' : 'rgba(150,200,160,0.50)',
                  }}>
                    {fmtTime(ev.inicio)}
                  </span>
                </div>

                {/* Dot + vertical connector */}
                <div style={{ width: 16, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 1, height: 8, flexShrink: 0,
                    background: i === 0 ? 'transparent' : 'rgba(46,107,66,0.18)',
                  }} />
                  <div style={{
                    width: isActive ? 10 : 7, height: isActive ? 10 : 7,
                    borderRadius: '50%', flexShrink: 0, zIndex: 1,
                    background: isActive ? ev.color : isPast ? 'rgba(46,107,66,0.15)' : `${ev.color}55`,
                    border: `1.5px solid ${isActive ? ev.color : isPast ? 'rgba(46,107,66,0.10)' : `${ev.color}35`}`,
                    boxShadow: isActive ? `0 0 10px ${ev.color}90, 0 0 20px ${ev.color}40` : 'none',
                    transition: 'all 0.4s ease',
                  }} />
                  {!isLast && (
                    <div style={{
                      width: 1, flex: 1, minHeight: 12, flexShrink: 0,
                      background: 'rgba(46,107,66,0.18)',
                    }} />
                  )}
                </div>

                {/* Card */}
                <div style={{ flex: 1, paddingLeft: 8, paddingBottom: isLast ? 4 : 8, paddingTop: 4 }}>
                  <div style={{
                    background: isPast ? 'rgba(10,20,12,0.40)' : ev.bg,
                    border: `1px solid ${isActive ? `${ev.color}40` : isPast ? 'rgba(46,107,66,0.05)' : `${ev.color}18`}`,
                    borderLeft: `3px solid ${isActive ? ev.color : isPast ? 'rgba(46,107,66,0.12)' : `${ev.color}45`}`,
                    borderRadius: '0 8px 8px 0',
                    padding: '7px 10px',
                    opacity: isPast ? 0.50 : 1,
                    boxShadow: isActive ? `0 0 20px ${ev.color}18, inset 0 0 20px ${ev.color}08` : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 10 }}>{ev.icon}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: isActive ? ev.color : isPast ? 'rgba(150,200,160,0.35)' : 'rgba(200,220,205,0.88)',
                      }}>
                        {ev.label}
                      </span>
                      {isActive && (
                        <span style={{
                          flexShrink: 0, fontSize: 7, fontWeight: 700, letterSpacing: '0.12em',
                          textTransform: 'uppercase', color: ev.color,
                          background: `${ev.color}15`, border: `1px solid ${ev.color}35`,
                          borderRadius: 4, padding: '1px 5px',
                        }}>
                          AO VIVO
                        </span>
                      )}
                    </div>
                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 8, color: 'rgba(150,200,160,0.30)', fontFamily: 'Orbitron,monospace' }}>
                        {fmtTime(ev.inicio)}–{fmtTime(ev.fim_previsto)}
                      </span>
                      {dur !== null && (
                        <span style={{ fontSize: 8, color: 'rgba(150,200,160,0.20)' }}>
                          {dur < 60 ? `${dur}min` : `${Math.floor(dur / 60)}h${dur % 60 > 0 ? `${dur % 60}m` : ''}`}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 8, color: `${ev.color}45` }}>
                        {ev.cat}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AGORA separator — injected between past and future */}
              {showNowAfter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 54, paddingRight: 4, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.50))' }} />
                  <span style={{
                    fontFamily: 'Orbitron,monospace', fontSize: 7.5, fontWeight: 700,
                    color: '#ef4444', letterSpacing: '0.12em', flexShrink: 0,
                  }}>
                    ◆ AGORA {nowStr}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(239,68,68,0.50), transparent)' }} />
                </div>
              )}
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
        <TVCard title={`Timeline · ${jogosHoje.length} jogos · ${showsHoje.length} shows · ${festasHoje.length} festas`}>
          <TVTimeline jogos={jogosHoje} shows={showsHoje} festas={festasHoje} />
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
