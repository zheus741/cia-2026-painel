'use client'

import { useEffect, useState } from 'react'
import { Droplets, Cloud } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors HomeClient)
// ─────────────────────────────────────────────────────────────────────────────

interface ContentStats {
  total: number; rascunho: number; em_producao: number; publicado: number
}

interface HeatCell { tipo: string; dia: number; count: number }

interface WeatherDay {
  label: string; tMax: number; tMin: number; rain: number; emoji: string
}

interface MetricsProps {
  contentStats: ContentStats
  heatmapData:  HeatCell[]
  weatherDays:  WeatherDay[] | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Qui 04', 'Sex 05', 'Sáb 06', 'Dom 07']
const TIPOS_HEATMAP = ['reels', 'feed', 'stories', 'material_youtube', 'foto', 'video']
const TIPO_LABELS: Record<string, string> = {
  reels: 'Reels', feed: 'Feed', stories: 'Stories',
  material_youtube: 'YouTube', foto: 'Foto', video: 'Vídeo',
}

// ─────────────────────────────────────────────────────────────────────────────
// HealthRing — refined for editorial cream card
// ─────────────────────────────────────────────────────────────────────────────

function HealthRing({ pct }: { pct: number }) {
  const [drawn, setDrawn] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setDrawn(pct), 180)
    return () => clearTimeout(t)
  }, [pct])

  const R = 64
  const C = 2 * Math.PI * R
  const offset = C - (drawn / 100) * C
  const isHealthy = pct >= 70
  const isWarning = pct >= 40 && pct < 70
  const stops = isHealthy
    ? ['#2e6b42', '#4aa066']
    : isWarning
    ? ['#E8B82F', '#F0D04A']
    : ['#C46B4A', '#D8845F']

  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="cia-ring-grad-v2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={stops[0]} />
            <stop offset="100%" stopColor={stops[1]} />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(10,15,11,0.06)" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={R}
          fill="none"
          stroke="url(#cia-ring-grad-v2)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 44, fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: '#0A0F0B',
        }}>
          {drawn}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(10,15,11,0.45)',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          marginTop: 2,
        }}>
          %
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HealthCard — cream, with ring + breakdown
// ─────────────────────────────────────────────────────────────────────────────

function HealthCard({ stats }: { stats: ContentStats }) {
  const pct = stats.total > 0
    ? Math.round((stats.publicado / stats.total) * 100)
    : 0

  const label =
    stats.total === 0 ? 'aguardando' :
    pct >= 70   ? 'saudável' :
    pct >= 40   ? 'atenção'  :
                  'crítico'

  const labelColor =
    stats.total === 0 ? 'rgba(10,15,11,0.40)' :
    pct >= 70   ? '#2e6b42' :
    pct >= 40   ? '#B58812' :
                  '#A04A2E'

  return (
    <div className="cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 320 }}>
      {/* eyebrow */}
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          saúde do pipeline
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: labelColor,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '3px 10px',
          borderRadius: 999,
          background: stats.total === 0 ? 'rgba(10,15,11,0.06)'
                     : pct >= 70 ? 'rgba(46,107,66,0.10)'
                     : pct >= 40 ? 'rgba(232,184,47,0.18)'
                                 : 'rgba(196,107,74,0.16)',
        }}>
          {label}
        </span>
      </div>

      {/* ring + breakdown */}
      <div className="flex-1 flex items-center gap-6 mt-2">
        <HealthRing pct={pct} />
        <div className="flex-1 space-y-2.5 min-w-0">
          {[
            { label: 'Total',       val: stats.total,       color: '#0A0F0B' },
            { label: 'Publicados',  val: stats.publicado,   color: '#2e6b42' },
            { label: 'Em produção', val: stats.em_producao, color: '#5C68E8' },
            { label: 'Rascunho',    val: stats.rascunho,    color: 'rgba(10,15,11,0.45)' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-baseline justify-between" style={{
              borderBottom: '1px solid rgba(10,15,11,0.06)',
              paddingBottom: 6,
            }}>
              <span style={{
                fontSize: 12.5, fontWeight: 500,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '-0.01em',
              }}>{label}</span>
              <span style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 22, fontWeight: 800,
                color, letterSpacing: '-0.03em',
              }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BottleneckCard — gold, pipeline bars
// ─────────────────────────────────────────────────────────────────────────────

function BottleneckCard({ stats }: { stats: ContentStats }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 250)
    return () => clearTimeout(t)
  }, [])

  const stages = [
    { key: 'rascunho',    label: 'Rascunho',    count: stats.rascunho,    barColor: 'rgba(10,15,11,0.55)',                                                done: false },
    { key: 'em_producao', label: 'Em produção', count: stats.em_producao, barColor: 'linear-gradient(90deg, #5C68E8 0%, #3D49E0 100%)',                  done: false },
    { key: 'publicado',   label: 'Publicado',   count: stats.publicado,   barColor: 'linear-gradient(90deg, #2e6b42 0%, #4aa066 100%)',                  done: true  },
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
    <div className="cia-edit-card cia-edit-card--gold cia-metrics-cell" style={{ minHeight: 320 }}>
      {/* eyebrow */}
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(70,50,5,0.65)',
          letterSpacing: '-0.01em',
        }}>
          detector de gargalo
        </span>
        {bottleneck && bottleneck.count > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: '#46320C',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.45)',
            border: '1px solid rgba(70,50,5,0.18)',
          }}>
            ⚡ {bottleneck.label}
          </span>
        )}
      </div>

      {/* heading */}
      <h3 style={{
        marginTop: 4,
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: 26, fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#0A0F0B',
        lineHeight: 1.05,
      }}>
        Pipeline
      </h3>

      {/* bars */}
      <div className="flex-1 flex flex-col justify-center gap-4 mt-4">
        {stages.map((stage, i) => {
          const isBottleneck = bottleneck?.key === stage.key && stage.count > 0
          const barW = mounted ? Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 4 : 0) : 0
          return (
            <div key={stage.key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: isBottleneck ? '#46320C' : 'rgba(10,15,11,0.75)',
                  letterSpacing: '-0.01em',
                }}>
                  {stage.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 22, fontWeight: 800,
                  color: '#0A0F0B', letterSpacing: '-0.03em',
                }}>
                  {stage.count}
                </span>
              </div>
              <div style={{
                height: 8, borderRadius: 999,
                background: 'rgba(255,255,255,0.40)',
                border: '1px solid rgba(70,50,5,0.10)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${barW}%`,
                  background: isBottleneck
                    ? 'linear-gradient(90deg, #B58812 0%, #E8B82F 100%)'
                    : stage.barColor,
                  transition: `width 1s cubic-bezier(0.16, 1, 0.3, 1) ${i * 180}ms`,
                  boxShadow: isBottleneck ? '0 0 12px rgba(232,184,47,0.55)' : 'none',
                  borderRadius: 999,
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* footer */}
      <div className="mt-4 pt-3 flex items-baseline justify-between" style={{
        borderTop: '1px solid rgba(70,50,5,0.12)',
      }}>
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(70,50,5,0.65)',
        }}>
          {stats.total} totais
        </span>
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 18, fontWeight: 800,
          color: '#0A0F0B',
          letterSpacing: '-0.02em',
        }}>
          {deliveryPct}<span style={{ fontSize: 12, color: 'rgba(10,15,11,0.45)', fontWeight: 700 }}>% entregues</span>
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WeatherCard — terracotta, 4-day forecast
// ─────────────────────────────────────────────────────────────────────────────

function WeatherCard({ days }: { days: WeatherDay[] | null }) {
  if (!days || days.length === 0) {
    return (
      <div className="cia-edit-card cia-edit-card--terracotta cia-metrics-cell" style={{ minHeight: 320 }}>
        <div className="flex items-center justify-between">
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '-0.01em',
          }}>
            previsão · 4 dias
          </span>
          <Cloud style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.65)' }} />
        </div>
        <div className="flex-1 flex items-center justify-center flex-col gap-2">
          <Cloud style={{ width: 36, height: 36, color: 'rgba(255,255,255,0.30)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            Indisponível
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
            Disponível a partir de 21/mai
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="cia-edit-card cia-edit-card--terracotta cia-metrics-cell" style={{ minHeight: 320 }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '-0.01em',
        }}>
          previsão · uberaba
        </span>
        <Cloud style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.65)' }} />
      </div>

      <h3 style={{
        marginTop: 4,
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: 26, fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#FFFFFF',
        lineHeight: 1.05,
      }}>
        Clima
      </h3>

      <div className="flex-1 grid grid-cols-2 gap-2 mt-4">
        {days.map(day => (
          <div key={day.label} style={{
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 16,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div className="flex items-baseline justify-between">
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {day.label}
              </span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{day.emoji}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 26, fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}>
                {day.tMax}°
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '-0.01em',
              }}>
                / {day.tMin}°
              </span>
            </div>
            <div className="flex items-center gap-1" style={{
              fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600,
            }}>
              <Droplets style={{ width: 10, height: 10 }} />
              {day.rain}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeatmapCard — lavender, full-width activity matrix
// ─────────────────────────────────────────────────────────────────────────────

function HeatmapCard({ data }: { data: HeatCell[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 450)
    return () => clearTimeout(t)
  }, [])

  const matrix = TIPOS_HEATMAP.map(tipo => ({
    tipo,
    label: TIPO_LABELS[tipo] ?? tipo,
    days: [1, 2, 3, 4].map(d => data.find(c => c.tipo === tipo && c.dia === d)?.count ?? 0),
  }))
  const maxVal = Math.max(...matrix.flatMap(r => r.days), 1)
  const totalContent = matrix.reduce((sum, r) => sum + r.days.reduce((s, v) => s + v, 0), 0)

  // Returns variant: empty / hatch (low) / solid (high)
  function cellMeta(val: number) {
    if (val === 0) return { variant: 'empty' as const, intensity: 0 }
    const intensity = val / maxVal
    return {
      variant: intensity >= 0.55 ? ('solid' as const) : ('hatch' as const),
      intensity,
    }
  }

  return (
    <div className="cia-edit-card cia-edit-card--lavender cia-metrics-cell" style={{ minHeight: 320 }}>
      <div className="flex items-start justify-between">
        <div>
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(45,27,92,0.65)',
            letterSpacing: '-0.01em',
          }}>
            atividade · 04 a 07 jun
          </span>
          <h3 style={{
            marginTop: 4,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 30, fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#0A0F0B',
            lineHeight: 1.0,
          }}>
            Cobertura
          </h3>
          <p style={{
            marginTop: 4,
            fontSize: 13, fontWeight: 500,
            color: 'rgba(45,27,92,0.55)',
            letterSpacing: '-0.01em',
          }}>
            Por tipo × dia do evento
          </p>
        </div>
        <div style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 36, fontWeight: 800,
          color: '#0A0F0B',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}>
          {totalContent}
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(45,27,92,0.55)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: 4,
            textAlign: 'right',
          }}>
            conteúdos
          </div>
        </div>
      </div>

      {/* day headers */}
      <div className="mt-5 flex" style={{ paddingLeft: 90 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 10, fontWeight: 700,
            color: 'rgba(45,27,92,0.55)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* matrix */}
      <div className="space-y-1.5 mt-2 flex-1">
        {matrix.map(({ tipo, label, days }, rowIdx) => (
          <div key={tipo} className="flex items-center gap-3">
            <div style={{
              width: 78, flexShrink: 0,
              textAlign: 'right',
              fontSize: 12, fontWeight: 600,
              color: 'rgba(10,15,11,0.65)',
              letterSpacing: '-0.01em',
            }}>
              {label}
            </div>
            <div className="flex flex-1 gap-1.5">
              {days.map((val, colIdx) => {
                const meta = cellMeta(val)
                const delay = `${(rowIdx * 4 + colIdx) * 30}ms`
                const cellClass =
                  meta.variant === 'empty' ? 'cia-heat-cell cia-heat-cell--empty' :
                  meta.variant === 'solid' ? 'cia-heat-cell cia-heat-cell--solid' :
                  'cia-heat-cell cia-heat-cell--hatch'

                // Color: terracotta-based, intensity scales saturation
                const heatColor = meta.variant === 'solid'
                  ? '#C46B4A'
                  : '#D8845F'
                const heatBorder = meta.variant === 'solid'
                  ? 'rgba(120,60,40,0.45)'
                  : 'rgba(196,107,74,0.30)'

                return (
                  <div
                    key={colIdx}
                    title={val > 0 ? `${label} · ${DAY_LABELS[colIdx]}: ${val}` : undefined}
                    className={`${cellClass} relative flex-1`}
                    style={{
                      height: 34,
                      transition: `opacity 0.6s ease ${delay}, transform 0.18s`,
                      opacity: mounted ? 1 : 0.2,
                      ['--heat-color'  as string]: heatColor,
                      ['--heat-border' as string]: heatBorder,
                    } as React.CSSProperties}
                  >
                    {val > 0 && mounted && (
                      <span style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12, fontWeight: 800,
                        color: meta.variant === 'solid' ? '#FFFFFF' : '#5A2A18',
                        letterSpacing: '-0.02em',
                        textShadow: meta.variant === 'solid' ? '0 1px 2px rgba(0,0,0,0.20)' : 'none',
                      }}>
                        {val}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* legend — hatch + solid */}
      <div className="mt-4 flex items-center justify-end gap-2" style={{
        fontSize: 10, fontWeight: 700,
        color: 'rgba(45,27,92,0.50)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        <span>vazio</span>
        <div className="cia-heat-cell cia-heat-cell--empty" style={{ width: 18, height: 18 }} />
        <div
          className="cia-heat-cell cia-heat-cell--hatch"
          style={{
            width: 18, height: 18,
            ['--heat-color' as string]: '#D8845F',
          } as React.CSSProperties}
        />
        <div
          className="cia-heat-cell cia-heat-cell--solid"
          style={{
            width: 18, height: 18,
            ['--heat-color'  as string]: '#C46B4A',
            ['--heat-border' as string]: 'rgba(120,60,40,0.45)',
          } as React.CSSProperties}
        />
        <span>pico</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeMetrics — exported component
// ─────────────────────────────────────────────────────────────────────────────

export function HomeMetrics({ contentStats, heatmapData, weatherDays }: MetricsProps) {
  return (
    <section style={{ padding: '8px 24px 32px' }}>
      <div className="mx-auto max-w-7xl">

        {/* heading */}
        <div className="mb-6 flex items-baseline justify-between">
          <h2 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(28px, 3vw, 40px)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: '#0A0F0B',
          }}>
            Pulso da operação
          </h2>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            atualizado agora
          </span>
        </div>

        {/* row 1: 3 cards */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          <div className="cia-metrics-col-4">
            <HealthCard stats={contentStats} />
          </div>
          <div className="cia-metrics-col-4">
            <BottleneckCard stats={contentStats} />
          </div>
          <div className="cia-metrics-col-4">
            <WeatherCard days={weatherDays} />
          </div>
        </div>

        {/* row 2: full-width heatmap */}
        <div className="mt-4">
          <HeatmapCard data={heatmapData} />
        </div>
      </div>
    </section>
  )
}
