'use client'

/**
 * Sistema de confirmação modal — substitui `confirm()` nativo (que é feio,
 * bloqueia o thread e não tem como customizar).
 *
 * Uso (estilo imperativo, igual o toast):
 *
 *   import { confirmDialog } from '@/components/confirm-dialog'
 *
 *   async function onDelete() {
 *     const ok = await confirmDialog({
 *       title: 'Remover anexo?',
 *       description: 'Essa ação não pode ser desfeita.',
 *       confirmLabel: 'Remover',
 *       destructive: true,
 *     })
 *     if (!ok) return
 *     // executa o delete
 *   }
 *
 * Renderize <ConfirmDialogHost /> uma vez em layout.tsx (já feito).
 */

import {
  ReactNode, useCallback, useEffect, useRef, useState,
} from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmConfig {
  title:         string
  description?:  string
  confirmLabel?: string
  cancelLabel?:  string
  destructive?:  boolean
  /** Opcional: ícone custom (default: AlertTriangle pra destructive, sem ícone pra normal) */
  icon?:         ReactNode
}

interface ActiveDialog extends ConfirmConfig {
  id:      string
  resolve: (ok: boolean) => void
}

// ── Emitter global ────────────────────────────────────────────────────────────
let SET_ACTIVE: ((dlg: ActiveDialog | null) => void) | null = null

export function confirmDialog(config: ConfirmConfig): Promise<boolean> {
  return new Promise(resolve => {
    if (!SET_ACTIVE) {
      console.warn('[confirmDialog] <ConfirmDialogHost /> não está montado — usando confirm() nativo')
      resolve(window.confirm(config.title + (config.description ? `\n\n${config.description}` : '')))
      return
    }
    SET_ACTIVE({
      ...config,
      id: `cd-${Date.now()}-${Math.random()}`,
      resolve,
    })
  })
}

// ── Host (montar no layout root) ──────────────────────────────────────────────

export function ConfirmDialogHost() {
  const [active, setActive] = useState<ActiveDialog | null>(null)
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    SET_ACTIVE = setActive
    return () => { SET_ACTIVE = null }
  }, [])

  // Foco automático no cancelar (default safer)
  useEffect(() => {
    if (active) {
      const t = setTimeout(() => cancelBtnRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [active])

  const close = useCallback((ok: boolean) => {
    if (active) {
      active.resolve(ok)
      setActive(null)
    }
  }, [active])

  // ESC = cancelar
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
      else if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) {
        // Enter no botão funciona nativamente
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, close])

  if (!active) return null

  const cfg = active
  const isDestr = cfg.destructive ?? false

  return (
    <div
      className="cia-confirm-overlay fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={e => { if (e.target === e.currentTarget) close(false) }}
    >
      <div
        className="cia-confirm-card relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        style={{ boxShadow: '0 24px 48px rgba(10,15,11,0.18), 0 4px 12px rgba(10,15,11,0.08)' }}
      >
        {/* Close X */}
        <button
          onClick={() => close(false)}
          className="absolute right-3 top-3 rounded p-1 text-[var(--muted-foreground)]/50 transition-colors hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 sm:p-6">
          {/* Icon */}
          {(cfg.icon || isDestr) && (
            <div
              className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: isDestr ? 'rgba(220,38,38,0.10)' : 'rgba(46,107,66,0.10)',
                color:      isDestr ? '#dc2626'              : 'var(--green-bright)',
              }}
            >
              {cfg.icon ?? <AlertTriangle className="h-5 w-5" />}
            </div>
          )}

          {/* Title */}
          <h2
            id="confirm-title"
            className="text-lg font-extrabold leading-tight tracking-tight text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
          >
            {cfg.title}
          </h2>

          {/* Description */}
          {cfg.description && (
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
              {cfg.description}
            </p>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={cancelBtnRef}
              onClick={() => close(false)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]/40"
            >
              {cfg.cancelLabel ?? 'Cancelar'}
            </button>
            <button
              onClick={() => close(true)}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-all shadow-sm"
              style={{
                background: isDestr ? '#dc2626' : 'var(--green)',
                boxShadow: isDestr ? '0 2px 8px rgba(220,38,38,0.25)' : '0 2px 8px rgba(46,107,66,0.25)',
              }}
            >
              {cfg.confirmLabel ?? 'Confirmar'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.cia-confirm-overlay) {
          background: rgba(10, 15, 11, 0.45);
          backdrop-filter: blur(4px);
          animation: cia-overlay-in 180ms ease-out;
        }
        :global(.cia-confirm-card) {
          animation: cia-card-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes cia-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cia-card-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}
