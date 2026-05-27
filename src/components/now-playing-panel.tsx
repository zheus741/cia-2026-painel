'use client'

import Link from 'next/link'
import { Radio, Clock, ArrowUpRight } from 'lucide-react'
import { STAGES, type StageId } from '@/lib/lineup-data'
import { useNowPlaying } from '@/lib/use-now-playing'

const SANS = 'var(--font-dm-sans), system-ui, sans-serif'

// ── Pulse dot ───────────────────────────────────────────────────────────────

function LivePulse({ size = 8, color = '#FF4444' }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size, height: size,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <span style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: color,
        opacity: 0.55,
        animation: 'np-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
      }} />
      <span style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
      }} />
      <style>{`
        @keyframes np-ping {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(2.4); opacity: 0;    }
          100% { transform: scale(2.4); opacity: 0;    }
        }
      `}</style>
    </span>
  )
}

// ── Painel completo (lineup, agenda) ────────────────────────────────────────

interface NowPlayingPanelProps {
  /** Quando true, oculta o componente se não há nada ao vivo no momento. Default: false (mostra fallback "próximo"). */
  hideWhenIdle?: boolean
  /** Link de "ver tudo" — geralmente "/lineup". */
  detailHref?: string
  /** Compacta o painel (1 linha por palco). Default: false. */
  compact?: boolean
}

export function NowPlayingPanel({
  hideWhenIdle = false,
  detailHref = '/lineup',
  compact = false,
}: NowPlayingPanelProps) {
  const state = useNowPlaying()

  // Não é dia do evento
  if (!state.activeDay) {
    if (hideWhenIdle) return null
    return null
  }

  // Dia do evento mas fora do range de programação
  if (!state.isLive) {
    if (hideWhenIdle) return null
    return (
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Clock size={16} color="rgba(10,15,11,0.4)" strokeWidth={2} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              hoje · {state.activeDay.date}
            </div>
            <div style={{
              fontFamily: SANS,
              fontSize: 15, fontWeight: 700,
              color: '#0A0F0B',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginTop: 2,
            }}>
              Programação começa às {state.activeDay.rangeStart}
            </div>
          </div>
        </div>

        <Link
          href={detailHref}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: '#0A0F0B',
            fontSize: 11.5, fontWeight: 600,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
          }}
        >
          Ver line up
          <ArrowUpRight size={13} strokeWidth={2.2} />
        </Link>
      </div>
    )
  }

  // É dia do evento E há programação ativa/próxima
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        border: '1px solid rgba(10,15,11,0.10)',
        background: 'linear-gradient(155deg, #0A0F0B 0%, #1a1f1c 100%)',
        color: '#FAF7F0',
        overflow: 'hidden',
        boxShadow: '0 1px 0 rgba(10,15,11,0.04), 0 12px 32px rgba(10,15,11,0.18)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: compact ? '12px 18px' : '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        borderBottom: '1px solid rgba(250,247,240,0.08)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <LivePulse size={9} />
          <span style={{
            fontSize: 10.5, fontWeight: 800,
            color: '#FF4444',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}>
            no ar agora
          </span>
          <span style={{
            fontSize: 10.5, fontWeight: 600,
            color: 'rgba(250,247,240,0.4)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginLeft: 4,
          }}>
            · {state.activeDay.label.toLowerCase()} · {state.activeDay.date}
          </span>
        </div>

        <Link
          href={detailHref}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(250,247,240,0.10)',
            color: '#FAF7F0',
            fontFamily: SANS,
            fontSize: 11, fontWeight: 700,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(250,247,240,0.18)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(250,247,240,0.10)')}
        >
          Line up completo
          <ArrowUpRight size={13} strokeWidth={2.2} />
        </Link>
      </div>

      {/* Lista de palcos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 0,
      }}>
        {STAGES.map((stage, i) => {
          const s = state.stages[stage.id as StageId]
          const isLastCol = i === STAGES.length - 1

          return (
            <div
              key={stage.id}
              style={{
                padding: compact ? '12px 18px' : '16px 20px',
                borderRight: !compact && !isLastCol ? '1px solid rgba(250,247,240,0.08)' : 'none',
                borderTop: compact && i > 0 ? '1px solid rgba(250,247,240,0.06)' : 'none',
                display: 'flex',
                flexDirection: compact ? 'row' : 'column',
                alignItems: compact ? 'center' : 'flex-start',
                justifyContent: 'space-between',
                gap: compact ? 14 : 6,
                minWidth: 0,
              }}
            >
              {/* Palco label */}
              <div style={{ minWidth: 0, flex: compact ? 0 : undefined, flexShrink: 0 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: stage.accentSoft,
                  border: `1px solid ${stage.accentRing}`,
                  marginBottom: compact ? 0 : 8,
                }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: stage.blockBg,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontFamily: SANS,
                    fontSize: 9.5, fontWeight: 800,
                    color: stage.tone === 'gold' ? '#F0D04A'
                         : stage.tone === 'terracotta' ? '#D8845F'
                         : '#9DA8FF',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}>
                    {stage.name}
                  </span>
                </div>
              </div>

              {/* Conteúdo */}
              <div style={{ minWidth: 0, flex: 1, textAlign: compact ? 'right' : 'left' }}>
                {s.current ? (
                  <>
                    <div style={{
                      fontFamily: SANS,
                      fontSize: compact ? 15 : 18,
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      color: '#FAF7F0',
                      lineHeight: 1.1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {s.current.artist}
                    </div>
                    <div style={{
                      fontFamily: SANS,
                      fontSize: 11, fontWeight: 600,
                      color: 'rgba(250,247,240,0.55)',
                      letterSpacing: '-0.01em',
                      marginTop: 3,
                    }}>
                      até {s.current.end} · {s.minutesLeft} min restantes
                    </div>
                  </>
                ) : s.next ? (
                  <>
                    <div style={{
                      fontFamily: SANS,
                      fontSize: 10.5, fontWeight: 700,
                      color: 'rgba(250,247,240,0.42)',
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      marginBottom: 3,
                    }}>
                      próximo
                    </div>
                    <div style={{
                      fontFamily: SANS,
                      fontSize: compact ? 14 : 16,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: '#FAF7F0',
                      lineHeight: 1.15,
                      opacity: 0.92,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {s.next.artist}
                    </div>
                    <div style={{
                      fontFamily: SANS,
                      fontSize: 11, fontWeight: 600,
                      color: 'rgba(250,247,240,0.48)',
                      letterSpacing: '-0.01em',
                      marginTop: 3,
                    }}>
                      às {s.next.start} · em {s.minutesToNext} min
                    </div>
                  </>
                ) : (
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 12, fontWeight: 600,
                    color: 'rgba(250,247,240,0.36)',
                    letterSpacing: '-0.01em',
                  }}>
                    Encerrado hoje
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

// ── Inline ticker (TV mode) ──────────────────────────────────────────────────

/**
 * Ticker bem compacto pra header de TV mode — só mostra palcos COM atração tocando.
 * Some completamente se nada ao vivo.
 */
export function NowPlayingTicker() {
  const state = useNowPlaying({ intervalMs: 15_000 })

  if (!state.isLive) return null

  const playing = STAGES
    .map(stage => ({ stage, s: state.stages[stage.id as StageId] }))
    .filter(x => x.s.current !== null)

  if (playing.length === 0) return null

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      padding: '8px 14px',
      borderRadius: 999,
      background: 'rgba(10,15,11,0.85)',
      backdropFilter: 'blur(8px)',
      color: '#FAF7F0',
      fontFamily: SANS,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LivePulse size={8} />
        <span style={{
          fontSize: 10, fontWeight: 800,
          color: '#FF4444',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          no ar
        </span>
      </div>

      {playing.map(({ stage, s }, i) => (
        <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && (
            <span style={{
              width: 4, height: 4, borderRadius: '50%',
              background: 'rgba(250,247,240,0.25)',
            }} />
          )}
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: stage.tone === 'gold' ? '#F0D04A'
                 : stage.tone === 'terracotta' ? '#D8845F'
                 : '#9DA8FF',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}>
            {stage.name}
          </span>
          <span style={{
            fontSize: 12.5, fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#FAF7F0',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {s.current!.artist}
          </span>
        </div>
      ))}
    </div>
  )
}
