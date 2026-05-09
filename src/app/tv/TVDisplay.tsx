'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize2, Minimize2, RefreshCw, AlertTriangle, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// Editorial TV — color tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:        '#0A1410',
  bgDeep:    '#06100A',
  cream:     '#FAF7F0',
  creamDim:  'rgba(250,247,240,0.62)',
  creamMute: 'rgba(250,247,240,0.38)',
  creamFade: 'rgba(250,247,240,0.18)',
  surface:   'rgba(250,247,240,0.035)',
  surfaceHi: 'rgba(250,247,240,0.06)',
  border:    'rgba(250,247,240,0.07)',
  borderHi:  'rgba(250,247,240,0.12)',
  gold:      '#F0D04A',
  goldMute:  'rgba(240,208,74,0.55)',
  green:     '#4aa06a',
  greenDeep: '#2e6b42',
  lavender:  '#B8A4E8',
  terracotta:'#D8845F',
  red:       '#ef4444',
  blue:      '#5C68E8',
} as const

const FONT_DISPLAY = 'var(--font-dm-sans), system-ui, sans-serif'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineStats {
  total: number; rascunho: number; em_producao: number; pronto: number; publicado: number
}
interface DiaStat { idx: number; total: number; publicados: number; label: string }
interface CanalStat { canal: string; total: number; publicados: number }
interface PatrocStat { id: string; nome: string; total: number; publicados: number }
interface Jogo {
  id: string; equipe_a_nome: string | null; equipe_b_nome: string | null
  inicio: string | null; fim_previsto: string | null; dia_id: string | null
  status: string | null; placar_a: number | null; placar_b: number | null
}
interface EventItem {
  id: string; nome?: string; equipe_a_nome?: string | null; equipe_b_nome?: string | null
  inicio: string | null; fim_previsto: string | null; dia_id: string | null
  placar_a?: number | null; placar_b?: number | null; status?: string | null
}
interface WeatherDay { date: string; tMax: number; tMin: number; rain: number; emoji: string }
interface EmCampoItem { nome: string; setor: string }
interface RecentPublicado { id: string; titulo: string | null; canal: string | null }

interface Props {
  pipelineStats:    PipelineStats
  conteudosPorDia:  DiaStat[]
  canalBreakdown:   CanalStat[]
  patrocStats:      PatrocStat[]
  equipeAtiva:      number
  setoresCobertos:  number
  ckTotal:          number
  ckFeitos:         number
  jogosHoje:        Jogo[]
  jogosAoVivo:      Jogo[]
  showsHoje:        EventItem[]
  festasHoje:       EventItem[]
  diasEvento:       { id: string; data: string }[]
  diaAtualId:       string | null
  weatherData:      WeatherDay[] | null
  emCampo:          EmCampoItem[]
  setoresFrios:     string[]
  capturasCount:    number
  velocidade:       number
  recentPublicados: RecentPublicado[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CANAL_LABELS: Record<string, string> = {
  instagram_cia:       'IG · CIA',
  tiktok_cia:          'TK · CIA',
  instagram_exp:       'IG · EXP',
  instagram_grupo_exp: 'IG · Grupo',
  tiktok_exp:          'TK · EXP',
  instagram_nix:       'IG · NIX',
  x_cia:               'X · CIA',
  youtube_exp:         'YT · EXP',
  outro:               'Outros',
}

const CANAL_COLOR: Record<string, string> = {
  instagram_cia:       '#E1306C',
  tiktok_cia:          '#69C9D0',
  instagram_exp:       '#A855F7',
  instagram_grupo_exp: '#7C3AED',
  tiktok_exp:          '#EE1D52',
  instagram_nix:       '#F97316',
  x_cia:               '#94A3B8',
  youtube_exp:         '#EF4444',
  outro:               '#6B7280',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null) {
  if (!iso) return '—:—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function durMin(s: string | null, e: string | null) {
  if (!s || !e) return null
  return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60_000)
}

// ─────────────────────────────────────────────────────────────────────────────
// MonumentalClock — DM Sans 800, gold display
// ─────────────────────────────────────────────────────────────────────────────

function MonumentalClock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }))
      setDate(now.toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
        timeZone: 'America/Sao_Paulo',
      }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 'clamp(56px, 6.5vw, 92px)',
        fontWeight: 800,
        color: C.cream,
        letterSpacing: '-0.04em',
        lineHeight: 0.95,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {time}
      </div>
      <div style={{
        fontSize: 11, color: C.creamMute, marginTop: 6,
        textTransform: 'capitalize', letterSpacing: '0.06em', fontWeight: 500,
      }}>
        {date}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertBanner — terracotta editorial
// ─────────────────────────────────────────────────────────────────────────────

function AlertBanner({ setoresFrios }: { setoresFrios: string[] }) {
  if (setoresFrios.length === 0) return null
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(216,132,95,0.16) 0%, rgba(216,132,95,0.06) 100%)',
      border: `1px solid rgba(216,132,95,0.30)`,
      borderRadius: 14,
      padding: '9px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexShrink: 0,
    }}>
      <AlertTriangle style={{ width: 14, height: 14, color: C.terracotta, flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
      <span style={{
        fontFamily: FONT_DISPLAY, fontSize: 9, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.16em',
        color: C.terracotta, flexShrink: 0,
      }}>
        Setores sem cobertura
      </span>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
        {setoresFrios.map(s => (
          <span key={s} style={{
            fontSize: 10, fontWeight: 600, color: '#F5DDD0',
            background: 'rgba(216,132,95,0.10)', border: '1px solid rgba(216,132,95,0.22)',
            borderRadius: 99, padding: '2px 9px',
          }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PlacarStrip — broadcast-style live scores
// ─────────────────────────────────────────────────────────────────────────────

function PlacarStrip({ jogos }: { jogos: Jogo[] }) {
  if (jogos.length === 0) return null
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(239,68,68,0.10), rgba(239,68,68,0.02))',
      border: `1px solid rgba(239,68,68,0.22)`,
      borderRadius: 14,
      padding: '8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block',
          boxShadow: `0 0 8px ${C.red}cc`, animation: 'ping 1.5s ease-in-out infinite',
        }} />
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 9, fontWeight: 800,
          color: C.red, letterSpacing: '0.16em',
        }}>
          AO VIVO
        </span>
      </div>
      <div style={{ width: 1, height: 30, background: 'rgba(239,68,68,0.18)', flexShrink: 0 }} />

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', flex: 1 }}>
        {jogos.map(j => (
          <div key={j.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: 12, padding: '5px 14px',
          }}>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 600,
              color: C.creamDim, maxWidth: 90,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}>
              {j.equipe_a_nome ?? '?'}
            </span>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800,
              color: C.red, letterSpacing: '-0.03em', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {j.placar_a ?? 0}
              <span style={{ fontSize: 14, color: 'rgba(239,68,68,0.35)', margin: '0 6px', fontWeight: 500 }}>×</span>
              {j.placar_b ?? 0}
            </span>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 600,
              color: C.creamDim, maxWidth: 90,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}>
              {j.equipe_b_nome ?? '?'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EmCampoPanel — editorial cards
// ─────────────────────────────────────────────────────────────────────────────

function EmCampoPanel({ emCampo, setoresFrios }: { emCampo: EmCampoItem[]; setoresFrios: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>

      {/* Em campo */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: '12px 14px',
        flex: emCampo.length > 0 ? 1 : '0 0 auto', minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontSize: 9, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.16em', color: C.creamMute,
          }}>
            Em Campo
          </p>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800,
            letterSpacing: '-0.04em', lineHeight: 1,
            color: emCampo.length > 0 ? C.green : C.creamFade,
          }}>
            {emCampo.length}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {emCampo.length === 0 ? (
            <p style={{ fontSize: 11, color: C.creamFade, textAlign: 'center', marginTop: 16 }}>
              Ninguém em campo
            </p>
          ) : (
            emCampo.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 9,
                background: 'rgba(74,160,106,0.06)',
                border: '1px solid rgba(74,160,106,0.10)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0,
                  boxShadow: `0 0 6px ${C.green}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: C.cream,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}>
                    {p.nome}
                  </div>
                  <div style={{
                    fontSize: 9.5, color: C.creamMute, marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.setor}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Setores frios */}
      {setoresFrios.length > 0 && (
        <div style={{
          background: 'rgba(216,132,95,0.05)',
          border: '1px solid rgba(216,132,95,0.18)',
          borderRadius: 16, padding: '12px 14px', flex: '0 0 auto',
        }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontSize: 9, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.16em',
            color: C.terracotta, marginBottom: 8,
          }}>
            ⚠ Setores Frios
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {setoresFrios.slice(0, 6).map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.terracotta, flexShrink: 0 }} />
                <span style={{
                  fontSize: 11, color: '#F5DDD0', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s}
                </span>
              </div>
            ))}
            {setoresFrios.length > 6 && (
              <span style={{ fontSize: 9.5, color: 'rgba(216,132,95,0.50)', paddingLeft: 12, marginTop: 2 }}>
                +{setoresFrios.length - 6} mais
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ProximoEvento — editorial big countdown
// ─────────────────────────────────────────────────────────────────────────────

type FocalEvent = { label: string; inicio: string | null; fim: string | null; icon: string; color: string }

function ProximoEvento({ jogos, shows, festas }: { jogos: Jogo[]; shows: EventItem[]; festas: EventItem[] }) {
  const [now, setNow] = useState(new Date(0))
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const all: FocalEvent[] = [
    ...jogos.map(j => ({
      label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
      inicio: j.inicio, fim: j.fim_previsto, icon: '🏆', color: C.green,
    })),
    ...shows.map(s => ({ label: s.nome ?? '', inicio: s.inicio, fim: s.fim_previsto, icon: '🎤', color: C.lavender })),
    ...festas.map(f => ({ label: f.nome ?? '', inicio: f.inicio, fim: f.fim_previsto, icon: '🎉', color: C.terracotta })),
  ].sort((a, b) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  const active = all.find(e => e.inicio && e.fim && new Date(e.inicio) <= now && new Date(e.fim) >= now)
  const next   = all.find(e => e.inicio && new Date(e.inicio) > now)
  const focal  = active ?? next

  if (!focal) return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '16px 20px', textAlign: 'center',
      color: C.creamFade, fontSize: 12, flexShrink: 0,
    }}>
      Sem eventos programados
    </div>
  )

  const isActive   = !!active
  const diff       = focal.inicio ? new Date(focal.inicio).getTime() - now.getTime() : 0
  const totalSecs  = Math.max(0, Math.floor(diff / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60

  const timer = isActive ? null :
    h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` :
    m > 0 ? `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` :
    `${s}s`

  return (
    <div style={{
      background: isActive
        ? `linear-gradient(135deg, ${focal.color}14 0%, ${C.surface} 100%)`
        : C.surface,
      border: `1px solid ${isActive ? focal.color + '38' : C.border}`,
      borderRadius: 18,
      padding: '16px 20px',
      textAlign: 'center',
      flexShrink: 0,
      boxShadow: isActive ? `0 0 60px ${focal.color}14` : 'none',
    }}>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 9, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.18em',
        color: isActive ? focal.color : C.creamMute, marginBottom: 6,
      }}>
        {isActive ? '● Em Andamento' : 'Próximo Evento'}
      </div>
      <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{focal.icon}</div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700,
        color: isActive ? focal.color : C.cream, lineHeight: 1.15, marginBottom: 10,
        letterSpacing: '-0.02em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {focal.label}
      </div>
      {isActive ? (
        <span style={{
          display: 'inline-block',
          fontFamily: FONT_DISPLAY, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: focal.color,
          background: `${focal.color}18`, border: `1px solid ${focal.color}40`,
          borderRadius: 999, padding: '4px 14px',
        }}>
          AO VIVO
        </span>
      ) : timer && (
        <div style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(28px, 3.5vw, 42px)',
          fontWeight: 800,
          color: C.cream, letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {timer}
        </div>
      )}
      <div style={{
        marginTop: 8, fontSize: 10, color: C.creamFade,
        fontFamily: FONT_DISPLAY, letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtTime(focal.inicio)} → {fmtTime(focal.fim)}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineDonut — gold + cream donut
// ─────────────────────────────────────────────────────────────────────────────

function PipelineDonut({ stats, velocidade }: { stats: PipelineStats; velocidade: number }) {
  const segments = [
    { label: 'Publicado',  value: stats.publicado,    color: C.green },
    { label: 'Pronto',     value: stats.pronto,       color: '#7BC195' },
    { label: 'Produção',   value: stats.em_producao,  color: C.blue },
    { label: 'Rascunho',   value: stats.rascunho,     color: C.creamFade },
  ]
  const total = stats.total || 1
  const R = 46, CX = 56, CY = 56, stroke = 11
  const Cf = 2 * Math.PI * R
  let cumulative = 0
  const arcs = segments.map(seg => {
    const frac = seg.value / total
    const dashArray = `${frac * Cf} ${Cf}`
    const dashOffset = -cumulative * Cf
    cumulative += frac
    return { ...seg, dashArray, dashOffset }
  })
  const pct = Math.round((stats.publicado / total) * 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(250,247,240,0.05)" strokeWidth={stroke} />
          {arcs.map((arc) => (
            <circle key={arc.label} cx={CX} cy={CY} r={R} fill="none" stroke={arc.color} strokeWidth={stroke}
              strokeDasharray={arc.dashArray} strokeDashoffset={arc.dashOffset}
              transform={`rotate(-90 ${CX} ${CY})`} strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800,
            color: C.gold, letterSpacing: '-0.04em', lineHeight: 1,
          }}>
            {pct}<span style={{ fontSize: 14, marginLeft: 1 }}>%</span>
          </span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 8, fontWeight: 700,
            color: C.creamMute, letterSpacing: '0.16em',
            textTransform: 'uppercase', marginTop: 1,
          }}>
            saúde
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {segments.filter(s => s.value > 0).map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: C.creamDim }}>{seg.label}</span>
            </div>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700,
              color: seg.color, letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {seg.value}
            </span>
          </div>
        ))}
        <div style={{
          marginTop: 8, padding: '5px 10px', borderRadius: 10,
          background: velocidade > 0 ? 'rgba(74,160,106,0.10)' : 'rgba(250,247,240,0.04)',
          border: `1px solid ${velocidade > 0 ? 'rgba(74,160,106,0.22)' : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 8.5, color: C.creamMute, letterSpacing: '0.14em',
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            Velocidade
          </span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800,
            color: C.green, letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            +{velocidade}<span style={{ fontSize: 10, color: 'rgba(74,160,106,0.55)', marginLeft: 1 }}>/h</span>
          </span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FourDayChart — editorial bars
// ─────────────────────────────────────────────────────────────────────────────

function FourDayChart({ dias }: { dias: DiaStat[] }) {
  const maxTotal = Math.max(...dias.map(d => d.total), 1)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, height: '100%' }}>
      {dias.map(d => {
        const barH = (d.total / maxTotal) * 100
        const pubH = d.total > 0 ? (d.publicados / d.total) * barH : 0
        const pct  = d.total > 0 ? Math.round((d.publicados / d.total) * 100) : 0
        return (
          <div key={d.idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 52, height: 64, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${barH}%`, minHeight: d.total > 0 ? 4 : 0, background: C.surfaceHi, borderRadius: '6px 6px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pubH}%`, minHeight: d.publicados > 0 ? 4 : 0, background: `linear-gradient(180deg, ${C.gold} 0%, #C9AC2F 100%)`, borderRadius: '6px 6px 0 0', boxShadow: d.publicados > 0 ? `0 0 12px ${C.gold}50` : 'none', transition: 'height 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </div>
            <div style={{ marginTop: 6, textAlign: 'center' }}>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800,
                color: C.gold, lineHeight: 1, letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {d.publicados}<span style={{ fontSize: 9, color: 'rgba(240,208,74,0.42)', fontWeight: 600 }}>/{d.total}</span>
              </div>
              <div style={{ fontSize: 9, color: C.creamFade, marginTop: 2 }}>{pct}%</div>
              <div style={{
                fontSize: 9.5, fontWeight: 600, color: C.creamMute, marginTop: 3,
                lineHeight: 1.1, letterSpacing: '-0.01em',
              }}>
                {d.label.split('·')[0].trim()}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CanalChart — editorial slim bars
// ─────────────────────────────────────────────────────────────────────────────

function CanalChart({ canais }: { canais: CanalStat[] }) {
  const maxTotal = Math.max(...canais.map(c => c.total), 1)
  if (canais.length === 0) return <p style={{ fontSize: 11, color: C.creamFade, textAlign: 'center', marginTop: 10 }}>Sem conteúdos hoje</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {canais.map(c => {
        const color = CANAL_COLOR[c.canal] ?? '#6b7280'
        const label = CANAL_LABELS[c.canal] ?? c.canal
        const barW  = (c.total / maxTotal) * 100
        const pubW  = c.total > 0 ? (c.publicados / c.total) * barW : 0
        const pct   = c.total > 0 ? Math.round((c.publicados / c.total) * 100) : 0
        return (
          <div key={c.canal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: C.creamDim, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
              <span style={{
                fontFamily: FONT_DISPLAY, fontSize: 10.5, color, fontWeight: 700,
                letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
              }}>
                {c.publicados}<span style={{ color: C.creamFade, fontWeight: 400 }}>/{c.total}</span>
                <span style={{ marginLeft: 6, fontSize: 9, color: C.creamMute, fontWeight: 500 }}>{pct}%</span>
              </span>
            </div>
            <div style={{ position: 'relative', height: 5, borderRadius: 3, background: C.surface, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${barW}%`, background: 'rgba(250,247,240,0.05)', borderRadius: 3 }} />
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pubW}%`, background: color, borderRadius: 3, opacity: 0.92, boxShadow: `0 0 6px ${color}55` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TVTimeline — editorial vertical timeline
// ─────────────────────────────────────────────────────────────────────────────

type TLEntry = {
  id: string; label: string; inicio: string | null; fim_previsto: string | null
  icon: string; color: string; cat: string
}

function TVTimeline({ jogos, shows, festas }: { jogos: Jogo[]; shows: EventItem[]; festas: EventItem[] }) {
  const [now, setNow] = useState(new Date(0))
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const all: TLEntry[] = [
    ...jogos.map(j => ({
      id: j.id, label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
      inicio: j.inicio, fim_previsto: j.fim_previsto,
      icon: '🏆', color: C.green, cat: 'Esportivo',
    })),
    ...shows.map(s => ({
      id: s.id, label: s.nome ?? '', inicio: s.inicio, fim_previsto: s.fim_previsto,
      icon: '🎤', color: C.lavender, cat: 'Show',
    })),
    ...festas.map(f => ({
      id: f.id, label: f.nome ?? '', inicio: f.inicio, fim_previsto: f.fim_previsto,
      icon: '🎉', color: C.terracotta, cat: 'Festa',
    })),
  ].sort((a, b) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  if (all.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
      <p style={{ color: C.creamFade, fontSize: 12 }}>Sem eventos hoje</p>
    </div>
  )

  let nowAfterIdx = -1
  for (let i = 0; i < all.length; i++) {
    if (all[i].inicio && new Date(all[i].inicio!) <= now) nowAfterIdx = i
  }
  const nowStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {all.map((ev, i) => {
          const isLast   = i === all.length - 1
          const dur      = durMin(ev.inicio, ev.fim_previsto)
          const isActive = !!ev.inicio && !!ev.fim_previsto && new Date(ev.inicio) <= now && new Date(ev.fim_previsto) >= now
          const isPast   = !!ev.fim_previsto && new Date(ev.fim_previsto) < now
          const showNow  = nowAfterIdx === i && !isLast && !!all[i + 1]?.inicio && new Date(all[i + 1].inicio!) > now
          return (
            <div key={ev.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ width: 38, flexShrink: 0, paddingTop: 9, paddingRight: 6, textAlign: 'right' }}>
                  <span style={{
                    fontFamily: FONT_DISPLAY, fontSize: 9, fontWeight: 700,
                    color: isActive ? ev.color : isPast ? C.creamFade : C.creamMute,
                    letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtTime(ev.inicio)}
                  </span>
                </div>
                <div style={{ width: 16, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 1, height: 8, background: i === 0 ? 'transparent' : C.border }} />
                  <div style={{
                    width: isActive ? 10 : 7, height: isActive ? 10 : 7, borderRadius: '50%',
                    flexShrink: 0,
                    background: isActive ? ev.color : isPast ? C.border : `${ev.color}55`,
                    boxShadow: isActive ? `0 0 10px ${ev.color}` : 'none',
                    transition: 'all 0.3s',
                  }} />
                  {!isLast && <div style={{ width: 1, flex: 1, minHeight: 12, background: C.border }} />}
                </div>
                <div style={{ flex: 1, paddingLeft: 9, paddingBottom: isLast ? 6 : 9, paddingTop: 4 }}>
                  <div style={{
                    background: isPast ? 'rgba(250,247,240,0.02)' : `${ev.color}10`,
                    border: `1px solid ${isActive ? ev.color + '40' : isPast ? C.border : ev.color + '18'}`,
                    borderRadius: 11, padding: '7px 11px',
                    opacity: isPast ? 0.50 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 11 }}>{ev.icon}</span>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 11.5, fontWeight: 700, flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: isActive ? ev.color : isPast ? C.creamMute : C.cream,
                        letterSpacing: '-0.01em',
                      }}>
                        {ev.label}
                      </span>
                      {isActive && (
                        <span style={{
                          fontFamily: FONT_DISPLAY, fontSize: 7.5, fontWeight: 800, letterSpacing: '0.14em',
                          textTransform: 'uppercase', color: ev.color,
                          background: `${ev.color}18`, border: `1px solid ${ev.color}38`,
                          borderRadius: 99, padding: '1px 6px',
                        }}>LIVE</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 9, color: C.creamMute,
                        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                      }}>
                        {fmtTime(ev.inicio)}–{fmtTime(ev.fim_previsto)}
                      </span>
                      {dur !== null && (
                        <span style={{ fontSize: 9, color: C.creamFade }}>
                          {dur < 60 ? `${dur}min` : `${Math.floor(dur/60)}h${dur%60>0?`${dur%60}m`:''}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {showNow && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 54, paddingRight: 4, margin: '3px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.50))' }} />
                  <span style={{
                    fontFamily: FONT_DISPLAY, fontSize: 8, fontWeight: 800,
                    color: C.red, letterSpacing: '0.14em', flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    ◆ {nowStr}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(239,68,68,0.50), transparent)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CelebrationToast — editorial gold burst
// ─────────────────────────────────────────────────────────────────────────────

function CelebrationToast({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${C.gold}18 0%, transparent 70%)`,
        animation: 'celebBurst 2.5s ease-out forwards',
      }} />
      <div style={{
        background: `linear-gradient(135deg, ${C.bg} 0%, #1A2818 100%)`,
        border: `1px solid ${C.gold}55`,
        borderRadius: 22,
        padding: '22px 38px',
        display: 'flex', alignItems: 'center', gap: 18,
        boxShadow: `0 0 80px ${C.gold}25, 0 24px 48px rgba(0,0,0,0.45)`,
        animation: 'celebSlide 2.5s ease-out forwards',
      }}>
        <span style={{ fontSize: 36 }}>🎉</span>
        <div>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
            color: C.gold, letterSpacing: '-0.03em',
          }}>
            PUBLICADO!
          </div>
          <div style={{ fontSize: 11, color: C.creamMute, marginTop: 3, letterSpacing: '0.04em' }}>
            +1 conteúdo no ar
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TVCard wrapper
// ─────────────────────────────────────────────────────────────────────────────

function TVCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style,
    }}>
      <p style={{
        fontFamily: FONT_DISPLAY, fontSize: 8.5, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.18em',
        color: C.creamMute, marginBottom: 10, flexShrink: 0,
      }}>
        {title}
      </p>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI — DM Sans 800 hero number
// ─────────────────────────────────────────────────────────────────────────────

function KPI({ value, label, sub, color = C.cream, accent = false }: {
  value: string | number; label: string; sub?: string; color?: string; accent?: boolean
}) {
  return (
    <div style={{
      flex: 1,
      background: accent ? `${color}10` : C.surface,
      border: `1px solid ${accent ? color + '28' : C.border}`,
      borderRadius: 14, padding: '11px 16px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 3,
      minHeight: 76,
    }}>
      <span style={{
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800,
        color, lineHeight: 1, letterSpacing: '-0.04em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: FONT_DISPLAY, fontSize: 9, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.14em', color: C.creamMute,
      }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: 8.5, color: C.creamFade, letterSpacing: '0.04em' }}>{sub}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NotifTicker — scrolling recent publications
// ─────────────────────────────────────────────────────────────────────────────

function NotifTicker({ items }: { items: RecentPublicado[] }) {
  if (items.length === 0) return null
  const displayItems = [...items, ...items]

  return (
    <div style={{ overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center' }}>
      <div style={{
        display: 'flex', gap: 24, alignItems: 'center',
        animation: `ticker ${Math.max(20, items.length * 4)}s linear infinite`,
        whiteSpace: 'nowrap',
      }}>
        {displayItems.map((item, i) => (
          <div key={`${item.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: CANAL_COLOR[item.canal ?? ''] ?? C.green, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: C.creamDim, letterSpacing: '-0.01em' }}>
              {item.titulo ?? 'Sem título'}
              {item.canal && <span style={{ color: C.creamMute }}> · {CANAL_LABELS[item.canal] ?? item.canal}</span>}
            </span>
            <span style={{ fontSize: 10, color: C.creamFade }}>·</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TVDisplay
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_START = new Date('2026-06-04T00:00:00-03:00')

export function TVDisplay({
  pipelineStats,
  conteudosPorDia,
  canalBreakdown,
  patrocStats,
  equipeAtiva,
  ckTotal,
  ckFeitos,
  jogosHoje,
  jogosAoVivo,
  showsHoje,
  festasHoje,
  diasEvento,
  diaAtualId,
  weatherData,
  emCampo,
  setoresFrios,
  capturasCount,
  velocidade,
  recentPublicados,
}: Props) {
  const router        = useRouter()
  const [fullscreen, setFullscreen]   = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [refreshIn,  setRefreshIn]    = useState(15)
  const [celebrate,  setCelebrate]    = useState(false)
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPublicados = useRef(pipelineStats.publicado)
  const doRefreshRef   = useRef<() => void>(() => {})

  useEffect(() => {
    if (pipelineStats.publicado > prevPublicados.current) {
      setCelebrate(true)
      const t = setTimeout(() => setCelebrate(false), 2800)
      return () => clearTimeout(t)
    }
    prevPublicados.current = pipelineStats.publicado
  }, [pipelineStats.publicado])

  function doRefresh() {
    router.refresh()
    setLastRefresh(Date.now())
    setRefreshIn(15)
  }
  doRefreshRef.current = doRefresh

  useEffect(() => {
    const interval = setInterval(() => doRefreshRef.current(), 15_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRefresh) / 1000)
      setRefreshIn(Math.max(0, 15 - elapsed))
    }, 1000)
    return () => clearInterval(tick)
  }, [lastRefresh])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conteudos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doRefreshRef.current(), 1_000)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doRefreshRef.current(), 800)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doRefreshRef.current(), 1_000)
      })
      .subscribe()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

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
    function onFSChange() { setFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      document.documentElement.requestFullscreen().catch(() => {})
      setFullscreen(true)
    }, 1200)
    return () => clearTimeout(t)
  }, [])

  // Derived
  const now         = new Date()
  const diffMs      = EVENT_START.getTime() - now.getTime()
  const diffDays    = Math.max(0, Math.ceil(diffMs / 86_400_000))
  const eventActive = diffDays === 0
  const diaIdx      = diaAtualId ? (diasEvento.findIndex(d => d.id === diaAtualId) + 1) : 0
  const totalHoje   = conteudosPorDia.find(d => diasEvento[d.idx - 1]?.id === diaAtualId)
  const publicadosHoje     = totalHoje?.publicados ?? 0
  const totalConteudosHoje = totalHoje?.total ?? 0
  const healthPct    = pipelineStats.total > 0 ? Math.round((pipelineStats.publicado / pipelineStats.total) * 100) : 0
  const checklistPct = ckTotal > 0 ? Math.round((ckFeitos / ckTotal) * 100) : 0
  const hasAlerts    = setoresFrios.length > 0
  const healthColor  = healthPct >= 70 ? C.green : healthPct >= 40 ? C.gold : C.terracotta
  const ckColor      = checklistPct >= 70 ? C.green : C.gold

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: C.bg,
      color: C.cream,
      fontFamily: FONT_DISPLAY,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      gap: 10, padding: '12px 14px',
      boxSizing: 'border-box', position: 'relative',
    }}>

      {/* Background atmosphere */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(250,247,240,0.025) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      <div style={{
        position: 'absolute', top: -120, left: -100, width: 560, height: 560,
        background: `radial-gradient(circle, ${C.gold}08 0%, transparent 65%)`,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: -120, right: -120, width: 600, height: 600,
        background: `radial-gradient(circle, ${C.green}08 0%, transparent 65%)`,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ═══════ ROW 1 — HEADER ═══════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18,
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 10, zIndex: 1, position: 'relative', flexShrink: 0,
      }}>
        {/* Left: Brand + day */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
          <div style={{
            background: 'rgba(250,247,240,0.04)',
            border: `1px solid ${C.borderHi}`,
            borderRadius: 12, padding: '7px 14px',
            display: 'flex', alignItems: 'baseline', gap: 9,
          }}>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
              color: C.cream, letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              CIA
            </span>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600,
              color: C.creamMute, letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              2026
            </span>
          </div>
          {eventActive && diaIdx > 0 && (
            <div style={{
              background: `${C.gold}10`, border: `1px solid ${C.gold}30`,
              borderRadius: 99, padding: '5px 13px',
            }}>
              <span style={{
                fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 800,
                color: C.gold, letterSpacing: '0.10em',
              }}>
                DIA {diaIdx}/4
              </span>
            </div>
          )}
          {!eventActive && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{
                fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800,
                color: C.gold, letterSpacing: '-0.04em', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {diffDays}
              </span>
              <span style={{
                fontSize: 9.5, color: C.creamMute, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontWeight: 700,
              }}>
                dias
              </span>
            </div>
          )}
        </div>

        {/* Center: MONUMENTAL CLOCK */}
        <MonumentalClock />

        {/* Right: status + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {eventActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: `${C.green}10`, border: `1px solid ${C.green}30`,
              borderRadius: 99, padding: '5px 13px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, display: 'inline-block', boxShadow: `0 0 8px ${C.green}`, animation: 'ping 2s ease-in-out infinite' }} />
              <span style={{
                fontFamily: FONT_DISPLAY, fontSize: 10.5, fontWeight: 800,
                color: C.green, letterSpacing: '0.10em',
              }}>
                AO VIVO
              </span>
            </div>
          )}
          {hasAlerts && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(216,132,95,0.10)', border: '1px solid rgba(216,132,95,0.30)',
              borderRadius: 99, padding: '5px 11px',
            }}>
              <AlertTriangle style={{ width: 11, height: 11, color: C.terracotta }} />
              <span style={{
                fontFamily: FONT_DISPLAY, fontSize: 10, fontWeight: 800,
                color: C.terracotta, letterSpacing: '0.10em',
              }}>
                {setoresFrios.length} FRIOS
              </span>
            </div>
          )}
          {capturasCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${C.gold}10`, border: `1px solid ${C.gold}30`,
              borderRadius: 99, padding: '5px 11px',
            }}>
              <Camera style={{ width: 11, height: 11, color: C.gold }} />
              <span style={{
                fontFamily: FONT_DISPLAY, fontSize: 10, fontWeight: 800,
                color: C.gold, letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {capturasCount}
              </span>
            </div>
          )}
          <button onClick={doRefresh} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 10,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.creamMute, cursor: 'pointer',
          }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={toggleFullscreen} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 10,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.creamMute, cursor: 'pointer',
          }}>
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ═══════ ROW 2 — ALERT BANNER ════════════════════════════════════════ */}
      <div style={{ zIndex: 1, position: 'relative', flexShrink: 0 }}>
        <AlertBanner setoresFrios={setoresFrios} />
      </div>

      {/* ═══════ ROW 3 — PLACAR STRIP ════════════════════════════════════════ */}
      {jogosAoVivo.length > 0 && (
        <div style={{ zIndex: 1, position: 'relative', flexShrink: 0 }}>
          <PlacarStrip jogos={jogosAoVivo} />
        </div>
      )}

      {/* ═══════ ROW 4 — KPI BAR ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 8, zIndex: 1, position: 'relative', flexShrink: 0 }}>
        <KPI value={emCampo.length} label="Em Campo" color={emCampo.length > 0 ? C.green : C.creamFade} accent={emCampo.length > 0} />
        <KPI value={equipeAtiva} label="Escalados" sub="hoje" color={C.cream} />
        <KPI value={`${publicadosHoje}/${totalConteudosHoje}`} label="Publicados Hoje" color={C.gold} accent />
        <KPI value={pipelineStats.total} label="Total Geral" color={C.cream} />
        <KPI value={`${healthPct}%`} label="Saúde" color={healthColor} accent={healthPct < 70} />
        <KPI value={`${checklistPct}%`} label="Checklist" sub={`${ckFeitos}/${ckTotal}`} color={ckColor} accent={checklistPct < 70} />
        {jogosAoVivo.length > 0 && <KPI value={jogosAoVivo.length} label="Ao Vivo" color={C.red} accent />}
      </div>

      {/* ═══════ ROW 5 — MAIN CONTENT ════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '210px 1fr 230px',
        gap: 10, flex: 1, minHeight: 0,
        zIndex: 1, position: 'relative',
      }}>

        {/* LEFT: Em Campo + Setores Frios */}
        <EmCampoPanel emCampo={emCampo} setoresFrios={setoresFrios} />

        {/* CENTER: Próximo Evento + Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <ProximoEvento jogos={jogosHoje} shows={showsHoje} festas={festasHoje} />
          <TVCard title={`Timeline · ${jogosHoje.length}j · ${showsHoje.length}s · ${festasHoje.length}f`} style={{ flex: 1 }}>
            <TVTimeline jogos={jogosHoje} shows={showsHoje} festas={festasHoje} />
          </TVCard>
        </div>

        {/* RIGHT: Pipeline + Canal + Patrocínio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
          <TVCard title="Pipeline · Produção" style={{ flex: '0 0 auto' }}>
            <PipelineDonut stats={pipelineStats} velocidade={velocidade} />
          </TVCard>
          <TVCard title="Canais · Hoje" style={{ flex: 1 }}>
            <CanalChart canais={canalBreakdown} />
          </TVCard>
          {patrocStats.length > 0 && (
            <TVCard title="Patrocínio" style={{ flex: '0 0 auto' }}>
              {patrocStats.slice(0, 3).map((p, i) => {
                const pct = p.total > 0 ? Math.round((p.publicados / p.total) * 100) : 0
                return (
                  <div key={p.id} style={{ marginBottom: i < 2 ? 7 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{
                        fontSize: 10, color: C.creamDim, fontWeight: 600, letterSpacing: '-0.01em',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%',
                      }}>
                        {p.nome}
                      </span>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 10, fontWeight: 700,
                        color: pct >= 70 ? C.green : C.gold, letterSpacing: '-0.02em',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 3, background: C.surface, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: pct >= 70 ? C.green : C.gold, borderRadius: 3,
                        transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </TVCard>
          )}
        </div>
      </div>

      {/* ═══════ ROW 6 — FOOTER ══════════════════════════════════════════════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto',
        gap: 10, zIndex: 1, position: 'relative', flexShrink: 0,
        borderTop: `1px solid ${C.border}`, paddingTop: 8,
      }}>
        {/* 4-day chart */}
        <TVCard title="Conteúdos por Dia" style={{ padding: '10px 14px' }}>
          <div style={{ height: 92 }}>
            <FourDayChart dias={conteudosPorDia} />
          </div>
        </TVCard>

        {/* Clima */}
        {weatherData && (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: '10px 12px',
            display: 'flex', flexDirection: 'column',
          }}>
            <p style={{
              fontFamily: FONT_DISPLAY, fontSize: 8.5, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.18em',
              color: C.creamMute, marginBottom: 7, flexShrink: 0,
            }}>
              Clima
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 56px)', gap: 5, flex: 1 }}>
              {weatherData.map(day => (
                <div key={day.date} style={{
                  background: 'rgba(250,247,240,0.03)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '5px 6px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 7, color: C.creamFade, marginBottom: 2, letterSpacing: '0.04em' }}>
                    {day.date.slice(8,10)}/06
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1, marginBottom: 2 }}>{day.emoji}</div>
                  <div style={{
                    fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 800,
                    color: C.cream, letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {day.tMax}°<span style={{ fontSize: 8, color: C.creamMute, fontWeight: 500 }}>/{day.tMin}°</span>
                  </div>
                  <div style={{ fontSize: 7.5, color: C.creamFade, marginTop: 2 }}>💧{day.rain}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticker + meta */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', gap: 5, padding: '8px 0', maxWidth: 220,
        }}>
          <NotifTicker items={recentPublicados} />
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 8, color: C.creamFade, fontFamily: 'monospace',
              letterSpacing: '0.06em',
            }}>
              CIA 2026 · v0.7
            </div>
            <div style={{
              fontSize: 8, color: C.creamFade, letterSpacing: '0.05em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              ↻ {refreshIn}s
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Celebration Overlay ═════════════════════════════════════════ */}
      <CelebrationToast show={celebrate} />

      {/* Animations */}
      <style>{`
        @keyframes ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes celebBurst {
          0% { opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        @keyframes celebSlide {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          12% { opacity: 1; transform: translateY(0) scale(1); }
          75% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.97); }
        }
      `}</style>
    </div>
  )
}
