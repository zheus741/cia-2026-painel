'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

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
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_START = new Date('2026-06-04T00:00:00-03:00')

// ─────────────────────────────────────────────────────────────────────────────
// CountUp — animated number counter
// ─────────────────────────────────────────────────────────────────────────────

function CountUp({ to, duration = 1600 }: { to: number; duration?: number }) {
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
// LiveTicker — Fraunces, sobre sage
// ─────────────────────────────────────────────────────────────────────────────

function LiveTicker({ target }: { target: Date }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) {
    return <span className="cia-brf-hero__ticker" style={{ visibility: 'hidden' }}>00:00:00</span>
  }

  const diffMs = Math.max(0, target.getTime() - now.getTime())
  if (diffMs === 0) return null

  const fullDays = Math.floor(diffMs / 86_400_000)
  const rest     = diffMs - fullDays * 86_400_000
  const hours    = Math.floor(rest / 3_600_000)
  const min      = Math.floor((rest % 3_600_000) / 60_000)
  const sec      = Math.floor((rest % 60_000) / 1000)
  const pad      = (n: number) => n.toString().padStart(2, '0')

  return (
    <div
      className="cia-brf-hero__ticker"
      aria-label={`Faltam ${fullDays} dias, ${hours} horas, ${min} minutos e ${sec} segundos`}
    >
      <span>{pad(hours)}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{pad(min)}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{pad(sec)}</span>
      <span className="cia-brf-hero__ticker__label">até o início</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineArc — arc gold/terracotta sutil atrás do número
// ─────────────────────────────────────────────────────────────────────────────

function PipelineArc() {
  return (
    <svg
      className="cia-brf-pipe-arc"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="cia-pipe-arc" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F0D04A" stopOpacity="0.45" />
          <stop offset="55%"  stopColor="#D8845F" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#C46B4A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#cia-pipe-arc)" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroCountdown — sage gradient NO QUADRADO TODO + número forte
// ─────────────────────────────────────────────────────────────────────────────

function HeroCountdown({ diffDays, eventActive }: { diffDays: number; eventActive: boolean }) {
  // Mix italic/roman pra dar caracter à Fraunces
  const digits = String(diffDays).split('')
  const hasMultipleDigits = digits.length >= 2

  return (
    <Link href="/cronograma" className="cia-brf-hero" aria-label="Abrir cronograma">

      {/* Eyebrow */}
      <div className="cia-brf-hero__eyebrow">
        <span>{eventActive ? 'Cobertura ao vivo' : 'Contagem regressiva'}</span>
        <span className="cia-brf-hero__pill">
          <span
            aria-hidden
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: eventActive ? '#22C55E' : '#051a0e',
              boxShadow: '0 0 8px currentColor',
            }}
          />
          {eventActive ? 'AO VIVO' : '04 — 07 jun'}
        </span>
      </div>

      {/* Número gigante centralizado */}
      <div className="cia-brf-hero__numwrap">
        {eventActive ? (
          <>
            <span className="cia-brf-hero__num">
              <em>Hoje</em>
            </span>
            <span className="cia-brf-hero__unit">é o dia</span>
          </>
        ) : (
          <>
            <span className="cia-brf-hero__num">
              {hasMultipleDigits ? (
                <>
                  <em>{digits[0]}</em>
                  {digits.slice(1).join('')}
                </>
              ) : (
                <CountUp to={diffDays} />
              )}
            </span>
            <span className="cia-brf-hero__unit">
              {diffDays === 1 ? 'dia restante' : 'dias restantes'}
            </span>
          </>
        )}
      </div>

      {/* Ticker Fraunces */}
      {!eventActive && <LiveTicker target={EVENT_START} />}

      {/* Foot */}
      <div className="cia-brf-hero__foot">
        <span className="cia-brf-hero__date">04 – 07 jun 2026 · Uberaba/MG</span>
        <span
          className="cia-circle-arrow"
          style={{
            width: 24, height: 24, borderRadius: '50%',
            background: '#051a0e',
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
          }}
        >
          <ArrowUpRight style={{ width: 11, height: 11, color: '#FAF7F0', strokeWidth: 2.2 }} />
        </span>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineCard — cream squircle + arc gold sutil + Fraunces forte
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
  const statusColor =
    total === 0 ? 'rgba(10,15,11,0.40)' :
    pct >= 70   ? '#2e6b42' :
    pct >= 40   ? '#C46B4A' :
                  '#9C2F1F'

  const safeTotal = Math.max(total, 1)
  const items = [
    { label: 'publicado', val: publicados, pct: Math.round((publicados / safeTotal) * 100), variant: 'solid'  as const },
    { label: 'produção',  val: emProducao, pct: Math.round((emProducao / safeTotal) * 100), variant: 'hatch'  as const },
    { label: 'rascunho',  val: rascunho,   pct: Math.round((rascunho   / safeTotal) * 100), variant: 'soft'   as const },
  ]

  const pctStr = String(pct)
  const pctFirst = pctStr[0]
  const pctRest = pctStr.slice(1)

  return (
    <Link href="/conteudos" className="cia-brf-pipe">
      <PipelineArc />

      {/* Eyebrow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <span style={{
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(10,15,11,0.45)',
        }}>
          Pipeline
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: statusColor,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}80`,
          }} />
          {status}
        </span>
      </div>

      {/* Big number — Fraunces 800, mixed italic/roman (50% menor) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        marginTop: 6,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 2,
        }}>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1",
            fontSize: 'clamp(56px, 6.5vw, 78px)',
            fontWeight: 800,
            lineHeight: 0.84,
            letterSpacing: '-0.055em',
            color: '#0A0F0B',
          }}>
            {pctRest ? (
              <>
                <em style={{ fontStyle: 'italic', fontWeight: 600 }}>{pctFirst}</em>
                {pctRest}
              </>
            ) : pctFirst}
          </span>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 500,
            color: 'rgba(10,15,11,0.40)',
            letterSpacing: '-0.03em',
            transform: 'translateY(-6px)',
          }}>
            %
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 12,
          color: 'rgba(10,15,11,0.58)',
          letterSpacing: '-0.01em',
          marginTop: 1,
        }}>
          <strong style={{ color: '#0A0F0B', fontWeight: 700, fontStyle: 'normal' }}>{publicados}</strong>{' '}
          de <strong style={{ color: '#0A0F0B', fontWeight: 700, fontStyle: 'normal' }}>{total}</strong> publicados
        </p>

        {/* Distribution bar — pushed to bottom */}
        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <div style={{ display: 'flex', gap: 3, height: 22 }}>
            {items.map(s => {
              const widthPct = total > 0 ? Math.max(s.pct, s.val > 0 ? 6 : 0) : (s.label === 'rascunho' ? 100 : 0)
              if (widthPct === 0) return null
              return (
                <div
                  key={s.label}
                  className={s.variant === 'hatch' ? 'cia-hatch-stripe cia-hatch-stripe--ink' : ''}
                  style={{
                    width: `${widthPct}%`,
                    borderRadius: 7,
                    background: s.variant === 'solid'
                      ? '#0A0F0B'
                      : s.variant === 'soft'
                        ? 'rgba(10,15,11,0.08)'
                        : undefined,
                    minWidth: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: s.variant === 'soft' ? '1px solid rgba(10,15,11,0.12)' : 'none',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-geist), system-ui, sans-serif',
                    fontSize: 10,
                    fontWeight: 800,
                    color: s.variant === 'solid' ? '#FAF7F0' : 'rgba(10,15,11,0.70)',
                    letterSpacing: '-0.01em',
                  }}>
                    {s.pct}%
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {items.map(s => (
              <span key={s.label} style={{
                flex: 1,
                fontFamily: 'var(--font-geist), system-ui, sans-serif',
                fontSize: 8.5,
                fontWeight: 700,
                color: 'rgba(10,15,11,0.42)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                textAlign: 'center',
              }}>
                {s.label} · {s.val}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA foot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 6,
        borderTop: '1px dashed rgba(10,15,11,0.10)',
      }}>
        <span style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 11.5,
          fontWeight: 500,
          color: 'rgba(10,15,11,0.55)',
        }}>
          Abrir kanban
        </span>
        <span
          className="cia-circle-arrow"
          style={{
            width: 24, height: 24, borderRadius: '50%',
            background: '#0A0F0B',
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
          }}
        >
          <ArrowUpRight style={{ width: 12, height: 12, color: '#FAF7F0', strokeWidth: 2.2 }} />
        </span>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeBriefing — main export
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
    <section style={{ padding: '14px 24px 8px' }}>
      <div className="mx-auto max-w-7xl">

        <div className="cia-brf cia-grain">

          {/* ── Signature row ─────────────────────────────────────── */}
          <div className="cia-brf-signature">
            <span className="cia-brf-star">★</span>
            <span>CIA · Copa Inter Atléticas · 2026</span>
          </div>

          {/* ── Greeting block ──────────────────────────────────── */}
          <div className="cia-brf-greeting">
            <span className="cia-brf-greeting__ola">Olá,</span>
            <span className="cia-brf-greeting__nome">{firstName}.</span>
            <span className="cia-brf-greeting__rule" aria-hidden="true" />
            <p className="cia-brf-greeting__line">
              {eventActive
                ? 'A cobertura está rolando — fica de olho no que está acontecendo agora.'
                : 'Vamos preparar a cobertura de hoje. Tudo num único painel — conteúdos, equipe e tempo real.'}
            </p>
            {userRole && (
              <span className="cia-brf-greeting__role">{userRole}</span>
            )}
          </div>

          {/* ── Hero grid ──────────────────────────────────────── */}
          <div className="cia-brf-grid">
            <PipelineCard
              publicados={publicados}
              total={total}
              emProducao={emProducao}
              rascunho={rascunho}
            />
            <HeroCountdown diffDays={diffDays} eventActive={eventActive} />
          </div>

        </div>
      </div>
    </section>
  )
}
