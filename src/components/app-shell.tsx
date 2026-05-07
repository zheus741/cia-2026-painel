import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  admin:       '#6ab87e',
  coordenacao: '#e8b94f',
  lider_area:  '#60a5fa',
  operador:    '#94a3b8',
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
    .select('nome, role')
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
              <ChevronRight
                className="h-3 w-3"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  color: 'rgba(180,210,185,0.65)',
                  fontFamily: 'Rajdhani, system-ui, sans-serif',
                }}
              >
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
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Avatar circle */}
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                background: `${roleColor}22`,
                border: `1px solid ${roleColor}44`,
                color: roleColor,
                fontFamily: 'Rajdhani, sans-serif',
                letterSpacing: '0.05em',
              }}
            >
              {initials}
            </div>

            {/* Name + role */}
            <div className="hidden sm:block">
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(195,225,200,0.88)',
                  lineHeight: 1.2,
                  fontFamily: 'Rajdhani, sans-serif',
                  letterSpacing: '0.02em',
                }}
              >
                {profile?.nome ?? user.email}
              </p>
            </div>

            {/* Role badge */}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: roleColor,
                opacity: 0.85,
                fontFamily: 'Rajdhani, sans-serif',
              }}
            >
              {roleName}
            </span>
          </div>

          {/* Logout */}
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
              title="Sair"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(155,185,160,0.5)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'rgba(192,57,43,0.15)'
                el.style.borderColor = 'rgba(192,57,43,0.30)'
                el.style.color = '#f87171'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'rgba(255,255,255,0.04)'
                el.style.borderColor = 'rgba(255,255,255,0.07)'
                el.style.color = 'rgba(155,185,160,0.5)'
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AdminSidebar />

        <main
          className="relative flex-1 overflow-auto"
          style={{ background: 'rgba(6,10,7,0.98)' }}
        >
          {/* Giroscópio decorativo */}
          <div className="pointer-events-none absolute right-0 top-0 select-none">
            <div className="cia-spin-reverse">
              <Image
                src="/assets/giroscopio.png"
                alt=""
                width={340}
                height={340}
                style={{
                  filter: 'invert(1) hue-rotate(100deg) saturate(1.1)',
                  mixBlendMode: 'screen',
                  opacity: 0.045,
                }}
              />
            </div>
          </div>

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
