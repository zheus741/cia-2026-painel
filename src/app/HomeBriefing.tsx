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
// DonutChart — anel verde com pct no centro (estilo ref imagem 2)
// ─────────────────────────────────────────────────────────────────────────────

function DonutChart({ percent, color = '#2e6b42' }: { percent: number; color?: string }) {
  const radius = 56
  const stroke = 11
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100)

  return (
    <svg
      viewBox="0 0 140 140"
      width="138"
      height="138"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* track */}
      <circle
        cx="70" cy="70" r={radius}
        fill="none"
        stroke="rgba(10,15,11,0.10)"
        strokeWidth={stroke}
      />
      {/* progress */}
      <circle
        cx="70" cy="70" r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
      {/* big number — Fraunces 800 mixed italic/roman */}
      <text
        x="70" y="72"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1",
          fontWeight: 800,
          fontSize: 42,
          letterSpacing: '-0.04em',
          fill: '#0A0F0B',
        }}
      >
        {percent}
      </text>
      {/* % label */}
      <text
        x="70" y="100"
        textAnchor="middle"
        style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 13,
          letterSpacing: '-0.01em',
          fill: 'rgba(10,15,11,0.45)',
        }}
      >
        %
      </text>
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

  // Linhas da tabela (label + valor + cor semântica)
  const rows: { label: string; value: number; valueColor: string }[] = [
    { label: 'Total',       value: total,      valueColor: '#0A0F0B' },
    { label: 'Publicados',  value: publicados, valueColor: '#2e6b42' },
    { label: 'Em produção', value: emProducao, valueColor: '#3D49E0' },
    { label: 'Rascunho',    value: rascunho,   valueColor: 'rgba(10,15,11,0.40)' },
  ]

  const statusBg =
    total === 0 ? 'rgba(10,15,11,0.06)' :
    pct >= 70   ? 'rgba(46,107,66,0.12)' :
    pct >= 40   ? 'rgba(196,107,74,0.14)' :
                  'rgba(156,47,31,0.12)'

  return (
    <Link href="/conteudos" className="cia-brf-pipe">

      {/* Eyebrow editorial + status pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <span style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 13,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          saúde do pipeline
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 999,
          background: statusBg,
          border: `1px solid ${statusColor}40`,
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: statusColor,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}80`,
          }} />
          {status}
        </span>
      </div>

      {/* Conteúdo horizontal compacto: donut esquerda + tabela direita */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        marginTop: 10,
      }}>
        {/* Donut chart */}
        <DonutChart percent={pct} color={statusColor} />

        {/* Tabela: 4 linhas com label + valor */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'baseline',
              gap: 8,
              padding: '6px 0 6px',
              borderBottom: i < rows.length - 1 ? '1px solid rgba(10,15,11,0.08)' : 'none',
            }}>
              <span style={{
                fontFamily: 'var(--font-geist), system-ui, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(10,15,11,0.62)',
                letterSpacing: '-0.005em',
              }}>
                {r.label}
              </span>
              <span style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontVariationSettings: "'opsz' 36, 'SOFT' 0, 'WONK' 0",
                fontWeight: 800,
                fontSize: 18,
                color: r.valueColor,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
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
