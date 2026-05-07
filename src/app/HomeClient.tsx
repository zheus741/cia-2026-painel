'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, AlertTriangle, Zap, ArrowRight,
  Camera, CheckSquare, ClipboardList, Swords, MapPin, Music,
  Heart, Lightbulb, BookOpen, Calendar, Cloud,
  Droplets, Activity, Gauge, Layers, BarChart3, Radio, UserCircle, Tv2,
} from 'lucide-react'
import { CoordDashboard } from './CoordDashboard'
import type {
  CoordConteudoHoje,
  CoordJogo,
  CoordShow,
  CoordFesta,
  CoordTurnoCount,
  CoordPatrocinador,
} from './CoordDashboard'
import { AnalyticsCards } from './AnalyticsCards'
import type { RankingItem, LacunaItem, VolumePorHora, AtleticaItem } from './AnalyticsCards'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WeatherDay {
  label: string
  tMax: number
  tMin: number
  rain: number
  emoji: string
}

interface ContentStats {
  total: number
  rascunho: number
  em_producao: number
  publicado: number
}

interface HeatCell {
  tipo: string
  dia: number
  count: number
}

interface TurnoHoje {
  id: string
  inicio: string
  fim: string
  funcao: string
  setor: { nome: string } | null
}

interface ChecklistInst {
  id: string
  nome_override: string | null
  show: { nome: string } | null
  jogo: { equipe_a_nome: string; equipe_b_nome: string } | null
  checklist_itens: { id: string; status: string }[]
}

interface Props {
  profile: { nome: string; role: string; funcao_principal: string | null } | null
  contentStats: ContentStats
  heatmapData: HeatCell[]
  turnosHoje: TurnoHoje[]
  checklistsAtivos: ChecklistInst[]
  diffDays: number
  eventActive: boolean
  weatherDays: WeatherDay[] | null
  isCoord: boolean
  isOperador: boolean
  coordConteudosHoje?: CoordConteudoHoje[]
  coordJogosHoje?: CoordJogo[]
  coordShowsHoje?: CoordShow[]
  coordFestasHoje?: CoordFesta[]
  coordTurnosHoje?: CoordTurnoCount[]
  coordPatrocinadores?: CoordPatrocinador[]
  coordConteudosPorPatrocinador?: { patrocinador_id: string | null; status: string }[]
  coordChecklistItens?: { id: string; status: string }[]
  coordDiasEvento?: { id: string; data: string }[]
  coordDiaAtualId?: string | null
  analyticsRanking?:       RankingItem[]
  analyticsLacunas?:       LacunaItem[]
  analyticsVolumePorHora?: VolumePorHora[]
  analyticsAtleticas?:     AtleticaItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Qui 04', 'Sex 05', 'Sáb 06', 'Dom 07']

const TIPOS_HEATMAP = ['reels', 'feed', 'stories', 'material_youtube', 'foto', 'video']

const TIPO_LABELS: Record<string, string> = {
  reels:            'Reels',
  feed:             'Feed',
  stories:          'Stories',
  material_youtube: 'YouTube',
  foto:             'Foto',
  video:            'Vídeo',
}

const MODULES = [
  { icon: Camera,        label: 'Conteúdos',    href: '/conteudos',            grad: 'linear-gradient(145deg, #1e5c36 0%, #2e8b57 100%)' },
  { icon: Radio,         label: 'Placar',        href: '/placar',               grad: 'linear-gradient(145deg, #14503a 0%, #1a7a4a 100%)' },
  { icon: CheckSquare,   label: 'Checklists',    href: '/checklist',            grad: 'linear-gradient(145deg, #2e6b42 0%, #4aa066 100%)' },
  { icon: Lightbulb,     label: 'Pautas',        href: '/pautas',               grad: 'linear-gradient(145deg, #7a5206 0%, #b07a0a 100%)' },
  { icon: Calendar,      label: 'Cronograma',    href: '/cronograma',           grad: 'linear-gradient(145deg, #1a5c5c 0%, #2e8b8b 100%)' },
  { icon: BookOpen,      label: 'Wiki',          href: '/wiki',                 grad: 'linear-gradient(145deg, #2e5c3a 0%, #3d7a52 100%)' },
  { icon: UserCircle,    label: 'Minha Escala',  href: '/minha-escala',         grad: 'linear-gradient(145deg, #1e4d6b 0%, #2e6b8b 100%)' },
  { icon: ClipboardList, label: 'Escala',        href: '/admin/escala',         grad: 'linear-gradient(145deg, #2e6b42 0%, #3d9e5c 100%)' },
  { icon: Swords,        label: 'Jogos',         href: '/admin/jogos',          grad: 'linear-gradient(145deg, #5c2e2e 0%, #8b3a3a 100%)' },
  { icon: MapPin,        label: 'Mapa',          href: '/mapa',                 grad: 'linear-gradient(145deg, #3a5c1e 0%, #5c8b2e 100%)' },
  { icon: Music,         label: 'Shows',         href: '/admin/shows',          grad: 'linear-gradient(145deg, #4a2e6b 0%, #6b3a9e 100%)' },
  { icon: Heart,         label: 'Patrocínios',   href: '/admin/patrocinadores', grad: 'linear-gradient(145deg, #6b1e42 0%, #9e2e5c 100%)' },
]

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ num, label }: { num: string; label: string }) {
  return (
    <div className="cia-section-header">
      <span className="cia-section-num">{num}</span>
      <span className="cia-section-label">{label}</span>
      <div className="cia-section-rule" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CountUp — eased counter animation from 0 → target
// ─────────────────────────────────────────────────────────────────────────────

function CountUp({ to, duration = 1500 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (to === 0) { setVal(0); return }
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      // ease-out quart
      const ease = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(ease * to))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [to, duration])

  return <>{val}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// ModuleGrid — minimal uniform icons, 6×2 grid
// ─────────────────────────────────────────────────────────────────────────────

function ModuleGrid() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px 8px' }}>
      {MODULES.map((mod, i) => {
        const isHov = hovered === i
        return (
          <Link
            key={mod.href}
            href={mod.href}
            style={{ textDecoration: 'none' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="cia-module-in flex flex-col items-center"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              {/* Icon tile — gradient bg */}
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: mod.grad,
                opacity: isHov ? 1 : 0.82,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transform: isHov ? 'translateY(-4px) scale(1.06)' : 'translateY(0) scale(1)',
                transition: 'all 0.22s cubic-bezier(0.34,1.4,0.64,1)',
                boxShadow: isHov ? '0 10px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)' : '0 2px 6px rgba(0,0,0,0.08)',
              }}>
                <mod.icon style={{
                  width: 20,
                  height: 20,
                  color: 'rgba(255,255,255,0.92)',
                  transition: 'opacity 0.18s ease',
                  strokeWidth: 1.7,
                }} />
              </div>

              {/* Label */}
              <span style={{
                marginTop: 8,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.01em',
                textAlign: 'center',
                lineHeight: 1.2,
                color: isHov ? '#2e6b42' : 'rgba(46,107,66,0.70)',
                transition: 'color 0.18s ease',
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                display: 'block',
                width: 60,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {mod.label}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HealthRing
// ─────────────────────────────────────────────────────────────────────────────

function HealthRing({ pct }: { pct: number }) {
  const [drawn, setDrawn] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDrawn(pct), 120)
    return () => clearTimeout(t)
  }, [pct])

  const R = 46
  const C = 2 * Math.PI * R
  const offset = C - (drawn / 100) * C
  const isHealthy = pct >= 70
  const isWarning = pct >= 40 && pct < 70
  const glowColor = isHealthy
    ? 'rgba(74,138,92,0.55)'
    : isWarning
    ? 'rgba(200,151,58,0.55)'
    : 'rgba(248,113,113,0.45)'
  const scoreColor = isHealthy ? '#2e6b42' : isWarning ? '#e8b94f' : '#f87171'

  return (
    <div style={{ filter: `drop-shadow(0 0 18px ${glowColor})`, transition: 'filter 1.2s ease' }}>
      <svg width="120" height="120" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="cia-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            {isHealthy ? (
              <>
                <stop offset="0%"   stopColor="#4a8a5c" />
                <stop offset="100%" stopColor="#e8b94f" />
              </>
            ) : isWarning ? (
              <>
                <stop offset="0%"   stopColor="#e8b94f" />
                <stop offset="100%" stopColor="#f59e0b" />
              </>
            ) : (
              <>
                <stop offset="0%"   stopColor="#f87171" />
                <stop offset="100%" stopColor="#dc2626" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(16,29,18,0.05)" strokeWidth="1" />
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(16,29,18,0.08)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={R}
          fill="none"
          stroke="url(#cia-ring-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <text x="50" y="44" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="700" fontFamily="Orbitron, monospace" fill="#101d12">{drawn}</text>
        <text x="50" y="57" textAnchor="middle" fontSize="7" fontFamily="system-ui, sans-serif" fill="rgba(16,29,18,0.45)" letterSpacing="2.5">HEALTH</text>
        <text x="50" y="66" textAnchor="middle" fontSize="9" fontFamily="Orbitron, monospace" fill={scoreColor} fontWeight="700">%</text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BottleneckDetector
// ─────────────────────────────────────────────────────────────────────────────

function BottleneckDetector({ stats }: { stats: ContentStats }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 250); return () => clearTimeout(t) }, [])

  const stages = [
    { key: 'rascunho',    label: 'Rascunho',    count: stats.rascunho,    color: '#94a3b8', done: false },
    { key: 'em_producao', label: 'Em Produção', count: stats.em_producao, color: '#60a5fa', done: false },
    { key: 'publicado',   label: 'Publicado',   count: stats.publicado,   color: '#2e6b42', done: true  },
  ]
  const maxCount = Math.max(...stages.map(s => s.count), 1)
  const pendingStages = stages.filter(s => !s.done)
  const bottleneck = pendingStages.length > 0
    ? pendingStages.reduce((max, s) => s.count > max.count ? s : max)
    : null
  const deliveryPct = stats.total > 0
    ? Math.round((stats.publicado / stats.total) * 100)
    : 0

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => {
        const isBottleneck = bottleneck?.key === stage.key && stage.count > 0
        const barW = mounted ? Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 4 : 0) : 0
        return (
          <div key={stage.key}>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBottleneck ? (
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-amber-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                ) : (
                  <span className="h-4 w-4 flex items-center justify-center">
                    <span className="inline-flex h-2 w-2 rounded-full" style={{ background: stage.color, opacity: 0.7 }} />
                  </span>
                )}
                <span className="text-xs font-semibold text-[var(--foreground)]">{stage.label}</span>
                {isBottleneck && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                    Gargalo
                  </span>
                )}
              </div>
              <span
                className="tabular-nums text-sm font-bold"
                style={{ fontFamily: 'Orbitron, monospace', color: isBottleneck ? '#e8b94f' : stage.color }}
              >
                {stage.count}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(16,29,18,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${barW}%`,
                  transitionDelay: `${i * 180}ms`,
                  background: isBottleneck
                    ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                    : stage.done
                    ? 'linear-gradient(90deg, var(--green-dim), var(--green-bright))'
                    : stage.color,
                  boxShadow: isBottleneck
                    ? '0 0 10px rgba(251,191,36,0.45)'
                    : stage.done
                    ? '0 0 8px rgba(74,138,92,0.35)'
                    : 'none',
                }}
              />
            </div>
            {i < stages.length - 1 && (
              <div className="mt-2 flex justify-center">
                <ArrowRight className="h-3 w-3 text-[var(--muted-foreground)] opacity-30" />
              </div>
            )}
          </div>
        )
      })}
      {stats.total > 0 && (
        <div className="mt-2 flex items-center justify-between border-t border-[var(--border)]/50 pt-3 text-[10px] text-[var(--muted-foreground)]">
          <span>{stats.total} conteúdos totais</span>
          <span
            className="font-bold tabular-nums"
            style={{
              fontFamily: 'Orbitron, monospace',
              color: deliveryPct >= 70 ? '#2e6b42' : deliveryPct >= 40 ? '#e8b94f' : '#f87171',
            }}
          >
            {deliveryPct}% entregues
          </span>
        </div>
      )}
      {stats.total === 0 && (
        <p className="text-center text-xs text-[var(--muted-foreground)]/50 pt-2">
          Pipeline vazio — adicione conteúdos no Kanban
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivityHeatmap
// ─────────────────────────────────────────────────────────────────────────────

function ActivityHeatmap({ data }: { data: HeatCell[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 450); return () => clearTimeout(t) }, [])

  const matrix = TIPOS_HEATMAP.map(tipo => ({
    tipo,
    label: TIPO_LABELS[tipo] ?? tipo,
    days: [1, 2, 3, 4].map(d => data.find(c => c.tipo === tipo && c.dia === d)?.count ?? 0),
  }))
  const maxVal = Math.max(...matrix.flatMap(r => r.days), 1)

  function cellStyle(val: number, rowIdx: number, colIdx: number): React.CSSProperties {
    const intensity = val / maxVal
    const delay = `${(rowIdx * 4 + colIdx) * 35}ms`
    if (val === 0) {
      return {
        background: 'rgba(46,107,66,0.05)',
        border: '1px solid rgba(46,107,66,0.08)',
        transition: `background 0.5s ease ${delay}`,
      }
    }
    const alpha = 0.15 + intensity * 0.7
    const glow = intensity > 0.6 ? `0 0 10px rgba(74,138,92,${(intensity * 0.5).toFixed(2)})` : 'none'
    return {
      background: mounted ? `rgba(74,138,92,${alpha.toFixed(2)})` : 'rgba(46,107,66,0.05)',
      border: `1px solid rgba(74,138,92,${(alpha * 0.6).toFixed(2)})`,
      boxShadow: mounted ? glow : 'none',
      transition: `background 0.6s ease ${delay}, box-shadow 0.6s ease ${delay}`,
    }
  }

  return (
    <div>
      <div className="mb-2 flex" style={{ paddingLeft: '5.5rem' }}>
        {DAY_LABELS.map(d => (
          <div key={d} className="flex-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {matrix.map(({ tipo, label, days }, rowIdx) => (
          <div key={tipo} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-right text-[10px] font-semibold text-[var(--muted-foreground)] truncate leading-tight">
              {label}
            </div>
            <div className="flex flex-1 gap-1.5">
              {days.map((val, colIdx) => (
                <div
                  key={colIdx}
                  title={val > 0 ? `${label} · ${DAY_LABELS[colIdx]}: ${val}` : undefined}
                  className="relative flex-1 rounded-md"
                  style={{ height: 30, ...cellStyle(val, rowIdx, colIdx) }}
                >
                  {val > 0 && mounted && (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        color: val / maxVal > 0.5 ? 'rgba(255,255,255,0.9)' : '#2e6b42',
                        fontFamily: 'Orbitron, monospace',
                      }}
                    >
                      {val}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="text-[10px] text-[var(--muted-foreground)]/50">Intensidade:</span>
        {[0.15, 0.35, 0.55, 0.75, 0.9].map((alpha, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 14, height: 14,
              background: `rgba(74,138,92,${alpha})`,
              border: `1px solid rgba(74,138,92,${alpha * 0.7})`,
            }}
          />
        ))}
        <span className="text-[10px] text-[var(--muted-foreground)]/50">↑ alto</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeClient
// ─────────────────────────────────────────────────────────────────────────────

export function HomeClient({
  contentStats,
  heatmapData,
  turnosHoje,
  checklistsAtivos,
  diffDays,
  eventActive,
  weatherDays,
  isCoord,
  isOperador,
  coordConteudosHoje      = [],
  coordJogosHoje          = [],
  coordShowsHoje          = [],
  coordFestasHoje         = [],
  coordTurnosHoje         = [],
  coordPatrocinadores     = [],
  coordConteudosPorPatrocinador = [],
  coordChecklistItens     = [],
  coordDiasEvento         = [],
  coordDiaAtualId         = null,
  analyticsRanking        = [],
  analyticsLacunas        = [],
  analyticsVolumePorHora  = [],
  analyticsAtleticas      = [],
}: Props) {
  const pct = contentStats.total > 0
    ? Math.round((contentStats.publicado / contentStats.total) * 100)
    : 0

  const healthLabel =
    contentStats.total === 0 ? 'Aguardando'
    : pct >= 70             ? 'Saudável'
    : pct >= 40             ? 'Atenção'
                            : 'Risco'

  const healthColor =
    pct >= 70 ? '#2e6b42'
    : pct >= 40 ? '#e8b94f'
    : '#f87171'

  const HealthIcon =
    pct >= 70 ? TrendingUp
    : pct >= 40 ? AlertTriangle
    : Zap

  return (
    <main className="relative z-10 flex-1 overflow-y-auto">

      {/* ══════════════════════════════════════════════════════════
          HERO — branding + countdown + quick module access
          ══════════════════════════════════════════════════════════ */}
      <section className="cia-hero-section" style={{
        position: 'relative',
        overflow: 'hidden',
        borderBottom: 'none',
      }}>
        {/* Animated gradient orbs */}
        <div
          className="cia-hero-orb cia-hero-orb-1"
          style={{
            width: 520, height: 520,
            background: 'radial-gradient(circle, rgba(74,138,92,0.19) 0%, transparent 70%)',
            top: -160, left: -100,
          }}
        />
        <div
          className="cia-hero-orb cia-hero-orb-2"
          style={{
            width: 380, height: 380,
            background: 'radial-gradient(circle, rgba(200,151,58,0.10) 0%, transparent 70%)',
            top: -30, right: 160,
          }}
        />
        <div
          className="cia-hero-orb cia-hero-orb-1"
          style={{
            width: 260, height: 260,
            background: 'radial-gradient(circle, rgba(74,138,92,0.08) 0%, transparent 70%)',
            bottom: -80, right: 60,
            animationDelay: '7s',
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-9 pb-9">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '256px 1fr',
            gap: '52px',
            alignItems: 'start',
          }}>

            {/* ── LEFT: brand + countdown ── */}
            <div className="flex flex-col" style={{ gap: 18 }}>

              {/* Brand */}
              <div>
                <p style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.30em',
                  textTransform: 'uppercase',
                  color: 'rgba(138,95,6,0.70)',
                  fontFamily: 'Orbitron, monospace',
                  marginBottom: 11,
                }}>
                  Copa Inter Atléticas · 2026
                </p>
                <div style={{ lineHeight: 1, marginBottom: 10 }}>
                  <span style={{
                    display: 'block',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: 40,
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    color: '#101d12',
                    lineHeight: 1.05,
                  }}>
                    PAINEL
                  </span>
                  <span
                    className="cia-count-shimmer"
                    style={{
                      display: 'block',
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: 40,
                      fontWeight: 700,
                      letterSpacing: '-0.025em',
                      lineHeight: 1.05,
                    }}
                  >
                    CIA
                  </span>
                </div>
                <p style={{
                  fontSize: 10.5,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'rgba(46,107,66,0.55)',
                  fontFamily: 'Rajdhani, sans-serif',
                }}>
                  Uberaba, MG · 04–07 jun
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(74,138,92,0.22), transparent)' }} />

              {/* Countdown */}
              {eventActive ? (
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(46,107,66,0.55)', fontFamily: 'Orbitron, monospace', textTransform: 'uppercase', marginBottom: 5 }}>
                    status
                  </p>
                  <p style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 700, color: '#2e6b42' }}>
                    🟢 AO VIVO
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    color: 'rgba(46,107,66,0.55)',
                    fontFamily: 'Orbitron, monospace',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}>
                    dias para o evento
                  </p>
                  <div
                    className="cia-count-shimmer"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: 92,
                      fontWeight: 700,
                      lineHeight: 0.92,
                      letterSpacing: '-0.04em',
                    }}
                  >
                    <CountUp to={diffDays} />
                  </div>
                  <p style={{
                    marginTop: 9,
                    fontSize: 10,
                    color: 'rgba(46,107,66,0.45)',
                    fontFamily: 'Rajdhani, sans-serif',
                    letterSpacing: '0.12em',
                  }}>
                    04 jun 2026 · Uberaba, MG
                  </p>
                </div>
              )}

              {/* Quick stat pills */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: 'Total',      val: contentStats.total,    color: '#2e6b42' },
                  { label: 'Publicados', val: contentStats.publicado, color: '#2e6b42' },
                  { label: 'Saúde',      val: `${pct}%`,             color: healthColor },
                ].map(({ label, val, color }) => (
                  <div
                    key={label}
                    style={{
                      flex: 1,
                      borderRadius: 11,
                      border: '1px solid rgba(46,107,66,0.20)',
                      background: 'linear-gradient(145deg, rgba(46,107,66,0.08) 0%, rgba(61,122,82,0.04) 100%)',
                      padding: '7px 5px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Orbitron, monospace', color, lineHeight: 1 }}>
                      {val}
                    </p>
                    <p style={{
                      fontSize: 7.5,
                      letterSpacing: '0.14em',
                      color: 'rgba(46,107,66,0.55)',
                      fontFamily: 'Rajdhani, sans-serif',
                      textTransform: 'uppercase',
                      marginTop: 3,
                    }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: module quick access ── */}
            <div>
              <SectionHeader num="01" label="Acesso Rápido" />
              <ModuleGrid />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BODY — scrollable dashboard sections
          ══════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-9">

        {/* ── 02 / MÉTRICAS ──────────────────────────────────── */}
        <div>
          <SectionHeader num="02" label="Métricas" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* Health Score */}
            <div className="cia-metric-card px-6 py-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                    Health Score
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <HealthIcon className="h-3.5 w-3.5" style={{ color: healthColor }} />
                    <p className="text-sm font-bold" style={{ color: healthColor }}>
                      {healthLabel}
                    </p>
                  </div>
                </div>
                <Activity className="h-4 w-4 opacity-25" style={{ color: '#2e6b42' }} />
              </div>
              <div className="flex items-center gap-5">
                <HealthRing pct={pct} />
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Total',       val: contentStats.total,       color: '#101d12' },
                    { label: 'Publicados',  val: contentStats.publicado,   color: '#2e6b42' },
                    { label: 'Produção',    val: contentStats.em_producao, color: '#60a5fa' },
                    { label: 'Rascunho',    val: contentStats.rascunho,    color: '#4e7055' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex items-baseline justify-between">
                      <span className="text-[11px] text-[var(--muted-foreground)]">{label}</span>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ fontFamily: 'Orbitron, monospace', color }}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pipeline / Bottleneck */}
            <div className="cia-metric-card cia-metric-card-gold px-6 py-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                    Detector de Gargalo
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
                    Pipeline de conteúdo
                  </p>
                </div>
                <Gauge className="h-4 w-4 opacity-30" style={{ color: '#e8b94f' }} />
              </div>
              <BottleneckDetector stats={contentStats} />
            </div>

            {/* Weather */}
            <div className="cia-metric-card px-5 py-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                Previsão · dias do evento
              </p>
              {weatherDays && weatherDays.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {weatherDays.map(day => (
                    <div
                      key={day.label}
                      className="rounded-xl border p-2 text-center transition-colors hover:border-[var(--green-dim)]/40"
                      style={{ background: 'rgba(46,107,66,0.05)', borderColor: 'rgba(46,107,66,0.12)' }}
                    >
                      <p className="text-[10px] font-semibold text-[var(--muted-foreground)]">{day.label}</p>
                      <p className="my-1 text-xl">{day.emoji}</p>
                      <p className="text-xs font-bold text-[var(--foreground)]">{day.tMax}° / {day.tMin}°</p>
                      <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                        <Droplets className="h-2.5 w-2.5" />
                        {day.rain}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-2">
                  <Cloud className="h-8 w-8 text-[var(--muted-foreground)] opacity-20" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Indisponível</p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]/70">
                      Disponível a partir de 21/mai.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 03 / ATIVIDADE ─────────────────────────────────── */}
        <div>
          <SectionHeader num="03" label="Atividade" />
          <div className="cia-metric-card px-6 py-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">
                  Cobertura por tipo × dia do evento
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                  Heatmap de produção — 04 a 07 jun
                </p>
              </div>
              <Layers className="h-4 w-4 opacity-25" style={{ color: '#2e6b42' }} />
            </div>
            <ActivityHeatmap data={heatmapData} />
          </div>
        </div>

        {/* ── 04 / CENTRO DE COMANDOS ────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-[-4px]">
            <SectionHeader num="04" label="Centro de Comandos" />
            <a
              href="/tv"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all hover:shadow-[0_0_12px_rgba(46,107,66,0.25)]"
              style={{
                borderColor: 'rgba(46,107,66,0.25)',
                background: 'rgba(46,107,66,0.06)',
                color: '#2e6b42',
                marginBottom: 20,
                flexShrink: 0,
              }}
            >
              <Tv2 className="h-3.5 w-3.5" />
              Modo TV
            </a>
          </div>
          <CoordDashboard
            conteudosHoje={coordConteudosHoje}
            jogosHoje={coordJogosHoje}
            showsHoje={coordShowsHoje}
            festasHoje={coordFestasHoje}
            turnosHoje={coordTurnosHoje}
            patrocinadores={coordPatrocinadores}
            conteudosPorPatrocinador={coordConteudosPorPatrocinador}
            checklistItens={coordChecklistItens}
            diasEvento={coordDiasEvento}
            diaAtualId={coordDiaAtualId}
          />
        </div>

        {/* ── 05 / ANÁLISES ───────────────────────────────────── */}
        <div>
          <SectionHeader num="05" label="Análises" />
          <AnalyticsCards
            ranking={analyticsRanking}
            lacunas={analyticsLacunas}
            volumePorHora={analyticsVolumePorHora}
            atleticas={analyticsAtleticas}
          />
        </div>

        {/* ── OPERACIONAL (operador role) ─────────────────────── */}
        {isOperador && (
          <div>
            <SectionHeader num="06" label="Operacional" />
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Minha escala */}
              <div className="cia-metric-card px-5 py-5">
                <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                  Minha escala hoje
                </p>
                {turnosHoje.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Sem turnos agendados para hoje.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {turnosHoje.map(t => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                        style={{ borderColor: 'rgba(74,138,92,0.15)', background: 'rgba(74,138,92,0.06)' }}
                      >
                        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: '#2e6b42', boxShadow: '0 0 6px rgba(46,107,66,0.40)' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold capitalize">{t.funcao.replace(/_/g, ' ')}</p>
                          {t.setor && <p className="text-[10px] text-[var(--muted-foreground)]">{t.setor.nome}</p>}
                        </div>
                        <p className="shrink-0 text-[10px] tabular-nums text-[var(--muted-foreground)]">
                          {new Date(t.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          –
                          {new Date(t.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Checklists */}
              <div className="cia-metric-card px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                    Checklists ativos
                  </p>
                  <Link href="/checklist" className="text-[10px] text-[var(--accent)] hover:underline">
                    Ver todos
                  </Link>
                </div>
                {checklistsAtivos.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Nenhum checklist criado.</p>
                ) : (
                  <ul className="space-y-2">
                    {checklistsAtivos.map(inst => {
                      const itens = inst.checklist_itens ?? []
                      const feitos = itens.filter(i => i.status === 'feito').length
                      const pctCheck = itens.length > 0 ? Math.round((feitos / itens.length) * 100) : 0
                      const titulo =
                        inst.nome_override ??
                        inst.show?.nome ??
                        (inst.jogo
                          ? `${inst.jogo.equipe_a_nome} × ${inst.jogo.equipe_b_nome}`
                          : 'Checklist')
                      return (
                        <li key={inst.id}>
                          <Link
                            href={`/checklist/${inst.id}`}
                            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:border-amber-500/25"
                            style={{ borderColor: 'rgba(46,107,66,0.10)', background: 'rgba(46,107,66,0.05)' }}
                          >
                            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                            <span className="flex-1 truncate text-xs font-medium">{titulo}</span>
                            <span className="shrink-0 text-[10px] tabular-nums text-[var(--muted-foreground)]">
                              {pctCheck}%
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Status bar ──────────────────────────────────────── */}
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-3 text-xs backdrop-blur-sm"
          style={{ borderColor: 'rgba(46,107,66,0.12)', background: 'rgba(46,107,66,0.06)' }}
        >
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#2e6b42', boxShadow: '0 0 8px rgba(46,107,66,0.40)' }} />
          <span className="font-semibold" style={{ color: '#2e6b42' }}>Sistema operacional</span>
          <span className="text-[var(--muted-foreground)]">·</span>
          <span className="text-[var(--muted-foreground)]">Supabase · RLS ativo</span>
          <div className="ml-auto flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 opacity-25" style={{ color: '#2e6b42' }} />
            <span className="text-[var(--muted-foreground)]">CIA 2026 · v0.6</span>
          </div>
        </div>

      </div>
    </main>
  )
}
