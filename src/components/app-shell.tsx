import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from '@/app/actions'
import { LogOut, ChevronRight } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  coordenacao: 'Coord',
  lider_area:  'Líder',
  operador:    'Operador',
}

const ROLE_COLOR: Record<string, string> = {
  admin:       '#2e6b42',
  coordenacao: '#8a5f06',
  lider_area:  '#2563eb',
  operador:    '#64748b',
}

interface AppShellProps {
  children: React.ReactNode
  section?: string
  fullWidth?: boolean
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export async function AppShell({ children, section, fullWidth = false }: AppShellProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, funcao_principal')
    .eq('id', user.id)
    .maybeSingle()

  const initials  = profile?.nome ? getInitials(profile.nome) : '??'
  const roleColor = profile?.role ? (ROLE_COLOR[profile.role] ?? '#6ab87e') : '#6ab87e'
  const roleName  = profile?.role ? (ROLE_LABEL[profile.role] ?? profile.role) : '—'

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* ── macOS Toolbar ───────────────────────────────────────────── */}
      <header className="mac-toolbar sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between px-4">

        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
            <CiaLogo size={26} />
          </Link>

          {section && (
            <div className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" style={{ color: 'rgba(16,29,18,0.25)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' }}>
                {section}
              </span>
            </div>
          )}
        </div>

        {/* Right: User pill + logout */}
        <div className="flex items-center gap-3">

          {/* User pill */}
          <div
            className="flex items-center gap-2.5 rounded-full px-3 py-1.5"
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Avatar circle */}
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                background: `${roleColor}18`,
                border: `1px solid ${roleColor}40`,
                color: roleColor,
                letterSpacing: '0.05em',
              }}
            >
              {initials}
            </div>

            {/* Name + role */}
            <div className="hidden sm:block">
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.2 }}>
                {profile?.nome ?? user.email}
              </p>
            </div>

            {/* Role badge */}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: roleColor,
              }}
            >
              {roleName}
            </span>
          </div>

          {/* Logout */}
          <form action={signOut}>
            <button type="submit" className="mac-logout-btn" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AdminSidebar role={profile?.role} funcao={profile?.funcao_principal} />

        <main
          className="relative flex-1 overflow-auto"
          style={{ background: 'var(--background)' }}
        >

          {fullWidth ? (
            <div className="relative z-10 h-full">{children}</div>
          ) : (
            <div className="relative z-10 mx-auto max-w-6xl px-6 py-6">{children}</div>
          )}
        </main>
      </div>
    </div>
  )
}
