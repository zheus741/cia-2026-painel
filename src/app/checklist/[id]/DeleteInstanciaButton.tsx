'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deletarInstancia } from '../actions'

interface Props {
  instanciaId: string
}

export function DeleteInstanciaButton({ instanciaId }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      await deletarInstancia(instanciaId)
      router.push('/checklist')
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted-foreground)]">Excluir este checklist?</span>
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
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Excluir
    </button>
  )
}
