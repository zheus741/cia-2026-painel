'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notif {
  id:         string
  titulo:     string
  corpo:      string | null
  lida:       boolean
  created_at: string
}

export function NotifBell({ userId }: { userId: string }) {
  const [notifs, setNotifs]  = useState<Notif[]>([])
  const [open,   setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Busca inicial + real-time
  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('notificacoes')
      .select('id, titulo, corpo, lida, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifs(data ?? []))

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
        aria-label="Notificações"
      >
        <Bell
          className="h-4 w-4"
          style={{ color: naoLidas > 0 ? '#2e6b42' : 'var(--muted-foreground)' }}
        />
        {naoLidas > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.50)' }}
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border shadow-xl"
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
            <div className="px-4 py-8 text-center">
              <p className="text-2xl">🔔</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Nenhuma notificação ainda</p>
            </div>
          ) : (
            <div className="max-h-[360px] divide-y divide-[rgba(46,107,66,0.07)] overflow-y-auto">
              {notifs.map((n, i) => (
                <div
                  key={n.id}
                  className="px-4 py-3 transition-colors hover:bg-[rgba(46,107,66,0.03)]"
                  style={{
                    background: !n.lida && i === 0 ? 'rgba(46,107,66,0.04)' : undefined,
                    animationDelay: `${i * 30}ms`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.lida && (
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: '#2e6b42' }}
                      />
                    )}
                    <div className={!n.lida ? '' : 'pl-3.5'}>
                      <p className="text-xs font-semibold text-[var(--foreground)] leading-snug">
                        {n.titulo}
                      </p>
                      {n.corpo && (
                        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)] leading-snug">
                          {n.corpo}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--muted-foreground)]/50 tabular-nums"
                        style={{ fontFamily: 'Orbitron, monospace' }}>
                        {fmtTs(n.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
