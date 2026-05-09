'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ModuleCard {
  href:       string
  label:      string
  meta?:      string                  // small text under label, e.g. "234 ativos"
  tone:       'lavender' | 'gold' | 'electric' | 'terracotta' | 'green' | 'cream'
  span?:      'sm' | 'md' | 'lg'      // width hint
  icon?:      React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>
}

interface QuickGridProps {
  cards: ModuleCard[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Tone → CSS class + colors
// ─────────────────────────────────────────────────────────────────────────────

interface ToneStyle {
  className:    string                          // background class on .cia-edit-card
  text:         string                          // primary text color
  textMuted:    string                          // muted text
  arrowDark:    boolean                         // CTA dot color
}

const TONES: Record<ModuleCard['tone'], ToneStyle> = {
  lavender:   { className: 'cia-edit-card cia-edit-card--lavender',   text: '#0A0F0B', textMuted: 'rgba(45,27,92,0.55)',   arrowDark: true  },
  gold:       { className: 'cia-edit-card cia-edit-card--gold',       text: '#0A0F0B', textMuted: 'rgba(70,50,5,0.65)',    arrowDark: true  },
  electric:   { className: 'cia-edit-card cia-edit-card--electric',   text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.70)', arrowDark: false },
  terracotta: { className: 'cia-edit-card cia-edit-card--terracotta', text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.75)', arrowDark: false },
  green:      { className: 'cia-edit-card cia-edit-card--green',      text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.75)', arrowDark: false },
  cream:      { className: 'cia-edit-card cia-edit-card--cream',      text: '#0A0F0B', textMuted: 'rgba(10,15,11,0.55)',    arrowDark: true  },
}

const SPAN_GRID: Record<NonNullable<ModuleCard['span']>, string> = {
  sm: 'col-span-2',
  md: 'col-span-3',
  lg: 'col-span-4',
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────

function Card({ card, idx }: { card: ModuleCard; idx: number }) {
  const tone = TONES[card.tone]
  const Icon = card.icon
  const span = SPAN_GRID[card.span ?? 'sm']

  return (
    <Link
      href={card.href}
      className={`${tone.className} cia-quick-card ${span}`}
      style={{
        animationDelay: `${idx * 35}ms`,
      }}
    >
      {/* top row: icon */}
      <div className="flex items-start justify-between">
        {Icon && (
          <Icon
            size={20}
            strokeWidth={1.8}
            style={{ color: tone.text, opacity: 0.85 }}
          />
        )}
        <span
          className="cia-quick-arrow"
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: tone.arrowDark ? '#0A0F0B' : '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            flexShrink: 0,
          }}
        >
          <ArrowUpRight
            style={{
              width: 14, height: 14,
              color: tone.arrowDark ? '#FFFFFF' : '#0A0F0B',
              strokeWidth: 2.2,
            }}
          />
        </span>
      </div>

      {/* label + meta */}
      <div className="flex-1 flex flex-col justify-end">
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 'clamp(22px, 2.4vw, 30px)',
          fontWeight: 800,
          lineHeight: 0.95,
          letterSpacing: '-0.03em',
          color: tone.text,
        }}>
          {card.label}
        </span>
        {card.meta && (
          <span style={{
            fontSize: 13, fontWeight: 500,
            color: tone.textMuted,
            letterSpacing: '-0.01em',
            marginTop: 6,
          }}>
            {card.meta}
          </span>
        )}
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeQuickGrid
// ─────────────────────────────────────────────────────────────────────────────

export function HomeQuickGrid({ cards }: QuickGridProps) {
  return (
    <section style={{ padding: '8px 24px 32px' }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(28px, 3vw, 40px)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: '#0A0F0B',
          }}>
            Acesso rápido
          </h2>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {cards.length} módulos
          </span>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          {cards.map((c, i) => (
            <Card key={c.href} card={c} idx={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
