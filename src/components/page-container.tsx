/**
 * <PageContainer /> — Wrapper padronizado de página
 *
 * Padroniza o respiro lateral + vertical em todas as páginas. Use em CONJUNTO
 * com layouts `fullWidth` (AppShellLayout sem max-width default) — esse
 * componente assume essa responsabilidade.
 *
 * Variantes:
 *   - default — max-w-[1640px] + padding escalonado (1ª/2ª/conferências)
 *   - narrow  — max-w-[960px]  + mesmo padding (formulários, perfil)
 *   - wide    — max-w-[1920px] + mesmo padding (placar, modos TV)
 *   - bleed   — sem max-width, sem padding (mapas, croqui — tela cheia)
 *
 * Espaçamento vertical:
 *   - default: space-y-6 entre filhos
 *   - tight:   space-y-3 (compact)
 *   - loose:   space-y-8 (editorial)
 *   - none:    sem space-y (controle externo)
 */

import { ReactNode } from 'react'

interface PageContainerProps {
  children:  ReactNode
  /** Largura máxima do conteúdo. Default 'standard' = 1640px (cabe bracket 16 times). */
  size?:     'narrow' | 'standard' | 'wide' | 'bleed'
  /** Espaço entre filhos diretos. Default 'default'. */
  gap?:      'none' | 'tight' | 'default' | 'loose'
  className?: string
}

const SIZE_CLASS: Record<NonNullable<PageContainerProps['size']>, string> = {
  narrow:   'mx-auto w-full max-w-[960px]  px-4 py-6 sm:px-6 md:py-8',
  standard: 'mx-auto w-full max-w-[1640px] px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12',
  wide:     'mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12',
  bleed:    'w-full',  // sem padding, edge-to-edge
}

const GAP_CLASS: Record<NonNullable<PageContainerProps['gap']>, string> = {
  none:    '',
  tight:   'space-y-3',
  default: 'space-y-6',
  loose:   'space-y-8',
}

export function PageContainer({
  children,
  size      = 'standard',
  gap       = 'default',
  className = '',
}: PageContainerProps) {
  return (
    <div className={[SIZE_CLASS[size], GAP_CLASS[gap], className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
