'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Map,
  Users,
  Trophy,
  Music,
  PartyPopper,
  Heart,
  GitBranch,
  Tag,
  UserCog,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { label: 'Edições', href: '/admin/edicoes', icon: Settings },
  { label: 'Dias', href: '/admin/dias', icon: Calendar },
  { label: 'Setores', href: '/admin/setores', icon: Map },
  { label: 'Modalidades', href: '/admin/modalidades', icon: Trophy },
  { label: 'Equipes', href: '/admin/equipes', icon: Users },
  { label: 'Shows', href: '/admin/shows', icon: Music },
  { label: 'Festas', href: '/admin/festas', icon: PartyPopper },
  { label: 'Patrocinadores', href: '/admin/patrocinadores', icon: Heart },
  { label: 'Pipelines', href: '/admin/pipelines', icon: GitBranch },
  { label: 'Tags', href: '/admin/tags', icon: Tag },
  { label: 'Usuários', href: '/admin/usuarios', icon: UserCog },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)]/50 px-3 py-4">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Cadastros
      </p>
      <nav className="space-y-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                  : 'text-[var(--foreground)] hover:bg-[var(--muted)]',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
