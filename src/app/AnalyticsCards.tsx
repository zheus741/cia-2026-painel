'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp, Clock, Users, Shield, ShieldCheck, ShieldAlert } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RankingItem {
  id: string; nome: string; funcao: string | null; total: number; publicados: number
}

export interface LacunaItem {
  id: string; label: string; hora: string; modalidade: string
}

export interface VolumePorHora {
  hora: number; count: number
}

export interface AtleticaItem {
  nome: string; jogos: number; coberta: boolean
}

interface Props {
  ranking:       RankingItem[]
  lacunas:       LacunaItem[]
  volumePorHora: VolumePorHora[]
  atleticas:     AtleticaItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FUNCAO_LABEL: Record<string, string> = {
  foto: 'Foto', video: 'Vídeo', social: 'Social', design: 'Design',
  texto: 'Texto', coordenacao: 'Coord',
}

const MEDAL = ['🥇', '🥈', '🥉']

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ranking de Produtividade
// ─────────────────────────────────────────────────────────────────────────────

function RankingCard({ ranking }: { ranking: RankingItem[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t) }, [])

  const maxPub = Math.max(...ranking.map(r => r.publicados), 1)

  if (ranking.length === 0) {
    return (
      <div className="cia-metric-card px-6 py-6 flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">Ranking de Produtividade</p>
          <TrendingUp className="h-4 w-4 opacity-20 text-[var(--green)]" />
        </div>
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8 opacity-50">
          Sem responsáveis atribuídos ainda.
        </p>
      </div>
    )
  }

  return (
    <div className="cia-metric-card px-6 py-6 flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">Ranking de Produtividade</p>
          <p className="mt-1 text-sm font-bold text-[var(--foreground)]">Quem mais publicou</p>
        </div>
        <TrendingUp className="h-4 w-4 opacity-25 text-[var(--green)]" />
      </div>

      <div className="space-y-2.5">
        {ranking.map((r, i) => {
          const pct     = r.total > 0 ? Math.round((r.publicados / r.total) * 100) : 0
          const barW    = mounted ? Math.max((r.publicados / maxPub) * 100, r.publicados > 0 ? 3 : 0) : 0
          const isTop3  = i < 3
          const medal   = MEDAL[i] ?? null

          return (
            <div key={r.id} className="group">
              <div className="flex items-center gap-2 mb-1">
                {/* Position */}
                <div className="w-5 text-center shrink-0">
                  {medal
                    ? <span className="text-sm">{medal}</span>
                    : <span className="text-[10px] font-bold tabular-nums" style={{ color: 'rgba(46,107,66,0.35)' }}>{i + 1}</span>
                  }
                </div>

                {/* Name + funcao */}
                <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold truncate" style={{ color: isTop3 ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                    {r.nome}
                  </span>
                  {r.funcao && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider shrink-0"
                      style={{ color: 'rgba(46,107,66,0.45)' }}
                    >
                      {FUNCAO_LABEL[r.funcao] ?? r.funcao}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="shrink-0 flex items-baseline gap-1">
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: 'Orbitron, monospace', color: isTop3 ? '#2e6b42' : 'var(--muted-foreground)' }}>
                    {r.publicados}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">/{r.total}</span>
                  <span className="text-[10px] font-bold tabular-nums ml-1" style={{ color: pct >= 70 ? '#2e6b42' : pct >= 40 ? '#d97706' : 'var(--muted-foreground)' }}>
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="ml-7 h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(16,29,18,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${barW}%`,
                    transitionDelay: `${i * 60}ms`,
                    background: isTop3
                      ? `linear-gradient(90deg, #2e6b42, #4aa06a)`
                      : 'rgba(46,107,66,0.35)',
                    boxShadow: isTop3 ? '0 0 6px rgba(74,160,106,0.40)' : 'none',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Lacunas de Cobertura
// ─────────────────────────────────────────────────────────────────────────────

function LacunasCard({ lacunas }: { lacunas: LacunaItem[] }) {
  const count = lacunas.length

  return (
    <div className="cia-metric-card px-6 py-6 flex flex-col" style={{ borderColor: count > 0 ? 'rgba(220,38,38,0.18)' : undefined }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">Lacunas de Cobertura</p>
          <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
            Jogos sem checklist hoje
          </p>
        </div>
        {count > 0
          ? <AlertTriangle className="h-4 w-4" style={{ color: '#dc2626' }} />
          : <ShieldCheck className="h-4 w-4" style={{ color: '#2e6b42' }} />
        }
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <ShieldCheck className="h-8 w-8" style={{ color: '#2e6b42', opacity: 0.5 }} />
          <p className="text-sm font-semibold text-[var(--green)]">Cobertura completa!</p>
          <p className="text-xs text-[var(--muted-foreground)] text-center">
            Todos os jogos de hoje têm checklist criado.
          </p>
        </div>
      ) : (
        <>
          {/* Alert badge */}
          <div
            className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            {count} jogo{count !== 1 ? 's' : ''} sem equipe designada
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {lacunas.map(l => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs"
                style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.10)' }}
              >
                <span className="w-10 shrink-0 font-mono text-[10px] text-[var(--muted-foreground)]">{l.hora}</span>
                <span className="flex-1 truncate font-medium text-[var(--foreground)]">{l.label}</span>
                {l.modalidade && (
                  <span className="shrink-0 text-[9px] text-[var(--muted-foreground)] uppercase tracking-wider">{l.modalidade}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Volume de Jogos por Hora
// ─────────────────────────────────────────────────────────────────────────────

function VolumeHoraCard({ volumePorHora }: { volumePorHora: VolumePorHora[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t) }, [])

  const maxCount = Math.max(...volumePorHora.map(v => v.count), 1)
  const totalJogos = volumePorHora.reduce((s, v) => s + v.count, 0)

  // Pico hora
  const pico = volumePorHora.reduce((a, b) => (b.count > a.count ? b : a), { hora: 0, count: 0 })

  if (volumePorHora.length === 0) {
    return (
      <div className="cia-metric-card px-6 py-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)] mb-4">Volume por Hora</p>
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8 opacity-50">Sem jogos programados para hoje.</p>
      </div>
    )
  }

  return (
    <div className="cia-metric-card px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">Volume por Hora</p>
          <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
            Jogos simultâneos · hoje
          </p>
        </div>
        <Clock className="h-4 w-4 opacity-25 text-[var(--green)]" />
      </div>

      {/* Summary pills */}
      <div className="mb-4 flex gap-2">
        <div className="flex-1 rounded-lg border px-3 py-2 text-center" style={{ borderColor: 'rgba(46,107,66,0.15)', background: 'rgba(46,107,66,0.05)' }}>
          <p className="text-base font-bold tabular-nums" style={{ fontFamily: 'Orbitron, monospace', color: '#2e6b42' }}>{totalJogos}</p>
          <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] mt-0.5">jogos totais</p>
        </div>
        <div className="flex-1 rounded-lg border px-3 py-2 text-center" style={{ borderColor: 'rgba(220,38,38,0.15)', background: 'rgba(220,38,38,0.05)' }}>
          <p className="text-base font-bold tabular-nums" style={{ fontFamily: 'Orbitron, monospace', color: '#dc2626' }}>{String(pico.hora).padStart(2,'0')}h</p>
          <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] mt-0.5">hora pico ({pico.count})</p>
        </div>
      </div>

      {/* Histogram */}
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {volumePorHora.map((v, i) => {
          const barH = mounted ? Math.max((v.count / maxCount) * 100, 4) : 0
          const isPeak = v.count === maxCount && maxCount > 0
          return (
            <div key={v.hora} className="flex flex-col items-center flex-1 gap-0.5">
              <div
                className="w-full rounded-t-sm transition-all duration-500 ease-out"
                title={`${String(v.hora).padStart(2,'0')}h: ${v.count} jogo${v.count !== 1 ? 's' : ''}`}
                style={{
                  height: `${barH}%`,
                  transitionDelay: `${i * 30}ms`,
                  background: isPeak
                    ? 'linear-gradient(180deg, #dc2626, #ef4444)'
                    : 'linear-gradient(180deg, #2e6b42, #4aa06a)',
                  boxShadow: isPeak ? '0 0 8px rgba(220,38,38,0.35)' : '0 0 4px rgba(46,107,66,0.20)',
                  minHeight: 3,
                }}
              />
              {v.count > 0 && (
                <span className="text-[8px] tabular-nums" style={{ color: 'rgba(46,107,66,0.55)', fontFamily: 'Orbitron,monospace' }}>
                  {v.count}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* X axis labels */}
      <div className="flex items-center gap-1 mt-1">
        {volumePorHora.map(v => (
          <div key={v.hora} className="flex-1 text-center text-[8px] text-[var(--muted-foreground)]">
            {String(v.hora).padStart(2,'0')}
          </div>
        ))}
      </div>

      {pico.count >= 5 && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: '#dc2626' }}>
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{pico.count} jogos simultâneos às {String(pico.hora).padStart(2,'0')}h — reforçar escala!</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cobertura por Atlética
// ─────────────────────────────────────────────────────────────────────────────

function AtleticasCard({ atleticas }: { atleticas: AtleticaItem[] }) {
  const cobertasCount  = atleticas.filter(a => a.coberta).length
  const totalCount     = atleticas.length
  const pct            = totalCount > 0 ? Math.round((cobertasCount / totalCount) * 100) : 0
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 400); return () => clearTimeout(t) }, [])

  return (
    <div className="cia-metric-card px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted-foreground)]">Cobertura por Atlética</p>
          <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
            Equipes com conteúdo criado
          </p>
        </div>
        <Users className="h-4 w-4 opacity-25 text-[var(--green)]" />
      </div>

      {/* Summary */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 w-32 overflow-hidden rounded-full" style={{ background: 'rgba(16,29,18,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: mounted ? `${pct}%` : '0%',
                background: pct >= 70
                  ? 'linear-gradient(90deg, var(--green-dim), var(--green-bright))'
                  : 'linear-gradient(90deg, #d97706, #fbbf24)',
                boxShadow: pct >= 70 ? '0 0 6px rgba(74,138,92,0.35)' : '0 0 6px rgba(251,191,36,0.35)',
              }}
            />
          </div>
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ fontFamily: 'Orbitron, monospace', color: pct >= 70 ? '#2e6b42' : '#d97706' }}>
          {cobertasCount}/{totalCount} · {pct}%
        </span>
      </div>

      {/* Grid of team tags */}
      {atleticas.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)] text-center py-4 opacity-50">Nenhuma atlética encontrada.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
          {atleticas.map(a => (
            <div
              key={a.nome}
              title={`${a.nome} · ${a.jogos} jogo${a.jogos !== 1 ? 's' : ''}`}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
              style={{
                background: a.coberta ? 'rgba(46,107,66,0.10)' : 'rgba(220,38,38,0.06)',
                border: `1px solid ${a.coberta ? 'rgba(46,107,66,0.22)' : 'rgba(220,38,38,0.18)'}`,
                color: a.coberta ? '#2e6b42' : '#dc2626',
              }}
            >
              {a.coberta
                ? <ShieldCheck className="h-2.5 w-2.5 shrink-0" />
                : <ShieldAlert className="h-2.5 w-2.5 shrink-0" />
              }
              <span className="truncate max-w-[100px]">{a.nome}</span>
              <span className="text-[8px] opacity-60 ml-0.5">{a.jogos}j</span>
            </div>
          ))}
        </div>
      )}

      {/* Sem cobertura */}
      {atleticas.some(a => !a.coberta) && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
          <p className="text-[10px] font-semibold" style={{ color: '#dc2626' }}>
            Sem cobertura ainda:
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
            {atleticas.filter(a => !a.coberta).map(a => a.nome).join(' · ')}
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function AnalyticsCards({ ranking, lacunas, volumePorHora, atleticas }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RankingCard ranking={ranking} />
      <LacunasCard lacunas={lacunas} />
      <VolumeHoraCard volumePorHora={volumePorHora} />
      <AtleticasCard atleticas={atleticas} />
    </div>
  )
}
