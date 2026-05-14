'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, BellRing, LayoutList, ClipboardList, Settings, Inbox,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type NotifTipo = 'kanban' | 'escala' | 'sistema'

interface Notif {
  id:         string
  titulo:     string
  corpo:      string | null
  lida:       boolean
  created_at: string
  tipo:       NotifTipo | null
  link:       string | null
}

// Ícone + cor por tipo — escaneabilidade rápida
const TIPO_META: Record<NotifTipo, { icon: typeof Bell; cor: string; bg: string }> = {
  kanban:  { icon: LayoutList,    cor: '#A04A2E', bg: 'rgba(160,74,46,0.10)' },
  escala:  { icon: ClipboardList, cor: '#2e6b42', bg: 'rgba(46,107,66,0.10)' },
  sistema: { icon: Settings,      cor: '#64748b', bg: 'rgba(100,116,139,0.10)' },
}

export function NotifBell({ userId }: { userId: string }) {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Busca inicial + real-time
  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('notificacoes')
      .select('id, titulo, corpo, lida, created_at, tipo, link')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifs((data ?? []) as Notif[]))

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${userId}` },
        payload => {
          setNotifs(prev => [payload.new as Notif, ...prev])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Fechar ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const naoLidas = notifs.filter(n => !n.lida).length

  async function handleToggle() {
    const next = !open
    setOpen(next)

    // Marca todas como lidas ao abrir
    if (next && naoLidas > 0) {
      const supabase = createClient()
      await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', userId)
        .eq('lida', false)
      setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
    }
  }

  // Clica na notificação: navega pro deep-link e fecha o dropdown
  function handleClickNotif(n: Notif) {
    if (n.link) {
      router.push(n.link)
      setOpen(false)
    }
  }

  function fmtTs(ts: string) {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  }

  return (
    <div ref={ref} className="relative">
      {/* Sino */}
      <button
        onClick={handleToggle}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(46,107,66,0.08)]"
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} novas)` : ''}`}
      >
        {naoLidas > 0 ? (
          <BellRing
            className="h-4 w-4"
            style={{ color: '#2e6b42' }}
          />
        ) : (
          <Bell
            className="h-4 w-4"
            style={{ color: 'var(--muted-foreground)' }}
          />
        )}
        {naoLidas > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white animate-pulse"
            style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.50)' }}
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border shadow-xl"
          style={{
            background:  'var(--card)',
            borderColor: 'rgba(46,107,66,0.14)',
            boxShadow:   '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'rgba(46,107,66,0.10)' }}
          >
            <p className="text-sm font-bold text-[var(--foreground)]">Notificações</p>
            {notifs.length > 0 && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {notifs.length} total
              </span>
            )}
          </div>

          {/* Lista */}
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Inbox className="h-7 w-7 text-[var(--muted-foreground)]/30" aria-hidden />
              <p className="text-sm text-[var(--muted-foreground)]">Nenhuma notificação ainda</p>
              <p className="text-[11px] text-[var(--muted-foreground)]/60">
                Você verá aqui quando for escalado, atribuído ou mencionado.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] divide-y divide-[rgba(46,107,66,0.07)] overflow-y-auto">
              {notifs.map((n) => {
                const meta = n.tipo && TIPO_META[n.tipo] ? TIPO_META[n.tipo] : TIPO_META.sistema
                const Icon = meta.icon
                const clickable = !!n.link
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotif(n)}
                    disabled={!clickable}
                    className={`group block w-full px-4 py-3 text-left transition-colors ${
                      clickable
                        ? 'cursor-pointer hover:bg-[rgba(46,107,66,0.04)]'
                        : 'cursor-default'
                    }`}
                    style={{
                      background: !n.lida ? 'rgba(46,107,66,0.04)' : undefined,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Icone por tipo */}
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: meta.bg, border: `1px solid ${meta.cor}28` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: meta.cor }} aria-hidden />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          {!n.lida && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: '#2e6b42' }}
                              aria-label="Não lida"
                            />
                          )}
                          <p className="text-xs font-semibold text-[var(--foreground)] leading-snug">
                            {n.titulo}
                          </p>
                        </div>
                        {n.corpo && (
                          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)] leading-snug line-clamp-2">
                            {n.corpo}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <p
                            className="text-[10px] text-[var(--muted-foreground)]/50 tabular-nums"
                            style={{ fontFamily: 'Orbitron, monospace' }}
                          >
                            {fmtTs(n.created_at)}
                          </p>
                          {clickable && (
                            <span className="text-[10px] font-semibold text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                              Abrir →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Footer */}
          <div
            className="border-t px-4 py-2.5"
            style={{ borderColor: 'rgba(46,107,66,0.08)', background: 'rgba(46,107,66,0.02)' }}
          >
            <a
              href="/minha-escala"
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              Ver minha escala →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
