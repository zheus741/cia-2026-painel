'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar, Map, MapPin, Users, Trophy, Music, PartyPopper,
  Heart, GitBranch, Tag, UserCog, Settings, Swords, ClipboardList, Camera, CheckSquare,
  Lightbulb, BookOpen, LayoutList, UserCircle, Radio, Aperture, Users2,
  FileSpreadsheet, PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Nav groups ─────────────────────────────────────────────────────────────────

const ADMIN_NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { label: 'Conteúdos',      href: '/conteudos',    icon: Camera },
      { label: 'Placar Ao Vivo', href: '/placar',       icon: Radio },
      { label: 'Checklists',     href: '/checklist',    icon: CheckSquare },
      { label: 'Pautas',         href: '/pautas',       icon: Lightbulb },
      { label: 'Cronograma',     href: '/cronograma',   icon: LayoutList },
      { label: 'Wiki',           href: '/wiki',         icon: BookOpen },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { label: 'Minha Escala',   href: '/minha-escala',       icon: UserCircle },
      { label: 'Escala',         href: '/admin/escala',        icon: ClipboardList },
      { label: 'Escala Mídia',   href: '/admin/escala-midia',  icon: Aperture },
      { label: 'Jogos',          href: '/admin/jogos',         icon: Swords },
      { label: 'Mapa Ao Vivo',   href: '/mapa',                icon: MapPin },
      { label: 'Shows',          href: '/admin/shows',         icon: Music },
      { label: 'Festas',         href: '/admin/festas',        icon: PartyPopper },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Patrocinadores',  href: '/admin/patrocinadores', icon: Heart },
      { label: 'Edições',         href: '/admin/edicoes',        icon: Settings },
      { label: 'Dias',            href: '/admin/dias',           icon: Calendar },
      { label: 'Setores',         href: '/admin/setores',        icon: Map },
      { label: 'Modalidades',     href: '/admin/modalidades',    icon: Trophy },
      { label: 'Equipes',         href: '/admin/equipes',        icon: Users },
      { label: 'Pipelines',       href: '/admin/pipelines',      icon: GitBranch },
      { label: 'Tags',            href: '/admin/tags',           icon: Tag },
      { label: 'Usuários',        href: '/admin/usuarios',       icon: UserCog },
      { label: 'Importar Tabela', href: '/admin/importar',       icon: FileSpreadsheet },
    ],
  },
]

function getMediaNavGroups(isLider: boolean) {
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
        { label: 'Minha Escala',      href: '/minha-escala', icon: UserCircle },
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

// ── Sidebar ────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  role?:               string
  funcao?:             string | null
  collapsed?:          boolean
  mobileOpen?:         boolean
  onToggleCollapsed?:  () => void
  onCloseMobile?:      () => void
}

export function AdminSidebar({
  role,
  funcao,
  collapsed      = false,
  mobileOpen     = false,
  onToggleCollapsed,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname    = usePathname()
  const isMediaRole = funcao === 'foto' || funcao === 'video'
  const isLider     = role === 'lider_area'
  const navGroups   = isMediaRole ? getMediaNavGroups(isLider) : ADMIN_NAV_GROUPS

  return (
    <aside
      className={cn(
        // Base
        'mac-sidebar flex flex-col overflow-hidden shrink-0',
        // ── Mobile: fixed overlay drawer ──
        'fixed inset-y-0 left-0 z-40',
        'transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        // ── Desktop: relative, in flow, width transition ──
        'md:relative md:inset-y-auto md:left-auto md:z-auto',
        'md:translate-x-0 md:shadow-none',
        'md:transition-[width] md:duration-200 md:ease-in-out',
      )}
      style={{
        // Mobile: fixed width drawer
        width: 'min(280px, 88vw)',
        // Desktop: dynamic collapsed/expanded via a CSS override
      }}
      // Desktop width via data attribute + CSS
      data-collapsed={collapsed ? 'true' : 'false'}
    >

      {/* Mobile header — close button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] md:hidden">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(46,107,66,0.55)' }}>
          Menu
        </span>
        <button
          onClick={onCloseMobile}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(46,107,66,0.08)]"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="mac-separator" />}

            {/* Group label — hidden when collapsed on desktop */}
            <div
              className={cn(
                'mac-nav-group transition-all duration-200 overflow-hidden',
              )}
              style={{
                // desktop collapsed: zero height
              }}
              data-label
            >
              {group.label}
            </div>

            {group.items.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    // close mobile drawer on nav
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      onCloseMobile?.()
                    }
                  }}
                  className={cn('mac-nav-item group/item relative', active && 'active')}
                  title={label}
                >
                  <Icon
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      color: active ? '#2e6b42' : 'rgba(46,107,66,0.50)',
                    }}
                  />

                  {/* Label — hidden when desktop collapsed */}
                  <span className="flex-1 truncate nav-label">
                    {label}
                  </span>

                  {/* Active dot */}
                  {active && (
                    <span
                      className="nav-dot"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: '#2e6b42',
                        boxShadow: '0 0 5px rgba(46,107,66,0.45)',
                      }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Desktop footer — toggle collapse */}
      <div
        className="hidden md:flex items-center border-t cursor-pointer transition-colors hover:bg-[rgba(46,107,66,0.06)] select-none"
        style={{ borderColor: 'rgba(16,29,18,0.08)', padding: '8px 10px', gap: 8, flexShrink: 0 }}
        onClick={onToggleCollapsed}
      >
        {collapsed ? (
          <PanelLeftOpen
            style={{ width: 14, height: 14, color: 'rgba(46,107,66,0.50)', flexShrink: 0, margin: '0 auto' }}
          />
        ) : (
          <>
            <PanelLeftClose style={{ width: 14, height: 14, color: 'rgba(46,107,66,0.45)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(46,107,66,0.50)', fontWeight: 500 }}>
              Recolher
            </span>
          </>
        )}
      </div>

      {/* Version tag — desktop only, full */}
      {!collapsed && (
        <div
          className="hidden md:block"
          style={{ padding: '4px 14px 10px', flexShrink: 0 }}
        >
          <p style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(46,107,66,0.45)', fontFamily: 'monospace' }}>
            CIA 2026 · v0.5
          </p>
        </div>
      )}
    </aside>
  )
}
