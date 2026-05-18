'use client'

/**
 * AtleticaLogo — exibe o escudo de uma atlética.
 *
 * Ordem de fallback:
 *  1. atletica.logo_url   (Supabase Storage ou URL externa)
 *  2. /logos/[slug].png   (arquivo estático em /public/logos/)
 *  3. Seed badge ou iniciais
 *
 * Nenhuma migration necessária. Basta colocar arquivos em /public/logos/
 * nomeados com o slug exato da atlética (ex: uftm.png, unaerp.svg).
 */

import { useState } from 'react'

interface AtleticaLogoProps {
  slug:      string
  nome:      string
  logoUrl:   string | null
  seed?:     number | null
  accent:    string
  size?:     number
  radius?:   number
}

export function AtleticaLogo({
  slug,
  nome,
  logoUrl,
  seed,
  accent,
  size    = 88,
  radius  = 18,
}: AtleticaLogoProps) {
  // Tenta logo_url primeiro; se falhar, tenta /logos/[slug].png
  const candidates = [
    logoUrl,
    `/logos/${slug}.png`,
    `/logos/${slug}.svg`,
    `/logos/${slug}.webp`,
    `/logos/${slug}.jpg`,
  ].filter(Boolean) as string[]

  const [idx, setIdx] = useState(0)

  const failed = idx >= candidates.length

  if (!failed) {
    return (
      <div style={{
        width: size, height: size, flexShrink: 0,
        borderRadius: radius, overflow: 'hidden',
        border: `1.5px solid ${accent}28`,
        background: `${accent}0a`,
        boxShadow: `0 8px 28px ${accent}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Usa <img> em vez de next/image para ter onError confiável */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={candidates[idx]}
          alt={`Escudo ${nome}`}
          onError={() => setIdx(i => i + 1)}
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    )
  }

  // ── Fallback: Seed badge ──────────────────────────────────────────────────
  if (seed != null) {
    return (
      <div style={{
        width: size, height: size, flexShrink: 0,
        borderRadius: radius,
        background: accent, color: '#FFFFFF',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 8px 24px ${accent}40`,
      }}>
        <span style={{
          fontSize: size * 0.12, fontWeight: 800,
          letterSpacing: '0.14em', opacity: 0.80,
          textTransform: 'uppercase',
        }}>
          Seed
        </span>
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: size * 0.45, fontWeight: 800,
          letterSpacing: '-0.05em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', marginTop: 2,
        }}>
          {seed}
        </span>
      </div>
    )
  }

  // ── Fallback final: iniciais ───────────────────────────────────────────────
  const initials = nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: radius,
      background: `${accent}18`, border: `2px solid ${accent}28`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        fontSize: size * 0.32, fontWeight: 800,
        color: accent, letterSpacing: '-0.04em',
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
      }}>
        {initials}
      </span>
    </div>
  )
}

// ── Variante pequena para uso em cards/listas ─────────────────────────────────
export function AtleticaLogoSmall({
  slug,
  nome,
  logoUrl,
  seed,
  accent,
  size = 32,
}: Omit<AtleticaLogoProps, 'radius'>) {
  return (
    <AtleticaLogo
      slug={slug}
      nome={nome}
      logoUrl={logoUrl}
      seed={seed}
      accent={accent}
      size={size}
      radius={8}
    />
  )
}
