'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, X } from 'lucide-react'
import { renomearInstancia } from '../actions'

interface Props {
  instanciaId: string
  /** Título atual resolvido (exibido quando não editando) */
  titulo: string
  /** Valor salvo de nome_override — pode ser null se é título auto-gerado */
  nomeOverride: string | null
}

export function RenomearInstanciaButton({ instanciaId, titulo, nomeOverride }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(nomeOverride ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openEdit() {
    setValue(nomeOverride ?? '')
    setError(null)
    setSaved(false)
    setEditing(true)
    // Foca após render
    requestAnimationFrame(() => inputRef.current?.select())
  }

  function cancel() {
    setEditing(false)
    setError(null)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await renomearInstancia(instanciaId, value.trim() || null)
      if (!res.ok) {
        setError(res.error ?? 'Erro ao salvar.')
        return
      }
      setSaved(true)
      setEditing(false)
      router.refresh()
      // Limpa o badge "Salvo" após 2s
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="mt-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nome do checklist (vazio = automático)"
            className="
              flex-1 rounded-lg border border-[var(--accent)]/60 bg-[var(--card)]
              px-3 py-2 font-[var(--font-display)] text-2xl font-bold
              tracking-tight text-[var(--foreground)] outline-none
              focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)]/40
              placeholder:text-base placeholder:font-normal
            "
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            title="Salvar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={cancel}
            disabled={isPending}
            title="Cancelar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <p className="text-[10px] text-[var(--muted-foreground)]/50">
          Deixe vazio para usar o nome gerado automaticamente · Enter para salvar · Esc para cancelar
        </p>
      </div>
    )
  }

  return (
    <div className="group mt-1 flex items-start gap-2">
      <h1 className="font-[var(--font-display)] text-3xl font-bold tracking-tight">
        {titulo}
      </h1>
      <div className="flex shrink-0 items-center gap-1 pt-1">
        <button
          onClick={openEdit}
          title="Renomear checklist"
          className="
            rounded p-1 text-[var(--muted-foreground)]/0 transition-all
            group-hover:text-[var(--muted-foreground)]/50
            hover:!text-[var(--muted-foreground)] hover:bg-[var(--muted)]
          "
        >
          <Pencil className="h-4 w-4" />
        </button>
        {saved && (
          <span className="text-xs font-medium text-[var(--green-bright)]">
            Salvo ✓
          </span>
        )}
      </div>
    </div>
  )
}
