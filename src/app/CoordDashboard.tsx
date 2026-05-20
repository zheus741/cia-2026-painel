'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Users, MapPin, FileText, Camera, Video } from 'lucide-react'

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
  setor_id?: string | null
}

export interface CoordShow {
  id: string
  nome: string
  inicio: string | null
  fim_previsto: string | null
  dia_id: string | null
  setor_id?: string | null
}

export interface CoordFesta {
  id: string
  nome: string
  inicio: string | null
  fim_previsto: string | null
  dia_id: string | null
  setor_id?: string | null
}

export interface CoordTurnoCount {
  user_id: string | null
  setor_id: string | null
}

export interface CoordPatrocinador {
  id: string
  nome: string
  ativo: boolean
  logo_url: string | null
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

export function dayLabel(data: string): string {
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
// StatsBar — 3 quick stats em pílulas editoriais
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
    { Icon: Users,    label: 'Equipe ativa',    value: `${pessoasAtivas}`,                    suffix: 'pessoas',  color: '#3D49E0' },
    { Icon: MapPin,   label: 'Setores',         value: `${setoresCobertos}`,                  suffix: 'cobertos', color: '#C46B4A' },
    { Icon: FileText, label: 'Conteúdos hoje',  value: `${publicadosHoje}/${totalHoje}`,      suffix: 'publicados', color: '#2e6b42' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 14,
    }}>
      {stats.map((s, i) => {
        const Icon = s.Icon
        return (
          <div key={i} className="cia-edit-card cia-edit-card--cream" style={{
            minHeight: 0,
            padding: '14px 18px',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            display: 'flex',
          }}>
            <div style={{
              width: 38, height: 38,
              borderRadius: 12,
              background: `${s.color}14`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon style={{ width: 18, height: 18, color: s.color, strokeWidth: 1.8 }} />
            </div>
            <div className="min-w-0 flex-1">
              <div style={{
                fontSize: 10.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.50)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {s.label}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 22, fontWeight: 800,
                  color: '#0A0F0B',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}>
                  {s.value}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: 'rgba(10,15,11,0.45)',
                  letterSpacing: '-0.01em',
                }}>
                  {s.suffix}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RedesCard — cream, social media breakdown
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
    <div className="cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 280 }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          redes hoje
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: pct >= 70 ? '#2e6b42' : pct >= 40 ? '#B58812' : 'rgba(10,15,11,0.40)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '3px 10px',
          borderRadius: 999,
          background: pct >= 70 ? 'rgba(46,107,66,0.12)'
                    : pct >= 40 ? 'rgba(232,184,47,0.18)'
                                : 'rgba(10,15,11,0.06)',
        }}>
          {pct}%
        </span>
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 38, fontWeight: 800,
          color: '#0A0F0B',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}>
          {publicados}
        </span>
        <span style={{
          fontSize: 14, fontWeight: 500,
          color: 'rgba(10,15,11,0.45)',
        }}>
          de {total} publicados
        </span>
      </div>

      <div className="flex-1 mt-4 overflow-y-auto" style={{ maxHeight: 200 }}>
        {canaisComConteudo.length === 0 ? (
          <p style={{
            fontSize: 13, color: 'rgba(10,15,11,0.40)',
            textAlign: 'center', padding: '24px 0',
          }}>
            Nenhum conteúdo programado para hoje.
          </p>
        ) : (
          <ul className="space-y-2">
            {canaisComConteudo.map(([canal, counts]) => {
              const cfg = CANAL_CONFIG[canal] ?? { label: canal, color: '#6b7280' }
              const canalPct = counts.total > 0 ? Math.round((counts.publicados / counts.total) * 100) : 0
              return (
                <li key={canal} className="flex items-center gap-2.5">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cfg.color,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    flex: 1,
                    fontSize: 12.5, fontWeight: 600,
                    color: 'rgba(10,15,11,0.75)',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {cfg.label}
                  </span>
                  <div style={{
                    width: 60,
                    height: 4,
                    borderRadius: 999,
                    background: 'rgba(10,15,11,0.06)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${canalPct}%`,
                      background: cfg.color,
                      borderRadius: 999,
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                    fontSize: 13, fontWeight: 800,
                    color: '#0A0F0B',
                    letterSpacing: '-0.02em',
                    minWidth: 38,
                    textAlign: 'right',
                  }}>
                    {counts.publicados}<span style={{ color: 'rgba(10,15,11,0.30)', fontSize: 11 }}>/{counts.total}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChecklistCard — green, gauge of done %
// ─────────────────────────────────────────────────────────────────────────────

function ChecklistCard({ checklistItens }: { checklistItens: CoordChecklistItem[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300)
    return () => clearTimeout(t)
  }, [])

  const total   = checklistItens.length
  const feitos  = checklistItens.filter(i => i.status === 'feito').length
  const pending = total - feitos
  const pct     = total > 0 ? Math.round((feitos / total) * 100) : 0

  return (
    <div className="cia-edit-card cia-edit-card--green cia-metrics-cell" style={{ minHeight: 280 }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '-0.01em',
        }}>
          checklist
        </span>
        {pending > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.20)',
          }}>
            <AlertTriangle style={{ width: 11, height: 11 }} />
            {pending} pendente{pending !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 60, fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '-0.05em',
          lineHeight: 0.85,
        }}>
          {pct}
        </span>
        <span style={{
          fontSize: 24, fontWeight: 700,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '-0.03em',
        }}>%</span>
      </div>
      <p style={{
        fontSize: 14, fontWeight: 500,
        color: 'rgba(255,255,255,0.75)',
        letterSpacing: '-0.01em',
        marginTop: 4,
      }}>
        {feitos} de {total} itens
      </p>

      {/* Big bar */}
      <div className="flex-1 flex flex-col justify-end mt-4">
        <div style={{
          height: 12,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: mounted ? `${pct}%` : '0%',
            background: '#FFFFFF',
            borderRadius: 999,
            transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>

        {total === 0 && (
          <p style={{
            marginTop: 12,
            fontSize: 12, color: 'rgba(255,255,255,0.55)',
          }}>
            Nenhum item de checklist hoje.
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PatrocinioCard — gold, sponsors progress
// ─────────────────────────────────────────────────────────────────────────────

function PatrocinioCard({
  patrocinadores,
  conteudosPorPatrocinador,
}: {
  patrocinadores: CoordPatrocinador[]
  conteudosPorPatrocinador: { patrocinador_id: string | null; status: string }[]
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 400)
    return () => clearTimeout(t)
  }, [])

  const ativos = patrocinadores.filter(p => p.ativo)
  const stats = ativos.map(p => {
    const conteudos = conteudosPorPatrocinador.filter(c => c.patrocinador_id === p.id)
    const total     = conteudos.length
    const published = conteudos.filter(c => c.status === 'publicado').length
    const pct       = total > 0 ? Math.round((published / total) * 100) : 0
    return { ...p, total, published, pct }
  })

  const totalGeral = stats.reduce((s, p) => s + p.total, 0)
  const pubGeral   = stats.reduce((s, p) => s + p.published, 0)
  const pctGeral   = totalGeral > 0 ? Math.round((pubGeral / totalGeral) * 100) : 0

  return (
    <div className="cia-edit-card cia-edit-card--gold cia-metrics-cell" style={{ minHeight: 280 }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(70,50,5,0.65)',
          letterSpacing: '-0.01em',
        }}>
          patrocínio
        </span>
        {ativos.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: '#46320C',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.40)',
            border: '1px solid rgba(70,50,5,0.18)',
          }}>
            {ativos.length} marcas
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 38, fontWeight: 800,
          color: '#0A0F0B',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}>
          {pctGeral}<span style={{ fontSize: 22, color: 'rgba(10,15,11,0.45)' }}>%</span>
        </span>
        <span style={{
          fontSize: 14, fontWeight: 500,
          color: 'rgba(70,50,5,0.65)',
        }}>
          entregue
        </span>
      </div>

      <div className="flex-1 mt-4 overflow-y-auto" style={{ maxHeight: 180 }}>
        {stats.length === 0 ? (
          <p style={{
            fontSize: 13, color: 'rgba(70,50,5,0.45)',
            textAlign: 'center', padding: '24px 0',
          }}>
            Nenhum patrocinador ativo.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {stats.map((p, i) => (
              <li key={p.id}>
                <a href={`/admin/patrocinadores/${p.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {p.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.logo_url}
                          alt={p.nome}
                          style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'contain', background: 'white', padding: 1, flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : p.pct < 50 && p.total > 0 ? (
                        <AlertTriangle style={{ width: 11, height: 11, color: '#A04A2E', flexShrink: 0 }} />
                      ) : null}
                      <span style={{
                        fontSize: 12.5, fontWeight: 600,
                        color: 'rgba(10,15,11,0.75)',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {p.nome}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                      fontSize: 13, fontWeight: 800,
                      color: '#0A0F0B',
                      letterSpacing: '-0.02em',
                      flexShrink: 0,
                      marginLeft: 8,
                    }}>
                      {p.published}<span style={{ color: 'rgba(10,15,11,0.30)', fontSize: 11 }}>/{p.total}</span>
                    </span>
                  </div>
                  <div style={{
                    height: 4,
                    borderRadius: 999,
                    background: 'rgba(70,50,5,0.08)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: mounted ? `${p.pct}%` : '0%',
                      background: p.pct >= 70
                        ? 'linear-gradient(90deg, #2e6b42, #4aa066)'
                        : p.pct >= 40
                        ? 'linear-gradient(90deg, #B58812, #E8B82F)'
                        : 'linear-gradient(90deg, #A04A2E, #C46B4A)',
                      transition: `width 1s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
                      borderRadius: 999,
                    }} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TimelineVertical — agenda cronológica (refined for editorial cards)
// ─────────────────────────────────────────────────────────────────────────────

type TLHomeEntry = {
  id: string; label: string; inicio: string | null; fim_previsto: string | null
  icon: string; color: string; bg: string; cat: string; setorId?: string | null
}

export function TimelineVertical({
  jogosHoje,
  showsHoje,
  festasHoje,
  isToday,
  coberturaPorSetor = {},
}: {
  jogosHoje:  CoordJogo[]
  showsHoje:  CoordShow[]
  festasHoje: CoordFesta[]
  isToday:    boolean
  coberturaPorSetor?: Record<string, { foto: boolean; video: boolean }>
}) {
  const [now, setNow] = useState(new Date(0))

  useEffect(() => {
    setNow(new Date())
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
      setorId: j.setor_id ?? null,
    })),
    ...showsHoje.map(s => ({
      id: s.id, label: s.nome, inicio: s.inicio, fim_previsto: s.fim_previsto,
      icon: '🎤', color: '#3D49E0', bg: 'rgba(61,73,224,0.08)', cat: 'Show',
      setorId: s.setor_id ?? null,
    })),
    ...festasHoje.map(f => ({
      id: f.id, label: f.nome, inicio: f.inicio, fim_previsto: f.fim_previsto,
      icon: '🎉', color: '#C46B4A', bg: 'rgba(196,107,74,0.08)', cat: 'Festa',
      setorId: f.setor_id ?? null,
    })),
  ].sort((a, b) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  })

  if (all.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center">
        <p style={{ fontSize: 13, color: 'rgba(10,15,11,0.40)' }}>
          Sem eventos programados para este dia
        </p>
      </div>
    )
  }

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
            {/* Event row */}
            <div className="flex items-start">
              {/* Time */}
              <div style={{
                width: 48, paddingTop: 11, paddingRight: 10, textAlign: 'right', flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 12, fontWeight: 700,
                  color: isActive ? ev.color : isPast ? 'rgba(10,15,11,0.22)' : 'rgba(10,15,11,0.55)',
                  letterSpacing: '-0.02em',
                }}>
                  {fmtEventTime(ev.inicio)}
                </span>
              </div>

              {/* Dot + connector */}
              <div className="flex w-4 flex-col items-center" style={{ flexShrink: 0 }}>
                <div style={{
                  width: 1, height: 8,
                  background: i === 0 ? 'transparent' : 'rgba(10,15,11,0.10)',
                  flexShrink: 0,
                }} />
                <div style={{
                  width: isActive ? 12 : 8,
                  height: isActive ? 12 : 8,
                  borderRadius: '50%',
                  background: isActive ? ev.color : isPast ? 'rgba(10,15,11,0.12)' : `${ev.color}50`,
                  border: `2px solid ${isActive ? ev.color : isPast ? 'rgba(10,15,11,0.10)' : `${ev.color}40`}`,
                  boxShadow: isActive ? `0 0 10px ${ev.color}50` : 'none',
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                }} />
                {!isLast && (
                  <div style={{
                    width: 1, flex: 1, minHeight: 14,
                    background: 'rgba(10,15,11,0.10)',
                    flexShrink: 0,
                  }} />
                )}
              </div>

              {/* Card */}
              <div style={{ flex: 1, paddingLeft: 10, paddingTop: 4, paddingBottom: isLast ? 4 : 12 }}>
                <div style={{
                  background: isPast ? 'rgba(10,15,11,0.03)' : ev.bg,
                  border: `1px solid ${isActive ? `${ev.color}35` : isPast ? 'rgba(10,15,11,0.05)' : `${ev.color}18`}`,
                  borderLeft: `3px solid ${isActive ? ev.color : isPast ? 'rgba(10,15,11,0.10)' : `${ev.color}50`}`,
                  borderRadius: '6px 14px 14px 6px',
                  padding: '10px 14px',
                  opacity: isPast ? 0.55 : 1,
                  boxShadow: isActive ? `0 4px 16px ${ev.color}18` : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: 14 }}>{ev.icon}</span>
                    <span style={{
                      flex: 1,
                      fontSize: 13, fontWeight: 700,
                      color: isActive ? ev.color : isPast ? 'rgba(10,15,11,0.40)' : '#0A0F0B',
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {ev.label}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: ev.color,
                        background: `${ev.color}15`,
                        border: `1px solid ${ev.color}35`,
                        borderRadius: 999,
                        padding: '2px 8px',
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}>
                        AO VIVO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span style={{
                      fontSize: 10.5, fontWeight: 600,
                      color: 'rgba(10,15,11,0.50)',
                      letterSpacing: '-0.01em',
                    }}>
                      {fmtEventTime(ev.inicio)}–{fmtEventTime(ev.fim_previsto)}
                    </span>
                    {dur !== null && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 600,
                        color: 'rgba(10,15,11,0.35)',
                      }}>
                        {dur < 60 ? `${dur}min` : `${Math.floor(dur / 60)}h${dur % 60 > 0 ? `${dur % 60}m` : ''}`}
                      </span>
                    )}
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 10, fontWeight: 700,
                      color: `${ev.color}90`,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {ev.cat}
                    </span>
                    {ev.setorId && (
                      <div className="flex items-center gap-1" title="Cobertura foto / vídeo">
                        <Camera style={{
                          width: 11, height: 11,
                          color: coberturaPorSetor[ev.setorId]?.foto ? '#2e6b42' : 'rgba(10,15,11,0.20)',
                        }} aria-label="Cobertura foto" />
                        <Video style={{
                          width: 11, height: 11,
                          color: coberturaPorSetor[ev.setorId]?.video ? '#3D49E0' : 'rgba(10,15,11,0.20)',
                        }} aria-label="Cobertura vídeo" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AGORA separator */}
            {showNowAfter && (
              <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: 64 }}>
                <div style={{
                  height: 1, flex: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(196,107,74,0.40))',
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  color: '#A04A2E',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: 'rgba(196,107,74,0.10)',
                  border: '1px solid rgba(196,107,74,0.30)',
                }}>
                  ◆ agora · {nowStr}
                </span>
                <div style={{
                  height: 1, flex: 1,
                  background: 'linear-gradient(90deg, rgba(196,107,74,0.40), transparent)',
                }} />
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
  jogosHoje: _jogosHoje,
  showsHoje: _showsHoje,
  festasHoje: _festasHoje,
  turnosHoje,
  patrocinadores,
  conteudosPorPatrocinador,
  checklistItens,
  diasEvento: _diasEvento = [],
  diaAtualId: _diaAtualId = null,
}: CoordDashboardProps) {
  // jogosHoje, showsHoje, festasHoje, diasEvento, diaAtualId são consumidos via AgendaSection (HomeClient)
  void _jogosHoje; void _showsHoje; void _festasHoje; void _diasEvento; void _diaAtualId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StatsBar conteudosHoje={conteudosHoje} turnosHoje={turnosHoje} />

      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        <div className="cia-metrics-col-4"><RedesCard       conteudosHoje={conteudosHoje} /></div>
        <div className="cia-metrics-col-4"><ChecklistCard   checklistItens={checklistItens} /></div>
        <div className="cia-metrics-col-4">
          <PatrocinioCard
            patrocinadores={patrocinadores}
            conteudosPorPatrocinador={conteudosPorPatrocinador}
          />
        </div>
      </div>
    </div>
  )
}
