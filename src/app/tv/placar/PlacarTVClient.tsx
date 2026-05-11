'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, Maximize2, Minimize2, Tv2, Calendar } from 'lucide-react'
import { CiaLogo } from '@/components/cia-logo'
import { createClient } from '@/lib/supabase/client'
import { getConferencia, type ConferenciaMeta } from '@/lib/conferencias'

// ── Types ────────────────────────────────────────────────────────────────────

export interface EquipeRef {
  slug: string
  divisao: string | null
  conferencia: string | null
  cor_primaria: string | null
  universidade: string | null
}

export interface JogoTV {
  id: string
  equipe_a_id: string | null; equipe_b_id: string | null
  equipe_a_nome: string | null; equipe_b_nome: string | null
  placar_a: number | null; placar_b: number | null
  status: string | null
  inicio: string | null; fim_previsto: string | null
  divisao: string | null; fase: string | null; categoria: string | null
  modalidade: { nome: string; icone: string } | null
  setor: { nome: string } | null
  equipe_a: EquipeRef | null
  equipe_b: EquipeRef | null
}

interface Props {
  aoVivo:     JogoTV[]
  encerrados: JogoTV[]
  proximos:   JogoTV[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const DIV_COLORS: Record<string, string> = {
  '1ª Divisão': '#F0D04A',  // mais saturado pro TV
  '2ª Divisão': '#6AB87E',
  'Super 08':   '#E89A6F',
}

const FASE_LABEL: Record<string, string> = {
  grupos:    'Fase de Grupos',
  oitavas:   'Oitavas',
  quartas:   'Quartas',
  semifinal: 'Semifinal',
  final:     'Final',
}

const REALTIME_MERGEABLE: (keyof JogoTV)[] = [
  'status', 'placar_a', 'placar_b',
  'equipe_a_nome', 'equipe_b_nome',
  'inicio', 'fase', 'categoria', 'divisao',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function teamAccent(eq: EquipeRef | null, fallbackDiv: string | null): { primary: string; meta: ConferenciaMeta | null } {
  if (eq?.conferencia) {
    const meta = getConferencia(eq.conferencia)
    if (meta) return { primary: meta.cor, meta }
  }
  const div = eq?.divisao ?? fallbackDiv
  if (div && DIV_COLORS[div]) return { primary: DIV_COLORS[div], meta: null }
  return { primary: '#94a3b8', meta: null }
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtTimeWithDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ── LiveCard — grandão pra ao_vivo ───────────────────────────────────────────

function LiveCard({
  jogo,
  variant,
  pulseA,
  pulseB,
}: {
  jogo: JogoTV
  variant: 'hero' | 'large' | 'medium'
  pulseA: boolean
  pulseB: boolean
}) {
  const accentA = teamAccent(jogo.equipe_a, jogo.divisao)
  const accentB = teamAccent(jogo.equipe_b, jogo.divisao)
  const placarA = jogo.placar_a ?? 0
  const placarB = jogo.placar_b ?? 0
  const divisao = jogo.divisao ?? jogo.equipe_a?.divisao ?? jogo.equipe_b?.divisao ?? null
  const divColor = divisao ? DIV_COLORS[divisao] : null
  const conf = accentA.meta ?? accentB.meta

  const scoreSize     = variant === 'hero' ? 180 : variant === 'large' ? 130 : 88
  const nameSize      = variant === 'hero' ? 32  : variant === 'large' ? 26  : 18
  const uniSize       = variant === 'hero' ? 14  : variant === 'large' ? 12  : 10
  const padding       = variant === 'hero' ? 36  : variant === 'large' ? 28  : 20

  return (
    <div
      style={{
        position: 'relative',
        background: '#0d1612',
        borderRadius: 24,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 30px 70px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02) inset',
      }}
    >
      {/* Conference / division ambient gradient */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(140% 60% at 0% 50%, ${accentA.primary}26 0%, transparent 60%), radial-gradient(140% 60% at 100% 50%, ${accentB.primary}26 0%, transparent 60%)`,
        }}
      />
      {/* Subtle noise/grain via SVG */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: 0.04,
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/></svg>")',
        }}
      />

      {/* Top meta strip */}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: `${padding * 0.45}px ${padding}px 0`,
        marginBottom: padding * 0.5,
      }}>
        {/* AO VIVO badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 99,
          background: 'rgba(220,38,38,0.18)',
          border: '1px solid rgba(220,38,38,0.40)',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
          color: '#fca5a5', textTransform: 'uppercase',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#ef4444', boxShadow: '0 0 8px #ef4444',
            animation: 'pulse 1.4s infinite',
          }} />
          Ao vivo
        </span>

        {jogo.modalidade && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, color: 'rgba(255,255,255,0.78)', fontWeight: 600,
            letterSpacing: '-0.01em',
          }}>
            <span style={{ fontSize: 18 }}>{jogo.modalidade.icone}</span>
            {jogo.modalidade.nome}
            {jogo.categoria && (
              <span style={{ opacity: 0.55, fontWeight: 500 }}>· {jogo.categoria}</span>
            )}
          </span>
        )}

        {divisao && divColor && (
          <span style={{
            padding: '3px 10px', borderRadius: 99,
            background: `${divColor}1f`,
            color: divColor,
            border: `1px solid ${divColor}44`,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            {divisao}
          </span>
        )}

        {conf && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 99,
            background: `${conf.cor}1f`,
            color: conf.cor,
            border: `1px solid ${conf.cor}44`,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            <span>{conf.icone}</span>{conf.nome}
          </span>
        )}

        {jogo.fase && (
          <span style={{
            padding: '3px 10px', borderRadius: 99,
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(255,255,255,0.10)',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            {FASE_LABEL[jogo.fase] ?? jogo.fase}
          </span>
        )}

        {jogo.setor && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>
            {jogo.setor.nome}
          </span>
        )}
      </div>

      {/* Main score row */}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: variant === 'hero' ? 32 : 20,
          padding: `${padding * 0.5}px ${padding}px ${padding}px`,
        }}
      >
        {/* Equipe A */}
        <TeamSide
          eq={jogo.equipe_a}
          fallback={jogo.equipe_a_nome}
          score={placarA}
          accent={accentA.primary}
          align="right"
          nameSize={nameSize}
          uniSize={uniSize}
          scoreSize={scoreSize}
          pulse={pulseA}
        />

        {/* VS / divider */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 1, height: scoreSize * 0.55,
            background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.16), transparent)',
          }} />
          <span style={{
            fontSize: variant === 'hero' ? 18 : 14, fontWeight: 800,
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>
            vs
          </span>
          <div style={{
            width: 1, height: scoreSize * 0.55,
            background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.16), transparent)',
          }} />
        </div>

        {/* Equipe B */}
        <TeamSide
          eq={jogo.equipe_b}
          fallback={jogo.equipe_b_nome}
          score={placarB}
          accent={accentB.primary}
          align="left"
          nameSize={nameSize}
          uniSize={uniSize}
          scoreSize={scoreSize}
          pulse={pulseB}
        />
      </div>
    </div>
  )
}

function TeamSide({
  eq, fallback, score, accent, align, nameSize, uniSize, scoreSize, pulse,
}: {
  eq: EquipeRef | null
  fallback: string | null
  score: number
  accent: string
  align: 'left' | 'right'
  nameSize: number
  uniSize: number
  scoreSize: number
  pulse: boolean
}) {
  const display = fallback ?? '—'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : 'flex-end',
      gap: 8,
      textAlign: align,
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
        fontSize: nameSize, fontWeight: 800,
        letterSpacing: '-0.025em', lineHeight: 1,
        color: '#fafaf0',
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {display}
      </div>
      {eq?.universidade && (
        <div style={{
          fontSize: uniSize, fontWeight: 600,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          color: accent,
          opacity: 0.85,
        }}>
          {eq.universidade}
        </div>
      )}
      <div style={{
        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
        fontSize: scoreSize, fontWeight: 800,
        letterSpacing: '-0.06em', lineHeight: 0.85,
        color: '#fafaf0',
        fontVariantNumeric: 'tabular-nums',
        marginTop: 4,
        transform: pulse ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        textShadow: pulse ? `0 0 32px ${accent}` : '0 1px 2px rgba(0,0,0,0.4)',
      }}>
        {score}
      </div>
    </div>
  )
}

// ── EncerradoChip — strip do rodapé ──────────────────────────────────────────

function EncerradoChip({ jogo }: { jogo: JogoTV }) {
  const placarA = jogo.placar_a ?? 0
  const placarB = jogo.placar_b ?? 0
  const winner: 'a' | 'b' | 'draw' = placarA > placarB ? 'a' : placarA < placarB ? 'b' : 'draw'
  const accentA = teamAccent(jogo.equipe_a, jogo.divisao).primary
  const accentB = teamAccent(jogo.equipe_b, jogo.divisao).primary

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 18px',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
      minWidth: 280,
    }}>
      {jogo.modalidade && (
        <span style={{ fontSize: 18 }}>{jogo.modalidade.icone}</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <span style={{
          fontSize: 13, fontWeight: winner === 'a' ? 800 : 500,
          color: winner === 'a' ? '#fafaf0' : 'rgba(255,255,255,0.55)',
          letterSpacing: '-0.01em',
          maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textAlign: 'right', flex: 1,
        }}>
          {jogo.equipe_a_nome ?? '—'}
        </span>
        <span style={{
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          fontSize: 22, fontWeight: 800,
          color: winner === 'a' ? accentA : 'rgba(255,255,255,0.45)',
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 22, textAlign: 'center',
        }}>
          {placarA}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>×</span>
        <span style={{
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          fontSize: 22, fontWeight: 800,
          color: winner === 'b' ? accentB : 'rgba(255,255,255,0.45)',
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 22, textAlign: 'center',
        }}>
          {placarB}
        </span>
        <span style={{
          fontSize: 13, fontWeight: winner === 'b' ? 800 : 500,
          color: winner === 'b' ? '#fafaf0' : 'rgba(255,255,255,0.55)',
          letterSpacing: '-0.01em',
          maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {jogo.equipe_b_nome ?? '—'}
        </span>
      </div>
    </div>
  )
}

// ── ProximoChip — quando não há ao vivo ──────────────────────────────────────

function ProximoChip({ jogo }: { jogo: JogoTV }) {
  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 20px',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
      minWidth: 280,
    }}>
      <span style={{
        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
        fontSize: 14, fontWeight: 800,
        color: '#F0D04A',
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtTime(jogo.inicio)}
      </span>
      {jogo.modalidade && (
        <span style={{ fontSize: 16 }}>{jogo.modalidade.icone}</span>
      )}
      <div style={{ fontSize: 13, color: '#fafaf0', fontWeight: 600, letterSpacing: '-0.01em' }}>
        {jogo.equipe_a_nome ?? '—'}
        <span style={{ margin: '0 8px', opacity: 0.4 }}>×</span>
        {jogo.equipe_b_nome ?? '—'}
      </div>
    </div>
  )
}

// ── Root component ───────────────────────────────────────────────────────────

export function PlacarTVClient({ aoVivo: initialAoVivo, encerrados: initialEncerrados, proximos: initialProximos }: Props) {
  const router = useRouter()
  const [aoVivo, setAoVivo] = useState(initialAoVivo)
  const [encerrados, setEncerrados] = useState(initialEncerrados)
  const [proximos, setProximos] = useState(initialProximos)
  const [conectado, setConectado] = useState(false)
  const [pulseMap, setPulseMap] = useState<Map<string, 'a' | 'b'>>(new Map())
  const [fullscreen, setFullscreen] = useState(false)
  const lastEncerradoFlashRef = useRef<Set<string>>(new Set(initialEncerrados.map(j => j.id)))
  const now = useClock()

  // Sincroniza props (quando router.refresh refaz fetch)
  useEffect(() => { setAoVivo(initialAoVivo) }, [initialAoVivo])
  useEffect(() => { setEncerrados(initialEncerrados) }, [initialEncerrados])
  useEffect(() => { setProximos(initialProximos) }, [initialProximos])

  // Pulse helper
  const triggerPulse = useCallback((jogoId: string, side: 'a' | 'b') => {
    setPulseMap(prev => {
      const next = new Map(prev)
      next.set(jogoId, side)
      return next
    })
    setTimeout(() => {
      setPulseMap(prev => {
        if (!prev.has(jogoId)) return prev
        const next = new Map(prev)
        next.delete(jogoId)
        return next
      })
    }, 600)
  }, [])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => { router.refresh() }, 1000)
    }

    const channel = supabase
      .channel('tv-placar-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jogos' }, (payload) => {
        const newRow = payload.new as Partial<JogoTV> & { id: string }
        const oldRow = payload.old as Partial<JogoTV>

        // Mudança de status afeta as listas → refresh full
        if (newRow.status !== oldRow.status) {
          scheduleRefresh()
          return
        }

        // Mudança de equipe → refresh full pros joins
        if (newRow.equipe_a_id !== oldRow.equipe_a_id || newRow.equipe_b_id !== oldRow.equipe_b_id) {
          scheduleRefresh()
          return
        }

        // Score change: pulse + merge
        if (newRow.placar_a !== oldRow.placar_a && newRow.placar_a !== undefined) {
          triggerPulse(newRow.id, 'a')
        }
        if (newRow.placar_b !== oldRow.placar_b && newRow.placar_b !== undefined) {
          triggerPulse(newRow.id, 'b')
        }

        const patch: Partial<JogoTV> = {}
        for (const key of REALTIME_MERGEABLE) {
          if (newRow[key] !== undefined) {
            (patch as Record<string, unknown>)[key] = newRow[key]
          }
        }

        // Aplica em ao_vivo (cards principais)
        setAoVivo(prev => prev.map(j => j.id === newRow.id ? { ...j, ...patch } : j))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jogos' }, scheduleRefresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'jogos' }, scheduleRefresh)
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
      })

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      supabase.removeChannel(channel)
    }
  }, [router, triggerPulse])

  // Encerrado novo → celebra (flash a primeira vez que aparece)
  const novosEncerrados = useMemo(() => {
    const seen = lastEncerradoFlashRef.current
    return encerrados.filter(j => !seen.has(j.id)).map(j => j.id)
  }, [encerrados])
  useEffect(() => {
    if (novosEncerrados.length > 0) {
      novosEncerrados.forEach(id => lastEncerradoFlashRef.current.add(id))
    }
  }, [novosEncerrados])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setFullscreen(false)
    }
  }, [])
  useEffect(() => {
    const onFS = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

  // Layout do grid de ao_vivo (varia por count)
  const liveVariant: 'hero' | 'large' | 'medium' =
    aoVivo.length === 1 ? 'hero' :
    aoVivo.length <= 4 ? 'large' : 'medium'
  const liveCols =
    aoVivo.length === 1 ? '1fr' :
    aoVivo.length === 2 ? 'repeat(2, 1fr)' :
    aoVivo.length <= 4 ? 'repeat(2, 1fr)' :
    aoVivo.length <= 6 ? 'repeat(3, 1fr)' :
    'repeat(3, 1fr)'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070b09',
      color: '#fafaf0',
      fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Atmosphere — mystical green orbs */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(60% 50% at 10% 10%, rgba(46,107,66,0.25) 0%, transparent 60%),
            radial-gradient(70% 50% at 90% 90%, rgba(106,184,126,0.10) 0%, transparent 60%),
            radial-gradient(50% 50% at 50% 100%, rgba(240,208,74,0.06) 0%, transparent 70%)
          `,
        }}
      />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
        padding: '20px 28px 16px',
        gap: 18,
      }}>

        {/* HEADER */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 16,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <CiaLogo size={28} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
              fontWeight: 700, color: 'rgba(255,255,255,0.45)',
            }}>
              CIA 2026 · Placar
            </span>
            <span style={{
              fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
            }}>
              Ao Vivo
            </span>
          </div>

          {/* Ao vivo count */}
          {aoVivo.length > 0 && (
            <span style={{
              marginLeft: 16,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 99,
              background: 'rgba(220,38,38,0.20)',
              border: '1px solid rgba(220,38,38,0.45)',
              color: '#fca5a5',
              fontSize: 12, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}>
              <Radio size={11} style={{ animation: 'pulse 1.4s infinite' }} />
              {aoVivo.length} {aoVivo.length === 1 ? 'jogo' : 'jogos'}
            </span>
          )}

          {/* Spacer + meta */}
          <div style={{ flex: 1 }} />

          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.50)', fontWeight: 600,
            letterSpacing: '0.04em',
          }}>
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })}
          </span>

          <span style={{
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            color: '#fafaf0',
          }}>
            {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' })}
          </span>

          {/* Connection */}
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 9px', borderRadius: 99,
              background: conectado ? 'rgba(106,184,126,0.16)' : 'rgba(255,255,255,0.04)',
              border: conectado ? '1px solid rgba(106,184,126,0.30)' : '1px solid rgba(255,255,255,0.08)',
              color: conectado ? '#9be3a8' : 'rgba(255,255,255,0.40)',
              fontSize: 9, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}
            title={conectado ? 'Atualizações em tempo real' : 'Conectando...'}
          >
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: conectado ? '#6ab87e' : 'rgba(255,255,255,0.35)',
              animation: conectado ? 'pulse 1.6s infinite' : 'none',
            }} />
            {conectado ? 'Sync' : 'OFF'}
          </span>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
            }}
            title={fullscreen ? 'Sair de tela cheia (Esc)' : 'Tela cheia'}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </header>

        {/* MAIN — live games or upcoming preview */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
          {aoVivo.length > 0 ? (
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: liveCols,
              gap: 16,
              minHeight: 0,
            }}>
              {aoVivo.map(jogo => (
                <LiveCard
                  key={jogo.id}
                  jogo={jogo}
                  variant={liveVariant}
                  pulseA={pulseMap.get(jogo.id) === 'a'}
                  pulseB={pulseMap.get(jogo.id) === 'b'}
                />
              ))}
            </div>
          ) : (
            <EmptyLive proximos={proximos} />
          )}
        </main>

        {/* FOOTER — encerrados strip */}
        {encerrados.length > 0 && (
          <footer style={{
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
              }}>
                Encerrados hoje
              </span>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.30)', fontVariantNumeric: 'tabular-nums',
              }}>
                {encerrados.length}
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{
              display: 'flex', gap: 10, overflowX: 'auto',
              paddingBottom: 4,
              scrollbarWidth: 'thin',
            }}>
              {encerrados.map(jogo => (
                <EncerradoChip key={jogo.id} jogo={jogo} />
              ))}
            </div>
          </footer>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        body::-webkit-scrollbar { width: 0; }
        ::-webkit-scrollbar { height: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 3px; }
      `}</style>
    </div>
  )
}

// ── Estado vazio: nenhum jogo ao vivo ────────────────────────────────────────

function EmptyLive({ proximos }: { proximos: JogoTV[] }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 28,
      padding: 40,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 86, height: 86, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Tv2 size={36} style={{ color: 'rgba(255,255,255,0.30)' }} />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 540 }}>
        <h2 style={{
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
          marginBottom: 10, color: '#fafaf0',
        }}>
          Sem jogos ao vivo agora
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
          Quando algum jogo entrar em campo, o placar aparece aqui em tempo real.
        </p>
      </div>

      {proximos.length > 0 && (
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Calendar size={13} style={{ color: 'rgba(255,255,255,0.45)' }} />
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
            }}>
              Próximos a iniciar
            </span>
          </div>
          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
          }}>
            {proximos.map(jogo => (
              <ProximoChip key={jogo.id} jogo={jogo} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
