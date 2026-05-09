'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Maximize2 } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BriefingProps {
  userName:        string
  userRole:        string | null
  diffDays:        number
  eventActive:     boolean
  publicados:      number
  total:           number
  emProducao:      number
  rascunho:        number
}

// ─────────────────────────────────────────────────────────────────────────────
// CountUp — animated number counter
// ─────────────────────────────────────────────────────────────────────────────

function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (to === 0) { setVal(0); return }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(ease * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])

  return <>{val}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// CircleArrow — black circular CTA button (signature element)
// ─────────────────────────────────────────────────────────────────────────────

function CircleArrow({ size = 44, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <span
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: dark ? '#0A0F0B' : '#FFFFFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(10,15,11,0.18)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className="cia-circle-arrow"
    >
      <ArrowUpRight
        style={{
          width: size * 0.42,
          height: size * 0.42,
          color: dark ? '#FFFFFF' : '#0A0F0B',
          strokeWidth: 2,
        }}
      />
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill — rounded chip used inside cards
// ─────────────────────────────────────────────────────────────────────────────

function Pill({
  children,
  bg = 'rgba(10,15,11,0.08)',
  color = '#0A0F0B',
}: {
  children: React.ReactNode
  bg?: string
  color?: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 11px',
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroVisualCard — gradient mesh + glass overlay (signature centerpiece)
// ─────────────────────────────────────────────────────────────────────────────

function HeroVisualCard({ diffDays, eventActive }: { diffDays: number; eventActive: boolean }) {
  return (
    <Link href="/cronograma" className="cia-hero-canvas group" style={{ textDecoration: 'none' }}>
      {/* Animated mesh orbs */}
      <span aria-hidden className="cia-mesh-orb cia-mesh-orb--1" />
      <span aria-hidden className="cia-mesh-orb cia-mesh-orb--2" />
      <span aria-hidden className="cia-mesh-orb cia-mesh-orb--3" />
      <span aria-hidden className="cia-mesh-orb cia-mesh-orb--4" />
      <span aria-hidden className="cia-mesh-orb cia-mesh-orb--5" />

      <div className="cia-hero-glass" style={{ position: 'relative', zIndex: 1 }}>
        {/* eyebrow */}
        <div className="flex items-center justify-between mb-3">
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(120,60,40,0.65)',
          }}>
            {eventActive ? 'cobertura ao vivo' : 'contagem regressiva'}
          </span>
          <Pill bg="rgba(120,60,40,0.08)" color="#5A2A18">
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: eventActive ? '#22C55E' : '#C46B4A',
                boxShadow: eventActive ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
              }}
            />
            {eventActive ? 'AO VIVO' : '04 — 07 jun'}
          </Pill>
        </div>

        {/* big number / status */}
        {eventActive ? (
          <>
            <h2 style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 'clamp(56px, 6.5vw, 96px)',
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: '-0.045em',
              color: '#0A0F0B',
              marginBottom: 8,
            }}>
              Hoje
            </h2>
            <p style={{
              fontSize: 15, fontWeight: 500,
              color: 'rgba(10,15,11,0.62)',
              letterSpacing: '-0.01em',
              maxWidth: 280,
            }}>
              Cobertura ao vivo da Copa Inter Atléticas em Uberaba, MG.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-3" style={{ marginBottom: 6 }}>
              <span style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 'clamp(72px, 8.5vw, 124px)',
                fontWeight: 800,
                lineHeight: 0.85,
                letterSpacing: '-0.05em',
                color: '#0A0F0B',
              }}>
                <CountUp to={diffDays} />
              </span>
              <span style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 22, fontWeight: 700,
                color: 'rgba(10,15,11,0.40)',
                letterSpacing: '-0.02em',
              }}>
                {diffDays === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <p style={{
              fontSize: 14, fontWeight: 500,
              color: 'rgba(10,15,11,0.62)',
              letterSpacing: '-0.01em',
              maxWidth: 280,
              marginBottom: 4,
            }}>
              Tudo num único painel — conteúdos, equipe e tempo real.
            </p>
            <span style={{
              fontSize: 11,
              color: 'rgba(120,60,40,0.55)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}>
              04 – 07 jun 2026 · Uberaba/MG
            </span>
          </>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between mt-5">
          <span style={{ fontSize: 13, color: 'rgba(10,15,11,0.55)', fontWeight: 600 }}>
            Ver cronograma
          </span>
          <CircleArrow size={40} />
        </div>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineCard — gold, content production health
// ─────────────────────────────────────────────────────────────────────────────

function PipelineCard({
  publicados, total, emProducao, rascunho,
}: { publicados: number; total: number; emProducao: number; rascunho: number }) {
  const pct = total > 0 ? Math.round((publicados / total) * 100) : 0
  const status =
    total === 0 ? 'aguardando' :
    pct >= 70   ? 'saudável'   :
    pct >= 40   ? 'atenção'    :
                  'crítico'
  const statusEmoji =
    total === 0 ? '○' :
    pct >= 70   ? '●' :
    pct >= 40   ? '◑' :
                  '◐'

  return (
    <Link href="/conteudos" className="cia-edit-card cia-edit-card--gold group">
      {/* eyebrow + affordance */}
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'rgba(70, 50, 5, 0.65)',
          letterSpacing: '-0.01em',
        }}>
          pipeline de conteúdo
        </span>
        <div className="flex items-center gap-2">
          <Pill bg="rgba(70,50,5,0.12)" color="#46320C">
            {statusEmoji} {status}
          </Pill>
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              width: 22, height: 22,
              borderRadius: 7,
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(70,50,5,0.10)',
              color: 'rgba(70,50,5,0.65)',
            }}
          >
            <Maximize2 style={{ width: 11, height: 11 }} />
          </span>
        </div>
      </div>

      {/* big number */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-baseline gap-3">
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(72px, 9vw, 124px)',
            fontWeight: 800,
            lineHeight: 0.85,
            letterSpacing: '-0.05em',
            color: '#0A0F0B',
          }}>
            {pct}
          </span>
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 32, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '-0.03em',
          }}>%</span>
        </div>
        <span style={{
          fontSize: 17, fontWeight: 500,
          color: 'rgba(10,15,11,0.60)',
          letterSpacing: '-0.01em',
          marginTop: 4,
        }}>
          {publicados} de {total} publicados
        </span>

        {/* hatched distribution bars (signature element) */}
        <div className="mt-4">
          {(() => {
            const safeTotal = Math.max(total, 1)
            const items = [
              { label: 'publicado', val: publicados, pct: Math.round((publicados / safeTotal) * 100), variant: 'solid'  as const },
              { label: 'produção',  val: emProducao, pct: Math.round((emProducao / safeTotal) * 100), variant: 'hatch'  as const },
              { label: 'rascunho',  val: rascunho,   pct: Math.round((rascunho   / safeTotal) * 100), variant: 'soft'   as const },
            ]
            return (
              <div className="flex gap-1.5" style={{ height: 38 }}>
                {items.map(s => {
                  const widthPct = total > 0 ? Math.max(s.pct, s.val > 0 ? 6 : 0) : (s.label === 'rascunho' ? 100 : 0)
                  if (widthPct === 0) return null
                  return (
                    <div
                      key={s.label}
                      className={s.variant === 'hatch' ? 'cia-hatch-stripe cia-hatch-stripe--ink' : ''}
                      style={{
                        width: `${widthPct}%`,
                        borderRadius: 9,
                        background: s.variant === 'solid'
                          ? '#0A0F0B'
                          : s.variant === 'soft'
                            ? 'rgba(10,15,11,0.10)'
                            : undefined,
                        position: 'relative',
                        minWidth: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: s.variant === 'soft' ? '1px solid rgba(10,15,11,0.10)' : 'none',
                      }}
                    >
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: s.variant === 'solid' ? '#FFFFFF' : 'rgba(10,15,11,0.75)',
                        letterSpacing: '-0.01em',
                      }}>
                        {s.pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          <div className="flex gap-1.5 mt-1.5">
            {[
              { label: 'publicado', val: publicados },
              { label: 'produção',  val: emProducao },
              { label: 'rascunho',  val: rascunho   },
            ].map(s => (
              <span key={s.label} style={{
                flex: 1, fontSize: 9, fontWeight: 700,
                color: 'rgba(70,50,5,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textAlign: 'center',
              }}>
                {s.label} · {s.val}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-end justify-between mt-5">
        <span style={{ fontSize: 13, color: 'rgba(70,50,5,0.65)', fontWeight: 500 }}>
          Abrir kanban
        </span>
        <CircleArrow size={42} />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeBriefing — exported component
// ─────────────────────────────────────────────────────────────────────────────

export function HomeBriefing({
  userName,
  userRole,
  diffDays,
  eventActive,
  publicados,
  total,
  emProducao,
  rascunho,
}: BriefingProps) {

  const firstName = userName?.split(' ')[0] ?? 'time'

  return (
    <section className="relative" style={{
      background: 'transparent',
      padding: '32px 24px 24px',
    }}>
      <div className="mx-auto max-w-7xl">

        {/* ─── Greeting block (2-line, dramatic) ─── */}
        <div className="mb-8">
          <p style={{
            fontSize: 11.5, fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(46,107,66,0.55)',
            marginBottom: 10,
          }}>
            CIA · Copa Inter Atléticas 2026
          </p>
          <h1 className="cia-greeting-headline">
            Olá, {firstName}!
            <span>
              {eventActive
                ? 'A cobertura está rolando — fica de olho.'
                : 'Vamos preparar a cobertura de hoje.'}
            </span>
          </h1>
          {userRole && (
            <p className="mt-3" style={{
              fontSize: 14, fontWeight: 600,
              color: 'rgba(10,15,11,0.45)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {userRole}
            </p>
          )}
        </div>

        {/* ─── Hero card grid (Pipeline | Hero Visual | Signature) ─── */}
        <div
          className="cia-briefing-grid"
          style={{
            display: 'grid',
            gap: 14,
          }}
        >
          <div className="cia-briefing-cell-1">
            <PipelineCard
              publicados={publicados}
              total={total}
              emProducao={emProducao}
              rascunho={rascunho}
            />
          </div>
          <div className="cia-briefing-cell-2">
            <HeroVisualCard diffDays={diffDays} eventActive={eventActive} />
          </div>
        </div>
      </div>
    </section>
  )
}
