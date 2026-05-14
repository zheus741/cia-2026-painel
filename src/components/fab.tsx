'use client'

/**
 * <FAB /> — Floating Action Button reutilizável
 *
 * Posiciona automaticamente:
 *   - Mobile: bottom-20 right-5 (acima da bottom nav, sem cobrir conteúdo)
 *   - Desktop: bottom-6 right-5
 *
 * Brand: verde primário com sombra suave matching --green
 *
 * Uso:
 *   <FAB onClick={() => setOpen(true)} label="Nova Pauta" />
 *
 * Pra ações conditionais (ex: só admin):
 *   {canCreate && <FAB ... />}
 */

import { Plus } from 'lucide-react'
import { ReactNode } from 'react'

interface FABProps {
  /** Handler do clique. */
  onClick: () => void
  /** Label visível em desktop (à direita do ícone, expansível). Em mobile mostra só ícone. */
  label?: string
  /** Ícone customizado. Default: Plus. */
  icon?: ReactNode
  /** ARIA label (obrigatório quando label não é mostrado em mobile). */
  ariaLabel: string
  /** Esconde o FAB temporariamente sem desmontar. */
  hidden?: boolean
  /** Override do z-index — útil se há overlays customizados. Default: 40 (abaixo da bottom nav que é 30, acima do conteúdo). */
  zIndex?: number
}

export function FAB({ onClick, label, icon, ariaLabel, hidden, zIndex = 40 }: FABProps) {
  if (hidden) return null
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="group fixed bottom-20 right-5 md:bottom-6 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2e6b42]/30 transition-all hover:scale-105 active:scale-95 md:hover:px-5"
      style={{
        background: 'linear-gradient(135deg, #2e6b42 0%, #1a4a2e 100%)',
        zIndex,
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center shrink-0">
        {icon ?? <Plus className="h-5 w-5" strokeWidth={2.5} />}
      </span>
      {label && (
        <span className="hidden md:inline-block whitespace-nowrap">{label}</span>
      )}
    </button>
  )
}
