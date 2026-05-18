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
// LiveTicker — tique-taque preciso até o início do evento
// ─────────────────────────────────────────────────────────────────────────────

function LiveTicker({ target }: { target: Date }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) {
    return <span className="cia-brf-hero__ticker" style={{ visibility: 'hidden' }}>00h 00min 00s</span>
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
    <span
      className="cia-brf-hero__ticker"
      aria-label={`Faltam ${fullDays} dias, ${hours} horas, ${min} minutos e ${sec} segundos`}
    >
      {pad(hours)}h {pad(min)}min {pad(sec)}s
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OrganicBlob — assinatura visual SVG (verde místico)
// Curva orgânica imperfeita, anima de leve via .cia-brf-blob
// ─────────────────────────────────────────────────────────────────────────────

function OrganicBlob() {
  return (
    <svg
      className="cia-brf-blob"
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="blob-grad" cx="50%" cy="45%" r="55%">
          <stop offset="0%"   stopColor="#3d7a52" stopOpacity="0.95" />
          <stop offset="55%"  stopColor="#2e6b42" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#1a3a24" stopOpacity="0.55" />
        </radialGradient>
        <filter id="blob-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {/* Forma orgânica — não é círculo perfeito */}
      <path
        d="M300,72 C402,72 488,128 530,220 C572,312 564,420 502,488 C440,556 326,572 232,540 C138,508 60,420 60,316 C60,212 122,124 200,90 C236,76 268,72 300,72 Z"
        fill="url(#blob-grad)"
        filter="url(#blob-soft)"
      />
      {/* Halo interno mais claro */}
      <path
        d="M290,140 C360,140 420,180 446,250 C470,320 458,390 410,432 C362,474 290,484 232,460 C176,436 130,386 134,316 C138,246 184,180 240,156 C262,146 276,140 290,140 Z"
        fill="rgba(250,247,240,0.06)"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroCountdown — card preto com blob orgânico + contador Fraunces gigante
// ─────────────────────────────────────────────────────────────────────────────

function HeroCountdown({ diffDays, eventActive }: { diffDays: number; eventActive: boolean }) {
  return (
    <Link href="/cronograma" className="cia-brf-hero" aria-label="Abrir cronograma do evento">
      <OrganicBlob />

      {/* Eyebrow */}
      <div className="cia-brf-hero__eyebrow">
        <span>{eventActive ? 'Cobertura ao vivo' : 'Contagem regressiva'}</span>
        <span className="cia-brf-hero__pill">
          <span
            aria-hidden
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: eventActive ? '#22C55E' : '#F0D04A',
              boxShadow: eventActive ? '0 0 8px rgba(34,197,94,0.7)' : '0 0 6px rgba(240,208,74,0.6)',
            }}
          />
          {eventActive ? 'AO VIVO' : '04 — 07 jun'}
        </span>
      </div>

      {/* Big number */}
      {eventActive ? (
        <div className="cia-brf-hero__num" style={{ marginTop: 'auto' }}>
          <em>Hoje</em>
          <span className="cia-brf-hero__unit">é o dia</span>
        </div>
      ) : (
        <div className="cia-brf-hero__num">
          <CountUp to={diffDays} />
          <span className="cia-brf-hero__unit">
            {diffDays === 1 ? '· dia restante' : '· dias restantes'}
          </span>
        </div>
      )}

      {/* Ticker */}
      {!eventActive && (
        <LiveTicker target={EVENT_START} />
      )}

      {/* Foot */}
      <div className="cia-brf-hero__foot">
        <span className="cia-brf-hero__date">04 – 07 jun 2026 · Uberaba/MG</span>
        <span
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#FAF7F0',
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
          }}
          className="cia-circle-arrow"
        >
          <ArrowUpRight style={{ width: 18, height: 18, color: '#0A0F0B', strokeWidth: 2.2 }} />
        </span>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineCard v2 — squircle cream com border preto fino + Fraunces
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

  return (
    <Link href="/conteudos" className="cia-brf-pipe">
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

      {/* Big number */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginTop: 12,
        }}>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 0",
            fontSize: 'clamp(96px, 11vw, 156px)',
            fontWeight: 700,
            lineHeight: 0.82,
            letterSpacing: '-0.05em',
            color: '#0A0F0B',
          }}>
            <CountUp to={pct} />
          </span>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 32,
            fontWeight: 500,
            color: 'rgba(10,15,11,0.32)',
            letterSpacing: '-0.03em',
            transform: 'translateY(-6px)',
          }}>
            %
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 500,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
          marginTop: 8,
        }}>
          <strong style={{ color: '#0A0F0B', fontWeight: 700 }}>{publicados}</strong>{' '}
          de <strong style={{ color: '#0A0F0B', fontWeight: 700 }}>{total}</strong> publicados
        </p>

        {/* Distribution bar */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 4, height: 36 }}>
            {items.map(s => {
              const widthPct = total > 0 ? Math.max(s.pct, s.val > 0 ? 6 : 0) : (s.label === 'rascunho' ? 100 : 0)
              if (widthPct === 0) return null
              return (
                <div
                  key={s.label}
                  className={s.variant === 'hatch' ? 'cia-hatch-stripe cia-hatch-stripe--ink' : ''}
                  style={{
                    width: `${widthPct}%`,
                    borderRadius: 8,
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
                    fontSize: 10.5,
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
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {items.map(s => (
              <span key={s.label} style={{
                flex: 1,
                fontFamily: 'var(--font-geist), system-ui, sans-serif',
                fontSize: 9,
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
        marginTop: 22,
        paddingTop: 16,
        borderTop: '1px solid rgba(10,15,11,0.08)',
      }}>
        <span style={{
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(10,15,11,0.55)',
        }}>
          Abrir kanban
        </span>
        <span
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#0A0F0B',
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
          }}
          className="cia-circle-arrow"
        >
          <ArrowUpRight style={{ width: 15, height: 15, color: '#FAF7F0', strokeWidth: 2.2 }} />
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
    <section style={{ padding: '28px 24px 16px' }}>
      <div className="mx-auto max-w-7xl">

        {/* ═══════════════════════════════════════════════════════════
            Squircle frame com border preto + grain texture
            ═══════════════════════════════════════════════════════════ */}
        <div className="cia-brf cia-grain">

          {/* ── Signature row ─────────────────────────────────────── */}
          <div className="cia-brf-signature">
            <span className="cia-brf-star">★</span>
            <span>CIA · Copa Inter Atléticas · 2026</span>
          </div>

          {/* ── Greeting block (Fraunces italic + Geist bold) ────── */}
          <div className="cia-brf-greeting">
            <span className="cia-brf-greeting__ola">Olá,</span>
            <span className="cia-brf-greeting__nome">
              {firstName}.
            </span>
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

          {/* ── Hero grid ────────────────────────────────────────── */}
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
