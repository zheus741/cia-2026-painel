'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowUpRight, Radio, Users, FileCheck } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Janela do evento (BRT)
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_START = new Date('2026-06-04T00:00:00-03:00')
const EVENT_END   = new Date('2026-06-07T22:00:00-03:00')  // encerramento oficial
const TOTAL_MS    = EVENT_END.getTime() - EVENT_START.getTime()

type Fase = 'pre' | 'live' | 'post'

interface LiveStats {
  jogosAoVivo:    number
  publicadosHoje: number
  emCampo:        number
}

interface BriefingProps {
  userName:    string
  userRole:    string | null
  diffDays:    number
  eventActive: boolean
  liveStats?:  LiveStats
}

// ─────────────────────────────────────────────────────────────────────────────
// Motor de saudação — descontraído / irônico (tom CIA), por dia × hora, com nome
// ─────────────────────────────────────────────────────────────────────────────

type Bucket = 'madrugada' | 'manha' | 'tarde' | 'noite'
function bucketDaHora(h: number): Bucket {
  if (h < 5)  return 'madrugada'
  if (h < 12) return 'manha'
  if (h < 18) return 'tarde'
  return 'noite'
}

// Duas variantes por slot — alterna por paridade do minuto pra dar vida.
const SAUDACOES: Record<number, Record<Bucket, [string, string]>> = {
  // DIA 1 — Quinta
  1: {
    madrugada: ['Madrugada de quinta e você já de prontidão? Respeito, {n}.', '{n}, dia 1 mal começou e você já no posto. Lenda.'],
    manha:     ['Bom dia, {n}. Dia 1. O primeiro apito tá logo ali.', 'Acorda, {n} — a Copa começa hoje e a casa vai encher.'],
    tarde:     ['Tarde de quinta, {n}. A máquina já tá girando.', '{n}, dia 1 a todo vapor. Segura essa.'],
    noite:     ['Caiu a noite no dia 1, {n}. Agora a casa enche de verdade.', 'Noite de quinta, {n}. A festa tá só esquentando.'],
  },
  // DIA 2 — Sexta
  2: {
    madrugada: ['Ainda de pé, {n}? A festa não dorme — e você também não.', '{n}, 3 da manhã e firme. Isso que é amor pela cobertura.'],
    manha:     ['Bom dia (ou quase), {n}. Dia 2 e a perna já reclama.', 'Café duplo, {n}. Sexta vai ser longa.'],
    tarde:     ['Sexta rolando, {n}. Segura o ritmo que tem muito pela frente.', '{n}, metade da sexta. Respira e bora.'],
    noite:     ['Sexta à noite, {n}. A noite mais longa começa agora.', '{n}, pico de sexta. Capricha na cobertura.'],
  },
  // DIA 3 — Sábado
  3: {
    madrugada: ['Sábado de madrugada e você no front, {n}. Monstro.', '{n}, a madrugada de sábado é só pros corajosos. Você é um.'],
    manha:     ['Bom dia, {n}. Metade do caminho. Café e bora pro dia mais cheio.', '{n}, sábado é o dia que define. Energia total.'],
    tarde:     ['Reta de sábado, {n}. Aguenta o tranco que vale a pena.', '{n}, sábado à tarde — cada clique conta agora.'],
    noite:     ['Sábado à noite — pico do evento, {n}. Mostra serviço.', '{n}, a noite mais importante. Capricha que o mundo tá vendo.'],
  },
  // DIA 4 — Domingo
  4: {
    madrugada: ['Domingo amanhecendo, {n}. Tá quase. Aguenta mais um pouco.', '{n}, última madrugada. Você chegou até aqui — termina forte.'],
    manha:     ['Último dia, {n}. Cava a energia de reserva, vamos.', '{n}, domingo. A reta final mais doce. Bora fechar.'],
    tarde:     ['Reta final, {n}. Cada conteúdo conta o dobro agora.', '{n}, últimas horas de Copa. Faz valer.'],
    noite:     ['Últimas horas, {n}. Bora fechar com chave de ouro.', '{n}, é isso. Capricha no encerramento — a gente conseguiu.'],
  },
}

function saudacaoLive(now: Date, nome: string): string {
  const dia    = Math.min(4, Math.max(1, Math.floor((now.getTime() - EVENT_START.getTime()) / 86_400_000) + 1))
  const hora   = Number(now.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' })) % 24
  const min    = now.getMinutes()
  const par    = SAUDACOES[dia][bucketDaHora(hora)]
  return par[min % 2].replace('{n}', nome)
}

// ─────────────────────────────────────────────────────────────────────────────
// Relógio vivo (tick 1s)
// ─────────────────────────────────────────────────────────────────────────────

function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ─────────────────────────────────────────────────────────────────────────────
// CountUp
// ─────────────────────────────────────────────────────────────────────────────

function CountUp({ to, duration = 1600 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (to === 0) { setVal(0); return }
    const start = performance.now()
    let raf = 0
    const tick = (n: number) => {
      const p = Math.min((n - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 4)) * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <>{val}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero PRÉ-evento — contagem regressiva pro início
// ─────────────────────────────────────────────────────────────────────────────

function HeroPre({ diffDays, now }: { diffDays: number; now: Date | null }) {
  const digits = String(diffDays).split('')
  const multi  = digits.length >= 2

  let hh = '00', mm = '00', ss = '00'
  if (now) {
    const ms = Math.max(0, EVENT_START.getTime() - now.getTime())
    const rest = ms % 86_400_000
    const pad = (n: number) => n.toString().padStart(2, '0')
    hh = pad(Math.floor(rest / 3_600_000))
    mm = pad(Math.floor((rest % 3_600_000) / 60_000))
    ss = pad(Math.floor((rest % 60_000) / 1000))
  }

  return (
    <Link href="/cronograma" className="cia-brf-hero" aria-label="Abrir cronograma">
      <div className="cia-brf-hero__eyebrow">
        <span>Contagem regressiva</span>
        <span className="cia-brf-hero__pill">
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#051a0e', boxShadow: '0 0 8px currentColor' }} />
          04 — 07 jun
        </span>
      </div>

      <div className="cia-brf-hero__numwrap">
        <span className="cia-brf-hero__num">
          {multi ? <><em>{digits[0]}</em>{digits.slice(1).join('')}</> : <CountUp to={diffDays} />}
        </span>
        <span className="cia-brf-hero__unit">{diffDays === 1 ? 'dia restante' : 'dias restantes'}</span>
      </div>

      {now && (
        <div className="cia-brf-hero__ticker" aria-label={`Faltam ${hh}h ${mm}m ${ss}s`}>
          <span>{hh}</span><span style={{ opacity: 0.5 }}>·</span>
          <span>{mm}</span><span style={{ opacity: 0.5 }}>·</span>
          <span>{ss}</span>
          <span className="cia-brf-hero__ticker__label">até o início</span>
        </div>
      )}

      <div className="cia-brf-hero__foot">
        <span className="cia-brf-hero__date">04 – 07 jun 2026 · Uberaba/MG</span>
        <FootArrow />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero AO VIVO — countdown em horas pro encerramento + progresso + dados
// ─────────────────────────────────────────────────────────────────────────────

function HeroLive({ now, liveStats }: { now: Date; liveStats?: LiveStats }) {
  const ms       = Math.max(0, EVENT_END.getTime() - now.getTime())
  const horas    = Math.floor(ms / 3_600_000)
  const min      = Math.floor((ms % 3_600_000) / 60_000)
  const seg      = Math.floor((ms % 60_000) / 1000)
  const pad      = (n: number) => n.toString().padStart(2, '0')
  const dia      = Math.min(4, Math.max(1, Math.floor((now.getTime() - EVENT_START.getTime()) / 86_400_000) + 1))
  const pct      = Math.min(100, Math.max(0, Math.round(((now.getTime() - EVENT_START.getTime()) / TOTAL_MS) * 100)))

  const stats = liveStats && (liveStats.jogosAoVivo + liveStats.publicadosHoje + liveStats.emCampo) > 0
    ? [
        { icon: Radio,     val: liveStats.jogosAoVivo,    label: 'ao vivo' },
        { icon: FileCheck, val: liveStats.publicadosHoje, label: 'publicados hoje' },
        { icon: Users,     val: liveStats.emCampo,        label: 'em campo' },
      ]
    : null

  return (
    <Link href="/cronograma" className="cia-brf-hero cia-brf-hero--live" aria-label="Abrir cronograma">
      {/* Eyebrow ao vivo */}
      <div className="cia-brf-hero__eyebrow">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span className="cia-live-dot" aria-hidden />
          AO VIVO
        </span>
        <span className="cia-brf-hero__pill">Dia {dia} de 4</span>
      </div>

      {/* Horas até o encerramento */}
      <div className="cia-brf-hero__numwrap">
        <span className="cia-brf-hero__num">
          <em>{horas}</em><span style={{ fontSize: '0.42em', fontStyle: 'normal', marginLeft: 2 }}>h</span>
        </span>
        <span className="cia-brf-hero__unit">até o encerramento</span>
      </div>

      {/* Ticker mm·ss */}
      <div className="cia-brf-hero__ticker" aria-label={`Faltam ${horas}h ${min}m`}>
        <span>{pad(min)}</span><span style={{ opacity: 0.5 }}>·</span><span>{pad(seg)}</span>
        <span className="cia-brf-hero__ticker__label">domingo 22h</span>
      </div>

      {/* Barra de progresso do evento */}
      <div style={{ marginTop: 14 }}>
        <div style={{ height: 5, borderRadius: 999, background: 'rgba(5,26,14,0.12)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 999,
            background: 'linear-gradient(90deg, #1f5c39, #c8973a)',
            transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        <div style={{ marginTop: 5, fontSize: 11, fontWeight: 700, color: 'rgba(5,26,14,0.55)', letterSpacing: '0.02em' }}>
          {pct}% do evento
        </div>
      </div>

      {/* Dados ao vivo (coordenação) */}
      {stats && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(5,26,14,0.70)' }}>
                <Icon style={{ width: 13, height: 13, strokeWidth: 2, color: '#1f5c39' }} />
                <span style={{ fontFamily: 'var(--font-dm-sans), system-ui', fontWeight: 800, color: '#051a0e' }}>{s.val}</span>
                {s.label}
              </span>
            )
          })}
        </div>
      )}

      <div className="cia-brf-hero__foot">
        <span className="cia-brf-hero__date">04 – 07 jun · Uberaba/MG</span>
        <FootArrow />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero PÓS-evento — encerrado
// ─────────────────────────────────────────────────────────────────────────────

function HeroPost() {
  return (
    <Link href="/cronograma" className="cia-brf-hero" aria-label="Abrir cronograma">
      <div className="cia-brf-hero__eyebrow">
        <span>Encerrado</span>
        <span className="cia-brf-hero__pill">★ CIA 2026</span>
      </div>
      <div className="cia-brf-hero__numwrap">
        <span className="cia-brf-hero__num"><em>Fim</em></span>
        <span className="cia-brf-hero__unit">4 dias de Copa</span>
      </div>
      <div className="cia-brf-hero__foot">
        <span className="cia-brf-hero__date">Obrigado pela cobertura · 04–07 jun</span>
        <FootArrow />
      </div>
    </Link>
  )
}

function FootArrow() {
  return (
    <span className="cia-circle-arrow" style={{
      width: 24, height: 24, borderRadius: '50%', background: '#051a0e',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)', flexShrink: 0,
    }}>
      <ArrowUpRight style={{ width: 11, height: 11, color: '#FAF7F0', strokeWidth: 2.2 }} />
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeBriefing — export principal
// ─────────────────────────────────────────────────────────────────────────────

export function HomeBriefing({ userName, userRole, diffDays, eventActive, liveStats }: BriefingProps) {
  const realNow = useNow()
  const firstName = userName?.split(' ')[0] ?? 'time'

  // ── Modo-preview temporário: ?preview=pre|live|post ──────────────────────────
  // Desloca o "agora" pra dentro da janela alvo, mantendo a hora real (greeting
  // e ticker continuam vivos). Sem o param, não tem efeito nenhum.
  const preview = useSearchParams().get('preview') as 'pre' | 'live' | 'post' | null
  let now = realNow
  if (preview && realNow) {
    const eff = new Date(realNow)
    // mês 5 = junho (0-indexed). Mantém hora:min:seg reais → tudo segue tickando.
    if (preview === 'pre')  eff.setFullYear(2026, 5, 2)   // 02/06 → pré
    if (preview === 'live') eff.setFullYear(2026, 5, 5)   // 05/06 → dia 2 ao vivo
    if (preview === 'post') eff.setFullYear(2026, 5, 8)   // 08/06 → pós
    now = eff
  }

  // Fase: antes de hidratar usa o eventActive do servidor (evita flash).
  let fase: Fase
  if (now) {
    fase = now < EVENT_START ? 'pre' : now < EVENT_END ? 'live' : 'post'
  } else {
    fase = eventActive ? 'live' : 'pre'
  }

  // No preview 'live' os dados reais estão zerados (pré-evento) — injeta exemplo
  // só pra ilustrar o layout completo. Em produção usa os números reais.
  const semDados = !liveStats || (liveStats.jogosAoVivo + liveStats.publicadosHoje + liveStats.emCampo) === 0
  const liveStatsEff: LiveStats | undefined =
    preview === 'live' && semDados
      ? { jogosAoVivo: 3, publicadosHoje: 47, emCampo: 31 }
      : liveStats

  // Saudação descontraída — viva só no AO VIVO; estática nas outras fases.
  const linha =
    fase === 'live' && now ? saudacaoLive(now, firstName)
    : fase === 'post'      ? `Acabou, ${firstName}. 4 dias de Copa — que jornada. Obrigado por cada clique.`
    : 'Vamos preparar a cobertura. Tudo num painel só — conteúdos, equipe e tempo real.'

  return (
    <section style={{ padding: '14px 24px 8px' }}>
      <div className="mx-auto max-w-7xl">
        <div className="cia-brf cia-grain">

          <div className="cia-brf-signature">
            <span className="cia-brf-star">★</span>
            <span>CIA · Copa Inter Atléticas · 2026</span>
          </div>

          <div className="cia-brf-greeting">
            <span className="cia-brf-greeting__ola">{fase === 'live' ? '' : 'Olá,'}</span>
            <span className="cia-brf-greeting__nome">{fase === 'live' ? '' : `${firstName}.`}</span>
            <span className="cia-brf-greeting__rule" aria-hidden="true" />
            <p className="cia-brf-greeting__line" key={linha} style={{ animation: 'ciaFadeLine 0.5s ease' }}>{linha}</p>
            {userRole && <span className="cia-brf-greeting__role">{userRole}</span>}
          </div>

          <div className="cia-brf-grid">
            {fase === 'live' && now ? <HeroLive now={now} liveStats={liveStatsEff} />
              : fase === 'post'    ? <HeroPost />
              : <HeroPre diffDays={diffDays} now={now} />}
          </div>

        </div>

        {preview && (
          <div style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#7a5c20', background: 'rgba(200,151,58,0.14)',
            border: '1px solid rgba(200,151,58,0.35)', borderRadius: 999, padding: '3px 10px',
          }}>
            ⚠ Preview · {preview} · não é o estado real
          </div>
        )}
      </div>

      <style>{`
        .cia-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #DC2626; box-shadow: 0 0 0 0 rgba(220,38,38,0.6); animation: ciaLivePulse 1.6s ease-out infinite; }
        @keyframes ciaLivePulse { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.55); } 70% { box-shadow: 0 0 0 7px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }
        @keyframes ciaFadeLine { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .cia-brf-hero--live { box-shadow: 0 0 0 1px rgba(200,151,58,0.25), 0 18px 50px -20px rgba(5,26,14,0.45); }
      `}</style>
    </section>
  )
}
