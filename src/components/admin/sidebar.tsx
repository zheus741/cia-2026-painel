'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar, Map, MapPin, Users, Trophy, Music, PartyPopper,
  Heart, GitBranch, Tag, UserCog, Settings, Swords, ClipboardList, Camera, CheckSquare,
  Lightbulb, BookOpen, LayoutList, UserCircle, Radio, Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { label: 'Conteúdos',      href: '/conteudos',             icon: Camera },
  { label: 'Placar Ao Vivo', href: '/placar',                icon: Radio },
  { label: 'Redes',          href: '/redes',                 icon: Share2 },
  { label: 'Checklists',     href: '/checklist',             icon: CheckSquare },
  { label: 'Pautas',         href: '/pautas',                icon: Lightbulb },
  { label: 'Cronograma',     href: '/cronograma',            icon: LayoutList },
  { label: 'Wiki',           href: '/wiki',                  icon: BookOpen },
  { label: 'Minha Escala',   href: '/minha-escala',          icon: UserCircle },
  { label: 'Escala',         href: '/admin/escala',          icon: ClipboardList },
  { label: 'Jogos',          href: '/admin/jogos',           icon: Swords },
  { label: 'Mapa Ao Vivo',   href: '/mapa',                  icon: MapPin },
  { label: 'Shows',          href: '/admin/shows',           icon: Music },
  { label: 'Festas',         href: '/admin/festas',          icon: PartyPopper },
  { label: 'Patrocinadores', href: '/admin/patrocinadores',  icon: Heart },
  { label: 'Edições',        href: '/admin/edicoes',         icon: Settings },
  { label: 'Dias',           href: '/admin/dias',            icon: Calendar },
  { label: 'Setores',        href: '/admin/setores',         icon: Map },
  { label: 'Modalidades',    href: '/admin/modalidades',     icon: Trophy },
  { label: 'Equipes',        href: '/admin/equipes',         icon: Users },
  { label: 'Pipelines',      href: '/admin/pipelines',       icon: GitBranch },
  { label: 'Tags',           href: '/admin/tags',            icon: Tag },
  { label: 'Usuarios',       href: '/admin/usuarios',        icon: UserCog },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside
      className="w-52 shrink-0 border-r border-[var(--border)] px-2 py-4 overflow-y-auto"
      style={{ background: 'rgba(6,12,7,0.60)', backdropFilter: 'blur(12px)' }}
    >
      <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
        Menu
      </p>
      <nav className="space-y-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = !!href && (pathname === href || pathname.startsWith(href + '/'))
          return (
            <Link
              key={href + label}
              href={href || '#'}
              className={cn(
                'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[var(--green-dim)]/40 text-[var(--green-bright)] shadow-[inset_0_0_0_1px_rgba(74,138,92,0.25)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-[var(--green-bright)]' : 'text-[var(--muted-foreground)] group-hover:text-[var(--green)]',
                )}
              />
              {label}
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--green-bright)] shadow-[0_0_6px_rgba(106,184,126,0.8)]" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="cia-gold-rule mx-3 mt-6" />
      <p className="mt-3 px-3 text-[9px] text-[var(--muted-foreground)]/50 tracking-wide">
        CIA 2026 · v0.4
      </p>
    </aside>
  )
}
