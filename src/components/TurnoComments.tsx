'use client'

import {
  useState, useEffect, useRef, useTransition, useCallback,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { addComentarioTurno, deleteComentarioTurno } from '@/app/actions/turno'
import { Send, Trash2, Loader2, MessageSquare, ChevronDown } from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Comentario {
  id:         string
  turno_id:   string
  user_id:    string
  texto:      string
  created_at: string
  author:     { nome: string | null } | null   // join com profiles
}

interface Props {
  turnoId:     string
  initialCount?: number   // badge inicial antes de abrir (para evitar fetch extra)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(nome: string | null | undefined): string {
  if (!nome) return '?'
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TurnoComments({ turnoId, initialCount = 0 }: Props) {
  const [open, setOpen]           = useState(false)
  const [comments, setComments]   = useState<Comentario[]>([])
  const [count, setCount]         = useState(initialCount)
  const [loaded, setLoaded]       = useState(false)
  const [text, setText]           = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  // ── Busca user atual (client-side) ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => setCurrentUserRole(data?.role ?? null))
    })
  }, [])

  // ── Carrega comentários quando abre ───────────────────────────────────────
  const load = useCallback(async () => {
    if (loaded) return
    const { data } = await supabase
      .from('comentarios_turno')
      .select('id, turno_id, user_id, texto, created_at, author:profiles(nome)')
      .eq('turno_id', turnoId)
      .order('created_at', { ascending: true })

    const rows = (data ?? []).map((r) => ({
      ...r,
      author: Array.isArray(r.author)
        ? (r.author[0] as { nome: string | null } | undefined) ?? null
        : r.author as { nome: string | null } | null,
    })) as Comentario[]
    setComments(rows)
    setCount(rows.length)
    setLoaded(true)
  }, [loaded, turnoId])

  useEffect(() => {
    if (open) {
      load()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open, load])

  // Scroll to bottom quando novos comentários chegam
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments, open])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    let alive = true

    const channel = supabase
      .channel(`turno-comments-${turnoId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'comentarios_turno',
          filter: `turno_id=eq.${turnoId}`,
        },
        async (payload) => {
          // Busca o nome do autor para o novo comentário
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', payload.new.user_id)
            .maybeSingle()

          // Evita setState depois de unmount (alive flag)
          if (!alive) return

          const novo: Comentario = {
            id:         payload.new.id,
            turno_id:   payload.new.turno_id,
            user_id:    payload.new.user_id,
            texto:      payload.new.texto,
            created_at: payload.new.created_at,
            author:     profile ? { nome: profile.nome } : null,
          }

          setComments((prev) => {
            // Evita duplicatas (pode vir do optimistic update)
            if (prev.some((c) => c.id === novo.id)) return prev
            return [...prev, novo]
          })
          setCount((n) => n + 1)
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'DELETE',
          schema: 'public',
          table:  'comentarios_turno',
          filter: `turno_id=eq.${turnoId}`,
        },
        (payload) => {
          if (!alive) return
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id))
          setCount((n) => Math.max(0, n - 1))
        },
      )
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
  }, [turnoId])

  // ── Enviar comentário ─────────────────────────────────────────────────────
  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || pending) return

    setText('')
    startTransition(async () => {
      await addComentarioTurno(turnoId, trimmed)
      // O realtime vai adicionar o comentário via subscription
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Deletar comentário ────────────────────────────────────────────────────
  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteComentarioTurno(id)
    })
  }

  const canDelete = (c: Comentario) =>
    c.user_id === currentUserId ||
    currentUserRole === 'admin' ||
    currentUserRole === 'coordenacao'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border-t pt-3 mt-1" style={{ borderColor: 'rgba(46,107,66,0.10)' }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left transition-colors"
        style={{ color: count > 0 ? '#2e6b42' : 'var(--muted-foreground)' }}
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-xs font-semibold">
          {count > 0
            ? `${count} comentário${count === 1 ? '' : 's'}`
            : 'Comentários'}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Thread */}
      {open && (
        <div className="mt-3 flex flex-col gap-0.5">
          {/* Lista */}
          {!loaded ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-2 text-center text-xs text-[var(--muted-foreground)]">
              Nenhum comentário ainda. Seja o primeiro!
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {comments.map((c) => {
                const isOwn = c.user_id === currentUserId
                return (
                  <div
                    key={c.id}
                    className={`group flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: isOwn ? '#2e6b42' : '#374151' }}
                    >
                      {initials(c.author?.nome)}
                    </div>

                    {/* Bubble */}
                    <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-[var(--foreground)]">
                          {isOwn ? 'Você' : (c.author?.nome?.split(' ')[0] ?? '?')}
                        </span>
                        <span className="text-[9px] text-[var(--muted-foreground)]">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <div className="flex items-start gap-1">
                        <div
                          className="rounded-2xl px-3 py-1.5 text-xs leading-relaxed"
                          style={
                            isOwn
                              ? { background: 'rgba(46,107,66,0.12)', color: '#101d12' }
                              : { background: 'rgba(0,0,0,0.04)',      color: '#1f2937' }
                          }
                        >
                          {c.texto}
                        </div>
                        {canDelete(c) && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="mt-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div
            className="mt-2 flex items-end gap-2 rounded-xl border p-2"
            style={{ borderColor: 'rgba(46,107,66,0.20)', background: 'rgba(46,107,66,0.03)' }}
          >
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreva um comentário... (Enter envia)"
              rows={1}
              maxLength={500}
              className="flex-1 resize-none bg-transparent text-xs outline-none placeholder:text-[var(--muted-foreground)] leading-relaxed"
              style={{ minHeight: 20, maxHeight: 80 }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 80)}px`
              }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || pending}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all"
              style={{
                background: text.trim() ? '#2e6b42' : 'rgba(46,107,66,0.15)',
                color:      text.trim() ? '#fff'     : 'rgba(46,107,66,0.40)',
              }}
            >
              {pending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />
              }
            </button>
          </div>

          {text.length > 400 && (
            <p className="text-right text-[9px] text-[var(--muted-foreground)]">
              {500 - text.length} restantes
            </p>
          )}
        </div>
      )}
    </div>
  )
}
