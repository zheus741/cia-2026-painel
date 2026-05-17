/**
 * <EmptyState /> — Estado vazio padronizado
 *
 * Substitui blocos repetidos do tipo:
 *
 *   <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
 *     <Icon className="..." />
 *     <p>Nenhum item encontrado</p>
 *   </div>
 *
 * Variantes:
 *   - default — uso geral em listas vazias
 *   - bordered — com borda tracejada (default)
 *   - plain — sem borda (use em contextos já dentro de card)
 *
 * Suporta:
 *   - icon (lucide ou qualquer ReactNode)
 *   - title + subtitle
 *   - action (botão CTA opcional)
 *   - children (slot livre — diagnóstico, info adicional)
 */

import { ReactNode } from 'react'

interface EmptyStateProps {
  /** Icone — geralmente um lucide-react component */
  icon?:    ReactNode
  /** Título — geralmente uma frase curta ("Nenhum jogo neste dia") */
  title:    string
  /** Subtítulo opcional explicando o estado / próximos passos */
  subtitle?: string
  /** Slot pra CTA (botão ou link) */
  action?:  ReactNode
  /** Slot livre adicional (ex: card de diagnóstico) */
  children?: ReactNode
  /** Variante visual */
  variant?: 'bordered' | 'plain'
  /** Tamanho do padding interno */
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const PADDING: Record<NonNullable<EmptyStateProps['size']>, string> = {
  sm:      'p-6',
  default: 'p-10',
  lg:      'p-16',
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  children,
  variant = 'bordered',
  size    = 'default',
  className = '',
}: EmptyStateProps) {
  const base =
    variant === 'bordered'
      ? 'rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/30'
      : ''

  return (
    <div className={[base, PADDING[size], 'text-center', className].filter(Boolean).join(' ')}>
      {icon && (
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center text-[var(--muted-foreground)]/30 [&_svg]:h-8 [&_svg]:w-8">
          {icon}
        </div>
      )}
      <p className="text-sm font-bold text-[var(--foreground)]">
        {title}
      </p>
      {subtitle && (
        <p className="mx-auto mt-1.5 max-w-md text-xs text-[var(--muted-foreground)]/65 leading-relaxed">
          {subtitle}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
      {children && (
        <div className="mx-auto mt-5 max-w-md text-left">
          {children}
        </div>
      )}
    </div>
  )
}
