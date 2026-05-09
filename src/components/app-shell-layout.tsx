'use client'

import * as React from 'react'
import Link from 'next/link'
import { CiaLogo } from '@/components/cia-logo'
import { AdminSidebar } from '@/components/admin/sidebar'
import { signOut } from '@/app/actions'
import { LogOut, Menu, Tv2 } from 'lucide-react'
import { NotifBell } from '@/components/NotifBell'
import { QuickCapture } from '@/components/QuickCapture'

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

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

interface Props {
  profile: { nome?: string | null; role?: string | null; funcao_principal?: string | null } | null
  userEmail?: string | null
  userId?:    string
  section?: string
  fullWidth?: boolean
  children: React.ReactNode
}

export function AppShellLayout({ profile, userEmail, userId, section, fullWidth = false, children }: Props) {
  const [collapsed,   setCollapsed]   = React.useState(false)
  const [mobileOpen,  setMobileOpen]  = React.useState(false)

  // Persistir estado collapsed no localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('cia-sidebar-collapsed')
      if (saved !== null) setCollapsed(saved === 'true')
    } catch { /* noop */ }
  }, [])

  // Fechar sidebar mobile ao mudar de rota (resize detecta mobile)
  React.useEffect(() => {
    function onResize() { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('cia-sidebar-collapsed', String(next)) } catch { /* noop */ }
  }

  const initials  = profile?.nome  ? getInitials(profile.nome) : '??'
  const roleColor = profile?.role  ? (ROLE_COLOR[profile.role] ?? '#6ab87e') : '#6ab87e'
  const roleName  = profile?.role  ? (ROLE_LABEL[profile.role] ?? profile.role) : '—'

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <header className="mac-toolbar sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between px-4">

        <div className="flex items-center gap-2.5">
          {/* Hamburger */}
          <button
            onClick={() => {
              if (window.innerWidth < 768) setMobileOpen(true)
              else toggleCollapsed()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(10,15,11,0.06)]"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" style={{ color: 'rgba(10,15,11,0.42)' }} />
          </button>

          <Link href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
            <CiaLogo size={26} />
          </Link>

          {section && (
            <div className="flex items-center gap-2">
              <span style={{ color: 'rgba(10,15,11,0.18)', fontSize: 15, fontWeight: 300, lineHeight: 1 }}>/</span>
              <span className="hidden sm:block" style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(10,15,11,0.52)',
                letterSpacing: '-0.01em',
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              }}>
                {section}
              </span>
            </div>
          )}
        </div>

        {/* Right: notif + tv + user pill + logout */}
        <div className="flex items-center gap-2">
          {userId && <NotifBell userId={userId} />}

          {/* TV pill */}
          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-all"
            style={{
              borderRadius: 999,
              padding: '4px 11px 4px 9px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: '#2e6b42',
              border: '1px solid rgba(46,107,66,0.22)',
              background: 'rgba(46,107,66,0.07)',
            }}
            title="Abrir Modo TV"
          >
            <Tv2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">TV</span>
          </a>

          {/* User pill */}
          <div
            className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1"
            style={{ background: 'rgba(10,15,11,0.05)', border: '1px solid rgba(10,15,11,0.08)' }}
          >
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{ background: `${roleColor}18`, border: `1px solid ${roleColor}36`, color: roleColor }}
            >
              {initials}
            </div>
            <span className="hidden sm:block" style={{
              fontSize: 12, fontWeight: 600,
              color: '#0A0F0B',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            }}>
              {profile?.nome?.split(' ')[0] ?? userEmail}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase',
              padding: '1px 5px',
              borderRadius: 99,
              background: `${roleColor}14`,
              color: roleColor,
            }}>
              {roleName}
            </span>
          </div>

          <form action={signOut}>
            <button type="submit" className="mac-logout-btn" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Mobile backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
          style={{ opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? 'auto' : 'none' }}
          aria-hidden
        />

        <AdminSidebar
          role={profile?.role ?? undefined}
          funcao={profile?.funcao_principal ?? undefined}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <main
          className="relative flex-1 overflow-auto"
          style={{ background: 'var(--background)' }}
        >
          {fullWidth ? (
            <div className="relative z-10 h-full">{children}</div>
          ) : (
            <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
          )}
          <QuickCapture />
        </main>
      </div>
    </div>
  )
}
