'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  LINEUP, STAGES, DAY_IDS, toMin, hourLabel,
  type DayId, type Perf, type StageId, type StageConfig,
} from '@/lib/lineup-data'
import { useNowPlaying } from '@/lib/use-now-playing'
import { NowPlayingPanel } from '@/components/now-playing-panel'

const SANS = 'var(--font-dm-sans), system-ui, sans-serif'
const PX = 2.0                    // pixels por minuto — bem mais arejado
const HEADER_H = 68
const TIME_COL_W = 68

// ── Helpers ──────────────────────────────────────────────────────────────────

interface CardLayout {
  showTimeEyebrow: boolean
  showNoteChip:   boolean
  showDurFooter:  boolean
  showLiveBadge:  boolean
  titleSize:      number
  padding:        string
  align:          'space-between' | 'center'
}

/** Decide o que cabe no card baseado na altura disponível (PX=2.0). */
function getCardLayout(height: number, isLive: boolean, hasNote: boolean): CardLayout {
  // < 75px (= até ~37min): só nome
  if (height < 75) {
    return {
      showTimeEyebrow: false,
      showNoteChip: false,
      showDurFooter: false,
      showLiveBadge: isLive,
      titleSize: 13,
      padding: '8px 12px',
      align: 'center',
    }
  }
  // 75-110px (= 37-55min): horário + nome (sem chip, sem footer)
  if (height < 110) {
    return {
      showTimeEyebrow: true,
      showNoteChip: false,
      showDurFooter: false,
      showLiveBadge: isLive,
      titleSize: 15,
      padding: '10px 14px',
      align: 'space-between',
    }
  }
  // 110-160px (= 55-80min): tudo, fontes médias
  if (height < 160) {
    return {
      showTimeEyebrow: true,
      showNoteChip: hasNote,
      showDurFooter: true,
      showLiveBadge: isLive,
      titleSize: 17,
      padding: '12px 16px',
      align: 'space-between',
    }
  }
  // ≥ 160px (= ≥80min): tudo grande
  return {
    showTimeEyebrow: true,
    showNoteChip: hasNote,
    showDurFooter: true,
    showLiveBadge: isLive,
    titleSize: height > 240 ? 24 : 20,
    padding: '14px 18px',
    align: 'space-between',
  }
}

// ── Live pulse dot (para badge "NO AR" nos cards) ────────────────────────────

function LivePulseDot({ color = '#FF4444' }: { color?: string }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: 7, height: 7,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <span style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: color,
        opacity: 0.55,
        animation: 'lineup-ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      <span style={{
        position: 'relative',
        width: 7, height: 7,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
      }} />
    </span>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export function LineupClient() {
  const nowPlaying = useNowPlaying()
  const [activeDay, setActiveDay] = useState<DayId>('qui')

  // Auto-seleciona o dia atual quando o componente monta dentro do evento
  useEffect(() => {
    if (nowPlaying.todayDayId) {
      setActiveDay(nowPlaying.todayDayId)
    }
  }, [nowPlaying.todayDayId])

  const day = LINEUP[activeDay]
  const startMin = toMin(day.rangeStart)
  const endMin   = toMin(day.rangeEnd)
  const totalMin = endMin - startMin
  const gridH    = totalMin * PX

  const firstHour = Math.floor(startMin / 60)
  const lastHour  = Math.ceil(endMin / 60)
  const hourTicks = useMemo(() =>
    Array.from(
      { length: lastHour - firstHour + 1 },
      (_, i) => (firstHour + i) * 60,
    ).filter(m => m >= startMin && m <= endMin),
    [firstHour, lastHour, startMin, endMin],
  )

  const totalArtists =
    day.stages.arena.length + day.stages.principal.length + day.stages.eletronico.length
  const totalHours = Math.round(totalMin / 60)

  const isViewingLiveDay = nowPlaying.isLive && nowPlaying.todayDayId === activeDay

  return (
    <div className="cia-fade-in" style={{ fontFamily: SANS, color: '#0A0F0B' }}>

      {/* CSS pra animação de pulse */}
      <style>{`
        @keyframes lineup-ping {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(2.5); opacity: 0;    }
          100% { transform: scale(2.5); opacity: 0;    }
        }
        @keyframes lineup-live-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,68,68,0.6), 0 0 0 2px rgba(255,68,68,0.85); }
          50%      { box-shadow: 0 0 0 6px rgba(255,68,68,0), 0 0 0 2px rgba(255,68,68,0.85); }
        }
        .lineup-live-card { animation: lineup-live-ring 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lineup-live-card { animation: none; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER EDITORIAL
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 24, flexWrap: 'wrap',
        }}>
          <div>
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
            }}>
              programação musical · 04 a 07 jun
            </span>
            <h1 style={{
              marginTop: 4, marginBottom: 0,
              fontFamily: SANS,
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 0.95,
              color: '#0A0F0B',
            }}>
              Line Up
            </h1>
            <p style={{
              marginTop: 8, marginBottom: 0,
              fontSize: 14, fontWeight: 500,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
              maxWidth: 520,
            }}>
              Três palcos · {totalArtists} atrações no dia · Uberaba MG
            </p>
          </div>

          <div style={{ textAlign: 'right', minWidth: 140 }}>
            <div style={{
              fontFamily: SANS,
              fontSize: 56, fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 0.9,
              color: '#0A0F0B',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {totalArtists}
            </div>
            <div style={{
              marginTop: 6,
              fontSize: 10, fontWeight: 700,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}>
              atrações · {totalHours}h de show
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PAINEL "NO AR AGORA" — só aparece quando é dia do evento
          ═══════════════════════════════════════════════════════════════════ */}
      {nowPlaying.activeDay && (
        <div style={{ marginBottom: 24 }}>
          <NowPlayingPanel />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          DAY TABS
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        role="tablist"
        aria-label="Selecionar dia da programação"
        style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}
      >
        {DAY_IDS.map(id => {
          const d = LINEUP[id]
          const active = activeDay === id
          const isToday = nowPlaying.todayDayId === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              aria-controls={`lineup-grid-${id}`}
              onClick={() => setActiveDay(id)}
              style={{
                position: 'relative',
                minHeight: 56,
                padding: '10px 18px',
                borderRadius: 14,
                border: active ? '1px solid #0A0F0B' : '1px solid var(--border)',
                background: active ? '#0A0F0B' : 'var(--card)',
                color: active ? '#FAF7F0' : '#0A0F0B',
                cursor: 'pointer',
                transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s',
                textAlign: 'left',
                fontFamily: SANS,
                boxShadow: active
                  ? '0 2px 0 rgba(10,15,11,0.04), 0 8px 24px rgba(10,15,11,0.18)'
                  : '0 1px 0 rgba(10,15,11,0.04)',
                minWidth: 100,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              {/* Indicador "HOJE" — pulse vermelho se for o dia do evento agora */}
              {isToday && (
                <div style={{
                  position: 'absolute',
                  top: 8, right: 8,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <LivePulseDot />
                </div>
              )}
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: active ? 'rgba(250,247,240,0.6)' : 'rgba(10,15,11,0.55)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {d.wd}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {d.date}
              </div>
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LEGENDA + RANGE DE HORAS
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 14,
        marginBottom: 14, paddingLeft: 2,
        alignItems: 'center',
      }}>
        {STAGES.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                width: 14, height: 14,
                borderRadius: 4,
                background: s.blockBg,
                boxShadow: `inset 0 0 0 1px ${s.accentRing}`,
                flexShrink: 0,
              }}
            />
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'rgba(10,15,11,0.7)',
              letterSpacing: '-0.01em',
            }}>
              {s.name}
            </span>
          </div>
        ))}
        <div style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 600,
          color: 'rgba(10,15,11,0.4)',
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {day.rangeStart} <span style={{ opacity: 0.4 }}>→</span> {day.rangeEnd}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          GRADE
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        id={`lineup-grid-${activeDay}`}
        role="tabpanel"
        aria-label={`Programação de ${day.label}`}
        style={{
          position: 'relative',
          overflowX: 'auto',
          overflowY: 'visible',
          borderRadius: 20,
          border: '1px solid rgba(10,15,11,0.10)',
          background: 'var(--card)',
          boxShadow: '0 1px 0 rgba(10,15,11,0.04), 0 8px 32px rgba(10,15,11,0.06)',
        }}
      >
        <div style={{ display: 'flex', minWidth: 760, position: 'relative' }}>

          {/* ─── Coluna de horas ────────────────────────────────────────── */}
          <div style={{
            width: TIME_COL_W,
            flexShrink: 0,
            position: 'relative',
            height: gridH + HEADER_H + 24,
            borderRight: '1px solid rgba(10,15,11,0.08)',
            background: 'rgba(10,15,11,0.015)',
          }}>
            <div style={{
              height: HEADER_H,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 14,
              borderBottom: '1px solid rgba(10,15,11,0.08)',
            }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.42)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}>
                hora
              </span>
            </div>

            {hourTicks.map(absMin => {
              const y = HEADER_H + (absMin - startMin) * PX
              return (
                <div
                  key={absMin}
                  style={{
                    position: 'absolute',
                    top: y, left: 0, right: 0,
                    transform: 'translateY(-50%)',
                    textAlign: 'center',
                    fontFamily: SANS,
                    fontSize: 13, fontWeight: 700,
                    color: 'rgba(10,15,11,0.42)',
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}
                >
                  {hourLabel(absMin)}
                </div>
              )
            })}
          </div>

          {/* ─── Colunas de palcos ─────────────────────────────────────── */}
          {STAGES.map(stage => {
            const perfs = day.stages[stage.id as StageId] ?? []
            const isEmpty = perfs.length === 0
            const stagePlay = nowPlaying.stages[stage.id as StageId]

            return (
              <div
                key={stage.id}
                style={{
                  flex: 1,
                  minWidth: 230,
                  position: 'relative',
                  height: gridH + HEADER_H + 24,
                  borderRight: '1px solid rgba(10,15,11,0.08)',
                }}
              >
                {/* Cabeçalho do palco */}
                <div style={{
                  height: HEADER_H,
                  padding: '12px 16px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  background: stage.accentSoft,
                  borderBottom: `2px solid ${stage.accentRing}`,
                  position: 'relative',
                }}>
                  <div style={{
                    fontSize: 9.5, fontWeight: 700,
                    color: 'rgba(10,15,11,0.5)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}>
                    {stage.eyebrow}
                  </div>
                  <div style={{
                    marginTop: 4,
                    fontFamily: SANS,
                    fontSize: 17, fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: stage.accentInk,
                    lineHeight: 1,
                  }}>
                    {stage.name}
                  </div>

                  {/* Badge "NO AR" no header se este palco está com algo tocando */}
                  {isViewingLiveDay && stagePlay.current && (
                    <div style={{
                      position: 'absolute',
                      top: 12, right: 12,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: '#0A0F0B',
                    }}>
                      <LivePulseDot />
                      <span style={{
                        fontSize: 9, fontWeight: 800,
                        color: '#FF7777',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                      }}>
                        no ar
                      </span>
                    </div>
                  )}
                </div>

                {/* Linhas-guia horárias */}
                {hourTicks.map(absMin => {
                  const y = HEADER_H + (absMin - startMin) * PX
                  return (
                    <div
                      key={absMin}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: y, left: 0, right: 0,
                        height: 1,
                        background: 'rgba(10,15,11,0.06)',
                        pointerEvents: 'none',
                      }}
                    />
                  )
                })}

                {/* Empty state */}
                {isEmpty && (
                  <div style={{
                    position: 'absolute',
                    top: HEADER_H + 32,
                    left: 16, right: 16,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px dashed rgba(10,15,11,0.18)',
                    background: 'rgba(10,15,11,0.02)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700,
                      color: 'rgba(10,15,11,0.42)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}>
                      sem programação
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 500,
                      color: 'rgba(10,15,11,0.55)',
                      letterSpacing: '-0.01em',
                    }}>
                      Palco encerra mais cedo neste dia
                    </div>
                  </div>
                )}

                {/* Blocos de atração */}
                {perfs.map((p, i) => {
                  const top    = HEADER_H + (toMin(p.start) - startMin) * PX
                  const height = p.duration * PX
                  const isSpecial = p.special
                  const isLive = isViewingLiveDay && stagePlay.current?.start === p.start
                  const layout = getCardLayout(height, isLive, !!p.note)

                  return (
                    <PerfCard
                      key={`${p.artist}-${p.start}-${i}`}
                      perf={p}
                      stage={stage}
                      top={top}
                      height={height}
                      isSpecial={!!isSpecial}
                      isLive={isLive}
                      layout={layout}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        marginTop: 16,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(10,15,11,0.42)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          Programação sujeita a alterações
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(10,15,11,0.10)', minWidth: 40 }} />
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(10,15,11,0.42)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          CIA 2026 · Uberaba MG
        </div>
      </div>
    </div>
  )
}

// ── PerfCard sub-component ───────────────────────────────────────────────────

interface PerfCardProps {
  perf:      Perf
  stage:     StageConfig
  top:       number
  height:    number
  isSpecial: boolean
  isLive:    boolean
  layout:    CardLayout
}

function PerfCard({ perf, stage, top, height, isSpecial, isLive, layout }: PerfCardProps) {
  const noteTextLight = stage.tone === 'gold' ? '#0A0F0B' : '#FFFFFF'
  const noteTextDark  = isSpecial ? 'rgba(232,184,47,0.95)' : noteTextLight

  return (
    <div
      role="article"
      aria-label={`${perf.artist}${perf.note ? ` (${perf.note})` : ''} no palco ${stage.name} das ${perf.start} às ${perf.end}${isLive ? ' — no ar agora' : ''}`}
      title={`${perf.artist} · ${perf.start}–${perf.end}`}
      tabIndex={0}
      className={isLive ? 'lineup-live-card' : ''}
      style={{
        position: 'absolute',
        top: top + 4,
        left: 8, right: 8,
        height: height - 8,
        background: isSpecial
          ? 'linear-gradient(155deg, #0A0F0B 0%, #1a1f1c 100%)'
          : stage.blockBg,
        borderRadius: 14,
        padding: layout.padding,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: layout.align,
        boxShadow: isLive
          ? `0 0 0 2px #FF4444, 0 8px 20px rgba(255,68,68,0.18)`
          : isSpecial
            ? '0 1px 0 rgba(10,15,11,0.06), 0 8px 24px rgba(10,15,11,0.25)'
            : `0 1px 0 ${stage.accentRing}, 0 4px 12px rgba(10,15,11,0.08)`,
        cursor: 'default',
        transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s',
        border: isSpecial ? '1px solid rgba(232,184,47,0.45)' : 'none',
        outline: 'none',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
      }}
      onFocus={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = `0 0 0 3px rgba(10,15,11,0.85), 0 0 0 5px rgba(232,184,47,0.6)`
      }}
      onBlur={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = isLive
          ? `0 0 0 2px #FF4444, 0 8px 20px rgba(255,68,68,0.18)`
          : isSpecial
            ? '0 1px 0 rgba(10,15,11,0.06), 0 8px 24px rgba(10,15,11,0.25)'
            : `0 1px 0 ${stage.accentRing}, 0 4px 12px rgba(10,15,11,0.08)`
      }}
    >
      <div style={{ minWidth: 0, flex: layout.align === 'center' ? 0 : '0 0 auto' }}>
        {/* Eyebrow: horário OU badge NO AR */}
        {(layout.showTimeEyebrow || layout.showLiveBadge) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 4,
          }}>
            {layout.showLiveBadge && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 6px',
                borderRadius: 999,
                background: '#0A0F0B',
              }}>
                <LivePulseDot />
                <span style={{
                  fontSize: 8.5, fontWeight: 800,
                  color: '#FF7777',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}>
                  no ar
                </span>
              </span>
            )}
            {layout.showTimeEyebrow && (
              <span style={{
                fontFamily: SANS,
                fontSize: 10, fontWeight: 700,
                color: isSpecial ? 'rgba(232,184,47,0.85)' : stage.blockTextMuted,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {perf.start} → {perf.end}
              </span>
            )}
          </div>
        )}

        {/* Título */}
        <div style={{
          fontFamily: SANS,
          fontSize: layout.titleSize,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: isSpecial ? '#FAF7F0' : stage.blockText,
          lineHeight: 1.05,
          wordBreak: 'break-word',
        }}>
          {perf.artist}
        </div>

        {/* Chip de nota */}
        {layout.showNoteChip && perf.note && (
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            marginTop: 8,
            padding: '3px 9px',
            borderRadius: 999,
            background: isSpecial ? 'rgba(232,184,47,0.18)' : stage.chipBg,
            fontFamily: SANS,
            fontSize: 9.5, fontWeight: 700,
            letterSpacing: '0.10em',
            color: noteTextDark,
            textTransform: 'uppercase',
          }}>
            {perf.note}
          </div>
        )}
      </div>

      {/* Footer: duração */}
      {layout.showDurFooter && (
        <div style={{
          fontFamily: SANS,
          fontSize: 11, fontWeight: 600,
          color: isSpecial ? 'rgba(250,247,240,0.55)' : stage.blockTextMuted,
          letterSpacing: '-0.01em',
          marginTop: 6,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {perf.duration} min
        </div>
      )}
    </div>
  )
}
