'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from '@/app/actions'
import { LogOut, Menu, Tv2, X, ChevronDown } from 'lucide-react'
import { NotifBell } from '@/components/NotifBell'
import { QuickCapture } from '@/components/QuickCapture'
import { CommandPalette } from '@/components/command-palette'
import { useNavBadges } from '@/components/use-nav-badges'
import { cn } from '@/lib/utils'
import {
  Camera, Radio, CheckSquare, Lightbulb, LayoutList, BookOpen,
  UserCircle, ClipboardList, Aperture, Swords, MapPin, Music, PartyPopper,
  Heart, Settings, Calendar, Map, Trophy, Users, GitBranch, Tag, UserCog,
  FileSpreadsheet, Users2, Home, Search,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type NavItem  = { label: string; href: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }
type NavGroup = { label: string; items: NavItem[] }

// ── Role meta ──────────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', coordenacao: 'Coord', lider_area: 'Líder', operador: 'Op',
  coordenador_esportivo: 'Coord. Esp.', operador_esportivo: 'Op. Esp.',
}
const ROLE_COLOR: Record<string, string> = {
  admin: '#2e6b42', coordenacao: '#8a5f06', lider_area: '#2563eb', operador: '#64748b',
  coordenador_esportivo: '#c0392b', operador_esportivo: '#7c3aed',
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
      { label: 'Agenda',         href: '/agenda',             icon: LayoutList },
      { label: 'Wiki',           href: '/wiki',               icon: BookOpen },
    ],
  },
  {
    label: 'Esportivo',
    items: [
      { label: 'Hub Esportivo',  href: '/esportivo',          icon: Trophy },
      { label: 'Atléticas',      href: '/atleticas',          icon: Users },
      { label: 'Chaveamento',    href: '/esportivo/chaveamento', icon: GitBranch },
      { label: 'Jogos',          href: '/admin/jogos',        icon: Swords },
      { label: 'Placar Ao Vivo', href: '/placar',             icon: Radio },
      { label: 'Placar TV',      href: '/tv/placar',          icon: Tv2 },
      { label: 'Dados Esportivo', href: '/admin/competicao',   icon: GitBranch },
      { label: 'Liga Super 8',    href: '/admin/competicao/super8', icon: Trophy },
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

// Nav para coordenacao/lider/operador — sem aba Gestão
function getMediaGroups(role: string): NavGroup[] {
  const isLider   = role === 'lider_area'
  const isOperador = role === 'operador'
  return [
    {
      label: 'Conteúdo',
      items: [
        { label: 'Agenda',        href: '/agenda',       icon: LayoutList },
        ...(!isOperador ? [{ label: 'Pautas', href: '/pautas', icon: Lightbulb }] : []),
        { label: 'Conteúdos',     href: '/conteudos',    icon: Camera },
        { label: 'Mapa Ao Vivo',  href: '/mapa',         icon: MapPin },
      ],
    },
    {
      label: 'Escala',
      items: [
        { label: 'Minha Escala', href: '/minha-escala', icon: UserCircle },
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

// Nav para coordenador_esportivo
const COORD_ESPORTIVO_GROUPS: NavGroup[] = [
  {
    label: 'Esportivo',
    items: [
      { label: 'Hub Esportivo',  href: '/esportivo',              icon: Trophy },
      { label: 'Atléticas',      href: '/atleticas',              icon: Users },
      { label: 'Chaveamento',    href: '/esportivo/chaveamento',  icon: GitBranch },
      { label: 'Placar Ao Vivo', href: '/placar',                 icon: Radio },
      { label: 'Liga Super 8',   href: '/esportivo/super-8',      icon: Trophy },
      { label: 'Escala',         href: '/esportivo/escala',       icon: ClipboardList },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { label: 'Importar Tabela', href: '/esportivo/importar', icon: FileSpreadsheet },
    ],
  },
]

// Nav para operador_esportivo
const OP_ESPORTIVO_GROUPS: NavGroup[] = [
  {
    label: 'Esportivo',
    items: [
      { label: 'Hub Esportivo',  href: '/esportivo',         icon: Trophy },
      { label: 'Atléticas',      href: '/atleticas',         icon: Users },
      { label: 'Chaveamento',    href: '/esportivo/chaveamento', icon: GitBranch },
      { label: 'Placar Ao Vivo', href: '/placar',            icon: Radio },
      { label: 'Liga Super 8',   href: '/esportivo/super-8', icon: Trophy },
      { label: 'Minha Escala',   href: '/esportivo/escala',  icon: ClipboardList },
    ],
  },
]

// Nav para coordenacao — tudo menos aba Gestão
const COORDENACAO_GROUPS: NavGroup[] = ADMIN_GROUPS.filter(g => g.label !== 'Gestão')

function getNavGroups(role: string | null | undefined, funcao: string | null | undefined): NavGroup[] {
  if (role === 'admin')                  return ADMIN_GROUPS
  if (role === 'coordenacao')            return COORDENACAO_GROUPS
  if (role === 'coordenador_esportivo')  return COORD_ESPORTIVO_GROUPS
  if (role === 'operador_esportivo')     return OP_ESPORTIVO_GROUPS
  // lider_area e operador: nav de mídia (baseada em funcao_principal ou role)
  return getMediaGroups(role ?? 'operador')
}

// ── Bottom nav mobile (5 itens críticos por role) ──────────────────────────────
// Curado manualmente — não é só "primeiros 5 do menu". São os destinos
// que cada role mais acessa durante o evento ao vivo.
function getBottomNavItems(role: string | null | undefined): NavItem[] {
  const home = { label: 'Início', href: '/', icon: Home }

  if (role === 'admin') return [
    home,
    { label: 'Conteúdos', href: '/conteudos', icon: LayoutList },
    { label: 'Esportivo', href: '/esportivo', icon: Trophy },
    { label: 'Placar',    href: '/placar',    icon: Radio },
    { label: 'Agenda',    href: '/agenda',    icon: Calendar },
  ]

  if (role === 'coordenacao') return [
    home,
    { label: 'Conteúdos', href: '/conteudos', icon: LayoutList },
    { label: 'Pautas',    href: '/pautas',    icon: Lightbulb },
    { label: 'Agenda',    href: '/agenda',    icon: Calendar },
    { label: 'Esportivo', href: '/esportivo', icon: Trophy },
  ]

  if (role === 'coordenador_esportivo') return [
    home,
    { label: 'Placar',    href: '/placar',           icon: Radio },
    { label: 'Escala',    href: '/esportivo/escala', icon: ClipboardList },
    { label: 'Atléticas', href: '/atleticas',        icon: Users },
    { label: 'Hub',       href: '/esportivo',        icon: Trophy },
  ]

  if (role === 'operador_esportivo') return [
    home,
    { label: 'Placar',    href: '/placar',           icon: Radio },
    { label: 'Escala',    href: '/esportivo/escala', icon: ClipboardList },
    { label: 'Atléticas', href: '/atleticas',        icon: Users },
    { label: 'Hub',       href: '/esportivo',        icon: Trophy },
  ]

  // lider_area / operador / fallback (mídia)
  return [
    home,
    { label: 'Conteúdos', href: '/conteudos',    icon: LayoutList },
    { label: 'Agenda',    href: '/agenda',       icon: Calendar },
    { label: 'Escala',    href: '/minha-escala', icon: UserCircle },
    { label: 'Captar',    href: '/captura',      icon: Camera },
  ]
}

// ── MobileBottomNav ────────────────────────────────────────────────────────────
function MobileBottomNav({ role, pathname, badges }: { role: string | null | undefined; pathname: string; badges: { aoVivo: number } }) {
  const items = getBottomNavItems(role)
  return (
    <nav
      aria-label="Navegação rápida"
      className="md:hidden fixed inset-x-0 bottom-0 z-30"
      style={{
        // Safe area inset para iOS PWA (home indicator)
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(12,20,16,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(250,247,240,0.08)',
      }}
    >
      <div className="flex items-stretch justify-around h-14">
        {items.map(({ label, href, icon: Icon }) => {
          // Lógica de active: match exato pra "/", prefix pra outros
          const active = href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(href + '/')
          // Badge "Ao vivo" só no item /placar
          const showAoVivoBadge = href === '/placar' && badges.aoVivo > 0
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors relative"
              style={{
                // 44px+ touch target garantido (h-14 = 56px)
                minHeight: 44,
                color: active ? '#F0D04A' : 'rgba(250,247,240,0.45)',
                textDecoration: 'none',
              }}
            >
              {/* Active indicator pill no topo */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-0.5 w-8 rounded-b-full"
                  style={{
                    background: '#F0D04A',
                    boxShadow: '0 0 8px rgba(240,208,74,0.5)',
                  }}
                />
              )}
              {/* Wrapper do ícone p/ poder posicionar badge */}
              <div className="relative">
                <Icon style={{
                  width: 18, height: 18,
                  color: active ? '#F0D04A' : 'rgba(250,247,240,0.45)',
                }} aria-hidden="true" />
                {/* Pulse dot vermelho quando há jogo ao vivo */}
                {showAoVivoBadge && (
                  <span
                    aria-label={`${badges.aoVivo} jogo${badges.aoVivo > 1 ? 's' : ''} ao vivo`}
                    className="absolute -top-1 -right-2 flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full bg-red-500 text-[8px] font-bold text-white animate-pulse"
                    style={{ boxShadow: '0 0 8px rgba(239,68,68,0.55)' }}
                  >
                    {badges.aoVivo}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ── NavDropdown ────────────────────────────────────────────────────────────────
function NavDropdown({ group, pathname, badges }: { group: NavGroup; pathname: string; badges: { aoVivo: number } }) {
  const [open, setOpen] = React.useState(false)
  const ref     = React.useRef<HTMLDivElement>(null)
  const trigRef = React.useRef<HTMLButtonElement>(null)

  const isGroupActive = group.items.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/'),
  )
  // Indica que o grupo contém algum item com "atividade ao vivo"
  const hasLiveItem = badges.aoVivo > 0 && group.items.some(item => item.href === '/placar')

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Escape fecha e devolve foco ao trigger (acessibilidade teclado)
  React.useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        trigRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Close on route change
  React.useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        ref={trigRef}
        onClick={() => setOpen(o => !o)}
        className="cia-nav-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          color: isGroupActive || open ? '#0A0F0B' : 'rgba(10,15,11,0.48)',
          background: open ? 'rgba(10,15,11,0.07)' : 'transparent',
        }}
      >
        {group.label}
        {/* Live indicator no grupo — pulse vermelho quando há jogo ao vivo */}
        {hasLiveItem && (
          <span
            aria-label={`${badges.aoVivo} jogo ao vivo`}
            className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"
            style={{ boxShadow: '0 0 6px rgba(239,68,68,0.55)' }}
          />
        )}
        <ChevronDown
          aria-hidden="true"
          style={{
            width: 11, height: 11,
            transition: 'transform 0.20s',
            transform: open ? 'rotate(-180deg)' : 'none',
            opacity: 0.45,
          }}
        />
        {/* Gold underline when group has active child */}
        {isGroupActive && (
          <span className="cia-nav-active-bar" aria-hidden="true" />
        )}
      </button>

      {/* Dropdown panel — cream com border preto fino */}
      {open && (
        <div className="cia-nav-panel" role="menu">
          {/* Eyebrow do grupo */}
          <div style={{
            fontFamily: 'var(--font-geist), system-ui, sans-serif',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(10,15,11,0.40)',
            padding: '6px 10px 8px',
            borderBottom: '1px dashed rgba(10,15,11,0.10)',
            marginBottom: 4,
          }}>
            {group.label}
          </div>
          {group.items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const showLive = href === '/placar' && badges.aoVivo > 0
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn('cia-nav-panel-item', active && 'active')}
              >
                <Icon aria-hidden="true" style={{
                  width: 14, height: 14, flexShrink: 0,
                  color: active ? '#2e6b42' : 'rgba(10,15,11,0.40)',
                }} />
                {label}
                {/* Live badge no item Placar */}
                {showLive && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-500"
                    style={{ marginLeft: 6 }}
                  >
                    <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                    {badges.aoVivo} ao vivo
                  </span>
                )}
                {active && (
                  <span aria-hidden="true" style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#2e6b42', marginLeft: 'auto', flexShrink: 0,
                    boxShadow: '0 0 6px rgba(46,107,66,0.55)',
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
  const closeRef = React.useRef<HTMLButtonElement>(null)

  // Foca o botão fechar ao abrir (trap inicial) e Escape fecha
  React.useEffect(() => {
    closeRef.current?.focus()
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0C1410' }}
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(250,247,240,0.08)' }}
      >
        <CiaLogo size={26} />
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Fechar menu"
          /* touch target 44×44 */
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{
            width: 44, height: 44,
            color: 'rgba(250,247,240,0.40)',
            background: 'rgba(250,247,240,0.06)',
          }}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {groups.map(group => (
          <div key={group.label}>
            {/* Label: 11px em vez de 9px — legível */}
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'rgba(250,247,240,0.35)',
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
                      /* 44px+ touch target: padding 13px vertical */
                      minHeight: 44,
                      padding: '13px 14px', borderRadius: 10,
                      textDecoration: 'none',
                      fontSize: 14, fontWeight: active ? 600 : 500,
                      letterSpacing: '-0.01em',
                      color: active ? '#F0D04A' : 'rgba(250,247,240,0.68)',
                      background: active ? 'rgba(240,208,74,0.12)' : 'transparent',
                      border: active ? '1px solid rgba(240,208,74,0.20)' : '1px solid transparent',
                    }}
                  >
                    <Icon aria-hidden="true" style={{
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
      </nav>

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
  // Badges em tempo real (jogos ao vivo etc.) — usado pra indicar atividade
  // tanto no NavDropdown (desktop) quanto no MobileBottomNav (mobile)
  const badges = useNavBadges()

  const navGroups = getNavGroups(profile?.role, profile?.funcao_principal)

  const initials  = profile?.nome  ? getInitials(profile.nome) : '??'
  const roleColor = profile?.role  ? (ROLE_COLOR[profile.role] ?? '#6ab87e') : '#6ab87e'
  const roleName  = profile?.role  ? (ROLE_LABEL[profile.role] ?? profile.role) : '—'

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* Skip link — aparece ao receber foco (teclado), invisível para mouse */}
      <a href="#main-content" className="cia-skip-link">
        Ir para o conteúdo principal
      </a>

      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="mac-toolbar sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 px-4">

        {/* Mobile hamburger — 40×40px para touch target adequado */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(10,15,11,0.06)]"
          style={{ width: 40, height: 40, flexShrink: 0 }}
          aria-label="Abrir menu de navegação"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <Menu className="h-4 w-4" aria-hidden="true" style={{ color: 'rgba(10,15,11,0.42)' }} />
        </button>

        {/* Logo CIA (já contém wordmark "CIA 2026 PAINEL · COBERTURA" no SVG) */}
        <Link
          href="/"
          aria-label="CIA 2026 — Ir para a página inicial"
          className="flex items-center opacity-95 hover:opacity-100 transition-opacity shrink-0"
        >
          <CiaLogo size={26} />
        </Link>

        {/* Separator */}
        <span
          className="hidden md:block shrink-0"
          style={{ width: 1, height: 20, background: 'rgba(10,15,11,0.10)', marginLeft: 8, marginRight: 6 }}
        />

        {/* Desktop nav groups */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navGroups.map(group => (
            <NavDropdown key={group.label} group={group} pathname={pathname} badges={badges} />
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger — dispara o CommandPalette via window event */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('cmd-palette-open'))}
            aria-label="Buscar (Cmd+K)"
            title="Buscar (⌘K)"
            className="flex items-center gap-2 rounded-lg transition-colors hover:bg-[rgba(10,15,11,0.06)]"
            style={{
              minHeight: 36,
              padding: '0 10px',
              color: 'rgba(10,15,11,0.55)',
              border: '1px solid rgba(10,15,11,0.10)',
              background: 'rgba(10,15,11,0.03)',
            }}
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden lg:inline text-xs font-medium">Buscar</span>
            <kbd className="hidden lg:inline-flex items-center text-[9.5px] font-mono font-semibold rounded border border-[rgba(10,15,11,0.10)] bg-white px-1 py-0.5 text-[rgba(10,15,11,0.45)]">
              ⌘K
            </kbd>
          </button>

          {userId && <NotifBell userId={userId} />}

          {/* TV pill — editorial */}
          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-all"
            style={{
              borderRadius: 999,
              padding: '5px 12px 5px 10px',
              fontFamily: 'var(--font-geist), system-ui, sans-serif',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#2e6b42',
              border: '1px solid rgba(46,107,66,0.28)',
              background: 'rgba(46,107,66,0.08)',
            }}
            title="Abrir Modo TV"
          >
            <Tv2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">TV</span>
          </a>

          {/* User pill — Fraunces italic no nome */}
          <div
            className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1"
            style={{ background: 'rgba(10,15,11,0.04)', border: '1px solid rgba(10,15,11,0.10)' }}
          >
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                background: `${roleColor}1a`,
                border: `1px solid ${roleColor}3a`,
                color: roleColor,
                fontFamily: 'var(--font-geist), system-ui, sans-serif',
              }}
            >
              {initials}
            </div>
            <span className="hidden sm:block" style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontVariationSettings: "'opsz' 36, 'SOFT' 50, 'WONK' 0",
              fontStyle: 'italic',
              fontSize: 13.5, fontWeight: 600, color: '#0A0F0B',
              letterSpacing: '-0.01em',
            }}>
              {profile?.nome?.split(' ')[0] ?? userEmail}
            </span>
            <span style={{
              fontFamily: 'var(--font-geist), system-ui, sans-serif',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 99,
              background: `${roleColor}14`, color: roleColor,
            }}>
              {roleName}
            </span>
          </div>

          <form action={signOut}>
            <button type="submit" className="mac-logout-btn" title="Sair" aria-label="Sair da conta">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
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
        id="main-content"
        className="relative flex-1 overflow-auto"
        style={{ background: 'var(--background)' }}
      >
        {fullWidth ? (
          <div className="relative z-10 h-full pb-16 md:pb-0">{children}</div>
        ) : (
          <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 pb-20 md:pb-6">{children}</div>
        )}
        <QuickCapture />
      </main>

      {/* Mobile bottom nav — só aparece em telas md menores */}
      <MobileBottomNav role={profile?.role} pathname={pathname} badges={badges} />

      {/* Command Palette — Cmd+K busca global */}
      <CommandPalette />
    </div>
  )
}
