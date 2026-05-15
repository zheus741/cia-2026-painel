'use client'

/**
 * <FiltrosEscala /> — Sistema de filtros multi-select pra escala.
 *
 * 2 núcleos de praças:
 *   - Praças Esportivas (setores com tipo='esportivo', vêm da planilha de jogos)
 *   - Festivo (FESTA NOTURNA, ARENA, Palco Eletrônico, Público, Patrocinadores, CIA Club)
 *
 * + Filtro por Função (Foto/Vídeo/Editor/etc).
 *
 * Multi-select: clica pra adicionar/remover, sem nenhum selecionado = mostra tudo.
 */

import { Trophy, PartyPopper, Filter, X, Check } from 'lucide-react'

interface Setor { id: string; nome: string; tipo?: string | null }
interface Funcao { value: string; label: string }
interface Turno  { setor_id: string | null; is_roaming?: boolean; funcao: string }

interface Props {
  setoresEsportivos: Setor[]
  setoresFestivos:   Setor[]
  funcoes:           readonly Funcao[]
  turnosByDia:       Turno[]
  selectedSetorIds:  Set<string>
  selectedFuncoes:   Set<string>
  onToggleSetor:     (id: string) => void
  onToggleFuncao:    (value: string) => void
  onClearAll:        () => void
  hasAnyFilter:      boolean
}

function countTurnosForSetor(turnos: Turno[], setorId: string): number {
  if (setorId === '__roaming__')   return turnos.filter(t => t.is_roaming).length
  if (setorId === '__sem_setor__') return turnos.filter(t => !t.setor_id && !t.is_roaming).length
  return turnos.filter(t => t.setor_id === setorId && !t.is_roaming).length
}

function FilterChip({ active, label, count, accent, onClick }: {
  active: boolean
  label:  string
  count?: number
  accent: { activeBg: string; activeBorder: string; activeText: string; hoverBorder: string }
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
        active
          ? `${accent.activeBorder} ${accent.activeBg} ${accent.activeText}`
          : `border-[var(--border)] text-[var(--muted-foreground)] ${accent.hoverBorder}`,
      ].join(' ')}
      aria-pressed={active}
    >
      {active && <Check className="h-3 w-3 -ml-0.5" aria-hidden />}
      {label}
      {count !== undefined && count > 0 && (
        <span className={[
          'rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
          active ? 'bg-white/30' : 'bg-[var(--border)]/40',
        ].join(' ')}>
          {count}
        </span>
      )}
    </button>
  )
}

function SecaoFiltro({
  icon: Icon, titulo, descricao, setores, turnos, selected, onToggle, accent,
  extraItems,
}: {
  icon: typeof Trophy
  titulo: string
  descricao?: string
  setores: Setor[]
  turnos:  Turno[]
  selected: Set<string>
  onToggle: (id: string) => void
  accent: Parameters<typeof FilterChip>[0]['accent']
  extraItems?: { id: string; nome: string }[]
}) {
  if (setores.length === 0 && !extraItems?.length) return null
  const items = [...setores, ...(extraItems ?? [])]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--muted-foreground)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">
          {titulo}
        </span>
        {descricao && (
          <span className="text-[10px] text-[var(--muted-foreground)]/40">· {descricao}</span>
        )}
        <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]/40">
          ({items.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(s => (
          <FilterChip
            key={s.id}
            label={s.nome}
            count={countTurnosForSetor(turnos, s.id)}
            active={selected.has(s.id)}
            onClick={() => onToggle(s.id)}
            accent={accent}
          />
        ))}
      </div>
    </div>
  )
}

export function FiltrosEscala({
  setoresEsportivos, setoresFestivos, funcoes, turnosByDia,
  selectedSetorIds, selectedFuncoes,
  onToggleSetor, onToggleFuncao, onClearAll, hasAnyFilter,
}: Props) {
  const activeSetorCount  = selectedSetorIds.size
  const activeFuncaoCount = selectedFuncoes.size

  // Accent palettes por seção
  const accentEsportivo = {
    activeBg:    'bg-[var(--green-dim)]/15',
    activeBorder:'border-[var(--green-bright)]/40',
    activeText:  'text-[var(--green-bright)]',
    hoverBorder: 'hover:border-[var(--green-dim)]/50',
  }
  const accentFestivo = {
    activeBg:    'bg-purple-100',
    activeBorder:'border-purple-400',
    activeText:  'text-purple-700',
    hoverBorder: 'hover:border-purple-300',
  }
  const accentFuncao = {
    activeBg:    'bg-amber-100',
    activeBorder:'border-amber-400',
    activeText:  'text-amber-700',
    hoverBorder: 'hover:border-amber-300',
  }

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 p-4 space-y-4">

      {/* Header com sumário + clear */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[var(--muted-foreground)]/60" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]/70">
            Filtros
          </span>
          {hasAnyFilter && (
            <span className="text-[10px] text-[var(--muted-foreground)]/60">
              {activeSetorCount} praça{activeSetorCount !== 1 ? 's' : ''}
              {activeFuncaoCount > 0 && ` · ${activeFuncaoCount} função${activeFuncaoCount !== 1 ? 'ões' : ''}`}
            </span>
          )}
        </div>
        {hasAnyFilter && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-[10px] font-semibold text-[var(--muted-foreground)]/70 hover:text-red-500 transition-colors"
          >
            <X className="h-3 w-3" />
            Limpar tudo
          </button>
        )}
      </div>

      {/* ── Núcleo 1: Praças Esportivas ────────────────────────────────── */}
      <SecaoFiltro
        icon={Trophy}
        titulo="Praças Esportivas"
        descricao="vindas da planilha de jogos"
        setores={setoresEsportivos}
        turnos={turnosByDia}
        selected={selectedSetorIds}
        onToggle={onToggleSetor}
        accent={accentEsportivo}
        extraItems={[
          { id: '__roaming__',   nome: 'Roaming' },
          { id: '__sem_setor__', nome: 'Sem setor' },
        ]}
      />

      {/* ── Núcleo 2: Festivo ──────────────────────────────────────────── */}
      <SecaoFiltro
        icon={PartyPopper}
        titulo="Festivo"
        descricao="praças extra-esportivas"
        setores={setoresFestivos}
        turnos={turnosByDia}
        selected={selectedSetorIds}
        onToggle={onToggleSetor}
        accent={accentFestivo}
      />

      {/* ── Núcleo 3: Função ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">
            Função
          </span>
          <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]/40">
            ({funcoes.length})
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {funcoes.map(f => (
            <FilterChip
              key={f.value}
              label={f.label}
              count={turnosByDia.filter(t => t.funcao === f.value).length}
              active={selectedFuncoes.has(f.value)}
              onClick={() => onToggleFuncao(f.value)}
              accent={accentFuncao}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
