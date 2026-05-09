'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Tv2, Camera } from 'lucide-react'

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
// CountdownCard — lavender, the time-remaining hero
// ─────────────────────────────────────────────────────────────────────────────

function CountdownCard({ diffDays, eventActive }: { diffDays: number; eventActive: boolean }) {
  return (
    <Link href="/cronograma" className="cia-edit-card cia-edit-card--lavender group">
      {/* eyebrow */}
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'rgba(45, 27, 92, 0.55)',
          letterSpacing: '-0.01em',
        }}>
          {eventActive ? 'evento em andamento' : 'contagem regressiva'}
        </span>
        <Pill bg="rgba(45,27,92,0.10)" color="#2D1B5C">
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: eventActive ? '#22C55E' : '#2D1B5C',
              boxShadow: eventActive ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
            }}
          />
          {eventActive ? 'AO VIVO' : '04 jun'}
        </Pill>
      </div>

      {/* big content */}
      <div className="flex-1 flex flex-col justify-end">
        {eventActive ? (
          <>
            <span style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 'clamp(54px, 6vw, 88px)',
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: '-0.04em',
              color: '#0A0F0B',
            }}>
              Hoje
            </span>
            <span className="mt-1" style={{
              fontSize: 16, fontWeight: 500,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
            }}>
              Cobertura ao vivo · Uberaba, MG
            </span>
          </>
        ) : (
          <>
            <span style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 'clamp(72px, 9vw, 132px)',
              fontWeight: 800,
              lineHeight: 0.85,
              letterSpacing: '-0.05em',
              color: '#0A0F0B',
              display: 'block',
            }}>
              <CountUp to={diffDays} />
            </span>
            <span style={{
              fontSize: 17, fontWeight: 500,
              color: 'rgba(10,15,11,0.60)',
              letterSpacing: '-0.01em',
              marginTop: 4,
            }}>
              {diffDays === 1 ? 'dia para o evento' : 'dias para o evento'}
            </span>
            <span className="mt-3" style={{
              fontSize: 12,
              color: 'rgba(45,27,92,0.50)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              04 – 07 jun 2026 · Uberaba, MG
            </span>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-end justify-between mt-5">
        <span style={{ fontSize: 13, color: 'rgba(45,27,92,0.55)', fontWeight: 500 }}>
          Ver cronograma
        </span>
        <CircleArrow size={42} />
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
      {/* eyebrow */}
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'rgba(70, 50, 5, 0.65)',
          letterSpacing: '-0.01em',
        }}>
          pipeline de conteúdo
        </span>
        <Pill bg="rgba(70,50,5,0.12)" color="#46320C">
          {statusEmoji} {status}
        </Pill>
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

        {/* mini bars */}
        <div className="mt-4 flex gap-2">
          {[
            { label: 'pub',     val: publicados, color: '#0A0F0B' },
            { label: 'prod',    val: emProducao, color: 'rgba(10,15,11,0.55)' },
            { label: 'rascun.', val: rascunho,   color: 'rgba(10,15,11,0.30)' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1,
              padding: '5px 8px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.40)',
              border: '1px solid rgba(70,50,5,0.10)',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 700, lineHeight: 1,
                color: s.color, letterSpacing: '-0.02em',
              }}>{s.val}</div>
              <div style={{
                fontSize: 9, fontWeight: 600,
                color: 'rgba(70,50,5,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 2,
              }}>{s.label}</div>
            </div>
          ))}
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
// SignatureCard — terracotta, vertical, signature CTA
// ─────────────────────────────────────────────────────────────────────────────

function SignatureCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* TV mode card — terracotta */}
      <a href="/tv" target="_blank" rel="noopener noreferrer"
         className="cia-edit-card cia-edit-card--terracotta group" style={{ flex: 1, minHeight: 0 }}>
        <div className="flex items-center justify-between">
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '-0.01em',
          }}>
            grande tela
          </span>
          <Tv2 style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.85)' }} />
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
          }}>
            Modo<br/>TV
          </span>
          <span className="mt-2" style={{
            fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '-0.01em',
          }}>
            Painel monumental
          </span>
        </div>

        <div className="flex items-end justify-between mt-4">
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
            Abrir
          </span>
          <CircleArrow size={36} dark={false} />
        </div>
      </a>

      {/* Quick capture — verde dim */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('cia:open-capture'))}
        className="cia-edit-card cia-edit-card--green group"
        style={{ flex: 1, minHeight: 0, textAlign: 'left', cursor: 'pointer' }}
      >
        <div className="flex items-center justify-between">
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '-0.01em',
          }}>
            atalho rápido
          </span>
          <Camera style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.85)' }} />
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
          }}>
            Captura<br/>nova
          </span>
          <span className="mt-2" style={{
            fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '-0.01em',
          }}>
            Foto / vídeo direto
          </span>
        </div>

        <div className="flex items-end justify-between mt-4">
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
            Abrir câmera
          </span>
          <CircleArrow size={36} dark={false} />
        </div>
      </button>
    </div>
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

        {/* ─── Greeting block ─── */}
        <div className="mb-8">
          <p style={{
            fontSize: 11.5, fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(46,107,66,0.55)',
            marginBottom: 8,
          }}>
            CIA · Copa Inter Atléticas 2026
          </p>
          <h1 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(40px, 5vw, 64px)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            color: '#0A0F0B',
          }}>
            Olá, {firstName}.
          </h1>
          {userRole && (
            <p className="mt-2" style={{
              fontSize: 17,
              fontWeight: 500,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
            }}>
              {userRole}
            </p>
          )}
        </div>

        {/* ─── Hero card grid ─── */}
        <div
          className="cia-briefing-grid"
          style={{
            display: 'grid',
            gap: 14,
          }}
        >
          <div className="cia-briefing-cell-1">
            <CountdownCard diffDays={diffDays} eventActive={eventActive} />
          </div>
          <div className="cia-briefing-cell-2">
            <PipelineCard
              publicados={publicados}
              total={total}
              emProducao={emProducao}
              rascunho={rascunho}
            />
          </div>
          <div className="cia-briefing-cell-3">
            <SignatureCard />
          </div>
        </div>
      </div>
    </section>
  )
}
