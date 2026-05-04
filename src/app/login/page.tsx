'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CiaLogo } from '@/components/cia-logo'
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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-8">
      <div className="cia-bg-stars pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-md">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3">
            <CiaLogo showText={false} className="scale-150" />
            <div className="text-center">
              <h1 className="font-[var(--font-display)] text-2xl font-bold tracking-tight">
                CIA 2026
              </h1>
              <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                Painel · Cobertura
              </p>
            </div>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-[var(--success)]" />
              <h2 className="text-lg font-semibold">Link enviado</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Confira sua caixa de entrada em <strong>{email}</strong>.
                Clique no link mágico pra entrar — válido por 1h.
              </p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
              >
                Usar outro e-mail
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--destructive)]">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Enviar link mágico
                  </>
                )}
              </Button>

              <p className="pt-2 text-center text-xs text-[var(--muted-foreground)]">
                Acesso restrito à equipe de cobertura.
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Copa Inter Atléticas 2026 · Uberaba/MG · 04–07 de junho
        </p>
      </div>
    </main>
  )
}
