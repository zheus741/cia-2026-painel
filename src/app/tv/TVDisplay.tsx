'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize2, Minimize2, RefreshCw, AlertTriangle, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineStats {
  total: number; rascunho: number; em_producao: number; pronto: number; publicado: number
}
interface DiaStat {
  idx: number; total: number; publicados: number; label: string
}
interface CanalStat {
  canal: string; total: number; publicados: number
}
interface PatrocStat {
  id: string; nome: string; total: number; publicados: number
}
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
interface WeatherDay {
  date: string; tMax: number; tMin: number; rain: number; emoji: string
}
interface EmCampoItem {
  nome: string; setor: string
}
interface RecentPublicado {
  id: string; titulo: string | null; canal: string | null
}

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
// Monumental Clock — hero element, center of header
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
        fontFamily: 'Orbitron, monospace',
        fontSize: 'clamp(48px, 6vw, 82px)',
        fontWeight: 900,
        color: '#4aa06a',
        letterSpacing: '0.04em',
        lineHeight: 1,
        textShadow: '0 0 40px rgba(74,160,106,0.35), 0 0 80px rgba(74,160,106,0.12)',
      }}>
        {time}
      </div>
      <div style={{
        fontSize: 10, color: 'rgba(150,200,160,0.40)', marginTop: 5,
        textTransform: 'capitalize', letterSpacing: '0.14em', fontWeight: 500,
      }}>
        {date}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Alert Banner — red strip when setores frios
// ─────────────────────────────────────────────────────────────────────────────

function AlertBanner({ setoresFrios }: { setoresFrios: string[] }) {
  if (setoresFrios.length === 0) return null
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(127,29,29,0.95) 0%, rgba(153,27,27,0.90) 100%)',
      border: '1px solid rgba(239,68,68,0.40)',
      borderLeft: '4px solid #ef4444',
      borderRadius: 8,
      padding: '7px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
    }}>
      <AlertTriangle style={{ width: 14, height: 14, color: '#fca5a5', flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#fca5a5', flexShrink: 0 }}>
        Setores sem cobertura:
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
        {setoresFrios.map(s => (
          <span key={s} style={{
            fontSize: 9.5, fontWeight: 700, color: '#fca5a5',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)',
            borderRadius: 4, padding: '2px 7px', letterSpacing: '0.05em',
          }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Placar Strip — horizontal live score cards
// ─────────────────────────────────────────────────────────────────────────────

function PlacarStrip({ jogos }: { jogos: Jogo[] }) {
  if (jogos.length === 0) return null
  return (
    <div style={{
      background: 'rgba(10,20,12,0.80)',
      border: '1px solid rgba(239,68,68,0.25)',
      borderLeft: '4px solid #ef4444',
      borderRadius: 8,
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* AO VIVO badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block',
          boxShadow: '0 0 8px rgba(239,68,68,0.8)', animation: 'ping 1.5s ease-in-out infinite',
        }} />
        <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, fontWeight: 700, color: '#ef4444', letterSpacing: '0.18em' }}>
          AO VIVO
        </span>
      </div>
      <div style={{ width: 1, height: 28, background: 'rgba(239,68,68,0.20)', flexShrink: 0 }} />

      {/* Score cards */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1 }}>
        {jogos.map(j => (
          <div key={j.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
            borderRadius: 8, padding: '4px 12px',
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(200,220,205,0.80)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {j.equipe_a_nome ?? '?'}
            </span>
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 20, fontWeight: 900, color: '#f87171', letterSpacing: '0.05em', lineHeight: 1 }}>
              {j.placar_a ?? 0}
              <span style={{ fontSize: 12, color: 'rgba(239,68,68,0.40)', margin: '0 3px' }}>×</span>
              {j.placar_b ?? 0}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(200,220,205,0.80)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {j.equipe_b_nome ?? '?'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Em Campo Panel — left column
// ─────────────────────────────────────────────────────────────────────────────

function EmCampoPanel({ emCampo, setoresFrios }: { emCampo: EmCampoItem[]; setoresFrios: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'hidden' }}>

      {/* Em campo */}
      <div style={{
        background: 'rgba(10,20,12,0.85)', border: '1px solid rgba(46,107,66,0.18)',
        borderRadius: 10, padding: '10px 12px', flex: emCampo.length > 0 ? 1 : '0 0 auto', minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
          <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'rgba(74,160,106,0.45)' }}>
            Em Campo
          </p>
          <span style={{
            fontFamily: 'Orbitron,monospace', fontSize: 12, fontWeight: 700,
            color: emCampo.length > 0 ? '#4aa06a' : 'rgba(150,200,160,0.25)',
          }}>
            {emCampo.length}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {emCampo.length === 0 ? (
            <p style={{ fontSize: 10, color: 'rgba(150,200,160,0.20)', textAlign: 'center', marginTop: 12 }}>
              Ninguém em campo
            </p>
          ) : (
            emCampo.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', borderRadius: 6,
                background: 'rgba(46,107,66,0.07)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#4aa06a', flexShrink: 0,
                  boxShadow: '0 0 6px rgba(74,160,106,0.70)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(200,220,205,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nome}
                  </div>
                  <div style={{ fontSize: 8.5, color: 'rgba(150,200,160,0.40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          background: 'rgba(20,8,8,0.90)', border: '1px solid rgba(239,68,68,0.25)',
          borderLeft: '3px solid rgba(239,68,68,0.60)',
          borderRadius: 10, padding: '10px 12px', flex: '0 0 auto',
        }}>
          <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(239,68,68,0.55)', marginBottom: 7 }}>
            ⚠ Frios
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {setoresFrios.slice(0, 6).map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'rgba(252,165,165,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s}
                </span>
              </div>
            ))}
            {setoresFrios.length > 6 && (
              <span style={{ fontSize: 9, color: 'rgba(239,68,68,0.40)', paddingLeft: 10 }}>
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
// Próximo Evento focal — center top
// ─────────────────────────────────────────────────────────────────────────────

type FocalEvent = { label: string; inicio: string | null; fim: string | null; icon: string; color: string }

function ProximoEvento({ jogos, shows, festas }: { jogos: Jogo[]; shows: EventItem[]; festas: EventItem[] }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const all: FocalEvent[] = [
    ...jogos.map(j => ({
      label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
      inicio: j.inicio, fim: j.fim_previsto, icon: '🏆', color: '#4aa06a',
    })),
    ...shows.map(s => ({ label: s.nome ?? '', inicio: s.inicio, fim: s.fim_previsto, icon: '🎤', color: '#a855f7' })),
    ...festas.map(f => ({ label: f.nome ?? '', inicio: f.inicio, fim: f.fim_previsto, icon: '🎉', color: '#f472b6' })),
  ].sort((a, b) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  const active = all.find(e => e.inicio && e.fim && new Date(e.inicio) <= now && new Date(e.fim) >= now)
  const next   = all.find(e => e.inicio && new Date(e.inicio) > now)
  const focal  = active ?? next

  if (!focal) return (
    <div style={{ padding: '16px 0', textAlign: 'center', color: 'rgba(150,200,160,0.20)', fontSize: 11 }}>
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
        ? `linear-gradient(135deg, ${focal.color}12 0%, rgba(10,20,12,0.85) 100%)`
        : 'rgba(10,20,12,0.85)',
      border: `1px solid ${isActive ? focal.color + '30' : 'rgba(46,107,66,0.18)'}`,
      borderLeft: `4px solid ${isActive ? focal.color : 'rgba(46,107,66,0.30)'}`,
      borderRadius: 10,
      padding: '12px 14px',
      textAlign: 'center',
      flexShrink: 0,
      boxShadow: isActive ? `0 0 30px ${focal.color}10` : 'none',
    }}>
      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'rgba(150,200,160,0.35)', marginBottom: 5 }}>
        {isActive ? '● Em Andamento' : 'Próximo Evento'}
      </div>
      <div style={{ fontSize: 20, lineHeight: 1, marginBottom: 4 }}>{focal.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? focal.color : 'rgba(200,220,205,0.88)', lineHeight: 1.2, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {focal.label}
      </div>
      {isActive ? (
        <span style={{
          display: 'inline-block', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: focal.color,
          background: `${focal.color}18`, border: `1px solid ${focal.color}40`,
          borderRadius: 12, padding: '3px 12px',
        }}>
          AO VIVO
        </span>
      ) : timer && (
        <div style={{
          fontFamily: 'Orbitron,monospace', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900,
          color: 'rgba(200,220,205,0.90)', letterSpacing: '0.04em',
          textShadow: '0 0 20px rgba(200,220,205,0.15)',
        }}>
          {timer}
        </div>
      )}
      <div style={{ marginTop: 5, fontSize: 9, color: 'rgba(150,200,160,0.30)', fontFamily: 'Orbitron,monospace' }}>
        {fmtTime(focal.inicio)} → {fmtTime(focal.fim)}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline donut (SVG)
// ─────────────────────────────────────────────────────────────────────────────

function PipelineDonut({ stats, velocidade }: { stats: PipelineStats; velocidade: number }) {
  const segments = [
    { label: 'Publicado',  value: stats.publicado,   color: '#2e6b42' },
    { label: 'Pronto',     value: stats.pronto,       color: '#4aa06a' },
    { label: 'Produção',   value: stats.em_producao,  color: '#3b82f6' },
    { label: 'Rascunho',   value: stats.rascunho,     color: 'rgba(150,200,160,0.20)' },
  ]
  const total = stats.total || 1
  const R = 44, CX = 52, CY = 52, stroke = 12
  const C = 2 * Math.PI * R
  let cumulative = 0
  const arcs = segments.map(seg => {
    const frac = seg.value / total
    const dashArray = `${frac * C} ${C}`
    const dashOffset = -cumulative * C
    cumulative += frac
    return { ...seg, dashArray, dashOffset }
  })
  const pct = Math.round((stats.publicado / total) * 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={104} height={104} viewBox="0 0 104 104">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(46,107,66,0.10)" strokeWidth={stroke} />
          {arcs.map((arc, i) => (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={arc.color} strokeWidth={stroke}
              strokeDasharray={arc.dashArray} strokeDashoffset={arc.dashOffset}
              transform="rotate(-90 52 52)" strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          ))}
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={17} fontWeight={700} fontFamily="Orbitron,monospace" fill="#4aa06a">{pct}</text>
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize={7.5} fill="rgba(150,200,160,0.40)" letterSpacing={1.5}>%SAÚDE</text>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {segments.filter(s => s.value > 0).map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'rgba(150,200,160,0.55)' }}>{seg.label}</span>
            </div>
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 11, fontWeight: 700, color: seg.color }}>{seg.value}</span>
          </div>
        ))}
        {/* Velocity badge */}
        <div style={{
          marginTop: 6, padding: '4px 8px', borderRadius: 6,
          background: velocidade > 0 ? 'rgba(46,107,66,0.12)' : 'rgba(46,107,66,0.05)',
          border: '1px solid rgba(46,107,66,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 8, color: 'rgba(150,200,160,0.40)', letterSpacing: '0.08em' }}>VELOCIDADE</span>
          <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 12, fontWeight: 700, color: '#4aa06a' }}>
            +{velocidade}/h
          </span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4-Day Bar Chart
// ─────────────────────────────────────────────────────────────────────────────

function FourDayChart({ dias }: { dias: DiaStat[] }) {
  const maxTotal = Math.max(...dias.map(d => d.total), 1)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, height: '100%' }}>
      {dias.map(d => {
        const barH = (d.total / maxTotal) * 100
        const pubH = d.total > 0 ? (d.publicados / d.total) * barH : 0
        const pct  = d.total > 0 ? Math.round((d.publicados / d.total) * 100) : 0
        return (
          <div key={d.idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 48, height: 64, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${barH}%`, minHeight: d.total > 0 ? 4 : 0, background: 'rgba(46,107,66,0.12)', borderRadius: '5px 5px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pubH}%`, minHeight: d.publicados > 0 ? 4 : 0, background: 'linear-gradient(180deg, #4aa06a 0%, #2e6b42 100%)', borderRadius: '5px 5px 0 0', boxShadow: d.publicados > 0 ? '0 0 10px rgba(74,160,106,0.30)' : 'none', transition: 'height 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </div>
            <div style={{ marginTop: 4, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 11, fontWeight: 700, color: '#4aa06a', lineHeight: 1 }}>
                {d.publicados}<span style={{ fontSize: 8, color: 'rgba(74,160,106,0.4)' }}>/{d.total}</span>
              </div>
              <div style={{ fontSize: 8, color: 'rgba(150,200,160,0.35)', marginTop: 1 }}>{pct}%</div>
              <div style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(150,200,160,0.50)', marginTop: 2, lineHeight: 1.1 }}>
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
// Canal Chart
// ─────────────────────────────────────────────────────────────────────────────

function CanalChart({ canais }: { canais: CanalStat[] }) {
  const maxTotal = Math.max(...canais.map(c => c.total), 1)
  if (canais.length === 0) return <p style={{ fontSize: 10, color: 'rgba(150,200,160,0.25)', textAlign: 'center', marginTop: 10 }}>Sem conteúdos hoje</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {canais.map(c => {
        const color = CANAL_COLOR[c.canal] ?? '#6b7280'
        const label = CANAL_LABELS[c.canal] ?? c.canal
        const barW  = (c.total / maxTotal) * 100
        const pubW  = c.total > 0 ? (c.publicados / c.total) * barW : 0
        const pct   = c.total > 0 ? Math.round((c.publicados / c.total) * 100) : 0
        return (
          <div key={c.canal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1.5 }}>
              <span style={{ fontSize: 9, color: 'rgba(200,220,205,0.60)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, color, fontWeight: 700 }}>
                {c.publicados}<span style={{ color: 'rgba(200,220,205,0.25)', fontWeight: 400 }}>/{c.total}</span>
              </span>
            </div>
            <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(46,107,66,0.08)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${barW}%`, background: 'rgba(46,107,66,0.10)', borderRadius: 2 }} />
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pubW}%`, background: color, borderRadius: 2, opacity: 0.85, boxShadow: `0 0 5px ${color}55` }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 7, color: 'rgba(150,200,160,0.25)', marginTop: 0.5 }}>{pct}%</div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────────────────────────────────────

type TLEntry = {
  id: string; label: string; inicio: string | null; fim_previsto: string | null
  icon: string; color: string; bg: string; cat: string
}

function TVTimeline({ jogos, shows, festas }: { jogos: Jogo[]; shows: EventItem[]; festas: EventItem[] }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const all: TLEntry[] = [
    ...jogos.map(j => ({
      id: j.id, label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
      inicio: j.inicio, fim_previsto: j.fim_previsto,
      icon: '🏆', color: '#4aa06a', bg: 'rgba(46,107,66,0.10)', cat: 'Esportivo',
    })),
    ...shows.map(s => ({
      id: s.id, label: s.nome ?? '', inicio: s.inicio, fim_previsto: s.fim_previsto,
      icon: '🎤', color: '#a855f7', bg: 'rgba(124,58,237,0.08)', cat: 'Show',
    })),
    ...festas.map(f => ({
      id: f.id, label: f.nome ?? '', inicio: f.inicio, fim_previsto: f.fim_previsto,
      icon: '🎉', color: '#f472b6', bg: 'rgba(190,24,93,0.06)', cat: 'Festa',
    })),
  ].sort((a, b) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  if (all.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
      <p style={{ color: 'rgba(150,200,160,0.20)', fontSize: 11 }}>Sem eventos hoje</p>
    </div>
  )

  let nowAfterIdx = -1
  for (let i = 0; i < all.length; i++) {
    if (all[i].inicio && new Date(all[i].inicio!) <= now) nowAfterIdx = i
  }
  const nowStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingRight: 2 }}>
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
                <div style={{ width: 34, flexShrink: 0, paddingTop: 8, paddingRight: 5, textAlign: 'right' }}>
                  <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 7.5, fontWeight: 700, color: isActive ? ev.color : isPast ? 'rgba(150,200,160,0.20)' : 'rgba(150,200,160,0.45)' }}>
                    {fmtTime(ev.inicio)}
                  </span>
                </div>
                <div style={{ width: 14, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 1, height: 7, background: i === 0 ? 'transparent' : 'rgba(46,107,66,0.16)' }} />
                  <div style={{ width: isActive ? 9 : 6, height: isActive ? 9 : 6, borderRadius: '50%', flexShrink: 0, background: isActive ? ev.color : isPast ? 'rgba(46,107,66,0.12)' : `${ev.color}50`, boxShadow: isActive ? `0 0 8px ${ev.color}80` : 'none', transition: 'all 0.3s' }} />
                  {!isLast && <div style={{ width: 1, flex: 1, minHeight: 10, background: 'rgba(46,107,66,0.16)' }} />}
                </div>
                <div style={{ flex: 1, paddingLeft: 7, paddingBottom: isLast ? 4 : 7, paddingTop: 3 }}>
                  <div style={{
                    background: isPast ? 'rgba(10,20,12,0.35)' : ev.bg,
                    border: `1px solid ${isActive ? ev.color + '35' : isPast ? 'rgba(46,107,66,0.05)' : ev.color + '15'}`,
                    borderLeft: `2px solid ${isActive ? ev.color : isPast ? 'rgba(46,107,66,0.10)' : ev.color + '40'}`,
                    borderRadius: '0 7px 7px 0', padding: '5px 8px', opacity: isPast ? 0.45 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 9 }}>{ev.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? ev.color : isPast ? 'rgba(150,200,160,0.30)' : 'rgba(200,220,205,0.85)' }}>
                        {ev.label}
                      </span>
                      {isActive && <span style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ev.color, background: `${ev.color}15`, border: `1px solid ${ev.color}30`, borderRadius: 3, padding: '1px 4px' }}>LIVE</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 7.5, color: 'rgba(150,200,160,0.28)', fontFamily: 'Orbitron,monospace' }}>{fmtTime(ev.inicio)}–{fmtTime(ev.fim_previsto)}</span>
                      {dur !== null && <span style={{ fontSize: 7.5, color: 'rgba(150,200,160,0.18)' }}>{dur < 60 ? `${dur}min` : `${Math.floor(dur/60)}h${dur%60>0?`${dur%60}m`:''}`}</span>}
                    </div>
                  </div>
                </div>
              </div>
              {showNow && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 48, paddingRight: 4, margin: '3px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.45))' }} />
                  <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 7, fontWeight: 700, color: '#ef4444', letterSpacing: '0.12em', flexShrink: 0 }}>◆ {nowStr}</span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(239,68,68,0.45), transparent)' }} />
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
// Celebration Toast — flashes on new publish
// ─────────────────────────────────────────────────────────────────────────────

function CelebrationToast({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Radial burst */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(74,160,106,0.12) 0%, transparent 70%)',
        animation: 'celebBurst 2.5s ease-out forwards',
      }} />
      <div style={{
        background: 'linear-gradient(135deg, rgba(14,30,17,0.96) 0%, rgba(22,50,28,0.96) 100%)',
        border: '1px solid rgba(74,160,106,0.50)',
        borderRadius: 16,
        padding: '18px 32px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 0 60px rgba(74,160,106,0.25), 0 20px 40px rgba(0,0,0,0.40)',
        animation: 'celebSlide 2.5s ease-out forwards',
      }}>
        <span style={{ fontSize: 28 }}>🎉</span>
        <div>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 14, fontWeight: 900, color: '#4aa06a', letterSpacing: '0.08em' }}>
            PUBLICADO!
          </div>
          <div style={{ fontSize: 10, color: 'rgba(150,200,160,0.55)', marginTop: 2, letterSpacing: '0.08em' }}>
            +1 conteúdo no ar
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TV Card wrapper
// ─────────────────────────────────────────────────────────────────────────────

function TVCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(10, 20, 12, 0.85)', border: '1px solid rgba(46,107,66,0.18)',
      borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style,
    }}>
      <p style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(74,160,106,0.40)', marginBottom: 8, flexShrink: 0 }}>
        {title}
      </p>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KPI({ value, label, sub, color = '#4aa06a', size = 'md' }: {
  value: string | number; label: string; sub?: string; color?: string; size?: 'sm' | 'md' | 'lg'
}) {
  const fontSize = size === 'lg' ? 32 : size === 'sm' ? 18 : 24
  return (
    <div style={{
      flex: 1, background: 'rgba(15, 28, 18, 0.70)', border: '1px solid rgba(46,107,66,0.16)',
      borderRadius: 9, padding: '10px 14px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2,
    }}>
      <span style={{ fontFamily: 'Orbitron,monospace', fontSize, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(150,200,160,0.45)' }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: 8, color: 'rgba(150,200,160,0.25)' }}>{sub}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Ticker — scrolling recent publications in footer
// ─────────────────────────────────────────────────────────────────────────────

function NotifTicker({ items }: { items: RecentPublicado[] }) {
  if (items.length === 0) return null
  const displayItems = [...items, ...items] // duplicate for seamless loop

  return (
    <div style={{ overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center' }}>
      <div style={{
        display: 'flex', gap: 20, alignItems: 'center',
        animation: `ticker ${Math.max(20, items.length * 4)}s linear infinite`,
        whiteSpace: 'nowrap',
      }}>
        {displayItems.map((item, i) => (
          <div key={`${item.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: CANAL_COLOR[item.canal ?? ''] ?? '#4aa06a', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'rgba(150,200,160,0.50)' }}>
              {item.titulo ?? 'Sem título'}{item.canal ? ` · ${CANAL_LABELS[item.canal] ?? item.canal}` : ''}
            </span>
            <span style={{ fontSize: 8, color: 'rgba(150,200,160,0.20)' }}>·</span>
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
  setoresCobertos,
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

  // Detect new publication
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

  useEffect(() => {
    const interval = setInterval(doRefresh, 15_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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
        debounceRef.current = setTimeout(doRefresh, 1_000)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(doRefresh, 800)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(doRefresh, 1_000)
      })
      .subscribe()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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
    }, 800)
    return () => clearTimeout(t)
  }, [])

  // Derived values
  const now        = new Date()
  const diffMs     = EVENT_START.getTime() - now.getTime()
  const diffDays   = Math.max(0, Math.ceil(diffMs / 86_400_000))
  const eventActive = diffDays === 0
  const diaIdx     = diaAtualId ? (diasEvento.findIndex(d => d.id === diaAtualId) + 1) : 0
  const totalHoje  = conteudosPorDia.find(d => diasEvento[d.idx - 1]?.id === diaAtualId)
  const publicadosHoje      = totalHoje?.publicados ?? 0
  const totalConteudosHoje  = totalHoje?.total ?? 0
  const healthPct    = pipelineStats.total > 0 ? Math.round((pipelineStats.publicado / pipelineStats.total) * 100) : 0
  const checklistPct = ckTotal > 0 ? Math.round((ckFeitos / ckTotal) * 100) : 0
  const hasAlerts    = setoresFrios.length > 0

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#060c07',
      color: 'rgba(200, 220, 205, 0.90)',
      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      gap: 8, padding: '10px 12px',
      boxSizing: 'border-box', position: 'relative',
    }}>

      {/* Background texture */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'radial-gradient(circle, rgba(46,107,66,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'absolute', top: -100, left: -80, width: 500, height: 500, background: 'radial-gradient(circle, rgba(46,107,66,0.08) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {/* ═══════ ROW 1 — HEADER ═══════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid rgba(46,107,66,0.12)',
        paddingBottom: 8, zIndex: 1, position: 'relative', flexShrink: 0,
      }}>
        {/* Left: Brand + day */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a3d24, #2e6b42)',
            border: '1px solid rgba(74,160,106,0.25)',
            borderRadius: 9, padding: '5px 11px',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 16, fontWeight: 700, color: '#4aa06a', letterSpacing: '0.04em' }}>CIA</span>
            <div style={{ width: 1, height: 16, background: 'rgba(74,160,106,0.20)' }} />
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 11, color: 'rgba(74,160,106,0.55)', letterSpacing: '0.04em' }}>2026</span>
          </div>
          {eventActive && diaIdx > 0 && (
            <div style={{
              background: 'rgba(46,107,66,0.12)', border: '1px solid rgba(46,107,66,0.25)',
              borderRadius: 7, padding: '4px 10px',
            }}>
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 10, fontWeight: 700, color: 'rgba(74,160,106,0.70)', letterSpacing: '0.08em' }}>
                DIA {diaIdx}/4
              </span>
            </div>
          )}
          {!eventActive && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 26, fontWeight: 700, color: '#2e6b42' }}>{diffDays}</span>
              <span style={{ fontSize: 9, color: 'rgba(150,200,160,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>dias</span>
            </div>
          )}
        </div>

        {/* Center: MONUMENTAL CLOCK */}
        <MonumentalClock />

        {/* Right: status + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {eventActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(46,107,66,0.12)', border: '1px solid rgba(74,160,106,0.30)',
              borderRadius: 18, padding: '4px 12px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4aa06a', display: 'inline-block', boxShadow: '0 0 8px rgba(74,160,106,0.8)', animation: 'ping 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 11, fontWeight: 700, color: '#4aa06a', letterSpacing: '0.08em' }}>AO VIVO</span>
            </div>
          )}
          {hasAlerts && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(127,29,29,0.30)', border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 18, padding: '4px 10px',
            }}>
              <AlertTriangle style={{ width: 10, height: 10, color: '#f87171' }} />
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, fontWeight: 700, color: '#f87171', letterSpacing: '0.10em' }}>
                {setoresFrios.length} FRIOS
              </span>
            </div>
          )}
          {capturasCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.30)',
              borderRadius: 18, padding: '4px 10px',
            }}>
              <Camera style={{ width: 10, height: 10, color: '#fbbf24' }} />
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, fontWeight: 700, color: '#fbbf24' }}>
                {capturasCount}
              </span>
            </div>
          )}
          <button onClick={doRefresh} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: 'rgba(46,107,66,0.08)', border: '1px solid rgba(46,107,66,0.18)', color: 'rgba(74,160,106,0.55)', cursor: 'pointer' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={toggleFullscreen} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: 'rgba(46,107,66,0.08)', border: '1px solid rgba(46,107,66,0.18)', color: 'rgba(74,160,106,0.55)', cursor: 'pointer' }}>
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
      <div style={{ display: 'flex', gap: 6, zIndex: 1, position: 'relative', flexShrink: 0 }}>
        <KPI value={emCampo.length} label="Em Campo" color={emCampo.length > 0 ? '#4aa06a' : 'rgba(150,200,160,0.30)'} size="sm" />
        <KPI value={equipeAtiva} label="Escalados" sub="hoje" color="rgba(150,200,160,0.60)" size="sm" />
        <KPI value={`${publicadosHoje}/${totalConteudosHoje}`} label="Publicados Hoje" color="#4aa06a" size="sm" />
        <KPI value={pipelineStats.total} label="Total Geral" color="rgba(150,200,160,0.55)" size="sm" />
        <KPI value={`${healthPct}%`} label="Saúde" color={healthPct >= 70 ? '#4aa06a' : healthPct >= 40 ? '#e8b94f' : '#f87171'} size="sm" />
        <KPI value={`${checklistPct}%`} label="Checklist" sub={`${ckFeitos}/${ckTotal}`} color={checklistPct >= 70 ? '#4aa06a' : '#e8b94f'} size="sm" />
        {jogosAoVivo.length > 0 && <KPI value={jogosAoVivo.length} label="Ao Vivo" color="#ef4444" size="sm" />}
      </div>

      {/* ═══════ ROW 5 — MAIN CONTENT ════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '190px 1fr 210px',
        gap: 8, flex: 1, minHeight: 0,
        zIndex: 1, position: 'relative',
      }}>

        {/* LEFT: Em Campo + Setores Frios */}
        <EmCampoPanel emCampo={emCampo} setoresFrios={setoresFrios} />

        {/* CENTER: Próximo Evento + Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <ProximoEvento jogos={jogosHoje} shows={showsHoje} festas={festasHoje} />
          <TVCard title={`Timeline · ${jogosHoje.length}j · ${showsHoje.length}s · ${festasHoje.length}f`} style={{ flex: 1 }}>
            <TVTimeline jogos={jogosHoje} shows={showsHoje} festas={festasHoje} />
          </TVCard>
        </div>

        {/* RIGHT: Pipeline + Canal + Patrocínio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
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
                  <div key={p.id} style={{ marginBottom: i < 2 ? 6 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 9, color: 'rgba(200,220,205,0.60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.nome}</span>
                      <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 8.5, color: pct >= 70 ? '#4aa06a' : '#e8b94f' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(46,107,66,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? '#2e6b42' : '#d97706', borderRadius: 2, transition: 'width 1s ease' }} />
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
        gap: 8, zIndex: 1, position: 'relative', flexShrink: 0,
        borderTop: '1px solid rgba(46,107,66,0.10)', paddingTop: 6,
      }}>
        {/* 4-day chart */}
        <TVCard title="Conteúdos por Dia" style={{ padding: '8px 12px' }}>
          <div style={{ height: 88 }}>
            <FourDayChart dias={conteudosPorDia} />
          </div>
        </TVCard>

        {/* Clima */}
        {weatherData && (
          <div style={{
            background: 'rgba(10,20,12,0.85)', border: '1px solid rgba(46,107,66,0.16)',
            borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column',
          }}>
            <p style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'rgba(74,160,106,0.38)', marginBottom: 6, flexShrink: 0 }}>
              Clima
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 52px)', gap: 4, flex: 1 }}>
              {weatherData.map(day => (
                <div key={day.date} style={{ background: 'rgba(46,107,66,0.05)', border: '1px solid rgba(46,107,66,0.10)', borderRadius: 6, padding: '4px 5px', textAlign: 'center' }}>
                  <div style={{ fontSize: 6.5, color: 'rgba(150,200,160,0.35)', marginBottom: 2 }}>{day.date.slice(8,10)}/06</div>
                  <div style={{ fontSize: 14, lineHeight: 1, marginBottom: 2 }}>{day.emoji}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(200,220,205,0.75)' }}>{day.tMax}°<span style={{ fontSize: 7.5, color: 'rgba(150,200,160,0.35)' }}>/{day.tMin}°</span></div>
                  <div style={{ fontSize: 7, color: 'rgba(150,200,160,0.30)', marginTop: 1 }}>💧{day.rain}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticker + meta */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4, padding: '6px 0', maxWidth: 200 }}>
          <NotifTicker items={recentPublicados} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 7.5, color: 'rgba(150,200,160,0.18)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>CIA 2026 · v0.7</div>
            <div style={{ fontSize: 7.5, color: 'rgba(150,200,160,0.18)', letterSpacing: '0.05em' }}>↻ {refreshIn}s</div>
          </div>
        </div>
      </div>

      {/* ═══════ Celebration Overlay ═════════════════════════════════════════ */}
      <CelebrationToast show={celebrate} />

      {/* Global animations */}
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
