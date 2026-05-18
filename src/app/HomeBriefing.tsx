'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DockTone = 'neutral' | 'green' | 'gold' | 'terracotta' | 'lavender' | 'electric'

export interface DockItem {
  href:  string
  label: string
  meta?: string
  icon:  LucideIcon
  tone?: DockTone
}

interface BriefingProps {
  userName:        string
  userRole:        string | null
  diffDays:        number
  eventActive:     boolean
  publicados:      number
  total:           number
  emProducao:      number
  rascunho:        number
  dockItems?:      DockItem[]
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
// LiveTicker — agora em Fraunces grande (não monospace)
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
// GooeyCloud — nuvem orgânica verde com gradiente em camadas
// Inspirado nas refs (Health/Intelly) — bumps merged via filter goo
// ─────────────────────────────────────────────────────────────────────────────

function GooeyCloud() {
  // 10 bumps em torno de um círculo central, posições programáticas
  const bumps = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2
    const radius = 158
    return {
      cx: 200 + Math.cos(angle) * radius,
      cy: 200 + Math.sin(angle) * radius,
      // tamanho ligeiramente variável pra parecer orgânico (não geométrico)
      r: 46 + (i % 3) * 4,
    }
  })

  return (
    <svg
      className="cia-brf-cloud"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Gradient sage 3D — 6 stops criando profundidade de esfera */}
        <radialGradient id="cia-cloud-sage" cx="35%" cy="28%" r="78%">
          <stop offset="0%"   stopColor="#f0f5ed" />
          <stop offset="14%"  stopColor="#dbe8d2" />
          <stop offset="38%"  stopColor="#a8c2a4" />
          <stop offset="60%"  stopColor="#6e9a72" />
          <stop offset="82%"  stopColor="#3a6b48" />
          <stop offset="100%" stopColor="#1f4a2a" />
        </radialGradient>

        {/* Highlight superior — brilho de luz */}
        <radialGradient id="cia-cloud-hl" cx="32%" cy="22%" r="42%">
          <stop offset="0%"   stopColor="#FAF7F0" stopOpacity="0.55" />
          <stop offset="55%"  stopColor="#FAF7F0" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#FAF7F0" stopOpacity="0" />
        </radialGradient>

        {/* Inner shadow gradient — profundidade nas bordas */}
        <radialGradient id="cia-cloud-shadow" cx="70%" cy="78%" r="62%">
          <stop offset="0%"   stopColor="#0a1f12" stopOpacity="0" />
          <stop offset="70%"  stopColor="#0a1f12" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0a1f12" stopOpacity="0.30" />
        </radialGradient>

        {/* Filter goo — merge dos circles em uma forma só com bordas suaves */}
        <filter id="cia-cloud-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur" mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
            result="goo"
          />
        </filter>

        {/* Mask — define o shape da nuvem (white = visível) */}
        <mask id="cia-cloud-mask">
          <g filter="url(#cia-cloud-goo)">
            {/* Centro */}
            <circle cx="200" cy="200" r="118" fill="white" />
            {/* Bumps */}
            {bumps.map((b, i) => (
              <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="white" />
            ))}
          </g>
        </mask>
      </defs>

      {/* Base sage com gradiente 3D — aplicada dentro do mask */}
      <rect x="0" y="0" width="400" height="400" fill="url(#cia-cloud-sage)" mask="url(#cia-cloud-mask)" />
      {/* Inner shadow */}
      <rect x="0" y="0" width="400" height="400" fill="url(#cia-cloud-shadow)" mask="url(#cia-cloud-mask)" />
      {/* Highlight glossy top-left */}
      <rect x="0" y="0" width="400" height="400" fill="url(#cia-cloud-hl)" mask="url(#cia-cloud-mask)" />

      {/* Outer soft glow halo */}
      <g style={{ mixBlendMode: 'multiply', opacity: 0.35 }}>
        <rect x="0" y="0" width="400" height="400" fill="url(#cia-cloud-sage)" mask="url(#cia-cloud-mask)"
          transform="translate(0,8)" />
      </g>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineArc — arc gold orgânico atrás do número do pipeline
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
          <stop offset="0%"   stopColor="#F0D04A" stopOpacity="0.55" />
          <stop offset="55%"  stopColor="#D8845F" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#C46B4A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#cia-pipe-arc)" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroCountdown — light theme + gooey cloud + Fraunces mixed italic/roman
// ─────────────────────────────────────────────────────────────────────────────

function HeroCountdown({ diffDays, eventActive }: { diffDays: number; eventActive: boolean }) {
  // Mix italic/roman: primeiro dígito em italic se tiver 2+ dígitos
  const digits = String(diffDays).split('')
  const hasMultipleDigits = digits.length >= 2

  return (
    <Link href="/cronograma" className="cia-brf-hero" aria-label="Abrir cronograma">
      <GooeyCloud />

      {/* Eyebrow */}
      <div className="cia-brf-hero__eyebrow">
        <span>{eventActive ? 'Cobertura ao vivo' : 'Contagem regressiva'}</span>
        <span className="cia-brf-hero__pill">
          <span
            aria-hidden
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: eventActive ? '#22C55E' : '#2e6b42',
              boxShadow: '0 0 8px currentColor',
            }}
          />
          {eventActive ? 'AO VIVO' : '04 — 07 jun'}
        </span>
      </div>

      {/* Número gigante dentro da nuvem */}
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

      {/* Ticker maior em Fraunces */}
      {!eventActive && <LiveTicker target={EVENT_START} />}

      {/* Foot */}
      <div className="cia-brf-hero__foot">
        <span className="cia-brf-hero__date">04 – 07 jun 2026 · Uberaba/MG</span>
        <span
          className="cia-circle-arrow"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#0A0F0B',
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
          }}
        >
          <ArrowUpRight style={{ width: 17, height: 17, color: '#FAF7F0', strokeWidth: 2.2 }} />
        </span>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineCard — cream squircle + arc gold + Fraunces mixed
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

      {/* Big number — Fraunces mixed italic/roman */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          marginTop: 12,
        }}>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontVariationSettings: "'opsz' 144, 'SOFT' 60, 'WONK' 1",
            fontSize: 'clamp(116px, 13vw, 180px)',
            fontWeight: 700,
            lineHeight: 0.82,
            letterSpacing: '-0.05em',
            color: '#0A0F0B',
          }}>
            {pctRest ? (
              <>
                <em style={{ fontStyle: 'italic', fontWeight: 500 }}>{pctFirst}</em>
                {pctRest}
              </>
            ) : pctFirst}
          </span>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 38,
            fontWeight: 500,
            color: 'rgba(10,15,11,0.32)',
            letterSpacing: '-0.03em',
            transform: 'translateY(-12px)',
          }}>
            %
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 15,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
          marginTop: 6,
        }}>
          <strong style={{ color: '#0A0F0B', fontWeight: 700, fontStyle: 'normal' }}>{publicados}</strong>{' '}
          de <strong style={{ color: '#0A0F0B', fontWeight: 700, fontStyle: 'normal' }}>{total}</strong> publicados
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
        marginTop: 18,
        paddingTop: 14,
        borderTop: '1px dashed rgba(10,15,11,0.12)',
      }}>
        <span style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 14,
          fontWeight: 500,
          color: 'rgba(10,15,11,0.55)',
        }}>
          Abrir kanban
        </span>
        <span
          className="cia-circle-arrow"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#0A0F0B',
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
          }}
        >
          <ArrowUpRight style={{ width: 14, height: 14, color: '#FAF7F0', strokeWidth: 2.2 }} />
        </span>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NavDock — capsulas horizontais com scroll natural + fade-edges
// Substitui o HomeQuickGrid antigo
// ─────────────────────────────────────────────────────────────────────────────

function NavDock({ items }: { items: DockItem[] }) {
  return (
    <div className="cia-brf-dockwrap">
      <div className="cia-brf-dockwrap__head">
        <span className="cia-brf-dockwrap__label">Acesso rápido</span>
        <span className="cia-brf-dockwrap__hint">arraste para o lado →</span>
      </div>
      <nav className="cia-brf-dock" aria-label="Acesso rápido">
        {items.map(item => {
          const Icon = item.icon
          const toneCls = item.tone && item.tone !== 'neutral'
            ? `cia-brf-dock-pill cia-brf-dock-pill--${item.tone}`
            : 'cia-brf-dock-pill'
          return (
            <Link key={item.href} href={item.href} className={toneCls}>
              <span className="cia-brf-dock-pill__icon">
                <Icon style={{ width: 13, height: 13, strokeWidth: 2.2 }} />
              </span>
              <span>{item.label}</span>
              {item.meta && <span className="cia-brf-dock-pill__meta">{item.meta}</span>}
            </Link>
          )
        })}
      </nav>
    </div>
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
  dockItems,
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

          {/* ── Dock dinâmico (substitui HomeQuickGrid) ─────────── */}
          {dockItems && dockItems.length > 0 && (
            <NavDock items={dockItems} />
          )}

        </div>
      </div>
    </section>
  )
}
