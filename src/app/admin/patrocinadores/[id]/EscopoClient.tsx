'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Plus, Trash2, Layers, Film, ImageIcon, Star, Radio,
  FileText, Repeat, Clock, Minus, Loader2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { criarEscopoItem, updateEscopoItemStatus, deleteEscopoItem } from './actions'

// ── Mapeamentos ────────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  story_rapido:      { label: 'Story Rápido',      Icon: Layers,    color: '#a78bfa' },
  story_editado:     { label: 'Story Editado',      Icon: Layers,    color: '#818cf8' },
  reels:             { label: 'Reels',               Icon: Film,      color: '#f472b6' },
  card_feed:         { label: 'Card Feed',            Icon: ImageIcon, color: '#60a5fa' },
  card_patrocinado:  { label: 'Card Patrocinado',     Icon: Star,      color: '#fbbf24' },
  cobertura_ao_vivo: { label: 'Cobertura ao Vivo',   Icon: Radio,     color: '#34d399' },
  texto_legenda:     { label: 'Texto / Legenda',      Icon: FileText,  color: '#94a3b8' },
  repost:            { label: 'Repost',               Icon: Repeat,    color: '#fb923c' },
}

const CANAL_LABEL: Record<string, string> = {
  instagram_feed:    'IG Feed',       instagram_stories: 'IG Stories',
  instagram_reels:   'IG Reels',      tiktok:            'TikTok',
  youtube:           'YouTube',       youtube_shorts:     'YT Shorts',
  twitter_x:         'Twitter/X',     facebook:           'Facebook',
  whatsapp_status:   'WA Status',     outro:              'Outro',
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendente:    { label: 'Pendente',    bg: 'bg-[var(--muted)]',     text: 'text-[var(--muted-foreground)]', dot: 'bg-slate-400' },
  em_producao: { label: 'Em produção', bg: 'bg-blue-900/20',        text: 'text-blue-300',                  dot: 'bg-blue-400' },
  entregue:    { label: 'Entregue',    bg: 'bg-emerald-900/20',     text: 'text-emerald-400',               dot: 'bg-emerald-400' },
  atrasado:    { label: 'Atrasado',    bg: 'bg-red-900/20',         text: 'text-red-400',                   dot: 'bg-red-400' },
}

const STATUS_BORDER: Record<string, string> = {
  pendente:    'border-l-slate-600',
  em_producao: 'border-l-blue-500',
  entregue:    'border-l-emerald-500',
  atrasado:    'border-l-red-500',
}

function fmt(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function StatusBadge({
  status, itemId, onStatusChange,
}: {
  status: string
  itemId: string
  onStatusChange: (id: string, s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = STATUS_META[status] ?? STATUS_META.pendente

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-80 ${meta.bg} ${meta.text} border-current/20`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-1.5 w-36 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
          {Object.entries(STATUS_META).map(([k, m]) => (
            <button
              key={k}
              type="button"
              onClick={() => { onStatusChange(itemId, k); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors hover:bg-[var(--muted)] ${k === status ? m.text : 'text-[var(--foreground)]/70'}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
              {m.label}
              {k === status && <span className="ml-auto text-[9px] opacity-60">atual</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DeleteButton({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [step, setStep] = useState<'idle' | 'confirm'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleClick() {
    if (step === 'idle') {
      setStep('confirm')
      timer.current = setTimeout(() => setStep('idle'), 3000)
    } else {
      clearTimeout(timer.current)
      setStep('idle')
      onConfirm()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={step === 'idle' ? 'Excluir entrega' : 'Clique novamente para confirmar'}
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all disabled:opacity-30
        ${step === 'confirm'
          ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--destructive)]'
        }`}
    >
      <Trash2 className="h-3 w-3" />
      {step === 'confirm' && 'Confirmar?'}
    </button>
  )
}

// ── Dialog de adicionar entrega ───────────────────────────────────────────────

const TIPO_OPTIONS = Object.entries(TIPO_META)
const CANAL_OPTIONS = Object.entries(CANAL_LABEL)

function AddDialog({
  open, onOpenChange, patrocinadorId, onAdd,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  patrocinadorId: string
  onAdd: (item: EscopoItem) => void
}) {
  const [tipo, setTipo] = useState('')
  const [canal, setCanal] = useState('')
  const [qty, setQty] = useState(1)
  const [desc, setDesc] = useState('')
  const [prazo, setPrazo] = useState('')
  const [pending, startT] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function reset() {
    setTipo(''); setCanal(''); setQty(1); setDesc(''); setPrazo(''); setErr(null)
  }

  useEffect(() => { if (open) reset() }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipo) { setErr('Selecione o tipo de conteúdo.'); return }
    setErr(null)
    const fd = new FormData()
    fd.set('tipo_conteudo', tipo)
    if (canal) fd.set('canal', canal)
    fd.set('quantidade_prevista', String(qty))
    if (desc.trim()) fd.set('descricao', desc.trim())
    if (prazo) fd.set('prazo_limite', prazo)

    const temp: EscopoItem = {
      id: 'tmp-' + Date.now(),
      tipo_conteudo: tipo,
      canal: canal || null,
      quantidade_prevista: qty,
      descricao: desc.trim() || null,
      prazo_limite: prazo || null,
      status: 'pendente',
    }
    onAdd(temp)
    onOpenChange(false)

    startT(async () => {
      await criarEscopoItem(patrocinadorId, fd)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova entrega contratada</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Tipo de conteúdo — chips */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Tipo de conteúdo <span className="text-[var(--destructive)]">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {TIPO_OPTIONS.map(([k, m]) => {
                const sel = tipo === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTipo(k)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all
                      ${sel
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/20 hover:text-[var(--foreground)]'
                      }`}
                    style={sel ? { background: m.color } : {}}
                  >
                    <m.Icon className="h-3 w-3" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Canal — chips */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Canal</p>
            <div className="flex flex-wrap gap-2">
              {CANAL_OPTIONS.map(([k, label]) => {
                const sel = canal === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCanal(sel ? '' : k)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-all
                      ${sel
                        ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/20 text-[var(--green-bright)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/20 hover:text-[var(--foreground)]'
                      }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Qtd + Prazo */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Quantidade</p>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(q => q + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Prazo</p>
              <input
                type="date"
                value={prazo}
                onChange={e => setPrazo(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] w-full"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Descrição <span className="normal-case font-normal">(opcional)</span></p>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Post de ativação com menção à marca…"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-[var(--green-bright)]/40"
            />
          </div>

          {err && (
            <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{err}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar entrega'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export interface EscopoItem {
  id: string
  tipo_conteudo: string | null
  canal: string | null
  quantidade_prevista: number
  descricao: string | null
  prazo_limite?: string | null
  status: string
}

interface Props {
  patrocinadorId: string
  items: EscopoItem[]
}

export function EscopoClient({ patrocinadorId, items: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startT] = useTransition()

  // Stats derivados
  const byStatus = Object.fromEntries(
    Object.keys(STATUS_META).map(k => [k, items.filter(i => i.status === k).length])
  )
  const total = items.reduce((s, i) => s + i.quantidade_prevista, 0)
  const entregue = items.filter(i => i.status === 'entregue').reduce((s, i) => s + i.quantidade_prevista, 0)
  const pct = total > 0 ? Math.round((entregue / total) * 100) : 0

  function handleStatusChange(id: string, status: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    startT(async () => {
      await updateEscopoItemStatus(id, patrocinadorId, status)
    })
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    startT(async () => {
      await deleteEscopoItem(id, patrocinadorId)
    })
  }

  return (
    <div className="space-y-5">

      {/* ── Stats rápidos ──────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Progress */}
            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Progresso geral
                </p>
                <span className={`text-sm font-bold tabular-nums ${pct === 100 ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-[var(--green-bright)]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                {entregue} de {total} unidades entregues
              </p>
            </div>

            {/* Badges por status */}
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {Object.entries(STATUS_META).map(([k, m]) => {
                const count = byStatus[k] ?? 0
                if (count === 0) return null
                return (
                  <div key={k} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${m.bg} ${m.text} border-current/20`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                    {count} {m.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Grid de cards ─────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]">
            <FileText className="h-5 w-5 text-[var(--muted-foreground)]/40" />
          </div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Nenhuma entrega cadastrada</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">Adicione o escopo contratado abaixo</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => {
            const meta = item.tipo_conteudo ? TIPO_META[item.tipo_conteudo] : null
            const Icon = meta?.Icon ?? FileText
            const iconColor = meta?.color ?? '#94a3b8'
            const prazoStr = fmt(item.prazo_limite)
            const borderColor = STATUS_BORDER[item.status] ?? STATUS_BORDER.pendente

            return (
              <div
                key={item.id}
                className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--border)] border-l-2 bg-[var(--card)] p-4 transition-opacity ${isPending ? 'opacity-70' : ''} ${borderColor}`}
              >
                {/* Tipo + Canal */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${iconColor}18` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: iconColor }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight text-[var(--foreground)]">
                        {meta?.label ?? item.tipo_conteudo ?? '—'}
                      </p>
                      {item.canal && (
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {CANAL_LABEL[item.canal] ?? item.canal}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantidade em destaque */}
                  <div className="text-right">
                    <p className="text-2xl font-black tabular-nums leading-none text-[var(--foreground)]">
                      {item.quantidade_prevista}
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/60">
                      {item.quantidade_prevista === 1 ? 'unidade' : 'unidades'}
                    </p>
                  </div>
                </div>

                {/* Descrição */}
                {item.descricao && (
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {item.descricao}
                  </p>
                )}

                {/* Footer: prazo + status + delete */}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)]/40 pt-3">
                  <div className="flex items-center gap-2">
                    {prazoStr && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                        <Clock className="h-3 w-3" />
                        {prazoStr}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge
                      status={item.status}
                      itemId={item.id}
                      onStatusChange={handleStatusChange}
                    />
                    <DeleteButton
                      onConfirm={() => handleDelete(item.id)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Botão adicionar ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:bg-[var(--green-dim)]/5 hover:text-[var(--green-bright)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar entrega
      </button>

      <AddDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        patrocinadorId={patrocinadorId}
        onAdd={item => setItems(prev => [...prev, item])}
      />
    </div>
  )
}
