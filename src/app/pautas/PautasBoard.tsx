'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  Plus, Lightbulb, Zap, CheckCircle, XCircle, ChevronRight,
  Link2, X, ArrowRight, Trash2, ExternalLink, User, Calendar,
  Tag, ChevronDown, ChevronUp,
} from 'lucide-react'
import { FAB } from '@/components/fab'
import { criarPautaAction } from './actions'

type StatusPauta = 'ideia' | 'aprovada' | 'em_execucao' | 'entregue' | 'descartada'

interface Pauta {
  id: string
  titulo: string
  descricao: string | null
  referencias: string[]
  status: StatusPauta
  criado_em: string
  setor: { nome: string } | null
  dia: { nome_dia: string } | null
  autor: { nome: string } | null
}

interface Props {
  pautas: Pauta[]
  edicaoId: string
}

interface DrawerState {
  mode: 'create' | 'view'
  pauta?: Pauta
}

const COLS: { key: StatusPauta; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { key: 'ideia',       label: 'Ideia',      icon: <Lightbulb className="h-3.5 w-3.5" />, color: 'text-yellow-400',                    bg: 'bg-yellow-400/10' },
  { key: 'aprovada',    label: 'Aprovada',   icon: <ChevronRight className="h-3.5 w-3.5" />, color: 'text-blue-400',                  bg: 'bg-blue-400/10' },
  { key: 'em_execucao', label: 'Executando', icon: <Zap className="h-3.5 w-3.5" />,           color: 'text-orange-400',               bg: 'bg-orange-400/10' },
  { key: 'entregue',    label: 'Entregue',   icon: <CheckCircle className="h-3.5 w-3.5" />,   color: 'text-[var(--green-bright)]',    bg: 'bg-[var(--green-bright)]/10' },
]

const NEXT_STATUS: Partial<Record<StatusPauta, StatusPauta>> = {
  ideia: 'aprovada',
  aprovada: 'em_execucao',
  em_execucao: 'entregue',
}

const NEXT_LABEL: Partial<Record<StatusPauta, string>> = {
  ideia: 'Aprovar',
  aprovada: 'Iniciar',
  em_execucao: 'Entregar',
}

async function avancarStatusFetch(id: string, novoStatus: StatusPauta) {
  const res = await fetch('/api/pautas', {
    method: 'PATCH',
    body: JSON.stringify({ id, status: novoStatus }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Erro ao atualizar pauta')
}

function isUrl(s: string) {
  try { new URL(s); return true } catch { return false }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── Card ────────────────────────────────────────────────────────────────────

function PautaCard({
  pauta,
  isPending,
  onMove,
  onDiscard,
  onOpen,
}: {
  pauta: Pauta
  isPending: boolean
  onMove: (id: string, status: StatusPauta) => void
  onDiscard: (id: string) => void
  onOpen: (pauta: Pauta) => void
}) {
  const next = NEXT_STATUS[pauta.status]
  const nextLabel = NEXT_LABEL[pauta.status]
  const refCount = pauta.referencias?.length ?? 0

  return (
    <div className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2.5 transition-colors hover:border-[var(--border)]/80">
      {/* Título clicável */}
      <button
        onClick={() => onOpen(pauta)}
        className="w-full text-left"
      >
        <p className="text-sm font-medium leading-snug group-hover:text-[var(--accent)] transition-colors">
          {pauta.titulo}
        </p>
        {pauta.descricao && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
            {pauta.descricao}
          </p>
        )}
      </button>

      {/* Meta: setor / dia / refs */}
      {(pauta.setor || pauta.dia || refCount > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {pauta.dia && (
            <span className="flex items-center gap-1 rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
              <Calendar className="h-2.5 w-2.5" />
              {pauta.dia.nome_dia}
            </span>
          )}
          {pauta.setor && (
            <span className="flex items-center gap-1 rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
              <Tag className="h-2.5 w-2.5" />
              {pauta.setor.nome}
            </span>
          )}
          {refCount > 0 && (
            <span className="flex items-center gap-1 rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
              <Link2 className="h-2.5 w-2.5" />
              {refCount} ref{refCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Autor + data */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {pauta.autor?.nome ?? 'Anônimo'}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {formatDate(pauta.criado_em)}
        </span>
      </div>

      {/* Ações */}
      {(next || (pauta.status !== 'descartada' && pauta.status !== 'entregue')) && (
        <div className="flex gap-1.5">
          {next && (
            <button
              onClick={() => onMove(pauta.id, next)}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1 rounded border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              <ArrowRight className="h-3 w-3" />
              {nextLabel}
            </button>
          )}
          {pauta.status !== 'descartada' && pauta.status !== 'entregue' && (
            <button
              onClick={() => onDiscard(pauta.id)}
              disabled={isPending}
              className="flex items-center justify-center rounded border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)] transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
              title="Descartar"
            >
              <XCircle className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Drawer ───────────────────────────────────────────────────────────────────

function PautaDrawer({
  drawer,
  edicaoId,
  isPending,
  onClose,
  onCreate,
  onMove,
  onDiscard,
}: {
  drawer: DrawerState
  edicaoId: string
  isPending: boolean
  onClose: () => void
  onCreate: (titulo: string, descricao: string, referencias: string[]) => void
  onMove: (id: string, status: StatusPauta) => void
  onDiscard: (id: string) => void
}) {
  // Form state
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [refsText, setRefsText] = useState('')
  const [showRefs, setShowRefs] = useState(false)
  const tituloRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (drawer.mode === 'create') {
      setTimeout(() => tituloRef.current?.focus(), 50)
    }
  }, [drawer.mode])

  function handleSubmit() {
    if (!titulo.trim()) return
    const refs = refsText
      .split('\n')
      .map(r => r.trim())
      .filter(Boolean)
    onCreate(titulo, descricao, refs)
    setTitulo('')
    setDescricao('')
    setRefsText('')
    setShowRefs(false)
  }

  const pauta = drawer.pauta
  const next = pauta ? NEXT_STATUS[pauta.status] : undefined
  const nextLabel = pauta ? NEXT_LABEL[pauta.status] : undefined

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — bottom sheet mobile, right panel desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] max-h-[90vh] overflow-hidden md:bottom-auto md:top-0 md:left-auto md:right-0 md:h-screen md:w-[420px] md:rounded-none md:border-t-0 md:border-l">
        {/* Handle (mobile only) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--border)] md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide font-medium">
              {drawer.mode === 'create' ? 'Nova Pauta' : 'Detalhes da Pauta'}
            </p>
            {pauta && (
              <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                {COLS.find(c => c.key === pauta.status)?.label} · {pauta.autor?.nome ?? 'Anônimo'} · {formatDate(pauta.criado_em)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {drawer.mode === 'create' ? (
            <>
              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Título <span className="text-red-400">*</span>
                </label>
                <input
                  ref={tituloRef}
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Qual é a pauta?"
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleSubmit()}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)]/60"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Explique a ideia
                </label>
                <textarea
                  rows={4}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Contexto, ângulo, por que vale cobrir, quem entrevistar..."
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm leading-relaxed outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)]/60"
                />
              </div>

              {/* Referências */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowRefs(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Referências
                  {showRefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showRefs && (
                  <>
                    <textarea
                      rows={4}
                      value={refsText}
                      onChange={e => setRefsText(e.target.value)}
                      placeholder={`Cole links ou textos, um por linha:\nhttps://instagram.com/...\nhttps://twitter.com/...`}
                      className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-mono leading-relaxed outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)]/60"
                    />
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      Links de redes sociais, matérias relacionadas, fotos, posts — qualquer referência útil.
                    </p>
                  </>
                )}
              </div>
            </>
          ) : pauta ? (
            <>
              {/* Título */}
              <div>
                <p className="text-lg font-semibold leading-snug">{pauta.titulo}</p>
              </div>

              {/* Descrição */}
              {pauta.descricao && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Descrição</p>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                    {pauta.descricao}
                  </p>
                </div>
              )}

              {/* Referências */}
              {pauta.referencias && pauta.referencias.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Referências
                  </p>
                  <ul className="space-y-1.5">
                    {pauta.referencias.map((ref, i) => (
                      <li key={i}>
                        {isUrl(ref) ? (
                          <a
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--accent)] transition-colors hover:border-[var(--accent)]/50 truncate"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{ref}</span>
                          </a>
                        ) : (
                          <span className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
                            <Link2 className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>{ref}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                {pauta.autor && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">Autor</p>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-[var(--muted-foreground)]" />
                      <span className="text-xs">{pauta.autor.nome}</span>
                    </div>
                  </div>
                )}
                {pauta.dia && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">Dia</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-[var(--muted-foreground)]" />
                      <span className="text-xs">{pauta.dia.nome_dia}</span>
                    </div>
                  </div>
                )}
                {pauta.setor && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">Setor</p>
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-[var(--muted-foreground)]" />
                      <span className="text-xs">{pauta.setor.nome}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status progression */}
              {(next || (pauta.status !== 'descartada' && pauta.status !== 'entregue')) && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">Avançar</p>
                  <div className="flex gap-2">
                    {next && (
                      <button
                        onClick={() => { onMove(pauta.id, next); onClose() }}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {nextLabel}
                      </button>
                    )}
                    {pauta.status !== 'descartada' && pauta.status !== 'entregue' && (
                      <button
                        onClick={() => { onDiscard(pauta.id); onClose() }}
                        disabled={isPending}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Descartar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer (create mode only) */}
        {drawer.mode === 'create' && (
          <div className="border-t border-[var(--border)] px-5 py-4 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!titulo.trim() || isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isPending ? 'Salvando…' : 'Adicionar pauta'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main Board ───────────────────────────────────────────────────────────────

export function PautasBoard({ pautas: initial, edicaoId }: Props) {
  const [pautas, setPautas] = useState(initial)
  useEffect(() => { setPautas(initial) }, [initial])

  const [isPending, startTransition] = useTransition()
  const [drawer, setDrawer] = useState<DrawerState | null>(null)

  function openCreate() {
    setDrawer({ mode: 'create' })
  }

  function openView(pauta: Pauta) {
    setDrawer({ mode: 'view', pauta })
  }

  function closeDrawer() {
    setDrawer(null)
  }

  function move(id: string, novoStatus: StatusPauta) {
    const prevStatus = pautas.find(p => p.id === id)?.status
    setPautas(prev => prev.map(p => p.id === id ? { ...p, status: novoStatus } : p))
    startTransition(async () => {
      try {
        await avancarStatusFetch(id, novoStatus)
      } catch {
        if (prevStatus) {
          setPautas(prev => prev.map(p => p.id === id ? { ...p, status: prevStatus } : p))
        }
      }
    })
  }

  function handleCreate(titulo: string, descricao: string, referencias: string[]) {
    const tempId = 'temp-' + Date.now()
    const now = new Date().toISOString()
    setPautas(prev => [...prev, {
      id: tempId, titulo, descricao: descricao || null,
      referencias, status: 'ideia', criado_em: now,
      setor: null, dia: null, autor: null,
    }])
    closeDrawer()

    startTransition(async () => {
      const result = await criarPautaAction(titulo, descricao, referencias, edicaoId)
      if (result.ok && result.data) {
        setPautas(prev => prev.map(p =>
          p.id === tempId
            ? { ...result.data!, criado_em: now, setor: null, dia: null, autor: null }
            : p
        ))
      } else {
        setPautas(prev => prev.filter(p => p.id !== tempId))
        alert(`Não foi possível salvar a pauta:\n${result.error ?? 'Erro desconhecido'}`)
        setDrawer({ mode: 'create' })
      }
    })
  }

  return (
    <>
      {/* Board */}
      <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-4">
        {COLS.map(col => {
          const itens = pautas.filter(p => p.status === col.key)
          return (
            <div key={col.key} className="flex w-full md:w-72 shrink-0 flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <span className={`flex items-center justify-center rounded p-1 ${col.bg}`}>
                  <span className={col.color}>{col.icon}</span>
                </span>
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="ml-auto text-xs text-[var(--muted-foreground)]">{itens.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {itens.map(pauta => (
                  <PautaCard
                    key={pauta.id}
                    pauta={pauta}
                    isPending={isPending}
                    onMove={move}
                    onDiscard={id => move(id, 'descartada')}
                    onOpen={openView}
                  />
                ))}

                {/* Add button — only in ideia column */}
                {col.key === 'ideia' && (
                  <button
                    onClick={openCreate}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nova pauta
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Descartadas (colapsada) */}
        <div className="flex w-full md:w-64 shrink-0 flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 opacity-50">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-sm font-semibold">Descartadas</span>
            <span className="ml-auto text-xs text-[var(--muted-foreground)]">
              {pautas.filter(p => p.status === 'descartada').length}
            </span>
          </div>
          <div className="space-y-2 opacity-40">
            {pautas.filter(p => p.status === 'descartada').map(pauta => (
              <div key={pauta.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs line-through text-[var(--muted-foreground)]">{pauta.titulo}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <FAB
        onClick={openCreate}
        label="Nova pauta"
        ariaLabel="Criar nova pauta"
        hidden={drawer !== null || isPending}
      />

      {/* Drawer */}
      {drawer && (
        <PautaDrawer
          drawer={drawer}
          edicaoId={edicaoId}
          isPending={isPending}
          onClose={closeDrawer}
          onCreate={handleCreate}
          onMove={move}
          onDiscard={id => move(id, 'descartada')}
        />
      )}
    </>
  )
}
