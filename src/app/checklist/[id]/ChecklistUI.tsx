'use client'

import { useState, useTransition, useEffect } from 'react'
import { Check, X, Minus, ExternalLink, Loader2 } from 'lucide-react'
import { marcarItem } from '../actions'

type ItemStatus = 'pendente' | 'feito' | 'nao_aplica'

interface ChecklistItem {
  id: string
  label: string
  obrigatorio: boolean
  ordem: number
  status: ItemStatus
  link_post: string | null
  observacao: string | null
  operador: { nome: string } | null
  feito_em: string | null
}

interface Props {
  instanciaId: string
  itens: ChecklistItem[]
}

export function ChecklistUI({ instanciaId, itens: initialItens }: Props) {
  const [itens, setItens] = useState(initialItens)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({})
  const [obsDraft, setObsDraft] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const feitos = itens.filter((i) => i.status === 'feito').length
  const total = itens.length
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0

  function optimisticMark(id: string, status: ItemStatus) {
    setItens((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status,
              feito_em: status === 'feito' ? new Date().toISOString() : null,
            }
          : i,
      ),
    )
  }

  // Limpa loadingId quando a transição termina (não dentro do startTransition,
  // pois React pode descartar o retorno da Promise em transitions)
  useEffect(() => {
    if (!isPending) setLoadingId(null)
  }, [isPending])

  function handleMark(id: string, status: ItemStatus) {
    setLoadingId(id)
    optimisticMark(id, status)
    startTransition(async () => {
      await marcarItem(id, status, linkDraft[id], obsDraft[id])
    })
  }

  const statusIcon: Record<ItemStatus, React.ReactNode> = {
    feito: <Check className="h-4 w-4" />,
    nao_aplica: <Minus className="h-4 w-4" />,
    pendente: null,
  }

  const statusBg: Record<ItemStatus, string> = {
    feito: 'border-[var(--green-bright)] bg-[var(--green-dim)]/20',
    nao_aplica: 'border-[var(--muted-foreground)]/40 bg-[var(--muted)]/20 opacity-50',
    pendente: 'border-[var(--border)] bg-[var(--card)]',
  }

  return (
    <div className="space-y-4">
      {/* Barra de progresso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--green-bright)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-[var(--muted-foreground)] min-w-[3rem] text-right">
          {feitos}/{total}
        </span>
      </div>

      {/* Lista de itens */}
      <ul className="space-y-2">
        {[...itens].sort((a, b) => a.ordem - b.ordem).map((item) => {
          const isExpanded = expanded === item.id
          const isLoading = loadingId === item.id && isPending

          return (
            <li
              key={item.id}
              className={`rounded-lg border transition-all ${statusBg[item.status]}`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Status buttons */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleMark(item.id, item.status === 'feito' ? 'pendente' : 'feito')}
                    disabled={isLoading}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                      item.status === 'feito'
                        ? 'border-[var(--green-bright)] bg-[var(--green-bright)] text-black'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green)] hover:text-[var(--green)]'
                    }`}
                    title="Marcar como feito"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleMark(item.id, item.status === 'nao_aplica' ? 'pendente' : 'nao_aplica')}
                    disabled={isLoading}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                      item.status === 'nao_aplica'
                        ? 'border-[var(--muted-foreground)] bg-[var(--muted)] text-[var(--foreground)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                    title="Não se aplica"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${item.status !== 'pendente' ? 'line-through text-[var(--muted-foreground)]' : ''}`}>
                    {item.label}
                    {item.obrigatorio && item.status === 'pendente' && (
                      <span className="ml-1 text-red-400 text-xs">*</span>
                    )}
                  </p>
                  {item.feito_em && item.operador && (
                    <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]/60">
                      {item.operador.nome} · {new Date(item.feito_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {item.link_post && (
                    <a
                      href={item.link_post}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      ver post
                    </a>
                  )}
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="shrink-0 text-xs text-[var(--muted-foreground)]/50 hover:text-[var(--muted-foreground)] px-1"
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>

              {/* Expanded: link + obs inputs */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 space-y-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                      Link do post
                    </label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/p/..."
                      value={linkDraft[item.id] ?? item.link_post ?? ''}
                      onChange={(e) => setLinkDraft((p) => ({ ...p, [item.id]: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                      Observação
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Observações, contexto..."
                      value={obsDraft[item.id] ?? item.observacao ?? ''}
                      onChange={(e) => setObsDraft((p) => ({ ...p, [item.id]: e.target.value }))}
                      className="mt-1 w-full resize-none rounded border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <button
                    onClick={() => handleMark(item.id, item.status)}
                    disabled={isLoading}
                    className="rounded bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {pct === 100 && (
        <div className="rounded-lg border border-[var(--green-bright)]/40 bg-[var(--green-dim)]/20 p-4 text-center">
          <p className="text-sm font-semibold text-[var(--green-bright)]">
            Checklist completo!
          </p>
        </div>
      )}
    </div>
  )
}
