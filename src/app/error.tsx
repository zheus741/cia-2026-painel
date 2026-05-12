'use client'

/**
 * Error boundary global do app — captura erros não tratados em qualquer
 * rota (dentro do shell). Renderiza UI amigável com:
 *  • Recuperação via `unstable_retry()` — re-renderiza o segmento
 *  • Botão de voltar pra home
 *  • Digest do erro (referência pra debug em logs)
 *
 * NÃO captura erros no layout raiz — pra isso ver `global-error.tsx`.
 */

import * as React from 'react'
import Link from 'next/link'
import { AlertOctagon, RotateCcw, Home, Copy, Check } from 'lucide-react'

interface Props {
  error:           Error & { digest?: string }
  unstable_retry:  () => void
}

export default function ErrorBoundary({ error, unstable_retry }: Props) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    // Log estruturado para diagnóstico em produção (Vercel runtime logs)
    console.error('[error-boundary]', {
      name:    error.name,
      message: error.message,
      digest:  error.digest,
      stack:   error.stack?.split('\n').slice(0, 5).join('\n'),
    })
  }, [error])

  function copyDigest() {
    const ref = error.digest ?? error.message ?? 'unknown'
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12"
    >
      {/* Ícone com aura suave */}
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full opacity-25 blur-2xl"
          style={{ background: 'radial-gradient(circle, var(--destructive), transparent 70%)' }}
        />
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(192,57,43,0.10)',
            border: '1px solid rgba(192,57,43,0.30)',
            color: 'var(--destructive)',
          }}
        >
          <AlertOctagon className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>

      {/* Headline */}
      <p
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--destructive)' }}
      >
        Algo deu errado
      </p>
      <h1
        className="mt-2 max-w-md text-center text-2xl font-extrabold tracking-tight md:text-3xl"
        style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}
      >
        Não consegui carregar esta página agora
      </h1>
      <p
        className="mt-3 max-w-sm text-center text-sm leading-relaxed"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Pode ter sido um soluço temporário do banco ou da rede. Tenta de
        novo — se persistir, manda a referência abaixo pra equipe de TI.
      </p>

      {/* Ações */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
          style={{
            background: 'var(--green)',
            color: 'white',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-bright)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--green)')}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Tentar novamente
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--muted-foreground)',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(10,15,11,0.04)'
            e.currentTarget.style.color = 'var(--foreground)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--muted-foreground)'
          }}
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar ao início
        </Link>
      </div>

      {/* Referência (digest) — útil pra equipe de TI investigar logs */}
      {(error.digest || error.message) && (
        <div className="mt-8 max-w-md">
          <p
            className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Referência técnica
          </p>
          <button
            onClick={copyDigest}
            className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 font-mono text-[11px] transition-colors"
            style={{
              borderColor: 'var(--border)',
              background: 'rgba(10,15,11,0.03)',
              color: 'var(--muted-foreground)',
            }}
            title="Copiar referência"
          >
            <span className="truncate text-left">
              {error.digest ?? error.message.slice(0, 60)}
            </span>
            {copied
              ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--green-bright)' }} aria-hidden="true" />
              : <Copy  className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />}
          </button>
        </div>
      )}
    </div>
  )
}
