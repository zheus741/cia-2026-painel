/**
 * <PageHeader /> — Cabeçalho padronizado de página
 *
 * Substitui o padrão repetido:
 *   <div className="cia-page-header">
 *     <p className="cia-page-header__eyebrow">...</p>
 *     <h1 className="cia-page-header__title">...</h1>
 *     <p className="cia-page-header__subtitle">...</p>
 *   </div>
 *
 * Suporta um slot `action` opcional pra CTAs (botão "Novo X", link "Modo TV", etc).
 * Sticky por padrão = false; usar `sticky` quando o conteúdo abaixo é muito longo
 * (kanban, listas grandes) pra manter o título visível durante scroll.
 */

import { ReactNode } from 'react'

interface PageHeaderProps {
  /** Pequeno label uppercase acima do título (categoria/seção). */
  eyebrow?: string
  /** Título principal — h1 grande. */
  title: string
  /** Subtítulo curto explicando a página. */
  subtitle?: string
  /** Slot pra CTAs no canto direito (botão, link, etc). */
  action?: ReactNode
  /** Quando true, faz o header grudar no topo ao scrollar. Útil pra kanban. */
  sticky?: boolean
  /** ClassName extra pra customizações pontuais. */
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  sticky = false,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={[
        'cia-page-header',
        'flex flex-wrap items-start justify-between gap-4',
        sticky ? 'sticky top-0 z-10 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]/40' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="cia-page-header__eyebrow">{eyebrow}</p>
        )}
        <h1 className="cia-page-header__title">{title}</h1>
        {subtitle && (
          <p className="cia-page-header__subtitle">{subtitle}</p>
        )}
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      )}
    </header>
  )
}
