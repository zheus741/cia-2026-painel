'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, Lightbulb, Zap, CheckCircle, XCircle, Trash2, ChevronRight } from 'lucide-react'
import { FAB } from '@/components/fab'

type StatusPauta = 'ideia' | 'aprovada' | 'em_execucao' | 'entregue' | 'descartada'

interface Pauta {
  id: string
  titulo: string
  descricao: string | null
  status: StatusPauta
  setor: { nome: string } | null
  dia: { nome_dia: string } | null
  autor: { nome: string } | null
}

interface Props {
  pautas: Pauta[]
  edicaoId: string
}

const COLS: { key: StatusPauta; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'ideia',       label: 'Ideia',       icon: <Lightbulb className="h-3.5 w-3.5" />, color: 'text-yellow-400' },
  { key: 'aprovada',    label: 'Aprovada',    icon: <ChevronRight className="h-3.5 w-3.5" />, color: 'text-blue-400' },
  { key: 'em_execucao', label: 'Executando',  icon: <Zap className="h-3.5 w-3.5" />, color: 'text-orange-400' },
  { key: 'entregue',    label: 'Entregue',    icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'text-[var(--green-bright)]' },
]

async function avancarStatus(id: string, novoStatus: StatusPauta) {
  const res = await fetch('/api/pautas', {
    method: 'PATCH',
    body: JSON.stringify({ id, status: novoStatus }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Erro ao atualizar pauta')
}

async function criarPauta(titulo: string, descricao: string, edicaoId: string) {
  const res = await fetch('/api/pautas', {
    method: 'POST',
    body: JSON.stringify({ titulo, descricao, edicao_id: edicaoId }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Erro ao criar pauta')
}

export function PautasBoard({ pautas: initial, edicaoId }: Props) {
  const [pautas, setPautas] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [showNew, setShowNew] = useState(false)
  const [newTitulo, setNewTitulo] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const ideiaColRef = useRef<HTMLDivElement | null>(null)

  function handleFabClick() {
    setShowNew(true)
    // Scroll para a coluna "ideia" (especialmente útil em mobile)
    setTimeout(() => {
      ideiaColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  const nextStatus: Partial<Record<StatusPauta, StatusPauta>> = {
    ideia: 'aprovada',
    aprovada: 'em_execucao',
    em_execucao: 'entregue',
  }

  function move(id: string, novoStatus: StatusPauta) {
    // salva status anterior para rollback
    const prevStatus = pautas.find((p) => p.id === id)?.status
    setPautas((prev) => prev.map((p) => p.id === id ? { ...p, status: novoStatus } : p))
    startTransition(async () => {
      try {
        await avancarStatus(id, novoStatus)
      } catch {
        // reverte o optimistic update em caso de falha
        if (prevStatus) {
          setPautas((prev) => prev.map((p) => p.id === id ? { ...p, status: prevStatus } : p))
        }
      }
    })
  }

  function handleCreate() {
    if (!newTitulo.trim()) return
    const tempId = 'temp-' + Date.now()
    setPautas((prev) => [...prev, {
      id: tempId, titulo: newTitulo, descricao: newDesc || null,
      status: 'ideia', setor: null, dia: null, autor: null,
    }])
    setNewTitulo('')
    setNewDesc('')
    setShowNew(false)
    startTransition(async () => {
      await criarPauta(newTitulo, newDesc, edicaoId)
      // revalidar a página recarrega os dados reais
      window.location.reload()
    })
  }

  return (
    <>
    <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-4">
      {COLS.map((col) => {
        const itens = pautas.filter((p) => p.status === col.key)
        return (
          <div
            key={col.key}
            ref={col.key === 'ideia' ? ideiaColRef : undefined}
            className="flex w-full md:w-72 shrink-0 flex-col gap-3"
          >
            {/* Header da coluna */}
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
              <span className={col.color}>{col.icon}</span>
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="ml-auto text-xs text-[var(--muted-foreground)]">{itens.length}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {itens.map((pauta) => (
                <div
                  key={pauta.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2"
                >
                  <p className="text-sm font-medium leading-snug">{pauta.titulo}</p>
                  {pauta.descricao && (
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
                      {pauta.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {pauta.dia && (
                      <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                        {pauta.dia.nome_dia}
                      </span>
                    )}
                    {pauta.setor && (
                      <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                        {pauta.setor.nome}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {nextStatus[pauta.status] && (
                      <button
                        onClick={() => move(pauta.id, nextStatus[pauta.status]!)}
                        disabled={isPending}
                        className="flex-1 rounded border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                      >
                        → {nextStatus[pauta.status]}
                      </button>
                    )}
                    {pauta.status !== 'descartada' && pauta.status !== 'entregue' && (
                      <button
                        onClick={() => move(pauta.id, 'descartada')}
                        disabled={isPending}
                        className="flex items-center justify-center rounded border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)] transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                        title="Descartar"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Nova pauta — só na coluna ideia */}
              {col.key === 'ideia' && (
                <>
                  {showNew ? (
                    <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--card)] p-3 space-y-2">
                      <input
                        autoFocus
                        placeholder="Título da pauta..."
                        value={newTitulo}
                        onChange={(e) => setNewTitulo(e.target.value)}
                        className="w-full rounded border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      />
                      <textarea
                        rows={2}
                        placeholder="Descrição (opcional)..."
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full resize-none rounded border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreate}
                          className="flex-1 rounded bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-black hover:opacity-90"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => { setShowNew(false); setNewTitulo(''); setNewDesc('') }}
                          className="rounded border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNew(true)}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nova pauta
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}

      {/* Coluna descartadas (colapsada) */}
      <div className="flex w-full md:w-64 shrink-0 flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 opacity-50">
          <XCircle className="h-3.5 w-3.5 text-red-400" />
          <span className="text-sm font-semibold">Descartadas</span>
          <span className="ml-auto text-xs text-[var(--muted-foreground)]">
            {pautas.filter((p) => p.status === 'descartada').length}
          </span>
        </div>
        <div className="space-y-2 opacity-40">
          {pautas.filter((p) => p.status === 'descartada').map((pauta) => (
            <div key={pauta.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
              <p className="text-xs line-through text-[var(--muted-foreground)]">{pauta.titulo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* FAB — visível globalmente; em mobile fica acima da bottom nav */}
    <FAB
      onClick={handleFabClick}
      label="Nova pauta"
      ariaLabel="Criar nova pauta"
      hidden={showNew || isPending}
    />
    </>
  )
}
