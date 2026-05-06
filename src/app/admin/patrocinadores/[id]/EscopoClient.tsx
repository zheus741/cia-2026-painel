'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { criarEscopoItem, updateEscopoItemStatus, deleteEscopoItem } from './actions'

const TIPO_LABEL: Record<string, string> = {
  story_rapido: 'Story rápido', story_editado: 'Story editado', reels: 'Reels',
  card_feed: 'Card feed', card_patrocinado: 'Card patrocinado', texto_legenda: 'Texto/legenda',
  repost: 'Repost', cobertura_ao_vivo: 'Cobertura ao vivo',
}

const CANAL_LABEL: Record<string, string> = {
  instagram_feed: 'IG Feed', instagram_stories: 'IG Stories', instagram_reels: 'IG Reels',
  tiktok: 'TikTok', youtube: 'YouTube', youtube_shorts: 'YT Shorts',
  twitter_x: 'Twitter/X', facebook: 'Facebook', whatsapp_status: 'WA Status', outro: 'Outro',
}

const STATUS_STYLE: Record<string, string> = {
  pendente:    'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  em_producao: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
  entregue:    'bg-[var(--green-dim)]/20 text-[var(--green-bright)] border-[var(--green-dim)]/40',
  atrasado:    'bg-red-900/20 text-red-300 border-red-700/30',
}

interface EscopoItem {
  id: string
  tipo_conteudo: string | null
  canal: string | null
  quantidade_prevista: number
  descricao: string | null
  status: string
}

interface Props {
  patrocinadorId: string
  items: EscopoItem[]
}

export function EscopoClient({ patrocinadorId, items: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(id: string, novoStatus: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: novoStatus } : i))
    startTransition(async () => {
      await updateEscopoItemStatus(id, patrocinadorId, novoStatus)
    })
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    startTransition(async () => {
      await deleteEscopoItem(id, patrocinadorId)
    })
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const tempItem: EscopoItem = {
      id: 'temp-' + Date.now(),
      tipo_conteudo: fd.get('tipo_conteudo') as string || null,
      canal: fd.get('canal') as string || null,
      quantidade_prevista: parseInt(fd.get('quantidade_prevista') as string) || 1,
      descricao: (fd.get('descricao') as string)?.trim() || null,
      status: 'pendente',
    }
    setItems((prev) => [...prev, tempItem])
    setShowForm(false)
    ;(e.target as HTMLFormElement).reset()
    startTransition(async () => {
      const res = await criarEscopoItem(patrocinadorId, fd)
      if (!res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== tempItem.id))
      }
    })
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && !showForm && (
        <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
          Nenhuma entrega cadastrada.
        </p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {item.tipo_conteudo && (
                <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                  {TIPO_LABEL[item.tipo_conteudo] ?? item.tipo_conteudo}
                </span>
              )}
              {item.canal && (
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {CANAL_LABEL[item.canal] ?? item.canal}
                </span>
              )}
              <span className="ml-auto text-xs font-bold tabular-nums text-[var(--foreground)]">
                ×{item.quantidade_prevista}
              </span>
            </div>
            {item.descricao && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.descricao}</p>
            )}
          </div>

          {/* Status dropdown */}
          <div className="relative shrink-0">
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(item.id, e.target.value)}
              disabled={isPending}
              className={`appearance-none cursor-pointer rounded-full border px-2.5 py-0.5 text-[10px] font-semibold pr-5 ${STATUS_STYLE[item.status] ?? STATUS_STYLE.pendente} disabled:opacity-50`}
            >
              <option value="pendente">Pendente</option>
              <option value="em_producao">Em produção</option>
              <option value="entregue">Entregue</option>
              <option value="atrasado">Atrasado</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-60" />
          </div>

          <button
            onClick={() => handleDelete(item.id)}
            disabled={isPending}
            className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:text-[var(--destructive)] disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleCreate} className="rounded-lg border border-[var(--green-dim)]/40 bg-[var(--green-dim)]/10 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              name="tipo_conteudo"
              className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
            >
              <option value="">Tipo de conteúdo</option>
              {Object.entries(TIPO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              name="canal"
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
            >
              <option value="">Canal</option>
              {Object.entries(CANAL_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              type="number"
              name="quantidade_prevista"
              placeholder="Qtd"
              min={1}
              defaultValue={1}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
            />
          </div>
          <input
            type="text"
            name="descricao"
            placeholder="Descrição (opcional)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[var(--green-dim)] px-3 py-1.5 text-xs font-semibold text-[var(--green-bright)] transition-colors hover:bg-[var(--green)] hover:text-black disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--green-dim)] hover:text-[var(--green-bright)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar entrega
        </button>
      )}
    </div>
  )
}
