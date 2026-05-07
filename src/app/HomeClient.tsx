'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, AlertTriangle, Zap, ArrowRight,
  Camera, CheckSquare, ClipboardList, Swords, Map, Music,
  Heart, Trophy, Lightbulb, BookOpen, Calendar, Cloud,
  Droplets, Activity, Gauge, Layers, BarChart3,
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
  dia: number   // 1–4
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
  // Coord-only props
  coordConteudosHoje?: CoordConteudoHoje[]
  coordJogosHoje?: CoordJogo[]
  coordShowsHoje?: CoordShow[]
  coordFestasHoje?: CoordFesta[]
  coordTurnosHoje?: CoordTurnoCount[]
  coordPatrocinadores?: CoordPatrocinador[]
  coordConteudosPorPatrocinador?: { patrocinador_id: string | null; status: string }[]
  coordChecklistItens?: { id: string; status: string }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Qui 04', 'Sex 05', 'Sáb 06', 'Dom 07']

const TIPOS_HEATMAP = [
  'reels',
  'feed',
  'stories',
  'material_youtube',
  'foto',
  'video',
]

const TIPO_LABELS: Record<string, string> = {
  reels:            'Reels',
  feed:             'Feed',
  stories:          'Stories',
  material_youtube: 'Mat. YouTube',
  foto:             'Foto',
  video:            'Vídeo',
}

const MODULES = [
  { icon: Camera,        label: 'Conteúdos',      desc: 'Kanban de produção',        href: '/conteudos',            accent: 'green' as const },
  { icon: CheckSquare,   label: 'Checklists',     desc: 'Cobertura por evento',       href: '/checklist',            accent: 'green' as const },
  { icon: ClipboardList, label: 'Escala',          desc: 'Pessoa × função × turno',   href: '/admin/escala',         accent: 'gold'  as const },
  { icon: Swords,        label: 'Jogos',           desc: 'Tabela e placar ao vivo',   href: '/admin/jogos',          accent: 'green' as const },
  { icon: Map,           label: 'Mapa',            desc: 'Setores e equipe em campo', href: '/mapa',                 accent: 'green' as const },
  { icon: Music,         label: 'Shows & Festas',  desc: 'Rundown ao vivo',           href: '/admin/shows',          accent: 'gold'  as const },
  { icon: Heart,         label: 'Patrocinadores',  desc: 'Escopo e entregas',         href: '/admin/patrocinadores', accent: 'gold'  as const },
  { icon: Trophy,        label: 'Modalidades',     desc: 'Esportivas + cheer',        href: '/admin/modalidades',    accent: 'gold'  as const },
  { icon: Lightbulb,     label: 'Pautas',          desc: 'Roaming e ideias',          href: '/pautas',               accent: 'green' as const },
  { icon: BookOpen,      label: 'Wiki',            desc: 'Briefings por função',      href: '/wiki',                 accent: 'green' as const },
  { icon: Calendar,      label: 'Cronograma',      desc: 'Programação do evento',     href: '/cronograma',           accent: 'gold'  as const },
  { icon: Cloud,         label: 'Clima',           desc: 'Previsão por dia',          href: null,                    accent: 'dim'   as const },
]

const ACCENT_STYLES = {
  green: {
    iconBg:   'rgba(74,138,92,0.18)',
    iconText: '#6ab87e',
    hoverBorder: 'rgba(74,138,92,0.35)',
    hoverGlow:   'rgba(74,138,92,0.12)',
    chevron: '#6ab87e',
  },
  gold: {
    iconBg:   'rgba(200,151,58,0.15)',
    iconText: '#e8b94f',
    hoverBorder: 'rgba(200,151,58,0.35)',
    hoverGlow:   'rgba(200,151,58,0.10)',
    chevron: '#e8b94f',
  },
  dim: {
    iconBg:   'rgba(255,255,255,0.05)',
    iconText: '#4e7055',
    hoverBorder: 'transparent',
    hoverGlow:   'transparent',
    chevron: '#4e7055',
  },
}

// ── Per-module gradient config (macOS-style icon colors) ─────────────────────
const MODULE_GRADIENTS: Record<string, { from: string; to: string; glow: string }> = {
  'Conteúdos':      { from: '#0f3d22', to: '#1e7a43', glow: 'rgba(30,122,67,0.70)'  },
  'Checklists':     { from: '#064e3b', to: '#059669', glow: 'rgba(5,150,105,0.65)'  },
  'Escala':         { from: '#78350f', to: '#d97706', glow: 'rgba(217,119,6,0.65)'  },
  'Jogos':          { from: '#0c4a6e', to: '#0284c7', glow: 'rgba(2,132,199,0.65)'  },
  'Mapa':           { from: '#14401a', to: '#3d8b2a', glow: 'rgba(61,139,42,0.65)'  },
  'Shows & Festas': { from: '#4c1d95', to: '#7c3aed', glow: 'rgba(124,58,237,0.65)' },
  'Patrocinadores': { from: '#7c2d12', to: '#ea580c', glow: 'rgba(234,88,12,0.65)'  },
  'Modalidades':    { from: '#713f12', to: '#ca8a04', glow: 'rgba(202,138,4,0.65)'  },
  'Pautas':         { from: '#083344', to: '#0891b2', glow: 'rgba(8,145,178,0.65)'  },
  'Wiki':           { from: '#1e1b4b', to: '#4338ca', glow: 'rgba(67,56,202,0.65)'  },
  'Cronograma':     { from: '#881337', to: '#e11d48', glow: 'rgba(225,29,72,0.65)'  },
  'Clima':          { from: '#1c2532', to: '#2e3e52', glow: 'rgba(46,62,82,0.40)'   },
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
  const scoreColor = isHealthy ? '#6ab87e' : isWarning ? '#e8b94f' : '#f87171'

  return (
    <div
      style={{ filter: `drop-shadow(0 0 18px ${glowColor})`, transition: 'filter 1.2s ease' }}
    >
      <svg width="130" height="130" viewBox="0 0 100 100">
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

        {/* Outer subtle ring */}
        <circle cx="50" cy="50" r="49" fill="none"
          stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

        {/* Track */}
        <circle cx="50" cy="50" r={R} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth="9" />

        {/* Progress */}
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

        {/* Center: score */}
        <text
          x="50" y="44"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="22"
          fontWeight="700"
          fontFamily="Orbitron, monospace"
          fill="white"
        >
          {drawn}
        </text>
        <text
          x="50" y="57"
          textAnchor="middle"
          fontSize="7"
          fontFamily="system-ui, sans-serif"
          fill="rgba(255,255,255,0.35)"
          letterSpacing="2.5"
        >
          HEALTH
        </text>
        <text
          x="50" y="66"
          textAnchor="middle"
          fontSize="9"
          fontFamily="Orbitron, monospace"
          fill={scoreColor}
          fontWeight="700"
        >
          %
        </text>
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
    { key: 'publicado',   label: 'Publicado',   count: stats.publicado,   color: '#6ab87e', done: true  },
  ]

  const maxCount = Math.max(...stages.map(s => s.count), 1)

  // Bottleneck = stage with most items, not yet done
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
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {stage.label}
                </span>
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

            <div className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
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
              color: deliveryPct >= 70 ? '#6ab87e' : deliveryPct >= 40 ? '#e8b94f' : '#f87171',
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
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.04)',
        transition: `background 0.5s ease ${delay}`,
      }
    }

    const alpha = 0.15 + intensity * 0.7
    const glow = intensity > 0.6
      ? `0 0 10px rgba(74,138,92,${(intensity * 0.5).toFixed(2)})`
      : 'none'

    return {
      background: mounted ? `rgba(74,138,92,${alpha.toFixed(2)})` : 'rgba(255,255,255,0.025)',
      border: `1px solid rgba(74,138,92,${(alpha * 0.6).toFixed(2)})`,
      boxShadow: mounted ? glow : 'none',
      transition: `background 0.6s ease ${delay}, box-shadow 0.6s ease ${delay}`,
    }
  }

  return (
    <div>
      {/* Day column headers */}
      <div className="mb-2 flex" style={{ paddingLeft: '5.5rem' }}>
        {DAY_LABELS.map(d => (
          <div key={d} className="flex-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {d}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="space-y-1.5">
        {matrix.map(({ tipo, label, days }, rowIdx) => (
          <div key={tipo} className="flex items-center gap-3">
            {/* Row label */}
            <div className="w-20 shrink-0 text-right text-[10px] font-semibold text-[var(--muted-foreground)] truncate leading-tight">
              {label}
            </div>

            {/* Cells */}
            <div className="flex flex-1 gap-1.5">
              {days.map((val, colIdx) => (
                <div
                  key={colIdx}
                  title={val > 0 ? `${label} · ${DAY_LABELS[colIdx]}: ${val}` : undefined}
                  className="relative flex-1 rounded-md"
                  style={{ height: 30, cursor: val > 0 ? 'default' : 'default', ...cellStyle(val, rowIdx, colIdx) }}
                >
                  {val > 0 && mounted && (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        color: val / maxVal > 0.5 ? 'rgba(255,255,255,0.9)' : '#6ab87e',
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

      {/* Legend */}
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
// Module Grid — macOS Launchpad style
// ─────────────────────────────────────────────────────────────────────────────

function ModuleGrid() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-8">
      {MODULES.map(({ icon: Icon, label, desc, href }, i) => {
        const ready = href !== null
        const grad = MODULE_GRADIENTS[label] ?? { from: '#1e293b', to: '#334155', glow: 'rgba(51,65,85,0.35)' }
        const isHov = hovered === i

        const tile = (
          <div
            className="cia-fade-in flex flex-col items-center"
            style={{ width: 80, animationDelay: `${i * 42}ms`, cursor: ready ? 'pointer' : 'default' }}
            onMouseEnter={() => ready && setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* App icon bubble */}
            <div style={{
              position: 'relative',
              width: 68,
              height: 68,
              borderRadius: 17,
              background: ready
                ? `linear-gradient(148deg, ${grad.from} 0%, ${grad.to} 100%)`
                : 'rgba(18,28,20,0.55)',
              transform: isHov ? 'scale(1.18) translateY(-7px)' : 'scale(1) translateY(0)',
              transition: 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease',
              boxShadow: isHov && ready
                ? `0 24px 60px ${grad.glow}, 0 8px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.24)`
                : ready
                ? `0 5px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.13)`
                : '0 2px 8px rgba(0,0,0,0.22)',
              opacity: ready ? 1 : 0.22,
              overflow: 'hidden',
            }}>
              {/* Specular top gloss — macOS icon hallmark */}
              {ready && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '52%',
                  background: 'linear-gradient(180deg,rgba(255,255,255,0.26) 0%,rgba(255,255,255,0.02) 100%)',
                  borderRadius: '17px 17px 56% 56% / 17px 17px 22px 22px',
                  pointerEvents: 'none',
                  zIndex: 1,
                }} />
              )}
              {/* Bottom depth vignette */}
              {ready && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '28%',
                  background: 'linear-gradient(0deg,rgba(0,0,0,0.28) 0%,transparent 100%)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }} />
              )}
              {/* Icon */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
              }}>
                <Icon style={{
                  width: 28, height: 28,
                  color: ready ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.13)',
                  filter: isHov && ready
                    ? 'drop-shadow(0 2px 14px rgba(255,255,255,0.55))'
                    : 'drop-shadow(0 1px 4px rgba(0,0,0,0.45))',
                  transition: 'filter 0.28s ease',
                }} />
              </div>
            </div>

            {/* Label + hover desc */}
            <div style={{ marginTop: 9, textAlign: 'center', width: 80 }}>
              <span style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.35,
                letterSpacing: '0.01em',
                color: ready ? (isHov ? '#e2f0e5' : '#6b9071') : '#263028',
                transition: 'color 0.2s ease',
              }}>
                {label}
              </span>
              <span style={{
                display: 'block',
                marginTop: 3,
                fontSize: 9,
                lineHeight: 1.3,
                letterSpacing: '0.02em',
                color: 'rgba(128,172,138,0.75)',
                opacity: isHov ? 1 : 0,
                transform: isHov ? 'translateY(0)' : 'translateY(5px)',
                transition: 'opacity 0.22s ease, transform 0.22s ease',
              }}>
                {ready ? desc : '— em breve'}
              </span>
            </div>
          </div>
        )

        return href ? (
          <Link key={label} href={href} style={{ textDecoration: 'none', display: 'block' }}>
            {tile}
          </Link>
        ) : (
          <div key={label}>{tile}</div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
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
}: Props) {
  const pct = contentStats.total > 0
    ? Math.round((contentStats.publicado / contentStats.total) * 100)
    : 0

  const healthLabel =
    contentStats.total === 0 ? 'Aguardando conteúdos'
    : pct >= 70             ? 'Cobertura saudável'
    : pct >= 40             ? 'Atenção necessária'
                            : 'Risco de entrega'

  const healthIcon =
    pct >= 70 ? TrendingUp
    : pct >= 40 ? AlertTriangle
    : Zap

  const HealthIcon = healthIcon
  const healthColor =
    pct >= 70 ? '#6ab87e'
    : pct >= 40 ? '#e8b94f'
    : '#f87171'

  return (
    <main className="relative z-10 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="cia-fade-in">
          <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: 'var(--gold)' }}>
            Copa Inter Atléticas 2026 · Uberaba/MG
          </p>
          <h1
            className="mt-2 text-4xl font-bold tracking-tight cia-gold-text sm:text-5xl"
            style={{ fontFamily: 'Orbitron, sans-serif', lineHeight: 1.1 }}
          >
            Painel da CIA
          </h1>
          <div className="cia-gold-rule mt-3 w-48" />
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            04–07 de junho · Central de comando da cobertura audiovisual
          </p>
        </div>

        {/* ── Countdown + Weather ───────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">

          {/* Countdown */}
          <div
            className="cia-glass rounded-2xl px-5 py-5"
            style={{ border: '1px solid rgba(200,151,58,0.2)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
              Contagem regressiva
            </p>
            {eventActive ? (
              <p
                className="mt-2 text-2xl font-bold cia-green-text"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                🟢 AO VIVO
              </p>
            ) : (
              <>
                <p
                  className="mt-1 font-bold leading-none cia-gold-text tabular-nums"
                  style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 64 }}
                >
                  {diffDays}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {diffDays === 1 ? 'dia para o evento' : 'dias para o evento'}
                </p>
              </>
            )}
            <div
              className="mt-4 h-px w-full"
              style={{ background: 'linear-gradient(90deg, var(--gold-dim), transparent)' }}
            />
            <p className="mt-3 text-[10px] text-[var(--muted-foreground)]/60">
              04 jun 2026 · Uberaba, MG
            </p>
          </div>

          {/* Weather */}
          <div
            className="cia-glass col-span-2 rounded-2xl px-5 py-5"
            style={{ border: '1px solid rgba(74,138,92,0.15)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
              Previsão · dias do evento
            </p>
            {weatherDays && weatherDays.length > 0 ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {weatherDays.map(day => (
                  <div
                    key={day.label}
                    className="rounded-xl border p-2.5 text-center transition-all hover:border-[var(--green-dim)] hover:bg-[var(--green-dim)]/10"
                    style={{ background: 'rgba(6,12,7,0.6)', borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <p className="text-[10px] font-semibold text-[var(--muted-foreground)]">{day.label}</p>
                    <p className="my-1.5 text-2xl">{day.emoji}</p>
                    <p className="text-xs font-bold text-[var(--foreground)]">{day.tMax}° / {day.tMin}°</p>
                    <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                      <Droplets className="h-2.5 w-2.5" />
                      {day.rain}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <Cloud className="h-10 w-10 text-[var(--muted-foreground)] opacity-20" />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Previsão indisponível</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]/70">
                    Modelos cobrem ~14 dias. Disponível a partir de 21/mai.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Health Score + Bottleneck ─────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Health Score */}
          <div
            className="cia-glass rounded-2xl px-6 py-6"
            style={{
              border: '1px solid rgba(74,138,92,0.22)',
              boxShadow: '0 0 60px rgba(74,138,92,0.06) inset',
            }}
          >
            <div className="mb-5 flex items-center justify-between">
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
              <Activity className="h-5 w-5 text-[var(--green-dim)] opacity-60" />
            </div>

            <div className="flex items-center gap-6">
              <HealthRing pct={pct} />

              <div className="flex-1 space-y-2.5">
                {[
                  { label: 'Total',       val: contentStats.total,       color: '#c8dccb' },
                  { label: 'Publicados',  val: contentStats.publicado,   color: '#6ab87e' },
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

          {/* Bottleneck Detector */}
          <div
            className="cia-glass-gold rounded-2xl px-6 py-6"
            style={{
              border: '1px solid rgba(200,151,58,0.18)',
              boxShadow: '0 0 60px rgba(200,151,58,0.04) inset',
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                  Detector de Gargalo
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
                  Pipeline de conteúdo
                </p>
              </div>
              <Gauge className="h-5 w-5 text-[var(--gold-dim)] opacity-70" />
            </div>
            <BottleneckDetector stats={contentStats} />
          </div>
        </div>

        {/* ── Activity Heatmap ──────────────────────────────────────────── */}
        <div
          className="cia-glass rounded-2xl px-6 py-6"
          style={{ border: '1px solid rgba(74,138,92,0.14)' }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                Heatmap de Atividade
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
                Cobertura por tipo × dia de evento
              </p>
            </div>
            <Layers className="h-5 w-5 text-[var(--green-dim)] opacity-60" />
          </div>
          <ActivityHeatmap data={heatmapData} />
        </div>

        {/* ── Dashboard Operador ───────────────────────────────────────── */}
        {isOperador && (
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Minha escala hoje */}
            <div
              className="cia-glass rounded-2xl px-5 py-5"
              style={{ border: '1px solid rgba(74,138,92,0.15)' }}
            >
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
                      style={{
                        borderColor: 'rgba(74,138,92,0.15)',
                        background: 'rgba(74,138,92,0.06)',
                      }}
                    >
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background: '#6ab87e',
                          boxShadow: '0 0 6px rgba(106,184,126,0.8)',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold capitalize">
                          {t.funcao.replace(/_/g, ' ')}
                        </p>
                        {t.setor && (
                          <p className="text-[10px] text-[var(--muted-foreground)]">{t.setor.nome}</p>
                        )}
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

            {/* Checklists ativos */}
            <div
              className="cia-glass rounded-2xl px-5 py-5"
              style={{ border: '1px solid rgba(200,151,58,0.12)' }}
            >
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
                          className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all"
                          style={{
                            borderColor: 'rgba(255,255,255,0.05)',
                            background: 'rgba(6,12,7,0.5)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(200,151,58,0.25)'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.05)'
                          }}
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
        )}

        {/* ── Coordination Dashboard ───────────────────────────────────── */}
        {isCoord && (
          <CoordDashboard
            conteudosHoje={coordConteudosHoje}
            jogosHoje={coordJogosHoje}
            showsHoje={coordShowsHoje}
            festasHoje={coordFestasHoje}
            turnosHoje={coordTurnosHoje}
            patrocinadores={coordPatrocinadores}
            conteudosPorPatrocinador={coordConteudosPorPatrocinador}
            checklistItens={coordChecklistItens}
          />
        )}

        {/* ── Module Grid ───────────────────────────────────────────────── */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
              Módulos do sistema
            </p>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }} />
          </div>
          <ModuleGrid />
        </div>

        {/* ── Status bar ───────────────────────────────────────────────── */}
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-3.5 text-xs backdrop-blur-sm"
          style={{
            borderColor: 'rgba(74,138,92,0.18)',
            background: 'rgba(13,26,15,0.5)',
          }}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: '#6ab87e', boxShadow: '0 0 8px rgba(106,184,126,0.8)' }}
          />
          <span className="font-semibold" style={{ color: '#6ab87e' }}>Sistema operacional</span>
          <span className="text-[var(--muted-foreground)]">·</span>
          <span className="text-[var(--muted-foreground)]">Supabase · RLS ativo</span>
          <div className="ml-auto flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-50" />
            <span className="text-[var(--muted-foreground)]">04–07 jun 2026</span>
          </div>
        </div>

      </div>
    </main>
  )
}
