import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from '@/app/actions'
import { LogOut, ArrowLeft } from 'lucide-react'
import { ProfileClient } from './ProfileClient'

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email, role, funcao_principal, foto_url, telefone')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/')

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden cia-bg">

      <div className="cia-dot-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="cia-bg-stars pointer-events-none absolute inset-0 opacity-30" />

      {/* Giroscópio */}
      <div className="pointer-events-none absolute -right-28 -top-28 select-none">
        <div className="cia-spin-slow cia-pulse-glow">
          <Image
            src="/assets/giroscopio.png"
            alt=""
            width={400}
            height={400}
            style={{
              filter: 'invert(1) hue-rotate(100deg) saturate(1.5)',
              mixBlendMode: 'screen',
              opacity: 0.07,
            }}
          />
        </div>
      </div>

      {/* Header */}
      <header
        className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-4 sm:px-6"
        style={{ background: 'rgba(6,12,7,0.88)', backdropFilter: 'blur(24px)' }}
      >
        <CiaLogo />
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--green-dim)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--destructive)]/50 hover:text-[var(--destructive)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-md">

          <div className="mb-8 cia-fade-in">
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--gold)' }}>
              Meu perfil
            </p>
            <h1
              className="mt-2 text-3xl font-bold cia-gold-text"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {profile.nome.split(' ')[0]}
            </h1>
            <div className="cia-gold-rule mt-3 w-32" />
          </div>

          <ProfileClient
            userId={user.id}
            profile={profile}
          />
        </div>
      </main>
    </div>
  )
}
