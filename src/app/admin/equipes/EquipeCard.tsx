'use client'

import { Pencil, Trash2, Users, Music, Sparkles, Building2 } from 'lucide-react'

interface Equipe {
  id: string
  nome: string
  slug: string | null
  tipo: string
  divisao: string | null
  universidade: string | null
  logo_url: string | null
  cor_primaria: string | null
}

const TIPO_META: Record<string, { label: string; icon: typeof Users; cor: string }> = {
  atletica: { label: 'Atlética', icon: Users,     cor: '#2e6b42' },
  cheer:    { label: 'Cheer',    icon: Sparkles,  cor: '#A04A2E' },
  bateria:  { label: 'Bateria',  icon: Music,     cor: '#3D49E0' },
}

export function EquipeCard({
  e, onEdit, onDelete,
}: {
  e: Equipe
  onEdit:   () => void
  onDelete: () => void
}) {
  const tipoMeta = TIPO_META[e.tipo] ?? TIPO_META.atletica
  const TipoIcon = tipoMeta.icon
  const cor = e.cor_primaria || tipoMeta.cor

  return (
    <article
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-[var(--card)] p-4 transition-all"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Color stripe lateral — cor primária da equipe */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: cor }}
      />

      <div className="flex items-start gap-3 pl-1.5">
        {/* Logo */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: 'var(--border)' }}
        >
          {e.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.logo_url}
              alt={e.nome}
              width={48}
              height={48}
              className="h-full w-full object-contain p-1"
              onError={(ev) => {
                ;(ev.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span
              className="text-[11px] font-bold uppercase tracking-wider leading-none text-center px-1"
              style={{ color: cor }}
            >
              {e.nome.split(' ').slice(0, 2).map(w => w[0]).join('')}
            </span>
          )}
        </div>

        {/* Nome + universidade */}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold text-[var(--foreground)] leading-tight">
            {e.nome}
          </h3>
          {e.universidade && (
            <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/60">
              <Building2 className="h-2.5 w-2.5" />
              {e.universidade}
            </p>
          )}
        </div>
      </div>

      {/* Badges: tipo + divisão */}
      <div className="flex flex-wrap items-center gap-1.5 pl-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: `${tipoMeta.cor}14`,
            color: tipoMeta.cor,
            border: `1px solid ${tipoMeta.cor}30`,
          }}
        >
          <TipoIcon className="h-2.5 w-2.5" />
          {tipoMeta.label}
        </span>
        {e.divisao && (
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--muted)]/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            {e.divisao}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="mt-auto flex justify-end gap-1 border-t border-[var(--border)]/40 pt-2">
        <button
          onClick={onEdit}
          aria-label="Editar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          aria-label="Excluir"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}
