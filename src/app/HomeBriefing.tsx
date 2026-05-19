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
// HomeBriefing — main export
// ─────────────────────────────────────────────────────────────────────────────

export function HomeBriefing({
  userName,
  userRole,
  diffDays,
  eventActive,
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

          {/* ── Hero único: contagem regressiva ───────────────── */}
          <div className="cia-brf-grid">
            <HeroCountdown diffDays={diffDays} eventActive={eventActive} />
          </div>

        </div>
      </div>
    </section>
  )
}
