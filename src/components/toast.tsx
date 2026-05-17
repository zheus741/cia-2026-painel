'use client'

/**
 * Sistema de toast minimalista — substitui `alert()` e mensagens inline ad-hoc.
 *
 * Uso:
 *   import { toast } from '@/components/toast'
 *
 *   toast.success('Salvo com sucesso')
 *   toast.error('Falha ao salvar', { description: 'detalhes' })
 *   toast.info('Conexão estabelecida')
 *   toast.warning('Conferir antes de publicar')
 *
 * Renderize <Toaster /> uma vez em layout.tsx (já feito).
 *
 * Implementação: simples, sem dependências. Cada toast tem 4-6s de duração.
 * Pra confirmações destrutivas (delete, etc), use confirm() do browser POR ENQUANTO
 * — vai existir um <ConfirmDialog /> depois (Quick win #11 do roadmap).
 */

import {
  ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

interface ToastData {
  id:           string
  kind:         ToastKind
  message:      string
  description?: string
  /** ms até auto-dismiss. 0 = persiste (manual close) */
  duration:     number
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, opts?: { description?: string; duration?: number }) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Global emitter (pra `toast.success(...)` funcionar sem hook) ─────────────
let GLOBAL_PUSH: ToastContextValue['push'] | null = null

export const toast = {
  success: (message: string, opts?: { description?: string; duration?: number }) =>
    GLOBAL_PUSH?.('success', message, opts),
  error: (message: string, opts?: { description?: string; duration?: number }) =>
    GLOBAL_PUSH?.('error', message, opts),
  info: (message: string, opts?: { description?: string; duration?: number }) =>
    GLOBAL_PUSH?.('info', message, opts),
  warning: (message: string, opts?: { description?: string; duration?: number }) =>
    GLOBAL_PUSH?.('warning', message, opts),
}

// ── Toaster — provider + renderer ────────────────────────────────────────────

export function Toaster() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const counterRef = useRef(0)

  const push: ToastContextValue['push'] = useCallback((kind, message, opts) => {
    const id = `t-${Date.now()}-${counterRef.current++}`
    const t: ToastData = {
      id,
      kind,
      message,
      description: opts?.description,
      duration: opts?.duration ?? (kind === 'error' ? 6500 : 4500),
    }
    setToasts(prev => [...prev, t])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Registra o emissor global
  useEffect(() => {
    GLOBAL_PUSH = push
    return () => { GLOBAL_PUSH = null }
  }, [push])

  return (
    <ToastContext.Provider value={{ push, remove }}>
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
        role="region"
        aria-label="Notificações"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} data={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook (opcional, pra contextos que precisam acessar fora do emissor global) ─

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <Toaster />')
  return ctx
}

// ── ToastItem — renderiza uma notificação ────────────────────────────────────

const KIND_CFG: Record<ToastKind, { icon: ReactNode; color: string; bg: string; border: string }> = {
  success: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'var(--green-bright)',  bg: 'rgba(46,107,66,0.10)',  border: 'rgba(46,107,66,0.40)' },
  error:   { icon: <XCircle className="h-4 w-4" />,      color: '#dc2626',              bg: 'rgba(220,38,38,0.10)',  border: 'rgba(220,38,38,0.40)' },
  info:    { icon: <Info className="h-4 w-4" />,         color: '#3b82f6',              bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.40)' },
  warning: { icon: <AlertCircle className="h-4 w-4" />,  color: '#d97706',              bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.40)' },
}

function ToastItem({ data, onClose }: { data: ToastData; onClose: () => void }) {
  const cfg = KIND_CFG[data.kind]

  // Auto-dismiss
  useEffect(() => {
    if (data.duration <= 0) return
    const t = setTimeout(onClose, data.duration)
    return () => clearTimeout(t)
  }, [data.duration, onClose])

  return (
    <div
      role="status"
      className="cia-toast-enter pointer-events-auto flex items-start gap-3 rounded-xl border bg-[var(--card)] shadow-lg backdrop-blur-sm p-3 pr-2"
      style={{
        borderColor: cfg.border,
        boxShadow: '0 8px 24px rgba(10,15,11,0.10), 0 2px 6px rgba(10,15,11,0.06)',
      }}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] font-bold leading-snug"
          style={{ color: 'var(--foreground)' }}
        >
          {data.message}
        </p>
        {data.description && (
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--muted-foreground)]/80">
            {data.description}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded p-1 text-[var(--muted-foreground)]/50 transition-colors hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <style jsx>{`
        :global(.cia-toast-enter) {
          animation: cia-toast-slide-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cia-toast-slide-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
      `}</style>
    </div>
  )
}
