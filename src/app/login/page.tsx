'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden cia-bg">

      {/* ── Fundo atmosférico ───────────────────────────── */}
      <div className="cia-dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="cia-bg-stars pointer-events-none absolute inset-0 opacity-60" />

      {/* Giroscópio central — marca d'água rotativa */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="cia-spin-slow cia-pulse-glow" style={{ width: 680, height: 680 }}>
          <Image
            src="/assets/giroscopio.png"
            alt=""
            width={680}
            height={680}
            style={{ filter: 'invert(1) hue-rotate(100deg) saturate(1.8)', mixBlendMode: 'screen', opacity: 0.13 }}
            priority
          />
        </div>
      </div>

      {/* Torres — decoração direita */}
      <div className="pointer-events-none absolute bottom-0 right-0 select-none">
        <Image
          src="/assets/torres.png"
          alt=""
          width={220}
          height={520}
          className="opacity-25"
          style={{ filter: 'brightness(0.6) saturate(0.8)' }}
        />
      </div>

      {/* Torres — espelho esquerda, menor */}
      <div className="pointer-events-none absolute bottom-0 left-0 select-none scale-x-[-1]">
        <Image
          src="/assets/torres.png"
          alt=""
          width={150}
          height={360}
          className="opacity-10"
          style={{ filter: 'brightness(0.4) saturate(0.6)' }}
        />
      </div>

      {/* ── Conteúdo central ────────────────────────────── */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 px-4 cia-fade-in">

        {/* Logo + identidade */}
        <div className="flex flex-col items-center gap-4">
          <div className="cia-float">
            <Image
              src="/assets/logo.png"
              alt="CIA 2026"
              width={100}
              height={100}
              className="drop-shadow-[0_0_24px_rgba(74,138,92,0.5)]"
              priority
            />
          </div>

          <div className="text-center">
            <h1
              className="text-3xl font-bold tracking-[0.15em] cia-gold-text"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              CIA 2026
            </h1>
            <div className="cia-gold-rule mx-auto mt-2 w-40" />
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              Painel de Cobertura
            </p>
          </div>
        </div>

        {/* Card do formulário */}
        <div className="cia-glass cia-glow w-full rounded-2xl p-7">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green-dim)]/30 ring-1 ring-[var(--green)]/40">
                <CheckCircle2 className="h-7 w-7 text-[var(--green-bright)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Link enviado</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Confira a caixa de entrada de <strong className="text-[var(--foreground)]">{email}</strong>.
                  Válido por 1h.
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-xs text-[var(--muted-foreground)] underline underline-offset-4 hover:text-[var(--foreground)]"
              >
                Usar outro e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/60 px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(74,138,92,0.35)] transition-all hover:bg-[var(--green-bright)] hover:shadow-[0_0_28px_rgba(74,138,92,0.5)] disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Mail className="h-4 w-4" /> Enviar link mágico</>
                )}
              </button>

              <p className="text-center text-[11px] text-[var(--muted-foreground)]">
                Acesso restrito à equipe de cobertura.
              </p>
            </form>
          )}
        </div>

        {/* Slogan */}
        <Image
          src="/assets/slogan.png"
          alt="O Tempo Que Te Pertence"
          width={280}
          height={40}
          className="opacity-20 invert"
        />
      </div>
    </main>
  )
}
