import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from '@/app/actions'
import { LogOut } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  coordenacao: 'Coordenação',
  lider_area:  'Líder',
  operador:    'Operador',
}

interface AppShellProps {
  children: React.ReactNode
  section?: string
  /** If true, the main content area is not constrained — good for full-width pages like Kanban */
  fullWidth?: boolean
}

export async function AppShell({ children, section, fullWidth = false }: AppShellProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-5"
        style={{ background: 'rgba(6,12,7,0.90)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-4">
          <Link href="/">
            <CiaLogo size={28} />
          </Link>
          {section && (
            <>
              <div className="h-4 w-px bg-[var(--border)]" />
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {section}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {profile?.nome ?? user.email}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {profile?.role ? ROLE_LABEL[profile.role] : '—'}
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--destructive)]/50 hover:text-[var(--destructive)]"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="relative flex-1 overflow-auto">
          {/* Giroscópio sutil de fundo */}
          <div className="pointer-events-none absolute right-0 top-0 select-none">
            <div className="cia-spin-reverse">
              <Image src="/assets/giroscopio.png" alt="" width={380} height={380}
                style={{ filter: 'invert(1) hue-rotate(100deg) saturate(1.2)', mixBlendMode: 'screen', opacity: 0.06 }} />
            </div>
          </div>

          {fullWidth ? (
            <div className="relative z-10 h-full">
              {children}
            </div>
          ) : (
            <div className="relative z-10 mx-auto max-w-6xl px-6 py-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
