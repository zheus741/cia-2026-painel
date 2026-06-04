'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize2, Minimize2, Wifi } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uniqueChannel } from '@/lib/supabase/channel-name'
import { CiaLogo } from '@/components/cia-logo'

// ─────────────────────────────────────────────────────────────────────────────
// Tokens — CIA 2026 Broadcast (central de dados, clean)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:        '#060B08',
  panel:     'rgba(250,247,240,0.028)',
  panelHi:   'rgba(250,247,240,0.055)',
  cream:     '#FAF7F0',
  creamDim:  'rgba(250,247,240,0.66)',
  creamMute: 'rgba(250,247,240,0.34)',
  creamFade: 'rgba(250,247,240,0.14)',
  border:    'rgba(250,247,240,0.08)',
  gold:      '#D4B36A',
  goldHi:    '#F0D04A',
  green:     '#52B074',
  greenDeep: '#2e6b42',
  red:       '#FF4D4D',
  blue:      '#6E79F0',
  lavender:  '#B8A4E8',
} as const

// MESMA FONTE em tudo — Fraunces (display serif) unificada
const FD = 'var(--font-fraunces), Georgia, serif'
const FS = FD
const NUM = 'tabular-nums' as const

const CANAL_LABEL: Record<string, string> = {
  instagram_cia: 'IG CIA', instagram_jogo_rapido: 'IG Jogo Rápido', tiktok_cia: 'TikTok CIA', instagram_exp: 'IG EXP',
  instagram_grupo_exp: 'IG Grupo EXP', tiktok_exp: 'TikTok EXP', instagram_nix: 'IG NIX',
  x_cia: 'X CIA', x_exp: 'X EXP', whats_comunidade: 'WhatsApp', youtube_exp: 'YouTube EXP', outro: 'Outros',
}
const CANAL_COLOR: Record<string, string> = {
  instagram_cia: '#E1306C', instagram_jogo_rapido: '#F472B6', tiktok_cia: '#69C9D0', instagram_exp: '#A855F7',
  instagram_grupo_exp: '#7C3AED', tiktok_exp: '#EE1D52', instagram_nix: '#F97316',
  x_cia: '#94A3B8', x_exp: '#64748B', whats_comunidade: '#25D366', youtube_exp: '#EF4444', outro: '#6B7280',
}
const TIPO_LABEL: Record<string, string> = {
  story_rapido: 'Story Rápido', story_editado: 'Story Editado', reels: 'Reels', card_feed: 'Card Feed',
  card_patrocinado: 'Patrocinado', texto_legenda: 'Legenda', repost: 'Repost', cobertura_ao_vivo: 'Ao Vivo', outro: 'Outros',
}
const TIPO_COLOR: Record<string, string> = {
  story_rapido: '#F97316', story_editado: '#EF4444', reels: '#E1306C', card_feed: '#52B074',
  card_patrocinado: '#F0D04A', texto_legenda: '#B8A4E8', repost: '#69C9D0', cobertura_ao_vivo: '#FF4D4D', outro: '#6B7280',
}

// ─────────────────────────────────────────────────────────────────────────────
// Types (mesmas props do TVDisplay; Jogo enriquecido com modalidade/divisão)
// ─────────────────────────────────────────────────────────────────────────────
interface PipelineStats { total: number; rascunho: number; em_producao: number; pronto: number; publicado: number }
interface DiaStat { idx: number; total: number; publicados: number; label: string }
interface CanalStat { canal: string; total: number; publicados: number }
interface PatrocStat { id: string; nome: string; logo_url: string | null; total: number; publicados: number }
interface Jogo {
  id: string; equipe_a_nome: string | null; equipe_b_nome: string | null
  inicio: string | null; fim_previsto: string | null; dia_id: string | null
  status: string | null; placar_a: number | null; placar_b: number | null
  divisao?: string | null; modalidade_nome?: string | null; modalidade_icone?: string | null; setor_nome?: string | null
}
interface EventItem { id: string; nome?: string; inicio: string | null; fim_previsto: string | null; dia_id: string | null }
interface WeatherDay { date: string; tMax: number; tMin: number; rain: number; emoji: string }
interface EmCampoItem { nome: string; setor: string }
interface RecentPublicado { id: string; titulo: string | null; canal: string | null }
interface RankingEquipe { id: string; nome: string; divisao: string | null; cor_primaria: string | null; total_pontos: number }
interface PodioRecente { equipe_nome: string; modalidade_nome: string; modalidade_icone: string | null; colocacao: number; pontos: number }
interface TipoStat { tipo: string; total: number; publicados: number }

interface Props {
  pipelineStats: PipelineStats
  conteudosPorDia: DiaStat[]
  canalBreakdown: CanalStat[]
  patrocStats: PatrocStat[]
  equipeAtiva: number
  setoresCobertos: number
  ckTotal: number
  ckFeitos: number
  jogosHoje: Jogo[]
  jogosAoVivo: Jogo[]
  showsHoje: EventItem[]
  festasHoje: EventItem[]
  diasEvento: { id: string; data: string }[]
  diaAtualId: string | null
  weatherData: WeatherDay[] | null
  emCampo: EmCampoItem[]
  setoresFrios: string[]
  capturasCount: number
  velocidade: number
  recentPublicados: RecentPublicado[]
  rankingEquipes: RankingEquipe[]
  podiosRecentes: PodioRecente[]
  tipoBreakdown: TipoStat[]
  jogosEncerrados: Jogo[]
  funilProducao?: import('@/lib/conteudos/funil-producao').FunilProducao | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}
function subInfo(j: Jogo): string {
  const bits: string[] = []
  if (j.modalidade_nome) bits.push(j.modalidade_nome)
  if (j.divisao) bits.push(j.divisao)
  if (j.setor_nome) bits.push(j.setor_nome)
  return bits.join(' · ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Relógio
// ─────────────────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState('')
  const [d, setD] = useState('')
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setT(n.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' }))
      setD(n.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }))
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1",
        fontSize: 'clamp(30px,3.6vw,52px)', fontWeight: 800, color: C.cream,
        letterSpacing: '-0.035em', lineHeight: 0.92, fontVariantNumeric: NUM,
      }}>{t}</div>
      <div style={{ fontFamily: FS, fontSize: 10, color: C.creamMute, marginTop: 4, textTransform: 'capitalize', letterSpacing: '0.12em', fontWeight: 500 }}>{d}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Eyebrow de cena
// ─────────────────────────────────────────────────────────────────────────────
function SceneHead({ accent, kicker, title, right }: { accent: string; kicker: string; title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent, boxShadow: `0 0 16px ${accent}`, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FS, fontSize: 11, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: accent }}>{kicker}</div>
          <div style={{
            fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 96, 'SOFT' 0, 'WONK' 1",
            fontSize: 'clamp(26px,3vw,44px)', fontWeight: 800, color: C.cream, letterSpacing: '-0.03em', lineHeight: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</div>
        </div>
      </div>
      {right}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Linha de jogo compacta (ao vivo / resultado / próximo) — usada nas colunas
// ─────────────────────────────────────────────────────────────────────────────
function JogoMini({ j, mode }: { j: Jogo; mode: 'live' | 'result' | 'next' }) {
  const a = j.placar_a ?? 0, b = j.placar_b ?? 0
  const winA = mode === 'result' && a > b, winB = mode === 'result' && b > a
  const scoreCol = mode === 'live' ? C.red : C.cream

  function TeamRow({ name, score, win, lose }: { name: string | null; score: number; win: boolean; lose: boolean }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: win ? (mode === 'live' ? C.red : C.green) : C.creamFade }} />
        <span style={{ flex: 1, minWidth: 0, fontFamily: FS, fontWeight: win ? 800 : 600, fontSize: 'clamp(12px,1.2vw,19px)', color: lose ? C.creamMute : C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{name ?? 'A definir'}</span>
        {mode !== 'next' && (
          <span style={{ fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 96, 'SOFT' 0, 'WONK' 1", fontSize: 'clamp(17px,1.7vw,28px)', fontWeight: 800, color: win ? (mode === 'live' ? C.red : C.green) : (lose ? C.creamMute : scoreCol), fontVariantNumeric: NUM, flexShrink: 0, minWidth: '1.3em', textAlign: 'right', lineHeight: 1 }}>{score}</span>
        )}
      </div>
    )
  }

  return (
    <div className="tvc-card" style={{
      background: mode === 'live' ? 'rgba(255,77,77,0.055)' : C.panel,
      border: `1px solid ${mode === 'live' ? 'rgba(255,77,77,0.20)' : C.border}`,
      borderLeft: `3px solid ${mode === 'live' ? C.red : mode === 'result' ? C.green : C.gold}`,
      borderRadius: 11, padding: 'clamp(7px,0.75vw,12px) clamp(11px,1.1vw,16px)',
      display: 'flex', flexDirection: 'column', gap: 'clamp(3px,0.4vw,6px)', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* meta: modalidade/divisão/setor + horário */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {j.modalidade_icone && <span style={{ fontSize: 'clamp(10px,0.85vw,13px)', flexShrink: 0 }}>{j.modalidade_icone}</span>}
        <span style={{ flex: 1, minWidth: 0, fontFamily: FS, fontSize: 'clamp(8.5px,0.74vw,11.5px)', fontWeight: 600, color: C.creamMute, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subInfo(j)}</span>
        <span style={{ flexShrink: 0, fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(11px,1vw,16px)', fontWeight: 800, color: mode === 'next' ? C.gold : C.creamMute, fontVariantNumeric: NUM }}>{fmtTime(j.inicio)}</span>
      </div>
      <TeamRow name={j.equipe_a_nome} score={a} win={winA} lose={winB} />
      <TeamRow name={j.equipe_b_nome} score={b} win={winB} lose={winA} />
    </div>
  )
}

// Coluna de jogos (Ao vivo / Resultados / Próximos)
function ColunaJogos({ icon, label, accent, games, mode, live }: { icon: string; label: string; accent: string; games: Jogo[]; mode: 'live' | 'result' | 'next'; live?: boolean }) {
  const CAP = 7
  const extra = games.length - CAP
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(7px,0.8vw,12px)', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, paddingBottom: 6, borderBottom: `2px solid ${accent}33` }}>
        <span className={live ? 'tvc-ping' : undefined} style={{ fontSize: 'clamp(12px,1.1vw,17px)', flexShrink: 0, filter: live ? `drop-shadow(0 0 8px ${accent})` : 'none' }}>{icon}</span>
        <span style={{ fontFamily: FS, fontSize: 'clamp(11px,1.05vw,16px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(15px,1.5vw,24px)', fontWeight: 800, color: C.cream, fontVariantNumeric: NUM }}>{games.length}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(5px,0.6vw,9px)', minHeight: 0, overflow: 'hidden' }}>
        {games.slice(0, CAP).map(j => <JogoMini key={j.id} j={j} mode={mode} />)}
        {extra > 0 && <div style={{ flexShrink: 0, fontFamily: FS, fontSize: 'clamp(10px,0.9vw,13px)', fontWeight: 700, letterSpacing: '0.06em', color: accent, textAlign: 'center', paddingTop: 2 }}>+{extra} jogos</div>}
        {games.length === 0 && <div style={{ fontFamily: FS, fontSize: 13, color: C.creamFade, textAlign: 'center', paddingTop: 16 }}>—</div>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile de KPI (central de dados)
// ─────────────────────────────────────────────────────────────────────────────
// KPI compacto (linha de topo do painel)
function MiniKpi({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent: string }) {
  return (
    <div className="tvc-card" style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 'clamp(8px,0.9vw,15px) clamp(10px,1.1vw,18px)', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <span style={{ fontFamily: FS, fontSize: 'clamp(8px,0.72vw,11px)', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.creamMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 96, 'SOFT' 0, 'WONK' 1", fontSize: 'clamp(22px,2.6vw,42px)', fontWeight: 800, color: accent, letterSpacing: '-0.03em', lineHeight: 0.9, fontVariantNumeric: NUM }}>{value}</span>
      {sub && <span style={{ fontFamily: FS, fontSize: 'clamp(8px,0.72vw,11px)', color: C.creamMute, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
    </div>
  )
}

// Painel compacto com título (usado na tela única de dados)
function MiniPanel({ title, accent, children, style }: { title: string; accent: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="tvc-card" style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 'clamp(11px,1.2vw,18px) clamp(13px,1.4vw,20px)', display: 'flex', flexDirection: 'column', gap: 'clamp(6px,0.7vw,11px)', minHeight: 0, overflow: 'hidden', ...style }}>
      <span style={{ fontFamily: FS, fontSize: 'clamp(9px,0.82vw,12px)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, flexShrink: 0 }}>{title}</span>
      {children}
    </div>
  )
}

// Linha de barra (canal/tipo/funil)
function BarRow({ label, color, total, pub, max }: { label: string; color: string; total: number; pub: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: FS, fontSize: 'clamp(10px,0.95vw,15px)', fontWeight: 600, color: C.creamDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <div style={{ width: '38%', height: 7, borderRadius: 99, background: 'rgba(250,247,240,0.06)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${Math.round(total / max * 100)}%`, background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(12px,1.2vw,19px)', fontWeight: 800, color: C.cream, fontVariantNumeric: NUM, flexShrink: 0, minWidth: '2.6em', textAlign: 'right' }}>
        {pub}<span style={{ color: C.creamFade, fontSize: '0.7em' }}>/{total}</span>
      </span>
    </div>
  )
}

// Donut do pipeline — gráfico elaborado (composição por status)
function PipelineDonut({ stats }: { stats: PipelineStats }) {
  const total = Math.max(1, stats.total)
  const pct = stats.total > 0 ? Math.round(stats.publicado / stats.total * 100) : 0
  const segs = [
    { v: stats.publicado, c: C.green, label: 'Publicado' },
    { v: stats.pronto, c: C.blue, label: 'Pronto' },
    { v: stats.em_producao, c: C.gold, label: 'Em produção' },
    { v: stats.rascunho, c: 'rgba(250,247,240,0.20)', label: 'Rascunho' },
  ]
  const R = 54, SW = 16, CIRC = 2 * Math.PI * R
  let acc = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px,1.6vw,30px)' }}>
      <div style={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
        <svg viewBox="0 0 140 140" style={{ width: 'clamp(108px,9vw,162px)', height: 'auto', transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(250,247,240,0.05)" strokeWidth={SW} />
          {segs.map((s, i) => {
            const len = (s.v / total) * CIRC
            const el = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.c} strokeWidth={SW} strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-acc} />
            acc += len
            return el
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 96, 'SOFT' 0, 'WONK' 1", fontSize: 'clamp(26px,2.8vw,46px)', fontWeight: 800, color: C.green, lineHeight: 1, fontVariantNumeric: NUM }}>{pct}%</span>
          <span style={{ fontFamily: FS, fontSize: 'clamp(7px,0.62vw,9.5px)', color: C.creamMute, letterSpacing: '0.16em', textTransform: 'uppercase' }}>publicado</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(5px,0.6vw,10px)' }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.c, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: FS, fontSize: 'clamp(10px,0.95vw,15px)', color: C.creamDim, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(13px,1.3vw,21px)', fontWeight: 800, color: C.cream, fontVariantNumeric: NUM, flexShrink: 0 }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
type Scene =
  | { kind: 'jogos' }
  | { kind: 'classificacao' }
  | { kind: 'painel' }

export function TVCarrossel(p: Props) {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [realtimeOk, setRealtimeOk] = useState(true)
  const doRefreshRef = useRef<() => void>(() => {})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived ──
  const ckPct = p.ckTotal > 0 ? Math.round(p.ckFeitos / p.ckTotal * 100) : 0
  const presPct = p.equipeAtiva > 0 ? Math.round(p.emCampo.length / p.equipeAtiva * 100) : 0
  const totalHoje = p.conteudosPorDia.find(d => p.diasEvento[d.idx - 1]?.id === p.diaAtualId)
  const publicadosHoje = totalHoje?.publicados ?? 0
  const totalConteudosHoje = totalHoje?.total ?? 0
  const diaIdx = p.diaAtualId ? p.diasEvento.findIndex(d => d.id === p.diaAtualId) + 1 : 0
  const proxJogos = p.jogosHoje.filter(j => j.status === 'agendado')

  // ── 3 telas: Jogos (ao vivo+resultados+próximos) · Classificação (ranking+pódios)
  //    · Painel de dados. Esportivo intercalado com a tela de dados. ──
  const temJogos = p.jogosAoVivo.length + p.jogosEncerrados.length + proxJogos.length > 0
  const esportivas: Scene[] = []
  if (temJogos) esportivas.push({ kind: 'jogos' })
  esportivas.push({ kind: 'classificacao' }) // sempre — mostra estado vazio até ter resultado
  const scenes: Scene[] = []
  esportivas.forEach(s => { scenes.push(s); scenes.push({ kind: 'painel' }) })
  if (scenes.length === 0) scenes.push({ kind: 'painel' })
  const scene = scenes[idx % scenes.length]
  const scenePos = idx % scenes.length
  // Painel de dados fica mais tempo na tela (mais coisa pra ler).
  const sceneDurMs = scene?.kind === 'painel' ? 20_000 : 12_000

  // ── Rotação (duração por cena) ──
  useEffect(() => {
    const t = setTimeout(() => setIdx(i => i + 1), sceneDurMs)
    return () => clearTimeout(t)
  }, [idx, sceneDurMs])

  // ── Refresh + realtime + fullscreen ──
  function doRefresh() { router.refresh() }
  doRefreshRef.current = doRefresh
  useEffect(() => {
    const id = setInterval(() => doRefreshRef.current(), 15_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const supabase = createClient()
    let reconnect: ReturnType<typeof setTimeout> | null = null
    const channel = supabase.channel(uniqueChannel('tv-carrossel'))
    for (const table of ['conteudos', 'jogos', 'turnos'] as const) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doRefreshRef.current(), 900)
      })
    }
    channel.subscribe((status) => {
      setRealtimeOk(status === 'SUBSCRIBED')
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (reconnect) clearTimeout(reconnect)
        reconnect = setTimeout(() => channel.subscribe(), 2000)
      }
    })
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (reconnect) clearTimeout(reconnect)
      supabase.removeChannel(channel)
    }
  }, [])
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); setFullscreen(true) }
    else { document.exitFullscreen().catch(() => {}); setFullscreen(false) }
  }, [])
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { document.documentElement.requestFullscreen().catch(() => {}); setFullscreen(true) }, 1200)
    return () => clearTimeout(t)
  }, [])

  // ── Render de cena ──
  function renderScene(s: Scene): React.ReactNode {
    if (s.kind === 'jogos') {
      return (
        <>
          <SceneHead accent={C.red} kicker="Esportivo · Jogos de hoje" title="Placar geral"
            right={<span style={{ fontFamily: FS, fontSize: 12, fontWeight: 700, color: C.creamMute, letterSpacing: '0.06em' }}>{p.jogosAoVivo.length} ao vivo · {p.jogosEncerrados.length} encerrados · {proxJogos.length} próximos</span>} />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'clamp(12px,1.4vw,24px)', minHeight: 0 }}>
            <ColunaJogos icon="🔴" label="No ar agora" accent={C.red} games={p.jogosAoVivo} mode="live" live />
            <ColunaJogos icon="✓" label="Resultados" accent={C.green} games={p.jogosEncerrados} mode="result" />
            <ColunaJogos icon="⏰" label="Próximos" accent={C.gold} games={proxJogos} mode="next" />
          </div>
        </>
      )
    }
    if (s.kind === 'painel') {
      const f = p.funilProducao
      const maxC = Math.max(1, ...p.canalBreakdown.map(c => c.total))
      const maxT = Math.max(1, ...p.tipoBreakdown.map(t => t.total))
      const patroc = [...p.patrocStats].sort((a, b) => (b.total > 0 ? b.publicados / b.total : 0) - (a.total > 0 ? a.publicados / a.total : 0)).slice(0, 6)
      const agenda = [
        ...p.jogosHoje.map(j => ({ t: j.inicio, label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`, tag: j.modalidade_nome || 'Jogo', color: j.status === 'ao_vivo' ? C.red : j.status === 'encerrado' ? C.green : C.gold, live: j.status === 'ao_vivo' })),
        ...p.showsHoje.map(s2 => ({ t: s2.inicio, label: s2.nome ?? 'Show', tag: 'Show', color: C.lavender, live: false })),
        ...p.festasHoje.map(f2 => ({ t: f2.inicio, label: f2.nome ?? 'Festa', tag: 'Festa', color: C.blue, live: false })),
      ].filter(x => x.t).sort((x, y) => (x.t! < y.t! ? -1 : 1)).slice(0, 6)
      const G = 'clamp(8px,0.9vw,14px)'
      return (
        <>
          <SceneHead accent={C.gold} kicker="Cobertura · Tempo real" title="Painel de dados"
            right={diaIdx > 0 ? <span style={{ fontFamily: FS, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.creamMute }}>{p.velocidade}/h · {p.capturasCount} capturas</span> : undefined} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: G, minHeight: 0 }}>
            {/* Hero: donut do pipeline + KPIs */}
            <div style={{ display: 'flex', gap: G, flexShrink: 0 }}>
              <MiniPanel title="Pipeline · por status" accent={C.green} style={{ flex: 1.15, justifyContent: 'center' }}>
                <PipelineDonut stats={p.pipelineStats} />
              </MiniPanel>
              <div style={{ flex: 1.7, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: G }}>
                <MiniKpi label="Publicados hoje" value={`${publicadosHoje}/${totalConteudosHoje}`} sub={`${p.velocidade}/h · ritmo`} accent={C.goldHi} />
                <MiniKpi label="Em campo" value={p.emCampo.length} sub={`${presPct}% presença`} accent={p.emCampo.length > 0 ? C.green : C.creamFade} />
                <MiniKpi label="Produzindo" value={p.funilProducao?.produzindoAgora ?? 0} sub="agora" accent={C.blue} />
                <MiniKpi label="Setores" value={p.setoresCobertos} sub={p.setoresFrios.length > 0 ? `${p.setoresFrios.length} frios` : 'todos ok'} accent={p.setoresFrios.length > 0 ? C.gold : C.green} />
                <MiniKpi label="Checklist" value={`${ckPct}%`} sub={`${p.ckFeitos}/${p.ckTotal}`} accent={ckPct >= 70 ? C.green : C.gold} />
                <MiniKpi label="Capturas" value={p.capturasCount} sub="pendentes" accent={p.capturasCount > 0 ? C.gold : C.creamFade} />
              </div>
            </div>
            {/* Meio: funil+dias · canais+tipos · patrocínio */}
            <div style={{ flex: 1.15, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: G, minHeight: 0 }}>
              <MiniPanel title="Funil de produção" accent={C.green} style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(7px,0.8vw,12px)' }}>
                  {f?.etapas.map(et => <BarRow key={et.etapa} label={et.label} color={et.pct >= 70 ? C.green : C.gold} total={Math.max(1, et.total)} pub={et.concluido} max={Math.max(1, et.total)} />)}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {p.conteudosPorDia.map(d => {
                    const isHoje = p.diasEvento[d.idx - 1]?.id === p.diaAtualId
                    return (
                      <div key={d.idx} style={{ flex: 1, textAlign: 'center', background: isHoje ? C.panelHi : 'transparent', border: `1px solid ${isHoje ? C.gold + '55' : C.border}`, borderRadius: 10, padding: '6px 3px' }}>
                        <div style={{ fontFamily: FS, fontSize: 9, color: isHoje ? C.gold : C.creamMute, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(d.label.split(' ')[0]) || `D${d.idx}`}</div>
                        <div style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(13px,1.3vw,19px)', fontWeight: 800, color: C.cream, fontVariantNumeric: NUM }}>{d.publicados}<span style={{ color: C.creamFade, fontSize: '0.62em' }}>/{d.total}</span></div>
                      </div>
                    )
                  })}
                </div>
              </MiniPanel>

              <MiniPanel title="Por canal" accent={C.lavender}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px,0.5vw,8px)' }}>
                  {p.canalBreakdown.slice(0, 5).map((c, i) => <BarRow key={i} label={CANAL_LABEL[c.canal] ?? c.canal} color={CANAL_COLOR[c.canal] ?? C.creamMute} total={c.total} pub={c.publicados} max={maxC} />)}
                  {p.canalBreakdown.length === 0 && <span style={{ fontFamily: FS, color: C.creamMute, fontSize: 12 }}>Sem publicações ainda.</span>}
                </div>
                <span style={{ fontFamily: FS, fontSize: 'clamp(9px,0.82vw,12px)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, marginTop: 'auto', paddingTop: 4 }}>Por tipo</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px,0.5vw,8px)' }}>
                  {p.tipoBreakdown.slice(0, 5).map((t, i) => <BarRow key={i} label={TIPO_LABEL[t.tipo] ?? t.tipo} color={TIPO_COLOR[t.tipo] ?? C.creamMute} total={t.total} pub={t.publicados} max={maxT} />)}
                </div>
              </MiniPanel>

              <MiniPanel title="Patrocínio" accent={C.goldHi}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(6px,0.7vw,11px)', overflow: 'hidden' }}>
                  {patroc.map(pt => {
                    const pct = pt.total > 0 ? Math.round(pt.publicados / pt.total * 100) : 0
                    return (
                      <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        {pt.logo_url
                          /* eslint-disable-next-line @next/next/no-img-element */
                          ? <img src={pt.logo_url} alt={pt.nome} style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'contain', background: 'white', padding: 2, flexShrink: 0 }} />
                          : <span style={{ width: 30, height: 30, borderRadius: 7, background: C.greenDeep, flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FS, fontWeight: 700, fontSize: 'clamp(11px,1.05vw,16px)', color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pt.nome}</div>
                          <div style={{ height: 5, borderRadius: 99, background: 'rgba(250,247,240,0.07)', overflow: 'hidden', marginTop: 4 }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: pct >= 70 ? C.green : pct >= 40 ? C.gold : C.red }} />
                          </div>
                        </div>
                        <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(13px,1.3vw,20px)', fontWeight: 800, color: C.cream, fontVariantNumeric: NUM, flexShrink: 0 }}>{pt.publicados}<span style={{ color: C.creamFade, fontSize: '0.7em' }}>/{pt.total}</span></span>
                      </div>
                    )
                  })}
                  {patroc.length === 0 && <span style={{ fontFamily: FS, color: C.creamMute, fontSize: 12 }}>Sem escopo cadastrado.</span>}
                </div>
              </MiniPanel>
            </div>
            {/* Baixo: agenda + clima */}
            <div style={{ flex: 1, display: 'flex', gap: G, minHeight: 0 }}>
              <MiniPanel title="Agenda de hoje" accent={C.green} style={{ flex: 2.2 }}>
                <div style={{ flex: 1, display: 'grid', gridAutoRows: '1fr', gap: 'clamp(3px,0.4vw,7px)', minHeight: 0 }}>
                  {agenda.map((x, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                      <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(13px,1.3vw,20px)', fontWeight: 800, color: x.color, fontVariantNumeric: NUM, flexShrink: 0, minWidth: '2.6em' }}>{fmtTime(x.t)}</span>
                      <span className={x.live ? 'tvc-ping' : undefined} style={{ width: 7, height: 7, borderRadius: '50%', background: x.color, flexShrink: 0, boxShadow: x.live ? `0 0 10px ${x.color}` : 'none' }} />
                      <span style={{ flex: 1, fontFamily: FS, fontWeight: 600, fontSize: 'clamp(11px,1.05vw,17px)', color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
                      <span style={{ fontFamily: FS, fontSize: 'clamp(8px,0.72vw,11px)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: x.color, flexShrink: 0 }}>{x.live ? '● ao vivo' : x.tag}</span>
                    </div>
                  ))}
                  {agenda.length === 0 && <span style={{ fontFamily: FS, color: C.creamMute, fontSize: 13, alignSelf: 'center' }}>Sem programação hoje.</span>}
                </div>
              </MiniPanel>
              {p.weatherData && p.weatherData.length > 0 && (
                <MiniPanel title="Clima · Uberaba" accent={C.blue} style={{ flex: 1 }}>
                  <div style={{ flex: 1, display: 'flex', gap: 'clamp(5px,0.6vw,9px)', minHeight: 0 }}>
                    {p.weatherData.slice(0, 4).map((w, i) => {
                      const dt = new Date(w.date + 'T12:00:00-03:00')
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'rgba(250,247,240,0.02)', border: `1px solid ${C.border}`, borderRadius: 11, padding: '6px 2px' }}>
                          <span style={{ fontFamily: FS, fontSize: 9, fontWeight: 700, textTransform: 'capitalize', color: C.creamMute }}>{dt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}</span>
                          <span style={{ fontSize: 'clamp(17px,1.8vw,28px)' }}>{w.emoji}</span>
                          <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(12px,1.2vw,18px)', color: C.cream, fontVariantNumeric: NUM }}>{Math.round(w.tMax)}°<span style={{ color: C.creamFade, fontSize: '0.62em' }}>/{Math.round(w.tMin)}°</span></span>
                          <span style={{ fontFamily: FS, fontSize: 8.5, color: C.creamFade }}>💧{w.rain}%</span>
                        </div>
                      )
                    })}
                  </div>
                </MiniPanel>
              )}
            </div>
          </div>
        </>
      )
    }
    if (s.kind === 'classificacao') {
      const top = p.rankingEquipes.slice(0, 8)
      const max = top[0]?.total_pontos || 1
      const medal = (c: number) => c === 1 ? '🥇' : c === 2 ? '🥈' : c === 3 ? '🥉' : `${c}º`
      return (
        <>
          <SceneHead accent={C.lavender} kicker="Esportivo · Classificação" title="Ranking & pódios" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 'clamp(12px,1.4vw,22px)', minHeight: 0 }}>
            {/* Ranking */}
            <MiniPanel title="Ranking das atléticas" accent={C.lavender}>
              <div style={{ flex: 1, display: 'grid', gridAutoRows: '1fr', gap: 'clamp(5px,0.6vw,9px)', minHeight: 0 }}>
                {top.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 13, overflow: 'hidden' }}>
                    <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(18px,1.9vw,32px)', fontWeight: 800, color: i === 0 ? C.goldHi : i === 1 ? C.cream : i === 2 ? C.gold : C.creamFade, width: '1.5em', textAlign: 'center', fontVariantNumeric: NUM, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ width: 5, height: '60%', borderRadius: 99, background: e.cor_primaria || C.greenDeep, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FS, fontWeight: 700, fontSize: 'clamp(12px,1.2vw,19px)', color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nome}</div>
                      {e.divisao && <div style={{ fontFamily: FS, fontSize: 9.5, color: C.creamMute, letterSpacing: '0.06em' }}>{e.divisao}</div>}
                    </div>
                    <div style={{ width: '22%', height: 5, borderRadius: 99, background: 'rgba(250,247,240,0.07)', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ height: '100%', width: `${Math.round(e.total_pontos / max * 100)}%`, background: C.lavender, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(15px,1.6vw,26px)', fontWeight: 800, color: C.cream, fontVariantNumeric: NUM, flexShrink: 0, minWidth: '1.7em', textAlign: 'right' }}>{e.total_pontos}</span>
                  </div>
                ))}
                {top.length === 0 && <span style={{ fontFamily: FS, color: C.creamMute, fontSize: 13, alignSelf: 'center' }}>Sem pontuação ainda.</span>}
              </div>
            </MiniPanel>
            {/* Pódios */}
            <MiniPanel title="Pódios recentes" accent={C.gold}>
              <div style={{ flex: 1, display: 'grid', gridAutoRows: '1fr', gap: 'clamp(5px,0.6vw,9px)', minHeight: 0 }}>
                {p.podiosRecentes.slice(0, 8).map((pd, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, overflow: 'hidden' }}>
                    <span style={{ fontSize: 'clamp(18px,1.9vw,30px)', flexShrink: 0, width: '1.5em', textAlign: 'center' }}>{pd.modalidade_icone ?? medal(pd.colocacao)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FS, fontWeight: 700, fontSize: 'clamp(12px,1.2vw,19px)', color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pd.equipe_nome}</div>
                      <div style={{ fontFamily: FS, fontSize: 9.5, color: C.creamMute }}>{pd.modalidade_nome}</div>
                    </div>
                    <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(14px,1.4vw,22px)', fontWeight: 800, color: pd.colocacao === 1 ? C.goldHi : C.cream, flexShrink: 0 }}>{medal(pd.colocacao)}</span>
                    <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(13px,1.4vw,21px)', fontWeight: 800, color: C.green, fontVariantNumeric: NUM, flexShrink: 0, minWidth: '2.2em', textAlign: 'right' }}>+{pd.pontos}</span>
                  </div>
                ))}
                {p.podiosRecentes.length === 0 && <span style={{ fontFamily: FS, color: C.creamMute, fontSize: 13, alignSelf: 'center' }}>Sem pódios ainda.</span>}
              </div>
            </MiniPanel>
          </div>
        </>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: C.bg, color: C.cream, fontFamily: FD, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
      {/* Atmosfera */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='280' height='280' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E")` }} />
      <div style={{ position: 'absolute', top: -160, left: -120, width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,107,66,0.12) 0%, transparent 62%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: -160, right: -100, width: 640, height: 640, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}0e 0%, transparent 62%)`, pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px 12px', borderBottom: `1px solid ${C.border}`, zIndex: 2, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <CiaLogo />
          {diaIdx > 0 && (
            <span style={{ fontFamily: FS, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: C.gold, border: `1px solid ${C.gold}44`, borderRadius: 99, padding: '4px 12px', whiteSpace: 'nowrap' }}>DIA {diaIdx}/4</span>
          )}
          {p.jogosAoVivo.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FS, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: C.red, border: `1px solid ${C.red}55`, borderRadius: 99, padding: '4px 12px', whiteSpace: 'nowrap' }}>
              <span className="tvc-ping" style={{ width: 7, height: 7, borderRadius: '50%', background: C.red }} />{p.jogosAoVivo.length} AO VIVO
            </span>
          )}
        </div>
        <Clock />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
          <Wifi size={15} style={{ color: realtimeOk ? C.green : C.gold }} />
          <button onClick={toggleFullscreen} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, color: C.creamMute, cursor: 'pointer', display: 'flex' }}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </header>

      {/* Cena */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1, minHeight: 0, padding: 'clamp(16px,2vw,34px) clamp(20px,2.4vw,44px)' }}>
        <div key={scenePos} className="tvc-scene" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'clamp(14px,1.6vw,26px)' }}>
          {renderScene(scene)}
        </div>
      </main>

      {/* Footer — progresso de cenas + barra */}
      <footer style={{ zIndex: 2, flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
        <div key={scenePos} className="tvc-prog" style={{ height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.green})`, animationDuration: `${sceneDurMs}ms` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 28px' }}>
          {scenes.map((s, i) => (
            <span key={i} style={{
              width: i === scenePos ? 22 : 6, height: 6, borderRadius: 99,
              background: i === scenePos ? C.cream : C.creamFade, transition: 'width 0.4s ease, background 0.4s ease',
            }} title={s.kind} />
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes tvcPing { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.35; transform:scale(0.7) } }
        .tvc-ping { animation: tvcPing 1.3s ease-in-out infinite; }
        @keyframes tvcScene { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .tvc-scene { animation: tvcScene 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes tvcCard { from { opacity:0; transform:translateY(14px) scale(0.985) } to { opacity:1; transform:translateY(0) scale(1) } }
        .tvc-card { animation: tvcCard 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes tvcProg { from { width:0% } to { width:100% } }
        .tvc-prog { animation: tvcProg linear forwards; }
      `}</style>
    </div>
  )
}
