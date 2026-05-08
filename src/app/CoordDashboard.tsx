'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CoordConteudoHoje {
  id: string
  status: string
  canal_publicacao: string | null
}

export interface CoordJogo {
  id: string
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  inicio: string | null
  fim_previsto: string | null
  dia_id: string | null
  modalidade_id?: string | null
}

export interface CoordShow {
  id: string
  nome: string
  inicio: string | null
  fim_previsto: string | null
  dia_id: string | null
}

export interface CoordFesta {
  id: string
  nome: string
  inicio: string | null
  fim_previsto: string | null
  dia_id: string | null
}

export interface CoordTurnoCount {
  user_id: string | null
  setor_id: string | null
}

export interface CoordPatrocinador {
  id: string
  nome: string
  ativo: boolean
}

export interface CoordChecklistItem {
  id: string
  status: string
}

export interface CoordDashboardProps {
  conteudosHoje: CoordConteudoHoje[]
  jogosHoje: CoordJogo[]
  showsHoje: CoordShow[]
  festasHoje: CoordFesta[]
  turnosHoje: CoordTurnoCount[]
  patrocinadores: CoordPatrocinador[]
  conteudosPorPatrocinador: { patrocinador_id: string | null; status: string }[]
  checklistItens: CoordChecklistItem[]
  diasEvento?: { id: string; data: string }[]
  diaAtualId?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Canal config
// ─────────────────────────────────────────────────────────────────────────────

const CANAL_CONFIG: Record<string, { label: string; color: string }> = {
  instagram_cia:       { label: 'Instagram CIA',       color: '#E1306C' },
  tiktok_cia:          { label: 'TikTok CIA',          color: '#69C9D0' },
  instagram_exp:       { label: 'Instagram EXP',       color: '#A855F7' },
  instagram_grupo_exp: { label: 'Instagram Grupo EXP', color: '#7C3AED' },
  tiktok_exp:          { label: 'TikTok EXP',          color: '#EE1D52' },
  instagram_nix:       { label: 'Instagram NIX',       color: '#F97316' },
  x_cia:               { label: 'X CIA',               color: '#94A3B8' },
  youtube_exp:         { label: 'YouTube EXP',         color: '#EF4444' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline helpers
// ─────────────────────────────────────────────────────────────────────────────

function dayLabel(data: string): string {
  const labels: Record<string, string> = {
    '2026-06-04': 'Qui 04',
    '2026-06-05': 'Sex 05',
    '2026-06-06': 'Sáb 06',
    '2026-06-07': 'Dom 07',
  }
  const [, , dd] = data.split('-')
  return labels[data] ?? `Dia ${dd}`
}

function fmtEventTime(iso: string | null): string {
  if (!iso) return '—:—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function durEventMin(s: string | null, e: string | null): number | null {
  if (!s || !e) return null
  return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60_000)
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsBar
// ─────────────────────────────────────────────────────────────────────────────

function StatsBar({
  conteudosHoje,
  turnosHoje,
}: {
  conteudosHoje: CoordConteudoHoje[]
  turnosHoje: CoordTurnoCount[]
}) {
  const totalHoje       = conteudosHoje.length
  const publicadosHoje  = conteudosHoje.filter(c => c.status === 'publicado').length
  const pessoasAtivas   = new Set(turnosHoje.map(t => t.user_id).filter(Boolean)).size
  const setoresCobertos = new Set(turnosHoje.map(t => t.setor_id).filter(Boolean)).size

  const stats = [
    { icon: '🟢', label: 'Equipe ativa',      value: `${pessoasAtivas}p` },
    { icon: '📍', label: 'Setores cobertos',   value: `${setoresCobertos}` },
    { icon: '📋', label: 'Conteúdos hoje',     value: `${publicadosHoje}/${totalHoje}` },
  ]

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-5 py-3 text-xs"
      style={{ borderColor: 'rgba(46,107,66,0.18)', background: 'rgba(46,107,66,0.04)' }}
    >
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span>{s.icon}</span>
          <span className="text-[var(--muted-foreground)]">{s.label}:</span>
          <span
            className="tabular-nums font-bold"
            style={{ fontFamily: 'Orbitron, monospace', color: '#2e6b42', fontSize: '0.8rem' }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RedesCard
// ─────────────────────────────────────────────────────────────────────────────

function RedesCard({ conteudosHoje }: { conteudosHoje: CoordConteudoHoje[] }) {
  const total      = conteudosHoje.length
  const publicados = conteudosHoje.filter(c => c.status === 'publicado').length

  const byCanal: Record<string, { total: number; publicados: number }> = {}
  for (const c of conteudosHoje) {
    const key = c.canal_publicacao ?? 'outro'
    if (!byCanal[key]) byCanal[key] = { total: 0, publicados: 0 }
    byCanal[key].total++
    if (c.status === 'publicado') byCanal[key].publicados++
  }

  const canaisComConteudo = Object.entries(byCanal)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)

  const pct = total > 0 ? Math.round((publicados / total) * 100) : 0

  return (
    <div className="cia-metric-card flex flex-col rounded-2xl px-5 py-5">
      <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
        Redes Hoje
      </p>
      <div className="mb-3 flex items-baseline gap-2">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ fontFamily: 'Orbitron, monospace', color: '#2e6b42' }}
        >
          {publicados}
        </span>
        <span className="text-sm text-[var(--muted-foreground)]">/ {total} publicados</span>
        <span
          className="ml-auto text-sm font-bold tabular-nums"
          style={{ fontFamily: 'Orbitron, monospace', color: pct >= 70 ? '#2e6b42' : pct >= 40 ? '#e8b94f' : '#f87171' }}
        >
          {pct}%
        </span>
      </div>

      {canaisComConteudo.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]/50">Nenhum conteúdo programado para hoje</p>
      ) : (
        <ul className="space-y-2">
          {canaisComConteudo.map(([canal, counts]) => {
            const cfg = CANAL_CONFIG[canal] ?? { label: canal, color: '#6b7280' }
            return (
              <li key={canal} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}80` }}
                />
                <span className="flex-1 truncate text-[var(--foreground)]">{cfg.label}</span>
                <span
                  className="tabular-nums font-bold"
                  style={{ fontFamily: 'Orbitron, monospace', color: cfg.color }}
                >
                  {counts.publicados}/{counts.total}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChecklistCard
// ─────────────────────────────────────────────────────────────────────────────

function ChecklistCard({ checklistItens }: { checklistItens: CoordChecklistItem[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t) }, [])

  const total   = checklistItens.length
  const feitos  = checklistItens.filter(i => i.status === 'feito').length
  const pending = total - feitos
  const pct     = total > 0 ? Math.round((feitos / total) * 100) : 0

  return (
    <div
      className="cia-metric-card flex flex-col rounded-2xl px-5 py-5"
      style={{ border: '1px solid rgba(200,151,58,0.18)' }}
    >
      <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
        Checklist
      </p>
      <div className="mb-3 flex items-baseline gap-2">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ fontFamily: 'Orbitron, monospace', color: '#e8b94f' }}
        >
          {feitos}
        </span>
        <span className="text-sm text-[var(--muted-foreground)]">/ {total} itens</span>
        <span
          className="ml-auto text-sm font-bold tabular-nums"
          style={{ fontFamily: 'Orbitron, monospace', color: pct >= 70 ? '#2e6b42' : pct >= 40 ? '#e8b94f' : '#f87171' }}
        >
          {pct}%
        </span>
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(16,29,18,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: mounted ? `${pct}%` : '0%',
            background: pct >= 70
              ? 'linear-gradient(90deg, var(--green-dim), var(--green-bright))'
              : 'linear-gradient(90deg, #d97706, #fbbf24)',
            boxShadow: pct >= 70 ? '0 0 8px rgba(74,138,92,0.35)' : '0 0 8px rgba(251,191,36,0.35)',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>✅ {feitos} concluídos</span>
        {pending > 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            {pending} pendente{pending !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {total === 0 && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]/50">Nenhum item de checklist encontrado</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PatrocinioCard
// ─────────────────────────────────────────────────────────────────────────────

function PatrocinioCard({
  patrocinadores,
  conteudosPorPatrocinador,
}: {
  patrocinadores: CoordPatrocinador[]
  conteudosPorPatrocinador: { patrocinador_id: string | null; status: string }[]
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 400); return () => clearTimeout(t) }, [])

  const ativos = patrocinadores.filter(p => p.ativo)
  const stats  = ativos.map(p => {
    const conteudos = conteudosPorPatrocinador.filter(c => c.patrocinador_id === p.id)
    const total     = conteudos.length
    const published = conteudos.filter(c => c.status === 'publicado').length
    const pct       = total > 0 ? Math.round((published / total) * 100) : 0
    return { ...p, total, published, pct }
  })

  return (
    <div
      className="cia-metric-card flex flex-col rounded-2xl px-5 py-5"
      style={{ border: '1px solid rgba(200,151,58,0.15)' }}
    >
      <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
        Patrocínio
      </p>

      {stats.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]/50">Nenhum patrocinador ativo</p>
      ) : (
        <ul className="space-y-3">
          {stats.map((p, i) => (
            <li key={p.id}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {p.pct < 50 && p.total > 0 && (
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                  )}
                  <span className="truncate text-xs font-semibold text-[var(--foreground)]">{p.nome}</span>
                </div>
                <span
                  className="ml-2 shrink-0 tabular-nums text-xs font-bold"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    color: p.pct >= 70 ? '#2e6b42' : p.pct >= 40 ? '#e8b94f' : '#f87171',
                  }}
                >
                  {p.published}/{p.total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(16,29,18,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: mounted ? `${p.pct}%` : '0%',
                    transitionDelay: `${i * 100}ms`,
                    background: p.pct >= 70
                      ? 'linear-gradient(90deg, #2e6b42, #3d7a52)'
                      : p.pct >= 40
                      ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                      : 'linear-gradient(90deg, #dc2626, #f87171)',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TimelineVertical — agenda cronológica, mobile-friendly
// ─────────────────────────────────────────────────────────────────────────────

type TLHomeEntry = {
  id: string; label: string; inicio: string | null; fim_previsto: string | null
  icon: string; color: string; bg: string; cat: string
}

function TimelineVertical({
  jogosHoje,
  showsHoje,
  festasHoje,
  isToday,
}: {
  jogosHoje:  CoordJogo[]
  showsHoje:  CoordShow[]
  festasHoje: CoordFesta[]
  isToday:    boolean
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [isToday])

  const all: TLHomeEntry[] = [
    ...jogosHoje.map(j => ({
      id: j.id,
      label: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
      inicio: j.inicio, fim_previsto: j.fim_previsto,
      icon: '🏆', color: '#2e6b42', bg: 'rgba(46,107,66,0.08)', cat: 'Esportivo',
    })),
    ...showsHoje.map(s => ({
      id: s.id, label: s.nome, inicio: s.inicio, fim_previsto: s.fim_previsto,
      icon: '🎤', color: '#7c3aed', bg: 'rgba(124,58,237,0.07)', cat: 'Show',
    })),
    ...festasHoje.map(f => ({
      id: f.id, label: f.nome, inicio: f.inicio, fim_previsto: f.fim_previsto,
      icon: '🎉', color: '#be185d', bg: 'rgba(190,24,93,0.06)', cat: 'Festa',
    })),
  ].sort((a, b) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  if (all.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)]/50">Sem eventos programados para este dia</p>
      </div>
    )
  }

  // Where to insert AGORA — after last event that already started
  let nowAfterIdx = -1
  if (isToday) {
    for (let i = 0; i < all.length; i++) {
      if (all[i].inicio && new Date(all[i].inicio!) <= now) nowAfterIdx = i
    }
  }

  const nowStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  return (
    <div>
      {all.map((ev, i) => {
        const isLast   = i === all.length - 1
        const dur      = durEventMin(ev.inicio, ev.fim_previsto)
        const isActive = isToday && !!ev.inicio && !!ev.fim_previsto &&
          new Date(ev.inicio) <= now && new Date(ev.fim_previsto) >= now
        const isPast   = isToday && !!ev.fim_previsto && new Date(ev.fim_previsto) < now
        const showNowAfter = nowAfterIdx === i && !isLast &&
          !!all[i + 1]?.inicio && new Date(all[i + 1].inicio!) > now

        return (
          <div key={ev.id}>

            {/* ── Event row ── */}
            <div className="flex items-start">

              {/* Time */}
              <div className="w-10 shrink-0 pt-[9px] pr-2 text-right">
                <span
                  className="tabular-nums text-[9px] font-bold"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    color: isActive
                      ? ev.color
                      : isPast
                      ? 'rgba(16,29,18,0.22)'
                      : 'rgba(16,29,18,0.45)',
                  }}
                >
                  {fmtEventTime(ev.inicio)}
                </span>
              </div>

              {/* Dot + vertical connector */}
              <div className="flex w-4 shrink-0 flex-col items-center">
                <div
                  className="w-px shrink-0"
                  style={{ height: 8, background: i === 0 ? 'transparent' : 'rgba(16,29,18,0.10)' }}
                />
                <div
                  className="shrink-0 rounded-full transition-all duration-300"
                  style={{
                    width:  isActive ? 10 : 7,
                    height: isActive ? 10 : 7,
                    background: isActive
                      ? ev.color
                      : isPast
                      ? 'rgba(16,29,18,0.12)'
                      : `${ev.color}60`,
                    border: `1.5px solid ${
                      isActive ? ev.color : isPast ? 'rgba(16,29,18,0.08)' : `${ev.color}40`
                    }`,
                    boxShadow: isActive ? `0 0 8px ${ev.color}60` : 'none',
                  }}
                />
                {!isLast && (
                  <div
                    className="w-px flex-1 shrink-0"
                    style={{ minHeight: 12, background: 'rgba(16,29,18,0.10)' }}
                  />
                )}
              </div>

              {/* Card */}
              <div className="flex-1 pl-2 pt-1" style={{ paddingBottom: isLast ? 4 : 8 }}>
                <div
                  className="rounded-r-xl transition-all duration-200"
                  style={{
                    background: isPast ? 'rgba(16,29,18,0.03)' : ev.bg,
                    border: `1px solid ${
                      isActive ? `${ev.color}35` : isPast ? 'rgba(16,29,18,0.05)' : `${ev.color}18`
                    }`,
                    borderLeft: `3px solid ${
                      isActive ? ev.color : isPast ? 'rgba(16,29,18,0.10)' : `${ev.color}50`
                    }`,
                    padding: '7px 10px',
                    opacity: isPast ? 0.50 : 1,
                    boxShadow: isActive ? `0 2px 12px ${ev.color}15` : 'none',
                  }}
                >
                  {/* Title row */}
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[11px]">{ev.icon}</span>
                    <span
                      className="flex-1 truncate text-[12px] font-semibold"
                      style={{
                        color: isActive ? ev.color : isPast ? 'rgba(16,29,18,0.35)' : 'var(--foreground)',
                      }}
                    >
                      {ev.label}
                    </span>
                    {isActive && (
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                        style={{
                          color: ev.color,
                          background: `${ev.color}12`,
                          border: `1px solid ${ev.color}30`,
                        }}
                      >
                        AO VIVO
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2">
                    <span
                      className="tabular-nums text-[9px]"
                      style={{ fontFamily: 'Orbitron, monospace', color: 'var(--muted-foreground)', opacity: 0.55 }}
                    >
                      {fmtEventTime(ev.inicio)}–{fmtEventTime(ev.fim_previsto)}
                    </span>
                    {dur !== null && (
                      <span className="text-[9px] text-[var(--muted-foreground)]/40">
                        {dur < 60
                          ? `${dur}min`
                          : `${Math.floor(dur / 60)}h${dur % 60 > 0 ? `${dur % 60}m` : ''}`
                        }
                      </span>
                    )}
                    <span className="ml-auto text-[9px] font-semibold" style={{ color: `${ev.color}60` }}>
                      {ev.cat}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── AGORA separator ── */}
            {showNowAfter && (
              <div className="flex items-center gap-2 py-1" style={{ paddingLeft: 56 }}>
                <div
                  className="h-px flex-1"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.35))' }}
                />
                <span
                  className="shrink-0 text-[8px] font-bold tracking-[0.12em] text-red-500"
                  style={{ fontFamily: 'Orbitron, monospace' }}
                >
                  ◆ AGORA {nowStr}
                </span>
                <div
                  className="h-px flex-1"
                  style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.35), transparent)' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function CoordDashboard({
  conteudosHoje,
  jogosHoje,
  showsHoje,
  festasHoje,
  turnosHoje,
  patrocinadores,
  conteudosPorPatrocinador,
  checklistItens,
  diasEvento = [],
  diaAtualId = null,
}: CoordDashboardProps) {
  // Day filter — default to current event day
  const [selectedDayId, setSelectedDayId] = useState<string | null>(diaAtualId)

  // Update when server data arrives
  useEffect(() => {
    if (!selectedDayId && diaAtualId) setSelectedDayId(diaAtualId)
  }, [diaAtualId, selectedDayId])

  // Filter events for selected day
  const jogosFiltered  = selectedDayId ? jogosHoje.filter(j  => j.dia_id  === selectedDayId) : jogosHoje
  const showsFiltered  = selectedDayId ? showsHoje.filter(s  => s.dia_id  === selectedDayId) : showsHoje
  const festasFiltered = selectedDayId ? festasHoje.filter(f => f.dia_id  === selectedDayId) : festasHoje
  const isToday        = selectedDayId === diaAtualId

  return (
    <div className="space-y-4">

      {/* Stats bar */}
      <StatsBar conteudosHoje={conteudosHoje} turnosHoje={turnosHoje} />

      {/* Three metric cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <RedesCard conteudosHoje={conteudosHoje} />
        <ChecklistCard checklistItens={checklistItens} />
        <PatrocinioCard
          patrocinadores={patrocinadores}
          conteudosPorPatrocinador={conteudosPorPatrocinador}
        />
      </div>

      {/* ── Timeline Gantt ── */}
      <div className="cia-metric-card rounded-2xl px-6 py-6">

        {/* Header + day filter */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
              Timeline de Eventos
            </p>
            <p className="mt-1 text-base font-bold text-[var(--foreground)]">
              Jogos · Shows · Festas
            </p>
          </div>

          {/* Day filter tabs */}
          {diasEvento.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {diasEvento.map(d => {
                const isSel = selectedDayId === d.id
                const isAct = d.id === diaAtualId
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDayId(d.id)}
                    className="relative rounded-lg px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] transition-all duration-150"
                    style={{
                      background: isSel
                        ? 'linear-gradient(145deg, #2e6b42, #3d7a52)'
                        : 'rgba(46,107,66,0.06)',
                      color: isSel ? '#fff' : 'rgba(46,107,66,0.65)',
                      border: isSel
                        ? '1px solid #2e6b42'
                        : '1px solid rgba(46,107,66,0.15)',
                      boxShadow: isSel ? '0 2px 10px rgba(46,107,66,0.30)' : 'none',
                    }}
                  >
                    {dayLabel(d.data)}
                    {/* "today" dot */}
                    {isAct && (
                      <span
                        className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500"
                        style={{ boxShadow: '0 0 4px rgba(46,107,66,0.7)' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <TimelineVertical
          jogosHoje={jogosFiltered}
          showsHoje={showsFiltered}
          festasHoje={festasFiltered}
          isToday={isToday}
        />
      </div>
    </div>
  )
}
