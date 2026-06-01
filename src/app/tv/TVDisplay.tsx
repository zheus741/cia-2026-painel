'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize2, Minimize2, RefreshCw, AlertTriangle, Camera, Wifi } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uniqueChannel } from '@/lib/supabase/channel-name'
import { CiaLogo } from '@/components/cia-logo'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — CIA 2026 Broadcast
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:          '#070D0A',
  bgCard:      'rgba(250,247,240,0.026)',
  bgCardHi:    'rgba(250,247,240,0.050)',
  cream:       '#FAF7F0',
  creamDim:    'rgba(250,247,240,0.68)',
  creamMute:   'rgba(250,247,240,0.38)',
  creamFade:   'rgba(250,247,240,0.16)',
  border:      'rgba(250,247,240,0.07)',
  borderHi:    'rgba(250,247,240,0.14)',
  gold:        '#D4B36A',
  goldBright:  '#F0D04A',
  green:       '#4aa06a',
  greenDeep:   '#2e6b42',
  red:         '#EF4444',
  blue:        '#5C68E8',
  terracotta:  '#D8845F',
  lavender:    '#B8A4E8',
} as const

const FD  = 'var(--font-fraunces), Georgia, serif'
const FS  = 'var(--font-geist), system-ui, sans-serif'
const NUM = 'tabular-nums' as const

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface PipelineStats  { total: number; rascunho: number; em_producao: number; pronto: number; publicado: number }
interface DiaStat        { idx: number; total: number; publicados: number; label: string }
interface CanalStat      { canal: string; total: number; publicados: number }
interface PatrocStat     { id: string; nome: string; logo_url: string | null; total: number; publicados: number }
interface Jogo           { id: string; equipe_a_nome: string | null; equipe_b_nome: string | null; inicio: string | null; fim_previsto: string | null; dia_id: string | null; status: string | null; placar_a: number | null; placar_b: number | null }
interface EventItem      { id: string; nome?: string; equipe_a_nome?: string | null; equipe_b_nome?: string | null; inicio: string | null; fim_previsto: string | null; dia_id: string | null; placar_a?: number | null; placar_b?: number | null; status?: string | null }
interface WeatherDay     { date: string; tMax: number; tMin: number; rain: number; emoji: string }
interface EmCampoItem    { nome: string; setor: string }
interface RecentPublicado{ id: string; titulo: string | null; canal: string | null }
interface RankingEquipe  { id: string; nome: string; divisao: string | null; cor_primaria: string | null; total_pontos: number }
interface PodioRecente   { equipe_nome: string; modalidade_nome: string; modalidade_icone: string | null; colocacao: number; pontos: number }
interface TipoStat       { tipo: string; total: number; publicados: number }

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
  rankingEquipes:   RankingEquipe[]
  podiosRecentes:   PodioRecente[]
  tipoBreakdown:    TipoStat[]
  jogosEncerrados:  Jogo[]
  funilProducao?:   import('@/lib/conteudos/funil-producao').FunilProducao | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const CANAL_LABEL: Record<string,string> = {
  instagram_cia:'IG CIA', tiktok_cia:'TK CIA', instagram_exp:'IG EXP',
  instagram_grupo_exp:'IG Grupo', tiktok_exp:'TK EXP', instagram_nix:'IG NIX',
  x_cia:'X CIA', youtube_exp:'YT EXP', outro:'Outros',
}
const CANAL_COLOR: Record<string,string> = {
  instagram_cia:'#E1306C', tiktok_cia:'#69C9D0', instagram_exp:'#A855F7',
  instagram_grupo_exp:'#7C3AED', tiktok_exp:'#EE1D52', instagram_nix:'#F97316',
  x_cia:'#94A3B8', youtube_exp:'#EF4444', outro:'#6B7280',
}
const TIPO_LABEL: Record<string,string> = {
  story_rapido:'Story Rápido', story_editado:'Story Edit.',
  reels:'Reels', card_feed:'Card Feed', card_patrocinado:'Patrocinado',
  texto_legenda:'Legenda', repost:'Repost', cobertura_ao_vivo:'Ao Vivo', outro:'Outros',
}
const TIPO_COLOR: Record<string,string> = {
  story_rapido:'#F97316', story_editado:'#EF4444', reels:'#E1306C',
  card_feed:'#4aa06a', card_patrocinado:'#F0D04A', texto_legenda:'#B8A4E8',
  repost:'#69C9D0', cobertura_ao_vivo:'#ef4444', outro:'#6B7280',
}

const EVENT_START = new Date('2026-06-04T00:00:00-03:00')

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' })
}
function durMin(s: string | null, e: string | null) {
  if (!s || !e) return null
  return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60_000)
}

// ─────────────────────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Panel({ children, accent, style, title, titleRight }: {
  children: React.ReactNode
  accent?: string
  style?: React.CSSProperties
  title?: string
  titleRight?: React.ReactNode
}) {
  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 18, right: 18, height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
          borderRadius: '0 0 2px 2px',
        }} />
      )}
      {title && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{
            fontFamily: FS, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: accent ? accent + 'bb' : C.creamFade,
          }}>{title}</span>
          {titleRight}
        </div>
      )}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Clock
// ─────────────────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState('')
  const [d, setD] = useState('')
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setT(n.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:'America/Sao_Paulo' }))
      setD(n.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', timeZone:'America/Sao_Paulo' }))
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign:'center', flex:1, minWidth:0 }}>
      <div style={{
        fontFamily: FD, fontStyle:'italic',
        fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1",
        fontSize: 'clamp(40px,5.5vw,76px)', fontWeight: 800,
        color: C.cream, letterSpacing: '-0.035em', lineHeight: 0.9,
        fontVariantNumeric: NUM,
      }}>{t}</div>
      <div style={{
        fontFamily: FS, fontSize: 10, color: C.creamMute, marginTop: 6,
        textTransform: 'capitalize', letterSpacing: '0.10em', fontWeight: 500,
      }}>{d}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Game Cards — broadcast dominant
// ─────────────────────────────────────────────────────────────────────────────
function LiveGameCard({ jogo }: { jogo: Jogo }) {
  const [pulse, setPulse] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1200)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'rgba(239,68,68,0.07)',
      border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 16, overflow: 'hidden',
      minWidth: 340, flex: 1, maxWidth: 520,
      boxShadow: pulse ? '0 0 24px rgba(239,68,68,0.12)' : '0 0 8px rgba(239,68,68,0.04)',
      transition: 'box-shadow 0.8s ease',
    }}>
      <div style={{ flex:1, padding:'12px 16px', textAlign:'right', minWidth:0 }}>
        <div style={{
          fontFamily: FD, fontStyle:'italic',
          fontVariationSettings: "'opsz' 72, 'SOFT' 0, 'WONK' 0",
          fontSize: 'clamp(12px,1.6vw,20px)', fontWeight: 700,
          color: C.creamDim, letterSpacing: '-0.01em',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>{jogo.equipe_a_nome ?? '?'}</div>
      </div>
      <div style={{
        padding: '8px 18px', textAlign:'center', flexShrink:0,
        borderLeft: '1px solid rgba(239,68,68,0.18)',
        borderRight: '1px solid rgba(239,68,68,0.18)',
      }}>
        <div style={{
          fontFamily: FD, fontStyle:'italic',
          fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1",
          fontSize: 'clamp(28px,3.5vw,52px)', fontWeight: 900,
          color: C.red, letterSpacing: '-0.04em', lineHeight: 1,
          fontVariantNumeric: NUM,
        }}>
          {jogo.placar_a ?? 0}
          <span style={{ fontSize:'0.45em', color:'rgba(239,68,68,0.35)', margin:'0 8px', fontWeight:400 }}>×</span>
          {jogo.placar_b ?? 0}
        </div>
        <div style={{ fontFamily:FS, fontSize:8, color:'rgba(239,68,68,0.55)', letterSpacing:'0.12em', marginTop:2 }}>
          {fmtTime(jogo.inicio)}
        </div>
      </div>
      <div style={{ flex:1, padding:'12px 16px', minWidth:0 }}>
        <div style={{
          fontFamily: FD, fontStyle:'italic',
          fontVariationSettings: "'opsz' 72, 'SOFT' 0, 'WONK' 0",
          fontSize: 'clamp(12px,1.6vw,20px)', fontWeight: 700,
          color: C.creamDim, letterSpacing: '-0.01em',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>{jogo.equipe_b_nome ?? '?'}</div>
      </div>
    </div>
  )
}

function LiveScoresSection({ jogos }: { jogos: Jogo[] }) {
  if (!jogos.length) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 2px', flexShrink: 0,
    }}>
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0,
        background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.28)',
        borderRadius:12, padding:'6px 12px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{
            width:7, height:7, borderRadius:'50%', background:C.red, display:'inline-block',
            boxShadow:`0 0 10px ${C.red}`,
            animation:'tvPing 1.4s ease-in-out infinite',
          }} />
          <span style={{ fontFamily:FS, fontSize:9, fontWeight:900, color:C.red, letterSpacing:'0.22em' }}>AO VIVO</span>
        </div>
        <span style={{ fontFamily:FD, fontVariationSettings:"'opsz' 72", fontSize:22, fontWeight:800, color:C.red, lineHeight:1, fontVariantNumeric:NUM }}>{jogos.length}</span>
        <span style={{ fontFamily:FS, fontSize:8, color:'rgba(239,68,68,0.55)', letterSpacing:'0.12em' }}>
          {jogos.length === 1 ? 'jogo' : 'jogos'}
        </span>
      </div>
      <div style={{ display:'flex', gap:10, flex:1, flexWrap:'wrap' }}>
        {jogos.map(j => <LiveGameCard key={j.id} jogo={j} />)}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Encerrados strip (compact)
// ─────────────────────────────────────────────────────────────────────────────
function EncerradosStrip({ jogos }: { jogos: Jogo[] }) {
  if (!jogos.length) return null
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      background:'rgba(74,160,106,0.055)', border:'1px solid rgba(74,160,106,0.16)',
      borderRadius:12, padding:'7px 14px', flexShrink:0, overflow:'hidden',
    }}>
      <span style={{ fontFamily:FS, fontSize:8.5, fontWeight:800, color:C.green, letterSpacing:'0.18em', flexShrink:0 }}>✓ ENCERRADO</span>
      <div style={{ width:1, height:24, background:'rgba(74,160,106,0.18)', flexShrink:0 }} />
      <div style={{ display:'flex', gap:8, overflowX:'auto', flex:1 }}>
        {jogos.map(j => (
          <div key={j.id} style={{
            display:'flex', alignItems:'center', gap:8, flexShrink:0,
            background:'rgba(74,160,106,0.06)', border:'1px solid rgba(74,160,106,0.14)',
            borderRadius:10, padding:'4px 12px',
          }}>
            <span style={{ fontFamily:FD, fontSize:11, color:C.creamDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:80, letterSpacing:'-0.01em' }}>
              {j.equipe_a_nome ?? '?'}
            </span>
            <span style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0", fontSize:18, fontWeight:800, color:C.green, letterSpacing:'-0.03em', fontVariantNumeric:NUM }}>
              {j.placar_a ?? '–'}
              <span style={{ fontSize:11, color:'rgba(74,160,106,0.35)', margin:'0 5px', fontWeight:400 }}>×</span>
              {j.placar_b ?? '–'}
            </span>
            <span style={{ fontFamily:FD, fontSize:11, color:C.creamDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:80, letterSpacing:'-0.01em' }}>
              {j.equipe_b_nome ?? '?'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI strip
// ─────────────────────────────────────────────────────────────────────────────
function KpiBar({ items }: { items: { label: string; value: string | number; accent?: string; sub?: string }[] }) {
  return (
    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
      {items.map((k, i) => (
        <div key={i} style={{
          flex:1, background:C.bgCard, border:`1px solid ${C.border}`,
          borderRadius:12, padding:'8px 12px', display:'flex', flexDirection:'column', gap:2,
        }}>
          <span style={{ fontFamily:FS, fontSize:8.5, fontWeight:700, letterSpacing:'0.16em', color:C.creamFade, textTransform:'uppercase' }}>{k.label}</span>
          <span style={{
            fontFamily:FD, fontStyle:'italic',
            fontVariationSettings:"'opsz' 72, 'SOFT' 0, 'WONK' 1",
            fontSize:'clamp(18px,2.2vw,30px)', fontWeight:800,
            color: k.accent ?? C.cream, letterSpacing:'-0.03em', lineHeight:1,
            fontVariantNumeric:NUM,
          }}>{k.value}</span>
          {k.sub && <span style={{ fontFamily:FS, fontSize:8.5, color:C.creamMute }}>{k.sub}</span>}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Column A — Agenda (timeline dos jogos/shows/festas do dia)
// ─────────────────────────────────────────────────────────────────────────────
type TLEntry = { id:string; label:string; inicio:string|null; fim:string|null; icon:string; color:string }

function AgendaColumn({ jogos, shows, festas }: { jogos:Jogo[]; shows:EventItem[]; festas:EventItem[] }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const entries: TLEntry[] = [
    ...jogos.map(j => ({ id:j.id, label:`${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`, inicio:j.inicio, fim:j.fim_previsto, icon:'🏆', color:C.green })),
    ...shows.map(s => ({ id:s.id, label:s.nome ?? '', inicio:s.inicio, fim:s.fim_previsto, icon:'🎤', color:C.lavender })),
    ...festas.map(f => ({ id:f.id, label:f.nome ?? '', inicio:f.inicio, fim:f.fim_previsto, icon:'🎉', color:C.terracotta })),
  ].sort((a,b) => {
    if (!a.inicio) return 1; if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  const nowStr = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' })

  return (
    <Panel accent={C.green} title="Agenda · Hoje" style={{ flex:1, minHeight:0, overflow:'hidden' }}>
      <div style={{ overflowY:'auto', flex:1 }}>
        {entries.length === 0 ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:60 }}>
            <span style={{ fontFamily:FS, fontSize:12, color:C.creamFade }}>Sem eventos hoje</span>
          </div>
        ) : entries.map((ev, i) => {
          const isActive = !!ev.inicio && !!ev.fim && new Date(ev.inicio) <= now && new Date(ev.fim) >= now
          const isPast   = !!ev.fim && new Date(ev.fim) < now
          const dur      = durMin(ev.inicio, ev.fim)
          const isLast   = i === entries.length - 1
          // "Agora" marker
          const showNow  = !isLast && !!entries[i+1]?.inicio && new Date(entries[i+1].inicio!) > now
                        && !!ev.fim && new Date(ev.fim) < now && !isPast

          return (
            <div key={ev.id}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start', paddingBottom: isLast ? 4 : 0 }}>
                {/* Time + dot */}
                <div style={{ width:34, flexShrink:0, paddingTop:8, textAlign:'right' }}>
                  <span style={{
                    fontFamily:FD, fontSize:9.5, fontWeight:700,
                    color: isActive ? ev.color : isPast ? C.creamFade : C.creamMute,
                    fontVariantNumeric:NUM, letterSpacing:'-0.01em',
                  }}>{fmtTime(ev.inicio)}</span>
                </div>
                <div style={{ width:14, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:8 }}>
                  {i > 0 && <div style={{ width:1, height:6, background:C.border, marginBottom:2 }} />}
                  <div style={{
                    width: isActive ? 11 : 7, height: isActive ? 11 : 7,
                    borderRadius:'50%', flexShrink:0,
                    background: isActive ? ev.color : isPast ? C.border : `${ev.color}55`,
                    boxShadow: isActive ? `0 0 12px ${ev.color}` : 'none',
                    transition:'all 0.4s',
                  }} />
                  {!isLast && <div style={{ width:1, flex:1, minHeight:10, background:C.border, marginTop:2 }} />}
                </div>
                {/* Card */}
                <div style={{ flex:1, paddingBottom:8 }}>
                  <div style={{
                    background: isPast ? 'rgba(250,247,240,0.02)' : `${ev.color}0d`,
                    border: `1px solid ${isActive ? ev.color+'44' : isPast ? C.border : ev.color+'18'}`,
                    borderRadius:10, padding:'7px 10px',
                    opacity: isPast ? 0.48 : 1,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:10.5 }}>{ev.icon}</span>
                      <span style={{
                        fontFamily:FD, fontSize:11.5, fontWeight:700, flex:1,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        color: isActive ? ev.color : isPast ? C.creamMute : C.cream,
                        letterSpacing:'-0.01em',
                      }}>{ev.label}</span>
                      {isActive && (
                        <span style={{
                          fontFamily:FS, fontSize:7.5, fontWeight:800, letterSpacing:'0.14em',
                          color:ev.color, background:`${ev.color}18`, border:`1px solid ${ev.color}38`,
                          borderRadius:99, padding:'1px 6px',
                        }}>LIVE</span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ fontFamily:FD, fontSize:9, color:C.creamFade, fontVariantNumeric:NUM }}>
                        {fmtTime(ev.inicio)}–{fmtTime(ev.fim)}
                      </span>
                      {dur != null && <span style={{ fontSize:9, color:C.creamFade }}>{dur < 60 ? `${dur}min` : `${Math.floor(dur/60)}h${dur%60>0?`${dur%60}m`:''}`}</span>}
                    </div>
                  </div>
                </div>
              </div>
              {showNow && (
                <div style={{ display:'flex', alignItems:'center', gap:6, paddingLeft:48, margin:'2px 0 4px' }}>
                  <div style={{ flex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(239,68,68,0.4))' }} />
                  <span style={{ fontFamily:FD, fontSize:8, fontWeight:800, color:C.red, letterSpacing:'0.14em', fontVariantNumeric:NUM }}>◆ {nowStr}</span>
                  <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(239,68,68,0.4),transparent)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Column B — Produção
// ─────────────────────────────────────────────────────────────────────────────
function PipelineRing({ stats, velocidade }: { stats: PipelineStats; velocidade: number }) {
  const pct  = stats.total > 0 ? Math.round(stats.publicado / stats.total * 100) : 0
  const col  = pct >= 70 ? C.green : pct >= 40 ? C.gold : C.terracotta
  const r    = 36, stroke = 6, circ = 2 * Math.PI * r
  const dash = circ * pct / 100

  return (
    <div style={{ display:'flex', gap:16, alignItems:'center' }}>
      <div style={{ position:'relative', width:88, height:88, flexShrink:0 }}>
        <svg width={88} height={88} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={44} cy={44} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
          <circle cx={44} cy={44} r={r} fill="none" stroke={col}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition:'stroke-dasharray 1s ease', filter:`drop-shadow(0 0 6px ${col}88)` }}
          />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0, 'WONK' 1", fontSize:22, fontWeight:800, color:col, lineHeight:1, fontVariantNumeric:NUM }}>{pct}%</span>
          <span style={{ fontFamily:FS, fontSize:8, color:C.creamFade, letterSpacing:'0.08em', marginTop:2 }}>saúde</span>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, flex:1 }}>
        {[
          { label:'Publicado', val:stats.publicado, color:C.green },
          { label:'Rascunho',  val:stats.rascunho,  color:C.terracotta },
          { label:'Em prod.',  val:stats.em_producao, color:C.blue },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:FS, fontSize:9, color:C.creamMute, width:56, flexShrink:0, letterSpacing:'-0.01em' }}>{s.label}</span>
            <div style={{ flex:1, height:4, borderRadius:3, background:C.bgCard, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${stats.total > 0 ? s.val/stats.total*100 : 0}%`, background:s.color, borderRadius:3, boxShadow:`0 0 6px ${s.color}66`, transition:'width 1s ease' }} />
            </div>
            <span style={{ fontFamily:FD, fontSize:11, fontWeight:700, color:s.color, fontVariantNumeric:NUM, width:22, textAlign:'right', flexShrink:0 }}>{s.val}</span>
          </div>
        ))}
        {velocidade > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
            <span style={{ fontFamily:FS, fontSize:8.5, color:C.creamFade }}>Velocidade</span>
            <span style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0", fontSize:14, fontWeight:700, color:C.gold, fontVariantNumeric:NUM }}>{velocidade}/h</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CanalBars({ canais }: { canais: CanalStat[] }) {
  const max = Math.max(...canais.map(c => c.total), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {canais.map(c => {
        const col   = CANAL_COLOR[c.canal] ?? '#6B7280'
        const label = CANAL_LABEL[c.canal] ?? c.canal
        const barW  = c.total / max * 100
        const pubW  = c.total > 0 ? c.publicados / c.total * barW : 0
        const pct   = c.total > 0 ? Math.round(c.publicados / c.total * 100) : 0
        return (
          <div key={c.canal}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontFamily:FS, fontSize:9.5, color:C.creamDim, fontWeight:600 }}>{label}</span>
              <span style={{ fontFamily:FD, fontSize:10, color:col, fontWeight:700, fontVariantNumeric:NUM }}>{c.publicados}<span style={{ color:C.creamFade, fontWeight:400 }}>/{c.total}</span><span style={{ color:C.creamFade, fontSize:8, marginLeft:4 }}>{pct}%</span></span>
            </div>
            <div style={{ position:'relative', height:4, borderRadius:3, background:C.bgCard, overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, width:`${barW}%`, background:'rgba(250,247,240,0.04)', borderRadius:3 }} />
              <div style={{ position:'absolute', inset:0, width:`${pubW}%`, background:col, borderRadius:3, opacity:.9, boxShadow:`0 0 5px ${col}55`, transition:'width 1s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TipoBars({ tipos }: { tipos: TipoStat[] }) {
  const max = Math.max(...tipos.map(t => t.total), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {tipos.map(t => {
        const col  = TIPO_COLOR[t.tipo] ?? '#6B7280'
        const lbl  = TIPO_LABEL[t.tipo] ?? t.tipo
        const barW = t.total / max * 100
        const pubW = t.total > 0 ? t.publicados / t.total * barW : 0
        const pct  = t.total > 0 ? Math.round(t.publicados / t.total * 100) : 0
        return (
          <div key={t.tipo}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontFamily:FS, fontSize:9.5, color:C.creamDim, fontWeight:600 }}>{lbl}</span>
              <span style={{ fontFamily:FD, fontSize:10, color:col, fontWeight:700, fontVariantNumeric:NUM }}>{t.publicados}<span style={{ color:C.creamFade, fontWeight:400 }}>/{t.total}</span><span style={{ color:C.creamFade, fontSize:8, marginLeft:4 }}>{pct}%</span></span>
            </div>
            <div style={{ position:'relative', height:4, borderRadius:3, background:C.bgCard, overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, width:`${barW}%`, background:'rgba(250,247,240,0.04)', borderRadius:3 }} />
              <div style={{ position:'absolute', inset:0, width:`${pubW}%`, background:col, borderRadius:3, opacity:.9, boxShadow:`0 0 5px ${col}55`, transition:'width 1s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProducaoColumn({ stats, velocidade, funil, canais, tipos, conteudosPorDia }: {
  stats: PipelineStats; velocidade: number
  funil: import('@/lib/conteudos/funil-producao').FunilProducao | null | undefined
  canais: CanalStat[]; tipos: TipoStat[]
  conteudosPorDia: DiaStat[]
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, minHeight:0, overflow:'hidden' }}>
      <Panel accent={C.gold} title="Pipeline · Saúde" style={{ flexShrink:0 }}>
        <PipelineRing stats={stats} velocidade={velocidade} />
      </Panel>

      {funil && funil.totalTarefas > 0 && (
        <Panel accent={C.blue} title={`Funil · ${funil.pctGeral}% completo`} style={{ flexShrink:0 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {funil.etapas.map((e, i) => {
              const colors = [C.terracotta, C.lavender, C.blue]
              const col = colors[i] ?? C.cream
              return (
                <div key={e.etapa} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:FS, fontSize:9, color:C.creamMute, width:52, flexShrink:0 }}>{e.label}</span>
                  <div style={{ flex:1, height:5, borderRadius:3, background:C.bgCard, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${e.pct}%`, background:col, borderRadius:3, boxShadow:`0 0 5px ${col}55`, transition:'width 1s ease' }} />
                  </div>
                  <span style={{ fontFamily:FD, fontSize:11, fontWeight:700, color:col, width:28, textAlign:'right', fontVariantNumeric:NUM }}>{e.pct}%</span>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {/* 4 days */}
      <Panel accent={C.gold} title="Conteúdos · 4 dias" style={{ flexShrink:0 }}>
        <div style={{ display:'flex', gap:6 }}>
          {conteudosPorDia.map(d => {
            const pct = d.total > 0 ? Math.round(d.publicados / d.total * 100) : 0
            const col = pct >= 70 ? C.green : pct >= 40 ? C.gold : C.terracotta
            return (
              <div key={d.idx} style={{ flex:1, textAlign:'center' }}>
                <div style={{
                  fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0, 'WONK' 1",
                  fontSize:20, fontWeight:800, color:col, lineHeight:1, fontVariantNumeric:NUM,
                }}>{d.publicados}</div>
                <div style={{ fontFamily:FS, fontSize:8, color:C.creamFade, marginTop:2 }}>/{d.total}</div>
                <div style={{ height:3, borderRadius:2, background:C.bgCard, margin:'4px 0 3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:col, transition:'width 1s ease' }} />
                </div>
                <div style={{ fontFamily:FS, fontSize:8, color:C.creamFade, letterSpacing:'0.04em' }}>{d.label.split('·')[0].trim()}</div>
              </div>
            )
          })}
        </div>
      </Panel>

      {canais.length > 0 && (
        <Panel accent={C.terracotta} title="Canais · Hoje" style={{ flex:1, minHeight:0, overflow:'hidden' }}>
          <div style={{ overflowY:'auto', flex:1 }}>
            <CanalBars canais={canais} />
            {tipos.length > 0 && (
              <>
                <div style={{ height:1, background:C.border, margin:'10px 0 8px' }} />
                <div style={{ fontFamily:FS, fontSize:8.5, fontWeight:700, letterSpacing:'0.18em', color:C.creamFade, textTransform:'uppercase', marginBottom:6 }}>Formatos</div>
                <TipoBars tipos={tipos} />
              </>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Column C — Equipe
// ─────────────────────────────────────────────────────────────────────────────
function EquipeColumn({ emCampo, setoresFrios, equipeAtiva, setoresCobertos, ckTotal, ckFeitos, capturasCount }: {
  emCampo: EmCampoItem[]
  setoresFrios: string[]
  equipeAtiva: number
  setoresCobertos: number
  ckTotal: number
  ckFeitos: number
  capturasCount: number
}) {
  const ckPct   = ckTotal > 0 ? Math.round(ckFeitos / ckTotal * 100) : 0
  const presPct = equipeAtiva > 0 ? Math.round(emCampo.length / equipeAtiva * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, minHeight:0, overflow:'hidden' }}>
      {/* Em campo agora */}
      <Panel accent={emCampo.length > 0 ? C.green : C.creamFade} title="Em Campo" style={{ flexShrink:0 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0, 'WONK' 1", fontSize:38, fontWeight:900, color:emCampo.length > 0 ? C.green : C.creamFade, lineHeight:1, fontVariantNumeric:NUM }}>{emCampo.length}</div>
            <div style={{ fontFamily:FS, fontSize:9, color:C.creamFade, marginTop:2 }}>de {equipeAtiva} escalados</div>
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontFamily:FS, fontSize:8.5, color:C.creamFade }}>Presença</span>
                <span style={{ fontFamily:FD, fontSize:10, fontWeight:700, color:C.green, fontVariantNumeric:NUM }}>{presPct}%</span>
              </div>
              <div style={{ height:4, borderRadius:2, background:C.bgCard, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${presPct}%`, background:C.green, transition:'width 1s ease', boxShadow:`0 0 6px ${C.green}55` }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:2 }}>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0", fontSize:16, fontWeight:800, color:setoresCobertos > 0 ? C.green : C.creamFade, fontVariantNumeric:NUM }}>{setoresCobertos}</div>
                <div style={{ fontFamily:FS, fontSize:8, color:C.creamFade }}>setores</div>
              </div>
              <div style={{ width:1, background:C.border }} />
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0", fontSize:16, fontWeight:800, color:ckPct >= 70 ? C.green : C.gold, fontVariantNumeric:NUM }}>{ckPct}%</div>
                <div style={{ fontFamily:FS, fontSize:8, color:C.creamFade }}>checklist</div>
              </div>
            </div>
          </div>
        </div>
        {emCampo.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:180, overflowY:'auto' }}>
            {emCampo.map((p, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(74,160,106,0.07)', border:'1px solid rgba(74,160,106,0.14)', borderRadius:8, padding:'5px 10px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.green, flexShrink:0, boxShadow:`0 0 6px ${C.green}` }} />
                <span style={{ fontFamily:FS, fontSize:10.5, fontWeight:600, color:C.cream, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</span>
                <span style={{ fontFamily:FS, fontSize:9, color:C.creamFade, maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{p.setor}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Alertas */}
      {(setoresFrios.length > 0 || capturasCount > 0) && (
        <Panel accent={C.terracotta} title="Alertas" style={{ flexShrink:0 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {setoresFrios.length > 0 && (
              <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <AlertTriangle style={{ width:12, height:12, color:C.terracotta, flexShrink:0, marginTop:1 }} />
                <div>
                  <div style={{ fontFamily:FS, fontSize:8.5, fontWeight:700, color:C.terracotta, letterSpacing:'0.10em', marginBottom:3 }}>SETORES FRIOS ({setoresFrios.length})</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                    {setoresFrios.map(s => (
                      <span key={s} style={{ fontFamily:FS, fontSize:9, background:'rgba(216,132,95,0.10)', border:'1px solid rgba(216,132,95,0.22)', borderRadius:99, padding:'1px 8px', color:'#F0CFC0' }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {capturasCount > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Camera style={{ width:12, height:12, color:C.gold, flexShrink:0 }} />
                <span style={{ fontFamily:FS, fontSize:9.5, color:C.gold }}><strong style={{ fontFamily:FD, fontSize:14, fontWeight:800, letterSpacing:'-0.02em' }}>{capturasCount}</strong> capturas pendentes de edição</span>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Checklist detail */}
      <Panel accent={ckPct >= 70 ? C.green : C.gold} title={`Checklist · ${ckFeitos}/${ckTotal}`} style={{ flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:8, borderRadius:4, background:C.bgCard, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${ckPct}%`, background: ckPct >= 70 ? C.green : C.gold, borderRadius:4, transition:'width 1s ease', boxShadow:`0 0 8px ${ckPct >= 70 ? C.green : C.gold}66` }} />
          </div>
          <span style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0", fontSize:18, fontWeight:800, color: ckPct >= 70 ? C.green : C.gold, fontVariantNumeric:NUM }}>{ckPct}%</span>
        </div>
      </Panel>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotating bottom panel (clima / ranking / podios / patrocinadores)
// ─────────────────────────────────────────────────────────────────────────────
const ROTATE_MS = 9000

function WeatherPanel({ days }: { days: WeatherDay[] }) {
  const DAY_PT: Record<string,string> = { '2026-06-04':'Qui 04', '2026-06-05':'Sex 05', '2026-06-06':'Sáb 06', '2026-06-07':'Dom 07' }
  return (
    <div style={{ display:'flex', gap:10, alignItems:'stretch' }}>
      {days.map(d => (
        <div key={d.date} style={{ flex:1, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:'10px 12px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <span style={{ fontFamily:FS, fontSize:8.5, color:C.creamFade, letterSpacing:'0.08em' }}>{DAY_PT[d.date] ?? d.date.slice(5)}</span>
          <span style={{ fontSize:22 }}>{d.emoji}</span>
          <span style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72, 'SOFT' 0, 'WONK' 1", fontSize:22, fontWeight:800, color:C.cream, lineHeight:1, fontVariantNumeric:NUM }}>{d.tMax}°<span style={{ fontSize:13, color:C.creamMute, fontWeight:400 }}>/{d.tMin}°</span></span>
          <span style={{ fontFamily:FS, fontSize:9, color:C.creamFade }}>💧{d.rain}%</span>
        </div>
      ))}
    </div>
  )
}

function RankingPanel({ ranking }: { ranking: RankingEquipe[] }) {
  return (
    <div style={{ display:'flex', gap:8, overflowX:'auto' }}>
      {ranking.slice(0,10).map((e, i) => (
        <div key={e.id} style={{
          flex:1, minWidth:100,
          background: i < 3 ? `${C.gold}10` : C.bgCard,
          border: `1px solid ${i < 3 ? C.gold+'30' : C.border}`,
          borderRadius:12, padding:'8px 10px', textAlign:'center',
        }}>
          <div style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72", fontSize: i < 3 ? 20 : 16, fontWeight:800, color: i < 3 ? C.goldBright : C.creamMute, lineHeight:1 }}>{i+1}°</div>
          <div style={{ fontFamily:FS, fontSize:9, color: i < 3 ? C.cream : C.creamDim, fontWeight: i < 3 ? 700 : 500, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.nome}</div>
          <div style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72", fontSize:14, fontWeight:700, color:C.gold, marginTop:2, fontVariantNumeric:NUM }}>{e.total_pontos}<span style={{ fontSize:9, color:C.creamFade, fontWeight:400 }}> pts</span></div>
        </div>
      ))}
    </div>
  )
}

function PodiosPanel({ podios }: { podios: PodioRecente[] }) {
  const medals = ['🥇','🥈','🥉']
  return (
    <div style={{ display:'flex', gap:8, overflowX:'auto' }}>
      {podios.map((p, i) => (
        <div key={i} style={{ flex:1, minWidth:140, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:'8px 12px', display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:16 }}>{medals[p.colocacao-1] ?? '🏅'}</span>
            <span style={{ fontFamily:FS, fontSize:9, color:C.creamFade }}>{p.modalidade_nome}</span>
          </div>
          <div style={{ fontFamily:FD, fontSize:12, fontWeight:700, color:C.cream, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.equipe_nome}</div>
          <div style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 72", fontSize:11, fontWeight:700, color:C.gold, fontVariantNumeric:NUM }}>{p.pontos} pts</div>
        </div>
      ))}
    </div>
  )
}

function PatrocPanel({ patrocs }: { patrocs: PatrocStat[] }) {
  return (
    <div style={{ display:'flex', gap:8, overflowX:'auto', alignItems:'stretch' }}>
      {patrocs.map(p => {
        const pct = p.total > 0 ? Math.round(p.publicados / p.total * 100) : 0
        const col = pct >= 70 ? C.green : pct >= 40 ? C.gold : C.terracotta
        return (
          <div key={p.id} style={{ flex:1, minWidth:120, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:'8px 10px' }}>
            <div style={{ fontFamily:FS, fontSize:10, fontWeight:600, color:C.creamDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:6 }}>{p.nome}</div>
            <div style={{ height:4, borderRadius:2, background:'rgba(250,247,240,0.06)', overflow:'hidden', marginBottom:4 }}>
              <div style={{ height:'100%', width:`${pct}%`, background:col, boxShadow:`0 0 5px ${col}55`, transition:'width 1s ease' }} />
            </div>
            <div style={{ fontFamily:FD, fontSize:12, fontWeight:700, color:col, fontVariantNumeric:NUM }}>{p.publicados}<span style={{ fontSize:9, color:C.creamFade, fontWeight:400 }}>/{p.total}</span></div>
          </div>
        )
      })}
    </div>
  )
}

type RotatingTab = 'clima' | 'ranking' | 'podios' | 'patrocinadores'

function RotatingPanel({ weatherData, ranking, podios, patrocs }: {
  weatherData: WeatherDay[] | null
  ranking: RankingEquipe[]
  podios: PodioRecente[]
  patrocs: PatrocStat[]
}) {
  const tabs: { id: RotatingTab; label: string; accent: string; show: boolean }[] = ([
    { id:'clima'          as RotatingTab, label:'Clima · Uberaba',     accent:C.blue,        show:!!weatherData?.length },
    { id:'ranking'        as RotatingTab, label:'Ranking Parcial',     accent:C.goldBright,  show:ranking.length > 0 },
    { id:'podios'         as RotatingTab, label:'Pódios Recentes',     accent:C.gold,        show:podios.length > 0 },
    { id:'patrocinadores' as RotatingTab, label:'Patrocínio',          accent:C.terracotta,  show:patrocs.length > 0 },
  ] as { id: RotatingTab; label: string; accent: string; show: boolean }[]).filter(t => t.show)

  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((i: number) => {
    setVisible(false)
    setTimeout(() => { setIdx(i); setVisible(true) }, 200)
  }, [])

  useEffect(() => {
    if (tabs.length < 2) return
    timerRef.current = setInterval(() => {
      goTo((idx + 1) % tabs.length)
    }, ROTATE_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [idx, tabs.length, goTo])

  if (!tabs.length) return null
  const cur = tabs[idx]

  return (
    <Panel accent={cur.accent} style={{ flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexShrink:0 }}>
        <span style={{ fontFamily:FS, fontSize:9, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:cur.accent + 'bb' }}>{cur.label}</span>
        <div style={{ flex:1 }} />
        {tabs.length > 1 && tabs.map((t, i) => (
          <button key={t.id} onClick={() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } goTo(i) }} style={{
            width: i === idx ? 20 : 6, height:6, borderRadius:3,
            background: i === idx ? t.accent : C.border,
            border:'none', cursor:'pointer', padding:0,
            transition:'all 0.3s ease',
          }} />
        ))}
      </div>
      <div style={{ opacity: visible ? 1 : 0, transition:'opacity 0.2s ease' }}>
        {cur.id === 'clima'         && weatherData && <WeatherPanel days={weatherData} />}
        {cur.id === 'ranking'       && <RankingPanel ranking={ranking} />}
        {cur.id === 'podios'        && <PodiosPanel podios={podios} />}
        {cur.id === 'patrocinadores'&& <PatrocPanel patrocs={patrocs} />}
      </div>
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast Ticker
// ─────────────────────────────────────────────────────────────────────────────
function Ticker({ jogos, publicados, jogosHoje, emCampo, setoresFrios }: {
  jogos: Jogo[]; publicados: { id: string; titulo: string | null; canal: string | null }[]
  jogosHoje: Jogo[]; emCampo: EmCampoItem[]; setoresFrios: string[]
}) {
  const items: { icon: string; text: string; color?: string }[] = []
  jogos.forEach(j => items.push({ icon:'🔴', text:`AO VIVO — ${j.equipe_a_nome ?? '?'} ${j.placar_a ?? 0}×${j.placar_b ?? 0} ${j.equipe_b_nome ?? '?'}`, color:C.red }))
  publicados.forEach(p => items.push({ icon:'✓', text:p.titulo ? `Publicado: ${p.titulo}` : `Publicado via ${p.canal ?? 'canal'}`, color:C.green }))
  jogosHoje.filter(j => j.status === 'agendado').slice(0, 4).forEach(j => items.push({ icon:'⏰', text:`${fmtTime(j.inicio)} — ${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}` }))
  setoresFrios.forEach(s => items.push({ icon:'⚠', text:`Sem cobertura: ${s}`, color:C.terracotta }))
  emCampo.slice(0, 4).forEach(p => items.push({ icon:'●', text:`${p.nome} · ${p.setor}`, color:C.green }))

  if (!items.length) items.push({ icon:'★', text:'CIA 2026 · Cobertura ao Vivo · Uberaba, MG' })

  const doubled = [...items, ...items]
  const total   = items.length

  return (
    <div style={{
      background: 'rgba(250,247,240,0.032)',
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      height: 34,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        animation: `tvTicker ${total * 6}s linear infinite`,
        whiteSpace: 'nowrap',
        willChange: 'transform',
      }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'0 28px' }}>
            <span style={{ fontSize: 9, color: item.color ?? C.creamFade }}>{item.icon}</span>
            <span style={{ fontFamily:FS, fontSize: 10.5, fontWeight: 600, color: item.color ?? C.creamDim, letterSpacing:'-0.01em' }}>{item.text}</span>
            <span style={{ color: C.creamFade, fontSize:8 }}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Celebration
// ─────────────────────────────────────────────────────────────────────────────
function Celebration({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at center, ${C.goldBright}14 0%, transparent 68%)`, animation:'tvCelebBurst 2.5s ease-out forwards' }} />
      <div style={{
        background:'linear-gradient(135deg, #0C1410 0%, #162014 100%)',
        border:`1.5px solid ${C.gold}60`,
        borderRadius:24, padding:'22px 40px',
        display:'flex', alignItems:'center', gap:18,
        boxShadow:`0 0 80px ${C.gold}20, 0 24px 48px rgba(0,0,0,0.45)`,
        animation:'tvCelebSlide 2.5s ease-out forwards',
      }}>
        <span style={{ fontSize:36 }}>🎉</span>
        <div>
          <div style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 144, 'SOFT' 0, 'WONK' 1", fontSize:20, fontWeight:900, color:C.gold, letterSpacing:'-0.03em' }}>PUBLICADO!</div>
          <div style={{ fontFamily:FS, fontSize:11, color:C.creamMute, marginTop:3, letterSpacing:'0.04em' }}>+1 conteúdo no ar</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TVDisplay — main component
// ─────────────────────────────────────────────────────────────────────────────
export function TVDisplay({
  pipelineStats, conteudosPorDia, canalBreakdown, patrocStats,
  equipeAtiva, setoresCobertos, ckTotal, ckFeitos,
  jogosHoje, jogosAoVivo, showsHoje, festasHoje,
  diasEvento, diaAtualId, weatherData,
  emCampo, setoresFrios, capturasCount, velocidade, recentPublicados,
  rankingEquipes, podiosRecentes, tipoBreakdown, jogosEncerrados,
  funilProducao,
}: Props) {
  const router    = useRouter()
  const [fullscreen, setFullscreen]   = useState(false)
  const [celebrate, setCelebrate]     = useState(false)
  const [refreshIn, setRefreshIn]     = useState(15)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [realtimeOk, setRealtimeOk]  = useState(true)

  const prevPublicados = useRef(pipelineStats.publicado)
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef     = useRef<ReturnType<typeof createClient>['channel'] | null>(null)
  const doRefreshRef   = useRef<() => void>(() => {})

  // Celebrate on new publish
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

  // Auto-refresh every 15s
  useEffect(() => {
    const id = setInterval(() => doRefreshRef.current(), 15_000)
    return () => clearInterval(id)
  }, [])

  // Countdown UI
  useEffect(() => {
    const id = setInterval(() => {
      setRefreshIn(Math.max(0, 15 - Math.floor((Date.now() - lastRefresh) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [lastRefresh])

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    const channel = supabase
      .channel(uniqueChannel('tv-v2'))
      .on('postgres_changes', { event:'*', schema:'public', table:'conteudos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doRefreshRef.current(), 1_000)
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'jogos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doRefreshRef.current(), 800)
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'turnos' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doRefreshRef.current(), 1_000)
      })
      .subscribe((status) => {
        setRealtimeOk(status === 'SUBSCRIBED')
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (reconnectTimeout) clearTimeout(reconnectTimeout)
          reconnectTimeout = setTimeout(() => channel.subscribe(), 2000)
        }
      })
    channelRef.current = channel as unknown as ReturnType<typeof createClient>['channel']
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      supabase.removeChannel(channel)
    }
  }, [])

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(()=>{}); setFullscreen(true) }
    else { document.exitFullscreen().catch(()=>{}); setFullscreen(false) }
  }, [])
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { document.documentElement.requestFullscreen().catch(()=>{}); setFullscreen(true) }, 1200)
    return () => clearTimeout(t)
  }, [])

  // Derived
  const now           = new Date()
  const diffMs        = EVENT_START.getTime() - now.getTime()
  const diffDays      = Math.max(0, Math.ceil(diffMs / 86_400_000))
  const eventActive   = diffDays === 0
  const diaIdx        = diaAtualId ? diasEvento.findIndex(d => d.id === diaAtualId) + 1 : 0
  const totalHoje     = conteudosPorDia.find(d => diasEvento[d.idx - 1]?.id === diaAtualId)
  const publicadosHoje     = totalHoje?.publicados ?? 0
  const totalConteudosHoje = totalHoje?.total ?? 0
  const healthPct     = pipelineStats.total > 0 ? Math.round(pipelineStats.publicado / pipelineStats.total * 100) : 0
  const healthColor   = healthPct >= 70 ? C.green : healthPct >= 40 ? C.gold : C.terracotta
  const ckPct         = ckTotal > 0 ? Math.round(ckFeitos / ckTotal * 100) : 0
  const presPct       = equipeAtiva > 0 ? Math.round(emCampo.length / equipeAtiva * 100) : 0

  const kpiItems = [
    { label:'Em campo', value:emCampo.length, accent:emCampo.length > 0 ? C.green : C.creamFade, sub:`${presPct}% presença` },
    { label:'Publicados hoje', value:`${publicadosHoje}/${totalConteudosHoje}`, accent:C.goldBright },
    { label:'Total pipeline', value:pipelineStats.total, accent:C.cream, sub:`${pipelineStats.publicado} pub.` },
    { label:'Saúde', value:`${healthPct}%`, accent:healthColor },
    { label:'Checklist', value:`${ckPct}%`, accent:ckPct >= 70 ? C.green : C.gold, sub:`${ckFeitos}/${ckTotal}` },
    { label:'Setores cobertos', value:setoresCobertos, accent:setoresCobertos > 0 ? C.green : C.creamFade },
    ...(jogosAoVivo.length > 0 ? [{ label:'Jogos ao vivo', value:jogosAoVivo.length, accent:C.red }] : []),
  ]

  return (
    <div style={{
      width:'100vw', height:'100vh',
      background: C.bg, color: C.cream,
      fontFamily: FD, overflow:'hidden',
      display:'flex', flexDirection:'column',
      gap:8, padding:'10px 12px',
      boxSizing:'border-box', position:'relative',
    }}>

      {/* ── ATMOSPHERE ── */}
      {/* Grain */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='280' height='280' filter='url(%23g)' opacity='0.05'/%3E%3C/svg%3E")`,
        backgroundSize:'280px 280px',
      }} />
      <div style={{ position:'absolute', top:-100, left:-100, width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(46,107,66,0.10) 0%, transparent 62%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'absolute', bottom:-120, right:-80, width:560, height:560, borderRadius:'50%', background:`radial-gradient(circle, ${C.gold}08 0%, transparent 62%)`, pointerEvents:'none', zIndex:0 }} />

      {/* ═══════ HEADER ════════════════════════════════════════════════════════ */}
      <header style={{
        display:'flex', alignItems:'center', gap:14,
        borderBottom:`1px solid ${C.border}`, paddingBottom:8,
        zIndex:1, position:'relative', flexShrink:0,
      }}>
        {/* Brand + dia */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ background:'rgba(46,107,66,0.08)', border:'1px solid rgba(46,107,66,0.20)', borderRadius:12, padding:'6px 14px', display:'flex', flexDirection:'column', gap:1 }}>
            <span style={{ fontFamily:FS, fontSize:7.5, fontWeight:700, color:'rgba(74,160,106,0.70)', letterSpacing:'0.28em', textTransform:'uppercase', lineHeight:1 }}>★ CIA · PAINEL</span>
            <span style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 144, 'SOFT' 0, 'WONK' 1", fontSize:22, fontWeight:800, color:C.cream, letterSpacing:'-0.03em', lineHeight:1 }}>2026</span>
          </div>
          {eventActive && diaIdx > 0 ? (
            <div style={{ background:`${C.goldBright}12`, border:`1px solid ${C.goldBright}30`, borderRadius:99, padding:'5px 14px' }}>
              <span style={{ fontFamily:FS, fontSize:10.5, fontWeight:800, color:C.goldBright, letterSpacing:'0.12em' }}>DIA {diaIdx}/4</span>
            </div>
          ) : !eventActive && (
            <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
              <span style={{ fontFamily:FD, fontStyle:'italic', fontVariationSettings:"'opsz' 144", fontSize:40, fontWeight:800, color:C.gold, letterSpacing:'-0.03em', lineHeight:1, fontVariantNumeric:NUM }}>{diffDays}</span>
              <span style={{ fontFamily:FS, fontSize:9, color:C.creamMute, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:700 }}>dias</span>
            </div>
          )}
          {eventActive && jogosAoVivo.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.28)', borderRadius:99, padding:'5px 12px' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:C.red, boxShadow:`0 0 10px ${C.red}`, display:'inline-block', animation:'tvPing 1.4s ease-in-out infinite' }} />
              <span style={{ fontFamily:FS, fontSize:9.5, fontWeight:800, color:C.red, letterSpacing:'0.16em' }}>{jogosAoVivo.length} AO VIVO</span>
            </div>
          )}
        </div>

        {/* Clock — center */}
        <Clock />

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {setoresFrios.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(216,132,95,0.10)', border:'1px solid rgba(216,132,95,0.28)', borderRadius:99, padding:'5px 11px' }}>
              <AlertTriangle style={{ width:10, height:10, color:C.terracotta }} />
              <span style={{ fontFamily:FS, fontSize:9, fontWeight:800, color:C.terracotta, letterSpacing:'0.12em' }}>{setoresFrios.length} FRIOS</span>
            </div>
          )}
          {/* Realtime + refresh indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(46,107,66,0.06)', border:'1px solid rgba(46,107,66,0.15)', borderRadius:12, padding:'5px 12px' }}>
            <CiaLogo size={18} showText={false} />
            <div style={{ width:1, height:14, background:C.border }} />
            <Wifi style={{ width:11, height:11, color: realtimeOk ? C.green : C.terracotta }} />
            <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, display:'inline-block', background:refreshIn <= 3 ? C.goldBright : C.green, boxShadow:`0 0 6px ${refreshIn <= 3 ? C.goldBright : C.green}`, transition:'background 0.3s' }} />
            <span style={{ fontFamily:FS, fontSize:12, fontWeight:700, color:C.creamDim, letterSpacing:'-0.02em', fontVariantNumeric:NUM }}>{refreshIn}s</span>
          </div>
          <button onClick={doRefresh} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:10, background:C.bgCard, border:`1px solid ${C.border}`, color:C.creamMute, cursor:'pointer' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={toggleFullscreen} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:10, background:C.bgCard, border:`1px solid ${C.border}`, color:C.creamMute, cursor:'pointer' }}>
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

      {/* ═══════ LIVE SCORES (quando ativos, dominam a cena) ═══════════════════ */}
      {jogosAoVivo.length > 0 && (
        <div style={{ zIndex:1, position:'relative', flexShrink:0 }}>
          <LiveScoresSection jogos={jogosAoVivo} />
        </div>
      )}
      {jogosEncerrados.length > 0 && (
        <div style={{ zIndex:1, position:'relative', flexShrink:0 }}>
          <EncerradosStrip jogos={jogosEncerrados} />
        </div>
      )}

      {/* ═══════ KPI BAR ════════════════════════════════════════════════════════ */}
      <div style={{ zIndex:1, position:'relative', flexShrink:0 }}>
        <KpiBar items={kpiItems} />
      </div>

      {/* ═══════ MAIN GRID ══════════════════════════════════════════════════════ */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'1fr 1.1fr 0.9fr',
        gap:10, flex:1, minHeight:0,
        zIndex:1, position:'relative',
      }}>
        {/* COL A — Agenda */}
        <AgendaColumn jogos={jogosHoje} shows={showsHoje} festas={festasHoje} />

        {/* COL B — Produção */}
        <ProducaoColumn
          stats={pipelineStats} velocidade={velocidade} funil={funilProducao}
          canais={canalBreakdown} tipos={tipoBreakdown} conteudosPorDia={conteudosPorDia}
        />

        {/* COL C — Equipe */}
        <EquipeColumn
          emCampo={emCampo} setoresFrios={setoresFrios}
          equipeAtiva={equipeAtiva} setoresCobertos={setoresCobertos}
          ckTotal={ckTotal} ckFeitos={ckFeitos} capturasCount={capturasCount}
        />
      </div>

      {/* ═══════ ROTATING PANEL ═════════════════════════════════════════════════ */}
      <div style={{ zIndex:1, position:'relative', flexShrink:0 }}>
        <RotatingPanel
          weatherData={weatherData} ranking={rankingEquipes}
          podios={podiosRecentes} patrocs={patrocStats}
        />
      </div>

      {/* ═══════ TICKER ═════════════════════════════════════════════════════════ */}
      <div style={{ zIndex:1, position:'relative', flexShrink:0 }}>
        <Ticker
          jogos={jogosAoVivo} publicados={recentPublicados}
          jogosHoje={jogosHoje} emCampo={emCampo} setoresFrios={setoresFrios}
        />
      </div>

      {/* Celebration */}
      <Celebration show={celebrate} />

      <style>{`
        @keyframes tvPing {
          0%, 100% { opacity:1; transform:scale(1); }
          50% { opacity:0.35; transform:scale(1.15); }
        }
        @keyframes tvTicker {
          from { transform:translateX(0); }
          to   { transform:translateX(-50%); }
        }
        @keyframes tvCelebBurst {
          0% { opacity:0 } 10% { opacity:1 } 70% { opacity:0.8 } 100% { opacity:0 }
        }
        @keyframes tvCelebSlide {
          0%   { opacity:0; transform:translateY(20px) scale(0.95); }
          12%  { opacity:1; transform:translateY(0) scale(1); }
          75%  { opacity:1; transform:translateY(0) scale(1); }
          100% { opacity:0; transform:translateY(-10px) scale(0.97); }
        }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(250,247,240,0.12); border-radius:2px; }
      `}</style>
    </div>
  )
}
