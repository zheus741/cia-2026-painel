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
}

export interface CoordShow {
  id: string
  nome: string
  inicio: string | null
  fim_previsto: string | null
}

export interface CoordFesta {
  id: string
  nome: string
  inicio: string | null
  fim_previsto: string | null
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Canal config — maps DB canal_publicacao enum values to display info
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

/** Total timeline window: 08:00 to 26:00 (02:00+1) = 18 hours */
const TIMELINE_START_H = 8
const TIMELINE_END_H   = 26   // 02:00 next day represented as 26

function timeToFraction(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const h = d.getHours() + d.getMinutes() / 60
  // Treat hours < 6 as "next day" (i.e., add 24)
  const adjusted = h < 6 ? h + 24 : h
  const total = TIMELINE_END_H - TIMELINE_START_H
  return Math.max(0, Math.min(1, (adjusted - TIMELINE_START_H) / total))
}

function hourLabel(h: number): string {
  const actual = h >= 24 ? h - 24 : h
  return `${String(actual).padStart(2, '0')}:00`
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
  const totalHoje      = conteudosHoje.length
  const publicadosHoje = conteudosHoje.filter(c => c.status === 'publicado').length
  const pessoasAtivas  = new Set(turnosHoje.map(t => t.user_id).filter(Boolean)).size
  const setoresCobertos = new Set(turnosHoje.map(t => t.setor_id).filter(Boolean)).size

  const stats = [
    { icon: '🟢', label: 'Equipe ativa', value: `${pessoasAtivas} pessoa${pessoasAtivas !== 1 ? 's' : ''} com turno hoje` },
    { icon: '📍', label: 'Setores cobertos', value: `${setoresCobertos} setor${setoresCobertos !== 1 ? 'es' : ''} único${setoresCobertos !== 1 ? 's' : ''} em turnos hoje` },
    { icon: '📋', label: 'Conteúdos hoje', value: `${publicadosHoje} publicado${publicadosHoje !== 1 ? 's' : ''} / ${totalHoje} total` },
  ]

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-5 py-3 text-xs"
      style={{ borderColor: 'rgba(46,107,66,0.18)', background: 'rgba(46,107,66,0.04)' }}
    >
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span>{s.icon}</span>
          <span className="font-semibold text-[var(--foreground)]">{s.label}:</span>
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

  // Group by canal_publicacao
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
    <div
      className="cia-metric-card flex flex-col rounded-2xl px-5 py-5"
      style={{ border: '1px solid rgba(74,138,92,0.2)' }}
    >
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

      {/* Progress bar */}
      <div
        className="mb-3 h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(16,29,18,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: mounted ? `${pct}%` : '0%',
            background: pct >= 70
              ? 'linear-gradient(90deg, var(--green-dim), var(--green-bright))'
              : 'linear-gradient(90deg, #d97706, #fbbf24)',
            boxShadow: pct >= 70
              ? '0 0 8px rgba(74,138,92,0.35)'
              : '0 0 8px rgba(251,191,36,0.35)',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>✅ {feitos} concluídos</span>
        {pending > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
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

  const stats = ativos.map(p => {
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
                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate text-xs font-semibold text-[var(--foreground)]">
                    {p.nome}
                  </span>
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
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(16,29,18,0.06)' }}
              >
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
// TimelineGantt
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string
  label: string
  startFrac: number
  endFrac: number
  color: string
}

function TimelineGantt({
  jogosHoje,
  showsHoje,
  festasHoje,
}: {
  jogosHoje: CoordJogo[]
  showsHoje: CoordShow[]
  festasHoje: CoordFesta[]
}) {
  const [nowFrac, setNowFrac] = useState<number | null>(null)

  useEffect(() => {
    function update() {
      const now = new Date()
      const h   = now.getHours() + now.getMinutes() / 60
      const adj = h < 6 ? h + 24 : h
      const total = TIMELINE_END_H - TIMELINE_START_H
      const frac = (adj - TIMELINE_START_H) / total
      setNowFrac(frac >= 0 && frac <= 1 ? frac : null)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  function buildEvents<T extends { id: string; inicio: string | null; fim_previsto: string | null }>(
    items: T[],
    getLabel: (item: T) => string,
    color: string,
  ): TimelineEvent[] {
    return items.flatMap(item => {
      const s = timeToFraction(item.inicio)
      const e = timeToFraction(item.fim_previsto)
      if (s === null) return []
      return [{
        id:       item.id,
        label:    getLabel(item),
        startFrac: s,
        endFrac:   e ?? Math.min(s + 0.05, 1),
        color,
      }]
    })
  }

  const jogosEvents  = buildEvents(jogosHoje, j => `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`, '#4a8a5c')
  const showsEvents  = buildEvents(showsHoje, s => s.nome, '#a855f7')
  const festasEvents = buildEvents(festasHoje, f => f.nome, '#ec4899')

  const allEmpty = jogosEvents.length === 0 && showsEvents.length === 0 && festasEvents.length === 0

  const lanes: { icon: string; label: string; events: TimelineEvent[] }[] = [
    { icon: '🏆', label: 'Esportivo',  events: jogosEvents },
    { icon: '🎤', label: 'Shows/DJs',  events: showsEvents },
    { icon: '🎉', label: 'Festas',     events: festasEvents },
  ]

  const hourMarks: number[] = []
  for (let h = TIMELINE_START_H; h <= TIMELINE_END_H; h += 2) {
    hourMarks.push(h)
  }

  if (allEmpty) {
    return (
      <div className="flex h-24 items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)]/50">Sem eventos programados para hoje</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 480 }}>
        {/* Hour axis */}
        <div className="relative mb-2 flex" style={{ paddingLeft: '6rem' }}>
          {hourMarks.map(h => (
            <div
              key={h}
              className="flex-1 text-center text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]"
            >
              {hourLabel(h)}
            </div>
          ))}
        </div>

        {/* Lanes */}
        <div className="space-y-2">
          {lanes.map(lane => (
            <div key={lane.label} className="flex items-center gap-3">
              {/* Lane label */}
              <div className="w-24 shrink-0 text-right text-[10px] font-semibold text-[var(--muted-foreground)]">
                {lane.icon} {lane.label}
              </div>

              {/* Lane track */}
              <div
                className="relative flex-1 rounded-md"
                style={{ height: 32, background: 'rgba(16,29,18,0.04)', border: '1px solid rgba(16,29,18,0.06)' }}
              >
                {/* Grid lines */}
                {hourMarks.slice(1).map((h, i) => {
                  const frac = (h - TIMELINE_START_H) / (TIMELINE_END_H - TIMELINE_START_H)
                  return (
                    <div
                      key={h}
                      className="absolute top-0 h-full"
                      style={{
                        left: `${frac * 100}%`,
                        width: 1,
                        background: 'rgba(16,29,18,0.06)',
                      }}
                    />
                  )
                })}

                {/* Events */}
                {lane.events.map(ev => (
                  <div
                    key={ev.id}
                    title={ev.label}
                    className="absolute top-1 overflow-hidden rounded px-1.5"
                    style={{
                      left:   `${ev.startFrac * 100}%`,
                      width:  `${Math.max(ev.endFrac - ev.startFrac, 0.03) * 100}%`,
                      height: 22,
                      background: `${ev.color}cc`,
                      border: `1px solid ${ev.color}`,
                      boxShadow: `0 0 8px ${ev.color}55`,
                    }}
                  >
                    <span
                      className="block truncate text-[9px] font-semibold leading-[22px] text-white"
                    >
                      {ev.label}
                    </span>
                  </div>
                ))}

                {/* Current time line */}
                {nowFrac !== null && nowFrac >= 0 && nowFrac <= 1 && (
                  <div
                    className="absolute top-0 h-full"
                    style={{ left: `${nowFrac * 100}%`, width: 2, background: '#ef4444', zIndex: 10 }}
                  >
                    {lane.label === lanes[0].label && (
                      <span
                        className="absolute -top-4 left-0.5 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold text-red-400"
                        style={{ fontFamily: 'Orbitron, monospace' }}
                      >
                        AGORA
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
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
}: CoordDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
          Dashboard de Coordenação
        </p>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }} />
      </div>

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

      {/* Timeline Gantt */}
      <div
        className="cia-metric-card rounded-2xl px-5 py-5"
        style={{ border: '1px solid rgba(74,138,92,0.14)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
              Timeline do Dia
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
              Jogos · Shows · Festas
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
            <span className="h-2 w-2 rounded-full bg-[#4a8a5c]" /> Esportivo
            <span className="ml-1 h-2 w-2 rounded-full bg-[#a855f7]" /> Shows
            <span className="ml-1 h-2 w-2 rounded-full bg-[#ec4899]" /> Festas
          </div>
        </div>
        <TimelineGantt
          jogosHoje={jogosHoje}
          showsHoje={showsHoje}
          festasHoje={festasHoje}
        />
      </div>
    </div>
  )
}
