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

const FD = 'var(--font-fraunces), Georgia, serif'
const FS = 'var(--font-geist), system-ui, sans-serif'
const NUM = 'tabular-nums' as const
const SCENE_MS = 11_000

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
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = []
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i])
    if (i < b.length) out.push(b[i])
  }
  return out
}
function subInfo(j: Jogo): string {
  const bits: string[] = []
  if (j.modalidade_nome) bits.push(j.modalidade_nome)
  if (j.divisao) bits.push(j.divisao)
  if (j.setor_nome) bits.push(j.setor_nome)
  bits.push(fmtTime(j.inicio))
  return bits.join('  ·  ')
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
// Card de jogo (ao vivo / resultado / próximo)
// ─────────────────────────────────────────────────────────────────────────────
function GameCard({ j, mode, delay }: { j: Jogo; mode: 'live' | 'result' | 'next'; delay: number }) {
  const accent = mode === 'live' ? C.red : mode === 'result' ? C.green : C.gold
  const a = j.placar_a ?? 0, b = j.placar_b ?? 0
  const winA = mode === 'result' && a > b, winB = mode === 'result' && b > a
  const showScore = mode !== 'next'

  const Team = ({ name, align, win }: { name: string | null; align: 'right' | 'left'; win: boolean }) => (
    <div style={{ flex: 1, minWidth: 0, textAlign: align }}>
      <div style={{
        fontFamily: FS, fontWeight: win ? 800 : 600,
        fontSize: 'clamp(15px,1.5vw,26px)', lineHeight: 1.05,
        color: win ? C.cream : (mode === 'result' ? C.creamDim : C.cream),
        letterSpacing: '-0.01em',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{name ?? 'A definir'}</div>
    </div>
  )

  return (
    <div className="tvc-card" style={{
      animationDelay: `${delay}ms`,
      background: mode === 'live' ? 'rgba(255,77,77,0.05)' : C.panel,
      border: `1px solid ${mode === 'live' ? 'rgba(255,77,77,0.22)' : C.border}`,
      borderRadius: 18, padding: 'clamp(12px,1.4vw,22px) clamp(14px,1.6vw,26px)',
      display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {mode === 'live' && (
        <span style={{ position: 'absolute', top: 12, left: 0, right: 0, margin: '0 auto', width: 'fit-content',
          fontFamily: FS, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.22em', color: C.red,
          display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="tvc-ping" style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />AO VIVO
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px,1vw,20px)', marginTop: mode === 'live' ? 14 : 0 }}>
        <Team name={j.equipe_a_nome} align="right" win={winA} />
        {showScore ? (
          <div style={{
            fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1",
            fontSize: 'clamp(34px,4.4vw,68px)', fontWeight: 900, color: accent, letterSpacing: '-0.05em',
            lineHeight: 0.85, fontVariantNumeric: NUM, flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 'clamp(6px,0.6vw,12px)',
          }}>
            <span style={{ opacity: winB ? 0.4 : 1 }}>{a}</span>
            <span style={{ fontSize: '0.4em', color: C.creamFade, fontWeight: 400, fontStyle: 'normal' }}>×</span>
            <span style={{ opacity: winA ? 0.4 : 1 }}>{b}</span>
          </div>
        ) : (
          <div style={{
            fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 96, 'SOFT' 0, 'WONK' 1",
            fontSize: 'clamp(22px,2.4vw,38px)', fontWeight: 800, color: C.gold, letterSpacing: '-0.02em',
            flexShrink: 0, fontVariantNumeric: NUM,
          }}>{fmtTime(j.inicio)}</div>
        )}
        <Team name={j.equipe_b_nome} align="left" win={winB} />
      </div>
      <div style={{ textAlign: 'center', fontFamily: FS, fontSize: 'clamp(9px,0.85vw,13px)', fontWeight: 600,
        letterSpacing: '0.06em', color: C.creamMute, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        {j.modalidade_icone && <span style={{ fontSize: '1.3em' }}>{j.modalidade_icone}</span>}
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subInfo(j)}</span>
      </div>
    </div>
  )
}

function gridCols(n: number) {
  if (n <= 1) return '1fr'
  if (n <= 4) return '1fr 1fr'
  return '1fr 1fr'
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile de KPI (central de dados)
// ─────────────────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, accent, big }: { label: string; value: React.ReactNode; sub?: string; accent: string; big?: boolean }) {
  return (
    <div className="tvc-card" style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18,
      padding: 'clamp(14px,1.6vw,26px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 'clamp(14px,1.6vw,26px)', right: 'clamp(14px,1.6vw,26px)', height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <span style={{ fontFamily: FS, fontSize: 'clamp(9px,0.8vw,12px)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.creamMute }}>{label}</span>
      <span style={{
        fontFamily: FD, fontStyle: 'italic', fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1",
        fontSize: big ? 'clamp(44px,6vw,104px)' : 'clamp(30px,3.6vw,60px)', fontWeight: 800, color: accent,
        letterSpacing: '-0.04em', lineHeight: 0.88, fontVariantNumeric: NUM,
      }}>{value}</span>
      {sub && <span style={{ fontFamily: FS, fontSize: 'clamp(9px,0.85vw,13px)', color: C.creamMute, fontWeight: 500 }}>{sub}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
type Scene =
  | { kind: 'live'; games: Jogo[]; page: number; pages: number }
  | { kind: 'result'; games: Jogo[]; page: number; pages: number }
  | { kind: 'next'; games: Jogo[]; page: number; pages: number }
  | { kind: 'central' }
  | { kind: 'ranking' }
  | { kind: 'agenda' }

export function TVCarrossel(p: Props) {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [realtimeOk, setRealtimeOk] = useState(true)
  const doRefreshRef = useRef<() => void>(() => {})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived ──
  const healthPct = p.pipelineStats.total > 0 ? Math.round(p.pipelineStats.publicado / p.pipelineStats.total * 100) : 0
  const healthColor = healthPct >= 70 ? C.green : healthPct >= 40 ? C.gold : C.red
  const ckPct = p.ckTotal > 0 ? Math.round(p.ckFeitos / p.ckTotal * 100) : 0
  const presPct = p.equipeAtiva > 0 ? Math.round(p.emCampo.length / p.equipeAtiva * 100) : 0
  const totalHoje = p.conteudosPorDia.find(d => p.diasEvento[d.idx - 1]?.id === p.diaAtualId)
  const publicadosHoje = totalHoje?.publicados ?? 0
  const totalConteudosHoje = totalHoje?.total ?? 0
  const diaIdx = p.diaAtualId ? p.diasEvento.findIndex(d => d.id === p.diaAtualId) + 1 : 0
  const proxJogos = p.jogosHoje.filter(j => j.status === 'agendado')

  // ── Cenas (intercala esportes × dados) ──
  const sports: Scene[] = []
  chunk(p.jogosAoVivo, 6).forEach((g, i, arr) => sports.push({ kind: 'live', games: g, page: i + 1, pages: arr.length }))
  chunk(p.jogosEncerrados, 8).forEach((g, i, arr) => sports.push({ kind: 'result', games: g, page: i + 1, pages: arr.length }))
  chunk(proxJogos, 8).forEach((g, i, arr) => sports.push({ kind: 'next', games: g, page: i + 1, pages: arr.length }))
  const dataScenes: Scene[] = [{ kind: 'central' }]
  if (p.rankingEquipes.length > 0) dataScenes.push({ kind: 'ranking' })
  dataScenes.push({ kind: 'agenda' })
  const scenes: Scene[] = interleave(sports, dataScenes)
  if (scenes.length === 0) scenes.push({ kind: 'central' })
  const scene = scenes[idx % scenes.length]
  const scenePos = idx % scenes.length

  // ── Rotação ──
  useEffect(() => {
    const id = setInterval(() => setIdx(i => i + 1), SCENE_MS)
    return () => clearInterval(id)
  }, [])

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
    if (s.kind === 'live' || s.kind === 'result' || s.kind === 'next') {
      const mode = s.kind === 'live' ? 'live' : s.kind === 'result' ? 'result' : 'next'
      const accent = mode === 'live' ? C.red : mode === 'result' ? C.green : C.gold
      const kicker = mode === 'live' ? 'Esportivo · Acontecendo' : mode === 'result' ? 'Esportivo · Encerrados' : 'Esportivo · A seguir'
      const title = mode === 'live' ? 'No ar agora' : mode === 'result' ? 'Resultados' : 'Próximos jogos'
      return (
        <>
          <SceneHead accent={accent} kicker={kicker} title={title}
            right={s.pages > 1 ? <span style={{ fontFamily: FS, fontSize: 12, fontWeight: 700, color: C.creamMute, letterSpacing: '0.1em' }}>{s.page}/{s.pages}</span> : undefined} />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: gridCols(s.games.length), gridAutoRows: '1fr', gap: 'clamp(10px,1.1vw,18px)', minHeight: 0 }}>
            {s.games.map((j, i) => <GameCard key={j.id} j={j} mode={mode} delay={i * 70} />)}
          </div>
        </>
      )
    }
    if (s.kind === 'central') {
      const f = p.funilProducao
      return (
        <>
          <SceneHead accent={C.gold} kicker="Cobertura · Tempo real" title="Central de dados" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 'clamp(10px,1.1vw,18px)', minHeight: 0 }}>
            <div style={{ gridRow: '1 / 3' }}>
              <Tile label="Saúde da operação" value={`${healthPct}%`} sub={`${p.pipelineStats.publicado} de ${p.pipelineStats.total} publicados`} accent={healthColor} big />
            </div>
            <Tile label="Publicados hoje" value={`${publicadosHoje}/${totalConteudosHoje}`} sub={`${p.velocidade}/h · ritmo`} accent={C.goldHi} />
            <Tile label="Em campo agora" value={p.emCampo.length} sub={`${presPct}% presença`} accent={p.emCampo.length > 0 ? C.green : C.creamFade} />
            <Tile label="Setores cobertos" value={p.setoresCobertos} sub={p.setoresFrios.length > 0 ? `${p.setoresFrios.length} sem cobertura` : 'todos ativos'} accent={p.setoresFrios.length > 0 ? C.gold : C.green} />
            <Tile label="Checklist do dia" value={`${ckPct}%`} sub={`${p.ckFeitos}/${p.ckTotal} itens`} accent={ckPct >= 70 ? C.green : C.gold} />
          </div>
          {f && f.etapas.length > 0 && (
            <div style={{ display: 'flex', gap: 'clamp(10px,1.1vw,18px)', flexShrink: 0 }}>
              {f.etapas.map((et) => {
                const pct = et.total > 0 ? Math.round(et.concluido / et.total * 100) : 0
                return (
                  <div key={et.etapa} style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontFamily: FS, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.creamMute }}>{et.label}</span>
                      <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 18, fontWeight: 800, color: C.cream, fontVariantNumeric: NUM }}>{et.concluido}<span style={{ color: C.creamFade, fontSize: '0.7em' }}>/{et.total}</span></span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(250,247,240,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: pct >= 70 ? C.green : C.gold }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )
    }
    if (s.kind === 'ranking') {
      const top = p.rankingEquipes.slice(0, 10)
      const max = top[0]?.total_pontos || 1
      return (
        <>
          <SceneHead accent={C.lavender} kicker="Esportivo · Classificação" title="Ranking das atléticas" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: top.length > 5 ? '1fr 1fr' : '1fr', gridAutoRows: '1fr', gap: 'clamp(8px,0.9vw,14px)', minHeight: 0 }}>
            {top.map((e, i) => (
              <div key={e.id} className="tvc-card" style={{ animationDelay: `${i * 50}ms`, display: 'flex', alignItems: 'center', gap: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 clamp(14px,1.4vw,24px)', overflow: 'hidden' }}>
                <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(22px,2.4vw,40px)', fontWeight: 800, color: i === 0 ? C.goldHi : i === 1 ? C.cream : i === 2 ? C.gold : C.creamFade, width: '1.6em', textAlign: 'center', fontVariantNumeric: NUM, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ width: 6, height: '46%', borderRadius: 99, background: e.cor_primaria || C.greenDeep, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FS, fontWeight: 700, fontSize: 'clamp(13px,1.3vw,22px)', color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nome}</div>
                  {e.divisao && <div style={{ fontFamily: FS, fontSize: 10, color: C.creamMute, letterSpacing: '0.08em' }}>{e.divisao}</div>}
                </div>
                <div style={{ width: '24%', flexShrink: 0 }}>
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(250,247,240,0.07)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${Math.round(e.total_pontos / max * 100)}%`, background: C.lavender, borderRadius: 99 }} />
                  </div>
                </div>
                <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(18px,2vw,32px)', fontWeight: 800, color: C.cream, fontVariantNumeric: NUM, flexShrink: 0, minWidth: '1.8em', textAlign: 'right' }}>{e.total_pontos}</span>
              </div>
            ))}
          </div>
        </>
      )
    }
    // agenda
    const ag = [
      ...p.jogosHoje.map(j => ({ t: j.inicio, label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`, tag: j.modalidade_nome || 'Jogo', color: j.status === 'ao_vivo' ? C.red : j.status === 'encerrado' ? C.green : C.gold, live: j.status === 'ao_vivo' })),
      ...p.showsHoje.map(s2 => ({ t: s2.inicio, label: s2.nome ?? 'Show', tag: 'Show', color: C.lavender, live: false })),
      ...p.festasHoje.map(f2 => ({ t: f2.inicio, label: f2.nome ?? 'Festa', tag: 'Festa', color: C.blue, live: false })),
    ].filter(x => x.t).sort((x, y) => (x.t! < y.t! ? -1 : 1)).slice(0, 9)
    return (
      <>
        <SceneHead accent={C.green} kicker="Programação · Hoje" title="Agenda do dia" />
        <div style={{ flex: 1, display: 'flex', gap: 'clamp(12px,1.4vw,22px)', minHeight: 0 }}>
          <div style={{ flex: 2.4, display: 'grid', gridAutoRows: '1fr', gap: 'clamp(6px,0.7vw,11px)', minHeight: 0 }}>
            {ag.map((x, i) => (
              <div key={i} className="tvc-card" style={{ animationDelay: `${i * 40}ms`, display: 'flex', alignItems: 'center', gap: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 clamp(14px,1.4vw,22px)', overflow: 'hidden' }}>
                <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 'clamp(15px,1.5vw,26px)', fontWeight: 800, color: x.color, fontVariantNumeric: NUM, flexShrink: 0, minWidth: '2.6em' }}>{fmtTime(x.t)}</span>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: x.color, flexShrink: 0, boxShadow: x.live ? `0 0 10px ${x.color}` : 'none' }} className={x.live ? 'tvc-ping' : undefined} />
                <span style={{ flex: 1, fontFamily: FS, fontWeight: 600, fontSize: 'clamp(12px,1.2vw,20px)', color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
                <span style={{ fontFamily: FS, fontSize: 'clamp(8px,0.75vw,11px)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: x.color, flexShrink: 0 }}>{x.live ? '● ao vivo' : x.tag}</span>
              </div>
            ))}
            {ag.length === 0 && <div style={{ fontFamily: FS, color: C.creamMute, alignSelf: 'center', justifySelf: 'center' }}>Sem programação para hoje.</div>}
          </div>
          {p.weatherData && p.weatherData.length > 0 && (
            <div style={{ flex: 1, display: 'grid', gridAutoRows: '1fr', gap: 'clamp(6px,0.7vw,11px)', minHeight: 0 }}>
              {p.weatherData.slice(0, 4).map((w, i) => {
                const dt = new Date(w.date + 'T12:00:00-03:00')
                return (
                  <div key={i} className="tvc-card" style={{ animationDelay: `${i * 60}ms`, display: 'flex', alignItems: 'center', gap: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 clamp(14px,1.4vw,20px)' }}>
                    <span style={{ fontSize: 'clamp(20px,2.2vw,34px)', flexShrink: 0 }}>{w.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'capitalize', color: C.creamMute }}>{dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}</div>
                      <div style={{ fontFamily: FS, fontSize: 10, color: C.creamFade }}>💧 {w.rain}%</div>
                    </div>
                    <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(16px,1.7vw,26px)', color: C.cream, fontVariantNumeric: NUM, flexShrink: 0 }}>
                      {Math.round(w.tMax)}°<span style={{ color: C.creamFade, fontSize: '0.65em' }}>/{Math.round(w.tMin)}°</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </>
    )
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
        <div key={scenePos} className="tvc-prog" style={{ height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.green})`, animationDuration: `${SCENE_MS}ms` }} />
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
