'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(
        error.message.includes('Invalid login')
          ? 'E-mail ou senha incorretos.'
          : error.message
      )
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden cia-bg">

      {/* ── Fundo atmosférico ───────────────────────────── */}
      <div className="cia-dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="cia-bg-stars pointer-events-none absolute inset-0 opacity-60" />

      {/* Giroscópio central */}
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

      {/* Torres direita */}
      <div className="pointer-events-none absolute bottom-0 right-0 select-none">
        <Image src="/assets/torres.png" alt="" width={220} height={520}
          className="opacity-25" style={{ filter: 'brightness(0.6) saturate(0.8)' }} />
      </div>

      {/* Torres esquerda */}
      <div className="pointer-events-none absolute bottom-0 left-0 select-none scale-x-[-1]">
        <Image src="/assets/torres.png" alt="" width={150} height={360}
          className="opacity-10" style={{ filter: 'brightness(0.4) saturate(0.6)' }} />
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
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
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

            {/* Senha */}
            <div className="space-y-1.5">
              <label htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/60 px-4 py-2.5 pr-10 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
                : <><Lock className="h-4 w-4" /> Entrar</>
              }
            </button>

            <p className="text-center text-[11px] text-[var(--muted-foreground)]">
              Acesso restrito à equipe de cobertura.
            </p>
          </form>
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
