'use client'

/**
 * CronogramaClient — Timeline editorial dos 4 dias do CIA 2026
 *
 * Features:
 *  - Hero "AGORA" / "Próximo em Xmin" / "Em N dias" com countdown
 *  - Tabs visuais por dia (auto-seleciona o "hoje" durante o evento)
 *  - Filtros por tipo (shows/jogos/festas)
 *  - Timeline vertical do dia agrupada por hora
 *  - Indicador "AGORA" pulsando entre eventos passados e futuros
 *  - Cards de evento clicáveis (jogos → /placar)
 */

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Music, Swords, PartyPopper, Clock, Sparkles, MapPin, Radio,
} from 'lucide-react'
import { PageContainer } from '@/components/page-container'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventoTipo = 'show' | 'jogo' | 'festa'

export interface Evento {
  id:        string
  nome:      string
  tipo:      EventoTipo
  subtipo?:  string | null   // "DJ Set", "Vôlei de Praia Masc"
  icone?:    string | null   // emoji da modalidade
  inicio:    string
  fim:       string | null
  local:     string | null
  detalhe?:  string | null   // "Masculino · Oitavas"
  dia_id:    string
  destaque?: boolean         // embaixador, ao vivo, etc
  badge?:    string | null   // "AO VIVO", "Embaixador"
  href?:     string          // link pra placar/perfil
}

interface Dia {
  id:    string
  label: string
  short: string
  date:  string  // YYYY-MM-DD
}

interface Props {
  dias:     Dia[]
  eventos:  Evento[]
}

// ── Design tokens por tipo ───────────────────────────────────────────────────

const TIPO_CFG: Record<EventoTipo, {
  label:   string
  plural:  string
  Icon:    React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  accent:  string  // cor sólida CSS
  bg:      string  // bg sutil rgba
  border:  string  // border rgba
}> = {
  show: {
    label:  'Show',
    plural: 'Shows',
    Icon:   Music,
    accent: 'var(--gold-vivid, #E8B82F)',
    bg:     'rgba(232,184,47,0.08)',
    border: 'rgba(232,184,47,0.35)',
  },
  jogo: {
    label:  'Jogo',
    plural: 'Jogos',
    Icon:   Swords,
    accent: 'var(--green-bright)',
    bg:     'rgba(46,107,66,0.08)',
    border: 'rgba(46,107,66,0.35)',
  },
  festa: {
    label:  'Festa',
    plural: 'Festas',
    Icon:   PartyPopper,
    accent: 'var(--terracotta-soft, #D8845F)',
    bg:     'rgba(216,132,95,0.08)',
    border: 'rgba(216,132,95,0.35)',
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
  } catch { return '' }
}

function hourBucket(iso: string): string {
  try {
    const h = new Date(iso).toLocaleString('pt-BR', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo',
    }).slice(0, 2)
    return `${h}:00`
  } catch { return '00:00' }
}

/** Today em YYYY-MM-DD (timezone São Paulo) */
function todaySaoPaulo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/** Hook: atualiza "now" a cada N segundos pra recalcular AGORA/próximo */
function useNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function diffHumanShort(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs
  const abs = Math.abs(diff)
  const min = Math.floor(abs / 60_000)
  if (min < 60) return diff > 0 ? `em ${min}min` : `há ${min}min`
  const h = Math.floor(abs / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const baseTxt = m > 0 ? `${h}h ${m}min` : `${h}h`
  if (abs > 86_400_000) {
    const d = Math.floor(abs / 86_400_000)
    return diff > 0 ? `em ${d} ${d === 1 ? 'dia' : 'dias'}` : `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  }
  return diff > 0 ? `em ${baseTxt}` : `há ${baseTxt}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CronogramaClient({ dias, eventos }: Props) {
  const now = useNow(30_000)
  const nowMs = now?.getTime() ?? 0

  // Filtros (chips toggle)
  const [filtros, setFiltros] = useState<Set<EventoTipo>>(new Set(['show', 'jogo', 'festa']))

  // Dia ativo — default: dia atual se durante o evento, senão primeiro dia
  const [diaAtivo, setDiaAtivo] = useState<string>(() => {
    const today = todaySaoPaulo()
    const diaHoje = dias.find(d => d.date === today)
    if (diaHoje) return diaHoje.id
    // se passou: último dia. Se antes: primeiro.
    const past = dias.filter(d => d.date < today).pop()
    if (past && dias[dias.length - 1].date < today) return dias[dias.length - 1].id
    return dias[0]?.id ?? ''
  })

  // Stats globais
  const totalEventos = eventos.length
  const countByTipo = useMemo(() => {
    const m: Record<EventoTipo, number> = { show: 0, jogo: 0, festa: 0 }
    for (const e of eventos) m[e.tipo]++
    return m
  }, [eventos])

  // Próximo evento (futuro, qualquer dia) — base do destaque do hero
  const proximoEvento = useMemo(() => {
    if (!nowMs) return null
    return eventos.find(e => new Date(e.inicio).getTime() > nowMs) ?? null
  }, [eventos, nowMs])

  // Evento(s) acontecendo AGORA (todos os tipos, qualquer dia)
  const eventosAoVivo = useMemo(() => {
    if (!nowMs) return []
    return eventos.filter(e => {
      const start = new Date(e.inicio).getTime()
      const end = e.fim ? new Date(e.fim).getTime() : start + 90 * 60_000
      return start <= nowMs && nowMs <= end
    })
  }, [eventos, nowMs])

  // Eventos do dia ativo, filtrados por tipo
  const eventosDoDia = useMemo(() => {
    return eventos
      .filter(e => e.dia_id === diaAtivo && filtros.has(e.tipo))
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
  }, [eventos, diaAtivo, filtros])

  // Agrupa por hora
  const gruposPorHora = useMemo(() => {
    const m = new Map<string, Evento[]>()
    for (const e of eventosDoDia) {
      const h = hourBucket(e.inicio)
      if (!m.has(h)) m.set(h, [])
      m.get(h)!.push(e)
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [eventosDoDia])

  function toggleFiltro(tipo: EventoTipo) {
    setFiltros(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) next.delete(tipo); else next.add(tipo)
      // se tudo desligou, religa o que foi clicado pra evitar tela vazia
      if (next.size === 0) next.add(tipo)
      return next
    })
  }

  // Calcula "linha do AGORA" pra timeline do dia ativo
  const diaAtivoMeta = dias.find(d => d.id === diaAtivo)
  const isHoje = diaAtivoMeta?.date === todaySaoPaulo()

  return (
    <PageContainer>
      {/* ── Page Header editorial ─────────────────────────────────── */}
      <header className="cia-page-header flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="cia-page-header__eyebrow">Programação</p>
          <h1 className="cia-page-header__title">Cronograma</h1>
          <p className="cia-page-header__subtitle">
            {totalEventos} eventos · 04–07 junho 2026 · Uberaba/MG
          </p>
        </div>
        <CountByTipo countByTipo={countByTipo} />
      </header>

      {/* ── Destaque AGORA / PRÓXIMO ─────────────────────────────── */}
      <HeroDestaque
        agora={eventosAoVivo}
        proximo={proximoEvento}
        nowMs={nowMs}
      />

      {/* ── Tabs de dia (visuais) ────────────────────────────────── */}
      <DiasTabs
        dias={dias}
        eventos={eventos}
        nowMs={nowMs}
        diaAtivo={diaAtivo}
        onChange={setDiaAtivo}
      />

      {/* ── Filtros por tipo ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/55">
          Mostrar
        </span>
        {(['show', 'jogo', 'festa'] as const).map(tipo => {
          const cfg = TIPO_CFG[tipo]
          const active = filtros.has(tipo)
          const count = countByTipo[tipo]
          return (
            <button
              key={tipo}
              onClick={() => toggleFiltro(tipo)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                active ? 'shadow-sm' : 'opacity-40 hover:opacity-60'
              }`}
              style={{
                background: active ? cfg.bg : 'transparent',
                color:      cfg.accent,
                borderColor: cfg.border,
              }}
            >
              <cfg.Icon className="h-3 w-3" />
              {cfg.plural}
              <span
                className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] tabular-nums"
                style={{ background: active ? `${cfg.accent}22` : 'transparent' }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Timeline do dia ──────────────────────────────────────── */}
      {gruposPorHora.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
          <p className="text-sm font-bold text-[var(--foreground)]">
            Nenhum evento neste dia
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/65">
            {filtros.size < 3
              ? 'Ative mais filtros pra ver eventos de outros tipos.'
              : 'Os eventos serão divulgados em breve.'}
          </p>
        </div>
      ) : (
        <Timeline
          gruposPorHora={gruposPorHora}
          nowMs={nowMs}
          isHoje={isHoje}
        />
      )}
    </PageContainer>
  )
}

// ── CountByTipo header ──────────────────────────────────────────────────────

function CountByTipo({ countByTipo }: { countByTipo: Record<EventoTipo, number> }) {
  return (
    <div className="hidden md:flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 px-3 py-2">
      {(['show', 'jogo', 'festa'] as const).map(tipo => {
        const cfg = TIPO_CFG[tipo]
        return (
          <span key={tipo} className="flex items-center gap-1.5 text-[11px]">
            <cfg.Icon className="h-3 w-3" style={{ color: cfg.accent }} />
            <span className="font-extrabold tabular-nums text-[var(--foreground)]">
              {countByTipo[tipo]}
            </span>
            <span className="text-[var(--muted-foreground)]/60 text-[10px] uppercase tracking-wider">
              {cfg.plural}
            </span>
          </span>
        )
      })}
    </div>
  )
}

// ── HeroDestaque ────────────────────────────────────────────────────────────

function HeroDestaque({
  agora, proximo, nowMs,
}: {
  agora:   Evento[]
  proximo: Evento | null
  nowMs:   number
}) {
  if (!nowMs) return null

  // Caso 1: tem evento AO VIVO
  if (agora.length > 0) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border p-4 md:p-5"
        style={{
          borderColor: 'rgba(239,68,68,0.35)',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.06), var(--card))',
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-50 blur-3xl animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.30), transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">
              {agora.length === 1 ? 'Acontecendo agora' : `${agora.length} eventos ao vivo agora`}
            </span>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            {agora.slice(0, 3).map(ev => <EventoCard key={ev.id} ev={ev} variant="hero" />)}
          </div>
        </div>
      </div>
    )
  }

  // Caso 2: tem próximo evento
  if (proximo) {
    const cfg = TIPO_CFG[proximo.tipo]
    const startMs = new Date(proximo.inicio).getTime()
    const diff = diffHumanShort(startMs, nowMs)
    return (
      <div
        className="relative overflow-hidden rounded-2xl border p-4 md:p-5"
        style={{
          borderColor: cfg.border,
          background: `linear-gradient(135deg, ${cfg.bg}, var(--card))`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
          style={{ background: `radial-gradient(circle, ${cfg.accent}40, transparent 70%)` }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-3.5 w-3.5" style={{ color: cfg.accent }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: cfg.accent }}>
              Próximo · {diff}
            </span>
          </div>
          <EventoCard ev={proximo} variant="hero" />
        </div>
      </div>
    )
  }

  // Caso 3: evento encerrado / sem futuros
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 p-5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]/55">
        Cobertura
      </p>
      <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
        Eventos encerrados — até a próxima edição 🏆
      </p>
    </div>
  )
}

// ── Tabs de dia ─────────────────────────────────────────────────────────────

function DiasTabs({
  dias, eventos, nowMs, diaAtivo, onChange,
}: {
  dias:     Dia[]
  eventos:  Evento[]
  nowMs:    number
  diaAtivo: string
  onChange: (id: string) => void
}) {
  const today = todaySaoPaulo()
  const countByDia = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of eventos) m[e.dia_id] = (m[e.dia_id] ?? 0) + 1
    return m
  }, [eventos])

  // Pra cada dia, se nowMs aponta pra ele, há AO VIVO
  const aoVivoByDia = useMemo(() => {
    if (!nowMs) return {} as Record<string, number>
    const m: Record<string, number> = {}
    for (const e of eventos) {
      const start = new Date(e.inicio).getTime()
      const end   = e.fim ? new Date(e.fim).getTime() : start + 90 * 60_000
      if (start <= nowMs && nowMs <= end) {
        m[e.dia_id] = (m[e.dia_id] ?? 0) + 1
      }
    }
    return m
  }, [eventos, nowMs])

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {dias.map(d => {
        const isAtivo = diaAtivo === d.id
        const isHoje  = d.date === today
        const isPast  = d.date < today
        const isFuture = d.date > today
        const count    = countByDia[d.id] ?? 0
        const aoVivo   = aoVivoByDia[d.id] ?? 0

        return (
          <button
            key={d.id}
            onClick={() => onChange(d.id)}
            className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
              isAtivo
                ? 'border-[var(--green-bright)]/55 bg-gradient-to-br from-[var(--green-dim)]/30 via-[var(--card)] to-[var(--card)] shadow-[0_4px_20px_rgba(46,107,66,0.10)]'
                : 'border-[var(--border)] bg-[var(--card)]/40 hover:-translate-y-0.5 hover:border-[var(--green-dim)] hover:shadow-sm'
            }`}
          >
            {isAtivo && (
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl"
                style={{ background: 'radial-gradient(circle, var(--green-bright), transparent 70%)' }}
              />
            )}
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`font-extrabold leading-none tracking-tight ${
                    isAtivo ? 'text-[var(--green-bright)]' : isPast ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'
                  }`}
                  style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 18 }}
                >
                  {d.label}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
                  {d.short} · <span className="tabular-nums">{count}</span> eventos
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1">
                {isHoje && !aoVivo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-dim)]/30 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--green-bright)]">
                    Hoje
                  </span>
                )}
                {aoVivo > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-500">
                    <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                    {aoVivo} ao vivo
                  </span>
                )}
                {isFuture && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/40">
                    em breve
                  </span>
                )}
                {isPast && !aoVivo && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/40">
                    encerrado
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Timeline ────────────────────────────────────────────────────────────────

function Timeline({
  gruposPorHora, nowMs, isHoje,
}: {
  gruposPorHora: Array<[string, Evento[]]>
  nowMs:         number
  isHoje:        boolean
}) {
  // Pra renderizar a linha "AGORA" entre os grupos:
  // calcula a "hora atual" se for hoje. Senão null.
  const nowHourBucket = isHoje && nowMs
    ? new Date(nowMs).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).slice(0, 2) + ':00'
    : null
  const nowTime = isHoje && nowMs
    ? new Date(nowMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : null

  // Acha a posição onde inserir o marker AGORA (entre grupos)
  let agoraInserted = false

  return (
    <div className="space-y-1">
      {gruposPorHora.map(([hora, eventos], idx) => {
        const showAgoraAbove = isHoje && nowHourBucket && hora >= nowHourBucket && !agoraInserted
        if (showAgoraAbove) agoraInserted = true

        return (
          <React.Fragment key={hora}>
            {showAgoraAbove && nowTime && hora !== nowHourBucket && (
              <AgoraMarker time={nowTime} />
            )}
            <div className="space-y-2">
              {/* Hora header */}
              <div className="flex items-center gap-3 pt-3">
                <span
                  className="inline-flex items-center justify-center rounded-md bg-[var(--muted)]/40 px-2 py-1 text-xs font-bold tabular-nums text-[var(--foreground)]"
                  style={{ minWidth: 56 }}
                >
                  {hora}
                </span>
                <span className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/40">
                  {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>

              {/* Eventos da hora */}
              <div className="grid gap-2 sm:grid-cols-2">
                {eventos.map(ev => <EventoCard key={ev.id} ev={ev} />)}
              </div>

              {/* Marker AGORA dentro da hora (se mesma hora bucket) */}
              {showAgoraAbove && nowTime && hora === nowHourBucket && (
                <AgoraMarker time={nowTime} />
              )}
            </div>
          </React.Fragment>
        )
      })}

      {/* AGORA depois de todos os grupos (se já passou de todo evento de hoje) */}
      {isHoje && !agoraInserted && nowTime && (
        <AgoraMarker time={nowTime} />
      )}
    </div>
  )
}

function AgoraMarker({ time }: { time: string }) {
  return (
    <div className="relative my-4 flex items-center gap-3">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white"
        style={{
          background: '#dc2626',
          boxShadow: '0 0 12px rgba(220,38,38,0.45)',
          minWidth: 56,
          justifyContent: 'center',
        }}
      >
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        {time}
      </span>
      <span
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg, #dc2626 0%, rgba(220,38,38,0.20) 50%, transparent 100%)' }}
      />
    </div>
  )
}

// ── EventoCard ──────────────────────────────────────────────────────────────

function EventoCard({ ev, variant = 'default' }: { ev: Evento; variant?: 'default' | 'hero' }) {
  const cfg = TIPO_CFG[ev.tipo]
  const isHero = variant === 'hero'

  const inner = (
    <div
      className={`relative overflow-hidden rounded-xl border transition-all ${
        isHero ? 'p-4' : 'p-3'
      } hover:-translate-y-0.5 hover:shadow-md`}
      style={{
        background: ev.destaque ? cfg.bg : 'var(--card)',
        borderColor: ev.destaque ? cfg.border : 'var(--border)',
      }}
    >
      {/* Color stripe lateral */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
        style={{ background: cfg.accent }}
      />

      <div className="relative flex items-start gap-3 pl-2">
        {/* Icon block */}
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg ${
            isHero ? 'h-10 w-10 text-lg' : 'h-9 w-9 text-base'
          }`}
          style={{
            background: cfg.bg,
            color: cfg.accent,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {ev.icone ? (
            <span aria-hidden>{ev.icone}</span>
          ) : (
            <cfg.Icon className={isHero ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Top row: meta + badge */}
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 rounded text-[9px] font-extrabold uppercase tracking-[0.12em]"
              style={{ color: cfg.accent }}
            >
              <Clock className="h-2.5 w-2.5" />
              <span className="tabular-nums">{fmtTime(ev.inicio)}</span>
              {ev.fim && (
                <span className="text-[var(--muted-foreground)]/55 font-bold normal-case ml-0.5">
                  →{' '}{fmtTime(ev.fim)}
                </span>
              )}
            </span>
            {ev.badge && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider"
                style={{
                  background: ev.badge === 'AO VIVO' ? 'rgba(239,68,68,0.15)' : 'rgba(232,184,47,0.15)',
                  color: ev.badge === 'AO VIVO' ? '#dc2626' : 'var(--gold-vivid, #b07a0a)',
                  border: `1px solid ${ev.badge === 'AO VIVO' ? 'rgba(239,68,68,0.40)' : 'rgba(232,184,47,0.40)'}`,
                }}
              >
                {ev.badge === 'AO VIVO' && (
                  <span className="relative inline-flex h-1 w-1">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-1 w-1 rounded-full bg-red-500" />
                  </span>
                )}
                {ev.badge}
              </span>
            )}
          </div>

          {/* Title */}
          <p
            className="font-extrabold leading-tight text-[var(--foreground)]"
            style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: isHero ? 17 : 14,
              letterSpacing: '-0.01em',
            }}
          >
            {ev.nome}
          </p>

          {/* Subtitle + detalhe */}
          {(ev.subtipo || ev.detalhe) && (
            <p className="mt-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]/75">
              {[ev.subtipo, ev.detalhe].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Local */}
          {ev.local && (
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]/65">
              <MapPin className="h-2.5 w-2.5" />
              {ev.local}
            </p>
          )}
        </div>

        {/* Indicator de click se houver href */}
        {ev.href && (
          <Radio
            className={`shrink-0 self-center opacity-30 transition-opacity group-hover:opacity-70 ${
              isHero ? 'h-4 w-4' : 'h-3 w-3'
            }`}
            style={{ color: cfg.accent }}
          />
        )}
      </div>
    </div>
  )

  if (ev.href) {
    return (
      <Link href={ev.href} className="group block" style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    )
  }
  return inner
}
