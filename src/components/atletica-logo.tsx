'use client'

/**
 * AtleticaLogo — exibe o escudo de uma atlética.
 *
 * Ordem de fallback:
 *  1. atletica.logo_url   (Supabase Storage ou URL externa)
 *  2. /logos/[slug].png   (arquivo estático em /public/logos/)
 *  3. /logos/[slug].svg
 *  4. Seed badge ou iniciais
 *
 * Usa next/image para otimização automática (WebP, lazy load, cache).
 * Nenhuma migration necessária — basta colocar arquivos em /public/logos/.
 */

import { useState } from 'react'
import Image from 'next/image'

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
  size   = 88,
  radius = 18,
}: AtleticaLogoProps) {
  // Só tenta .png e .svg — evita requests desnecessários
  const candidates = [
    logoUrl,
    `/logos/${slug}.png`,
    `/logos/${slug}.svg`,
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
        boxShadow: `0 6px 20px ${accent}22`,
        position: 'relative',
      }}>
        <Image
          src={candidates[idx]}
          alt={`Escudo ${nome}`}
          width={size}
          height={size}
          onError={() => setIdx(i => i + 1)}
          style={{ objectFit: 'contain', width: '100%', height: '100%' }}
          // Primeira imagem visível na viewport carrega eager; demais lazy
          loading={size >= 80 ? 'eager' : 'lazy'}
          unoptimized={candidates[idx].endsWith('.svg')}
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
        boxShadow: `0 6px 20px ${accent}38`,
      }}>
        <span style={{ fontSize: size * 0.12, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.80, textTransform: 'uppercase' }}>
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

  // ── Fallback final: iniciais ──────────────────────────────────────────────
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

// ── Variante pequena para listas/cards ───────────────────────────────────────
export function AtleticaLogoSmall({
  slug, nome, logoUrl, seed, accent, size = 32,
}: Omit<AtleticaLogoProps, 'radius'>) {
  return (
    <AtleticaLogo
      slug={slug} nome={nome} logoUrl={logoUrl}
      seed={seed} accent={accent} size={size} radius={8}
    />
  )
}
