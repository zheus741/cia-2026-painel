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

const TIMELINE_START_H = 8
const TIMELINE_END_H   = 26  // 02:00+1

function timeToFraction(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const h = d.getHours() + d.getMinutes() / 60
  const adjusted = h < 6 ? h + 24 : h
  const total = TIMELINE_END_H - TIMELINE_START_H
  return Math.max(0, Math.min(1, (adjusted - TIMELINE_START_H) / total))
}

function hourLabel(h: number): string {
  const actual = h >= 24 ? h - 24 : h
  return `${String(actual).padStart(2, '0')}h`
}

function fracToTime(frac: number): string {
  const totalH = TIMELINE_START_H + frac * (TIMELINE_END_H - TIMELINE_START_H)
  const h = Math.floor(totalH) % 24
  const m = Math.round((totalH % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Overlap packing — place events into non-overlapping rows
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string
  label: string
  startFrac: number
  endFrac: number
  color: string
  bgColor: string
}

interface PackedEvent {
  event: TimelineEvent
  row: number
}

function packLane(events: TimelineEvent[]): { packed: PackedEvent[]; rowCount: number } {
  const sorted = [...events].sort((a, b) => a.startFrac - b.startFrac)
  const rowEnds: number[] = []
  const packed: PackedEvent[] = []

  for (const event of sorted) {
    let placed = false
    for (let r = 0; r < rowEnds.length; r++) {
      if (event.startFrac >= rowEnds[r] + 0.004) {
        rowEnds[r] = event.endFrac
        packed.push({ event, row: r })
        placed = true
        break
      }
    }
    if (!placed) {
      rowEnds.push(event.endFrac)
      packed.push({ event, row: rowEnds.length - 1 })
    }
  }

  return { packed, rowCount: Math.max(rowEnds.length, 1) }
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
// TimelineGantt — packed lanes, all events visible
// ─────────────────────────────────────────────────────────────────────────────

const ROW_H   = 40   // px per event row
const ROW_GAP = 5    // gap between rows in same lane
const LANE_PAD = 8   // top/bottom padding inside track

function TimelineGantt({
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
  const [nowFrac, setNowFrac] = useState<number | null>(null)

  useEffect(() => {
    if (!isToday) { setNowFrac(null); return }
    function update() {
      const now = new Date()
      const h   = now.getHours() + now.getMinutes() / 60
      const adj = h < 6 ? h + 24 : h
      const frac = (adj - TIMELINE_START_H) / (TIMELINE_END_H - TIMELINE_START_H)
      setNowFrac(frac >= 0 && frac <= 1 ? frac : null)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [isToday])

  function buildEvents<T extends { id: string; inicio: string | null; fim_previsto: string | null }>(
    items: T[],
    getLabel: (item: T) => string,
    color: string,
    bgColor: string,
  ): TimelineEvent[] {
    return items.flatMap(item => {
      const s = timeToFraction(item.inicio)
      const e = timeToFraction(item.fim_previsto)
      if (s === null) return []
      // default duration 1h if no end
      const end = e ?? Math.min(s + 1 / (TIMELINE_END_H - TIMELINE_START_H), 1)
      return [{ id: item.id, label: getLabel(item), startFrac: s, endFrac: end, color, bgColor }]
    })
  }

  const jogosEvents  = buildEvents(jogosHoje,  j => `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`, '#2e6b42', 'rgba(46,107,66,0.10)')
  const showsEvents  = buildEvents(showsHoje,  s => s.nome,  '#7c3aed', 'rgba(124,58,237,0.10)')
  const festasEvents = buildEvents(festasHoje, f => f.nome,  '#be185d', 'rgba(190,24,93,0.08)')

  const lanes = [
    { icon: '🏆', label: 'Esportivo',   events: jogosEvents,  color: '#2e6b42' },
    { icon: '🎤', label: 'Shows & DJs', events: showsEvents,  color: '#7c3aed' },
    { icon: '🎉', label: 'Festas',      events: festasEvents, color: '#be185d' },
  ]

  const allEmpty = lanes.every(l => l.events.length === 0)

  // Hour marks for axis (every 2h) and grid (every 1h)
  const axisMarks: number[] = []
  for (let h = TIMELINE_START_H; h <= TIMELINE_END_H; h += 2) axisMarks.push(h)

  const gridMarks: number[] = []
  for (let h = TIMELINE_START_H + 1; h < TIMELINE_END_H; h++) gridMarks.push(h)

  if (allEmpty) {
    return (
      <div className="flex h-24 items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)]/50">Sem eventos programados para este dia</p>
      </div>
    )
  }

  const LABEL_W = 120 // px — label column width

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 700 }}>

        {/* ── Hour axis ── */}
        <div className="mb-2 flex" style={{ paddingLeft: LABEL_W }}>
          {axisMarks.map(h => (
            <div
              key={h}
              className="flex-1 text-center text-[9px] font-bold tracking-[0.18em] text-[var(--muted-foreground)]"
            >
              {hourLabel(h)}
            </div>
          ))}
        </div>

        {/* ── Lanes ── */}
        <div className="space-y-4">
          {lanes.map(lane => {
            const { packed, rowCount } = packLane(lane.events)
            const trackH = rowCount * (ROW_H + ROW_GAP) - ROW_GAP + LANE_PAD * 2

            return (
              <div key={lane.label} className="flex items-start gap-0">

                {/* Lane label column */}
                <div
                  className="flex shrink-0 flex-col items-end justify-center pr-4"
                  style={{ width: LABEL_W, minHeight: trackH }}
                >
                  <span className="text-base leading-none">{lane.icon}</span>
                  <span
                    className="mt-1 text-[11px] font-bold leading-tight"
                    style={{ color: lane.color }}
                  >
                    {lane.label}
                  </span>
                  <span className="mt-0.5 text-[9px] text-[var(--muted-foreground)]">
                    {lane.events.length} evento{lane.events.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Lane track */}
                <div
                  className="relative flex-1 overflow-visible rounded-xl"
                  style={{
                    height: trackH,
                    background: `linear-gradient(180deg, ${lane.color}06 0%, ${lane.color}03 100%)`,
                    border: `1px solid ${lane.color}18`,
                  }}
                >
                  {/* Vertical grid lines */}
                  {gridMarks.map(h => {
                    const frac = (h - TIMELINE_START_H) / (TIMELINE_END_H - TIMELINE_START_H)
                    const isMajor = h % 4 === 0
                    return (
                      <div
                        key={h}
                        className="absolute top-0 h-full pointer-events-none"
                        style={{
                          left: `${frac * 100}%`,
                          width: isMajor ? 1.5 : 1,
                          background: isMajor
                            ? `${lane.color}20`
                            : `${lane.color}0c`,
                        }}
                      />
                    )
                  })}

                  {/* Events — packed */}
                  {packed.map(({ event, row }) => {
                    const left  = `${event.startFrac * 100}%`
                    const width = `${Math.max((event.endFrac - event.startFrac), 0.025) * 100}%`
                    const top   = LANE_PAD + row * (ROW_H + ROW_GAP)

                    return (
                      <div
                        key={event.id}
                        title={event.label}
                        className="absolute overflow-hidden rounded-lg transition-all duration-150 hover:z-20 hover:brightness-105 hover:shadow-md"
                        style={{
                          left,
                          width,
                          top,
                          height: ROW_H,
                          background: event.bgColor,
                          border: `1.5px solid ${event.color}50`,
                        }}
                      >
                        {/* Left accent strip */}
                        <div
                          className="absolute left-0 top-0 h-full w-[3px] rounded-l"
                          style={{ background: `linear-gradient(180deg, ${event.color}, ${event.color}99)` }}
                        />
                        {/* Content */}
                        <div className="flex h-full flex-col justify-center pl-3 pr-1">
                          <span
                            className="block truncate text-[11px] font-semibold leading-snug"
                            style={{ color: event.color }}
                          >
                            {event.label}
                          </span>
                          <span
                            className="block text-[9px] tabular-nums leading-none mt-0.5"
                            style={{ color: `${event.color}99` }}
                          >
                            {fracToTime(event.startFrac)} – {fracToTime(event.endFrac)}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Now line */}
                  {nowFrac !== null && (
                    <div
                      className="pointer-events-none absolute top-0 z-30 h-full"
                      style={{ left: `${nowFrac * 100}%`, width: 2, background: '#ef4444' }}
                    >
                      <div
                        className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] font-bold text-white"
                        style={{ background: '#ef4444', fontFamily: 'Orbitron, monospace' }}
                      >
                        AGORA
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div
          className="mt-5 flex flex-wrap items-center gap-5 text-[10px] text-[var(--muted-foreground)]"
          style={{ paddingLeft: LABEL_W }}
        >
          {lanes.map(lane => (
            <div key={lane.label} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-3 rounded-sm"
                style={{ background: lane.color, opacity: 0.75 }}
              />
              <span>{lane.icon} {lane.label}</span>
            </div>
          ))}
          {nowFrac !== null && (
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-0.5 rounded-full bg-red-500" />
              <span>Agora</span>
            </div>
          )}
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

        <TimelineGantt
          jogosHoje={jogosFiltered}
          showsHoje={showsFiltered}
          festasHoje={festasFiltered}
          isToday={isToday}
        />
      </div>
    </div>
  )
}
