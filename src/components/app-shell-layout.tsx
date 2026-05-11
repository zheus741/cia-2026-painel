'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from '@/app/actions'
import { LogOut, Menu, Tv2, X, ChevronDown } from 'lucide-react'
import { NotifBell } from '@/components/NotifBell'
import { QuickCapture } from '@/components/QuickCapture'
import { cn } from '@/lib/utils'
import {
  Camera, Radio, CheckSquare, Lightbulb, LayoutList, BookOpen,
  UserCircle, ClipboardList, Aperture, Swords, MapPin, Music, PartyPopper,
  Heart, Settings, Calendar, Map, Trophy, Users, GitBranch, Tag, UserCog,
  FileSpreadsheet, Users2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type NavItem  = { label: string; href: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }
type NavGroup = { label: string; items: NavItem[] }

// ── Role meta ──────────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', coordenacao: 'Coord', lider_area: 'Líder', operador: 'Op',
}
const ROLE_COLOR: Record<string, string> = {
  admin: '#2e6b42', coordenacao: '#8a5f06', lider_area: '#2563eb', operador: '#64748b',
}
function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ── Nav groups ─────────────────────────────────────────────────────────────────
const ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Conteúdos',      href: '/conteudos',          icon: Camera },
      { label: 'Checklists',     href: '/checklist',          icon: CheckSquare },
      { label: 'Pautas',         href: '/pautas',             icon: Lightbulb },
      { label: 'Cronograma',     href: '/cronograma',         icon: LayoutList },
      { label: 'Wiki',           href: '/wiki',               icon: BookOpen },
    ],
  },
  {
    label: 'Esportivo',
    items: [
      { label: 'Hub Esportivo',  href: '/esportivo',          icon: Trophy },
      { label: 'Atléticas',      href: '/atleticas',          icon: Users },
      { label: 'Jogos',          href: '/admin/jogos',        icon: Swords },
      { label: 'Placar Ao Vivo', href: '/placar',             icon: Radio },
      { label: 'Placar TV',      href: '/tv/placar',          icon: Tv2 },
      { label: 'Competição',     href: '/admin/competicao',   icon: GitBranch },
      { label: 'Modalidades',    href: '/admin/modalidades',  icon: Trophy },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { label: 'Minha Escala',   href: '/minha-escala',       icon: UserCircle },
      { label: 'Escala',         href: '/admin/escala',       icon: ClipboardList },
      { label: 'Foto & Vídeo',   href: '/admin/escala-av',    icon: Aperture },
      { label: 'Mapa Ao Vivo',   href: '/mapa',               icon: MapPin },
      { label: 'Shows',          href: '/admin/shows',        icon: Music },
      { label: 'Festas',         href: '/admin/festas',       icon: PartyPopper },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Patrocinadores', href: '/admin/patrocinadores', icon: Heart },
      { label: 'Edições',        href: '/admin/edicoes',        icon: Settings },
      { label: 'Dias',           href: '/admin/dias',           icon: Calendar },
      { label: 'Setores',        href: '/admin/setores',        icon: Map },
      { label: 'Equipes',        href: '/admin/equipes',        icon: Users },
      { label: 'Pipelines',      href: '/admin/pipelines',      icon: GitBranch },
      { label: 'Tags',           href: '/admin/tags',           icon: Tag },
      { label: 'Usuários',       href: '/admin/usuarios',       icon: UserCog },
      { label: 'Importar',       href: '/admin/importar',       icon: FileSpreadsheet },
    ],
  },
]

function getMediaGroups(isLider: boolean): NavGroup[] {
  return [
    {
      label: 'Conteúdo',
      items: [
        { label: 'Cronograma',   href: '/cronograma',   icon: LayoutList },
        { label: 'Pautas',       href: '/pautas',       icon: Lightbulb },
        { label: 'Conteúdos',    href: '/conteudos',    icon: Camera },
        { label: 'Mapa Ao Vivo', href: '/mapa',         icon: MapPin },
      ],
    },
    {
      label: 'Escala',
      items: [
        { label: 'Minha Escala',      href: '/minha-escala',  icon: UserCircle },
        ...(isLider ? [{ label: 'Escala da Equipe', href: '/escala-midia', icon: ClipboardList }] : []),
      ],
    },
    {
      label: 'Equipe',
      items: [
        { label: 'Minha Equipe', href: '/minha-equipe', icon: Users2 },
      ],
    },
  ]
}

// ── NavDropdown ────────────────────────────────────────────────────────────────
function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const isGroupActive = group.items.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/'),
  )

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on route change
  React.useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="cia-nav-btn"
        style={{
          color: isGroupActive || open ? '#0A0F0B' : 'rgba(10,15,11,0.48)',
          background: open ? 'rgba(10,15,11,0.07)' : 'transparent',
        }}
      >
        {group.label}
        <ChevronDown
          style={{
            width: 11, height: 11,
            transition: 'transform 0.20s',
            transform: open ? 'rotate(-180deg)' : 'none',
            opacity: 0.45,
          }}
        />
        {/* Gold underline when group has active child */}
        {isGroupActive && (
          <span className="cia-nav-active-bar" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="cia-nav-panel">
          {group.items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn('cia-nav-panel-item', active && 'active')}
              >
                <Icon style={{
                  width: 14, height: 14, flexShrink: 0,
                  color: active ? '#F0D04A' : 'rgba(250,247,240,0.30)',
                }} />
                {label}
                {active && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#F0D04A', marginLeft: 'auto', flexShrink: 0,
                    boxShadow: '0 0 6px rgba(240,208,74,0.55)',
                  }} />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── MobileMenu (fullscreen overlay) ───────────────────────────────────────────
function MobileMenu({ groups, pathname, onClose }: { groups: NavGroup[]; pathname: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0C1410' }}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(250,247,240,0.08)' }}
      >
        <CiaLogo size={26} />
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'rgba(250,247,240,0.40)', background: 'rgba(250,247,240,0.06)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {groups.map(group => (
          <div key={group.label}>
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(250,247,240,0.28)',
              marginBottom: 6, paddingLeft: 4,
            }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10,
                      textDecoration: 'none',
                      fontSize: 14, fontWeight: active ? 600 : 500,
                      letterSpacing: '-0.01em',
                      color: active ? '#F0D04A' : 'rgba(250,247,240,0.68)',
                      background: active ? 'rgba(240,208,74,0.12)' : 'transparent',
                      border: active ? '1px solid rgba(240,208,74,0.20)' : '1px solid transparent',
                    }}
                  >
                    <Icon style={{
                      width: 16, height: 16, flexShrink: 0,
                      color: active ? '#F0D04A' : 'rgba(250,247,240,0.35)',
                    }} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Version */}
      <div style={{ padding: '12px 20px 20px', flexShrink: 0, borderTop: '1px solid rgba(250,247,240,0.07)' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.10em', color: 'rgba(250,247,240,0.18)', fontFamily: 'monospace' }}>
          CIA 2026 · v0.5
        </p>
      </div>
    </div>
  )
}

// ── AppShellLayout ─────────────────────────────────────────────────────────────
interface Props {
  profile: { nome?: string | null; role?: string | null; funcao_principal?: string | null } | null
  userEmail?: string | null
  userId?:    string
  section?:   string
  fullWidth?: boolean
  children:   React.ReactNode
}

export function AppShellLayout({
  profile, userEmail, userId, section: _section, fullWidth = false, children,
}: Props) {
  const pathname    = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const isMediaRole = profile?.funcao_principal === 'foto' || profile?.funcao_principal === 'video'
  const isLider     = profile?.role === 'lider_area'
  const navGroups   = isMediaRole ? getMediaGroups(isLider) : ADMIN_GROUPS

  const initials  = profile?.nome  ? getInitials(profile.nome) : '??'
  const roleColor = profile?.role  ? (ROLE_COLOR[profile.role] ?? '#6ab87e') : '#6ab87e'
  const roleName  = profile?.role  ? (ROLE_LABEL[profile.role] ?? profile.role) : '—'

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="mac-toolbar sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 px-4">

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(10,15,11,0.06)]"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" style={{ color: 'rgba(10,15,11,0.42)' }} />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity shrink-0">
          <CiaLogo size={26} />
        </Link>

        {/* Separator */}
        <span
          className="hidden md:block shrink-0"
          style={{ width: 1, height: 20, background: 'rgba(10,15,11,0.10)', marginLeft: 2, marginRight: 2 }}
        />

        {/* Desktop nav groups */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navGroups.map(group => (
            <NavDropdown key={group.label} group={group} pathname={pathname} />
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
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
              fontSize: 12, fontWeight: 600, color: '#0A0F0B',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            }}>
              {profile?.nome?.split(' ')[0] ?? userEmail}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase',
              padding: '1px 5px', borderRadius: 99,
              background: `${roleColor}14`, color: roleColor,
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

      {/* Mobile fullscreen menu */}
      {mobileOpen && (
        <MobileMenu
          groups={navGroups}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
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
  )
}
