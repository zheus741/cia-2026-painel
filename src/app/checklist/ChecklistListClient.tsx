'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Clock,
  ChevronDown,
  Sword,
  Music,
  PartyPopper,
  Handshake,
  LayoutGrid,
  Trash2,
} from 'lucide-react'

interface RowItem {
  id: string
  titulo: string
  dia: { nome_dia: string; data: string } | null
  horario: string | null
  t: { nome: string; tipo: string } | null
  total: number
  feitos: number
  pendentes: number
  pct: number
}

interface Props {
  rows: RowItem[]
  isCoord: boolean
  deletarInstancia: (id: string) => Promise<{ ok: boolean; error?: string }>
}

const TIPO_LABEL: Record<string, string> = {
  jogo: 'Jogos',
  show: 'Shows',
  festa: 'Festas',
  ativacao_patrocinador: 'Ativações',
}

const TIPO_BADGE_COLOR: Record<string, string> = {
  jogo: 'text-[var(--green-bright)] bg-[var(--green-dim)]/30',
  show: 'text-purple-700 bg-purple-50',
  festa: 'text-rose-700 bg-rose-50',
  ativacao_patrocinador: 'text-yellow-700 bg-yellow-50',
}

const TIPO_BADGE_LABEL: Record<string, string> = {
  jogo: 'Jogo',
  show: 'Show',
  festa: 'Festa',
  ativacao_patrocinador: 'Ativação',
}

function TipoIcon({ tipo, className }: { tipo: string; className?: string }) {
  const cls = className ?? 'h-4 w-4'
  if (tipo === 'jogo') return <Sword className={cls} />
  if (tipo === 'show') return <Music className={cls} />
  if (tipo === 'festa') return <PartyPopper className={cls} />
  if (tipo === 'ativacao_patrocinador') return <Handshake className={cls} />
  return <LayoutGrid className={cls} />
}

function DeleteButton({
  id,
  deletarInstancia,
}: {
  id: string
  deletarInstancia: (id: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      await deletarInstancia(id)
      router.refresh()
    })
  }

  if (confirming) {
    return (
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-[var(--card)]/95 backdrop-blur-sm"
        onClick={(e) => e.preventDefault()}
      >
        <p className="text-xs font-semibold text-[var(--foreground)]">Excluir este checklist?</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Excluindo...' : 'Sim, excluir'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        setConfirming(true)
      }}
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
      title="Excluir checklist"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function ChecklistCard({
  row,
  isCoord,
  deletarInstancia,
}: {
  row: RowItem
  isCoord: boolean
  deletarInstancia: (id: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const tipo = row.t?.tipo ?? ''
  const badgeColor = TIPO_BADGE_COLOR[tipo] ?? 'text-[var(--muted-foreground)] bg-[var(--muted)]'
  const badgeLabel = TIPO_BADGE_LABEL[tipo] ?? tipo

  return (
    <div className="group relative">
      {isCoord && (
        <DeleteButton id={row.id} deletarInstancia={deletarInstancia} />
      )}
      <Link
        href={`/checklist/${row.id}`}
        className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            {row.t && (
              <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeColor}`}>
                {badgeLabel}
              </span>
            )}
            <h3 className="text-sm font-semibold leading-snug">{row.titulo}</h3>
          </div>
          <span className="shrink-0 text-2xl font-bold tabular-nums text-[var(--muted-foreground)]">
            {row.pct}%
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-[var(--green-bright)] transition-all"
            style={{ width: `${row.pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          {row.dia && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {row.dia.nome_dia}
              {row.horario && (
                <> · {new Date(row.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {row.pendentes > 0 && (
              <span className="flex items-center gap-1 text-orange-400">
                <AlertCircle className="h-3 w-3" />
                {row.pendentes} pendente{row.pendentes !== 1 ? 's' : ''}
              </span>
            )}
            {row.pendentes === 0 && row.total > 0 && (
              <span className="text-[var(--green-bright)]">Concluído</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}

interface TipoSection {
  tipo: string
  label: string
  rows: RowItem[]
}

export function ChecklistListClient({ rows, isCoord, deletarInstancia }: Props) {
  const TIPO_ORDER = ['jogo', 'show', 'festa', 'ativacao_patrocinador', '']

  // Group by tipo
  const grouped = new Map<string, RowItem[]>()
  for (const row of rows) {
    const tipo = row.t?.tipo ?? ''
    const existing = grouped.get(tipo) ?? []
    grouped.set(tipo, [...existing, row])
  }

  const sections: TipoSection[] = TIPO_ORDER
    .filter((tipo) => grouped.has(tipo))
    .map((tipo) => ({
      tipo,
      label: tipo === '' ? 'Sem tipo' : (TIPO_LABEL[tipo] ?? tipo),
      rows: grouped.get(tipo)!,
    }))

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleSection(tipo: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(tipo)) {
        next.delete(tipo)
      } else {
        next.add(tipo)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.tipo)
        const totalFeitos = section.rows.reduce((acc, r) => acc + r.feitos, 0)
        const totalItens = section.rows.reduce((acc, r) => acc + r.total, 0)
        const avgPct = totalItens > 0 ? Math.round((totalFeitos / totalItens) * 100) : 0

        return (
          <div key={section.tipo} className="space-y-3">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.tipo)}
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left transition-colors hover:border-[var(--accent)]/50"
            >
              <TipoIcon tipo={section.tipo} className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="flex-1 text-sm font-semibold">{section.label}</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {section.rows.length} checklist{section.rows.length !== 1 ? 's' : ''}
              </span>
              <span className="min-w-[2.5rem] text-right text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">
                {avgPct}%
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
              />
            </button>

            {/* Cards grid */}
            {!isCollapsed && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.rows.map((row) => (
                  <ChecklistCard
                    key={row.id}
                    row={row}
                    isCoord={isCoord}
                    deletarInstancia={deletarInstancia}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
