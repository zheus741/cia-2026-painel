'use client'

/**
 * <MockRoster /> — Painel visual com os 30 nomes do CIA 2025 agrupados por função.
 *
 * Pra dimensionamento quantitativo da escala — NÃO afeta dados reais.
 * Coordenador vê "quantas pessoas teríamos em cada função" antes de cadastrar
 * usuários reais.
 */

import { useState } from 'react'
import { MOCK_TEAM_2025, contarPorFuncao, type MockMember } from '@/lib/mock-team-2025'
import {
  ChevronDown, ChevronUp, Camera, Video, Edit3, Palette,
  Headphones, Smartphone, Star, Sun, Moon, Shuffle,
} from 'lucide-react'

const FUNCAO_META: Record<MockMember['funcao'], { label: string; icon: typeof Camera; cor: string }> = {
  foto:            { label: 'Foto',              icon: Camera,     cor: '#7c3aed' },
  video:           { label: 'Vídeo',             icon: Video,      cor: '#1a5c5c' },
  editor:          { label: 'Editor',            icon: Edit3,      cor: '#A04A2E' },
  design:          { label: 'Design',            icon: Palette,    cor: '#D4A017' },
  coordenacao:     { label: 'Coordenação',       icon: Headphones, cor: '#2563eb' },
  storymaker:      { label: 'Storymaker',        icon: Smartphone, cor: '#dc2626' },
  lider_cobertura: { label: 'Líder de Cobertura', icon: Star,       cor: '#f59e0b' },
}

const TURNO_META: Record<MockMember['turno'], { icon: typeof Sun; cor: string }> = {
  Diurno:  { icon: Sun,      cor: '#f59e0b' },
  Noturno: { icon: Moon,     cor: '#6366f1' },
  Misto:   { icon: Shuffle,  cor: '#64748b' },
}

function Initials({ nome }: { nome: string }) {
  const parts = nome.trim().split(/\s+/)
  const letters = (parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : nome.slice(0, 2)
  ).toUpperCase()
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--green-dim)]/40 text-[10px] font-bold text-[var(--green-bright)]">
      {letters}
    </span>
  )
}

export function MockRoster() {
  const [open, setOpen] = useState(false)
  const counts = contarPorFuncao()
  const total  = MOCK_TEAM_2025.length

  // Agrupa por função na ordem do meta
  const grupos = (Object.keys(FUNCAO_META) as MockMember['funcao'][]).map(funcao => ({
    funcao,
    membros: MOCK_TEAM_2025.filter(m => m.funcao === funcao),
  })).filter(g => g.membros.length > 0)

  return (
    <div className="mx-4 sm:mx-6 mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden">
      {/* Header collapsible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-500/[0.05]"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
            <Star className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Referência CIA 2025
            </p>
            <p className="text-[11px] text-amber-700/70">
              <strong className="tabular-nums">{total}</strong> pessoas na edição anterior — dimensionamento pra planejar a escala
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Stats chips */}
          <div className="hidden sm:flex items-center gap-1.5">
            {grupos.slice(0, 4).map(g => {
              const meta = FUNCAO_META[g.funcao]
              return (
                <span
                  key={g.funcao}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${meta.cor}10`, color: meta.cor, borderColor: `${meta.cor}30` }}
                >
                  {counts[g.funcao]} {meta.label.split(' ')[0]}
                </span>
              )
            })}
            {grupos.length > 4 && (
              <span className="text-[10px] text-amber-700/60">+ {grupos.length - 4}</span>
            )}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
        </div>
      </button>

      {/* Lista expandida */}
      {open && (
        <div className="border-t border-amber-500/15 px-4 py-4 space-y-4">
          {grupos.map(({ funcao, membros }) => {
            const meta = FUNCAO_META[funcao]
            const Icon = meta.icon
            return (
              <div key={funcao}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" style={{ color: meta.cor }} />
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: meta.cor }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[10px] tabular-nums text-amber-700/60">
                    {membros.length} pessoa{membros.length !== 1 ? 's' : ''}
                  </span>
                  <span className="h-px flex-1 bg-amber-500/10" />
                </div>
                <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {membros.map(m => {
                    const turnoMeta = TURNO_META[m.turno]
                    const TurnoIcon = turnoMeta.icon
                    return (
                      <div
                        key={m.nome}
                        className="flex items-center gap-2 rounded-lg border border-amber-500/10 bg-white/40 px-2.5 py-2"
                      >
                        <Initials nome={m.nome} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[var(--foreground)]">
                            {m.nome}
                          </p>
                          {m.descricao && (
                            <p className="truncate text-[10px] text-[var(--muted-foreground)]/70">
                              {m.descricao}
                            </p>
                          )}
                        </div>
                        <span
                          title={`${m.turno} · ${m.horario}`}
                          className="inline-flex items-center gap-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                          style={{
                            background: `${turnoMeta.cor}12`,
                            color: turnoMeta.cor,
                          }}
                        >
                          <TurnoIcon className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
