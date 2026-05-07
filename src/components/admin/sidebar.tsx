'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar, Map, MapPin, Users, Trophy, Music, PartyPopper,
  Heart, GitBranch, Tag, UserCog, Settings, Swords, ClipboardList, Camera, CheckSquare,
  Lightbulb, BookOpen, LayoutList, UserCircle, Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Navigation groups — macOS System Settings style ──────────────────────────

const NAV_GROUPS = [
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
      { label: 'Minha Escala',   href: '/minha-escala', icon: UserCircle },
      { label: 'Escala',         href: '/admin/escala', icon: ClipboardList },
      { label: 'Jogos',          href: '/admin/jogos',  icon: Swords },
      { label: 'Mapa Ao Vivo',   href: '/mapa',         icon: MapPin },
      { label: 'Shows',          href: '/admin/shows',  icon: Music },
      { label: 'Festas',         href: '/admin/festas', icon: PartyPopper },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Patrocinadores', href: '/admin/patrocinadores', icon: Heart },
      { label: 'Edições',        href: '/admin/edicoes',        icon: Settings },
      { label: 'Dias',           href: '/admin/dias',           icon: Calendar },
      { label: 'Setores',        href: '/admin/setores',        icon: Map },
      { label: 'Modalidades',    href: '/admin/modalidades',    icon: Trophy },
      { label: 'Equipes',        href: '/admin/equipes',        icon: Users },
      { label: 'Pipelines',      href: '/admin/pipelines',      icon: GitBranch },
      { label: 'Tags',           href: '/admin/tags',           icon: Tag },
      { label: 'Usuários',       href: '/admin/usuarios',       icon: UserCog },
    ],
  },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="mac-sidebar flex w-[220px] shrink-0 flex-col overflow-hidden">
      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {/* Group separator (not on first group) */}
            {gi > 0 && <div className="mac-separator" />}

            {/* Group label */}
            <div className="mac-nav-group">{group.label}</div>

            {/* Items */}
            {group.items.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn('mac-nav-item', active && 'active')}
                >
                  <Icon
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      color: active ? '#6ab87e' : 'rgba(106,184,126,0.52)',
                    }}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  {active && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: '#6ab87e',
                        boxShadow: '0 0 6px rgba(106,184,126,0.75)',
                      }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '8px 14px 12px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: '0.08em',
            color: 'rgba(74,138,92,0.28)',
            fontFamily: 'monospace',
          }}
        >
          CIA 2026 · v0.5
        </p>
      </div>
    </aside>
  )
}
