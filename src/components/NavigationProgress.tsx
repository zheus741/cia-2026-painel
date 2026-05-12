'use client'

/**
 * Barra de progresso de navegação — estilo GitHub/YouTube.
 *
 * Mostra uma linha fina no topo da tela durante transições de rota.
 * Zero custo de performance: roda inteiramente no cliente, nenhum
 * dado extra é buscado, nenhuma request adicional é feita.
 *
 * Como funciona:
 *  1. Detecta início de navegação via evento DOM 'nav:start'
 *     — disparado por <Link> via mousedown e por router.push() via
 *       emitNavStart() antes de cada chamada programática.
 *  2. Detecta conclusão via usePathname + useSearchParams: quando a
 *     URL muda, a barra vai a 100% e some.
 *
 * Cor: var(--green-bright) para manter coerência com o tema CIA.
 */

import * as React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// ── Utilitário exportado ───────────────────────────────────────────────────────
/**
 * Dispara o evento de início de navegação para navegações programáticas.
 * Chame ANTES de qualquer router.push() / router.replace() que não seja
 * originado de um clique em <a>.
 *
 * @example
 *   emitNavStart()
 *   router.push('/conteudos?dia=abc')
 */
export function emitNavStart() {
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new Event('nav:start'))
  }
}

// ── Componente interno (usa useSearchParams → precisa de <Suspense>) ──────────
function Bar() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  type State = 'idle' | 'loading' | 'done'
  const [state, setState]   = React.useState<State>('idle')
  const [pct,   setPct]     = React.useState(0)

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const urlRef      = React.useRef(`${pathname}?${searchParams}`)
  const activeRef   = React.useRef(false)   // evita overlap de animações

  // ── Funções de controle da barra ─────────────────────────────────────────────
  const startBar = React.useCallback(() => {
    if (activeRef.current) return
    activeRef.current = true

    clearInterval(intervalRef.current!)
    setPct(0)
    setState('loading')

    // Avança até ~85% de forma não-linear — mais rápido no começo, lento no fim
    let current = 0
    intervalRef.current = setInterval(() => {
      current += Math.random() * 12 * (1 - current / 100)
      setPct(Math.min(current, 85))
    }, 180)
  }, [])

  const completeBar = React.useCallback(() => {
    if (!activeRef.current) return
    clearInterval(intervalRef.current!)

    // Vai a 100% e some após 400ms
    setPct(100)
    setState('done')
    setTimeout(() => {
      setState('idle')
      setPct(0)
      activeRef.current = false
    }, 420)
  }, [])

  // ── Detecta conclusão de navegação pela mudança de URL ───────────────────────
  React.useEffect(() => {
    const nextUrl = `${pathname}?${searchParams}`
    if (nextUrl !== urlRef.current) {
      urlRef.current = nextUrl
      completeBar()
    }
  }, [pathname, searchParams, completeBar])

  // ── Detecta início de navegação ───────────────────────────────────────────────
  React.useEffect(() => {
    // Evento programático (router.push via emitNavStart)
    const handleCustom = () => startBar()
    document.addEventListener('nav:start', handleCustom)

    // Cliques em <a> internos (links da sidebar, cards, etc.)
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      // Ignora links externos, âncoras, mailto, tel e download
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.hasAttribute('download')
      ) return
      startBar()
    }
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('nav:start', handleCustom)
      document.removeEventListener('click', handleClick)
    }
  }, [startBar])

  // ── Render ────────────────────────────────────────────────────────────────────
  if (state === 'idle') return null

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      style={{
        position:   'fixed',
        top:        0,
        left:       0,
        zIndex:     9999,
        height:     '2.5px',
        width:      `${pct}%`,
        background: 'var(--green-bright)',
        boxShadow:  '0 0 8px 1px var(--green-bright)',
        borderRadius: '0 2px 2px 0',
        // Transição suave exceto no salto final para 100%
        transition: state === 'done'
          ? 'width 200ms ease-out, opacity 200ms 220ms ease'
          : 'width 180ms ease-out',
        opacity: state === 'done' ? 0 : 1,
        // Previne layout shift
        pointerEvents: 'none',
        willChange:    'width, opacity',
      }}
    />
  )
}

// ── Export público com Suspense ────────────────────────────────────────────────
// useSearchParams() exige Suspense boundary; o fallback é null pois a barra
// só é necessária após hidratação de qualquer forma.
export function NavigationProgress() {
  return (
    <React.Suspense fallback={null}>
      <Bar />
    </React.Suspense>
  )
}
