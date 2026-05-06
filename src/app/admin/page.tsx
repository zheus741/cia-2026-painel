import { createClient } from '@/lib/supabase/server'
import { Settings, Calendar, Map, Users, Trophy, Music, PartyPopper, Heart, GitBranch, Tag, UserCog, Swords, ClipboardList, Camera } from 'lucide-react'
import Link from 'next/link'

const cards = [
  { label: 'Conteúdos', href: '/conteudos',            icon: Camera,        table: 'conteudos' },
  { label: 'Jogos',     href: '/admin/jogos',           icon: Swords,        table: 'jogos' },
  { label: 'Escala',    href: '/admin/escala',          icon: ClipboardList, table: 'turnos' },
  { label: 'Edições',   href: '/admin/edicoes',         icon: Settings,      table: 'edicoes' },
  { label: 'Dias',      href: '/admin/dias',            icon: Calendar,      table: 'dias_evento' },
  { label: 'Setores',   href: '/admin/setores',         icon: Map,           table: 'setores' },
  { label: 'Modalidades',href: '/admin/modalidades',    icon: Trophy,        table: 'modalidades' },
  { label: 'Equipes',   href: '/admin/equipes',         icon: Users,         table: 'equipes' },
  { label: 'Shows',     href: '/admin/shows',           icon: Music,         table: 'shows' },
  { label: 'Festas',    href: '/admin/festas',          icon: PartyPopper,   table: 'festas' },
  { label: 'Patrocinadores', href: '/admin/patrocinadores', icon: Heart,     table: 'patrocinadores' },
  { label: 'Pipelines', href: '/admin/pipelines',       icon: GitBranch,     table: 'pipeline_templates' },
  { label: 'Tags',      href: '/admin/tags',            icon: Tag,           table: 'tags' },
  { label: 'Usuários',  href: '/admin/usuarios',        icon: UserCog,       table: 'profiles' },
] as const

export default async function AdminHome() {
  const supabase = await createClient()

  const counts: Record<string, number> = {}
  await Promise.all(
    cards.map(async (c) => {
      const { count } = await supabase
        .from(c.table)
        .select('id', { count: 'exact', head: true })
      counts[c.table] = count ?? 0
    }),
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">
          Painel administrativo
        </p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          Cadastros
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Gerencie a base de dados que alimenta o painel: estrutura do evento,
          equipes, patrocinadores, pipelines de conteúdo e usuários.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(({ label, href, icon: Icon, table }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
          >
            <div className="flex items-start justify-between">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)]">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-2xl font-bold tabular-nums text-[var(--muted-foreground)]">
                {counts[table] ?? 0}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{label}</h3>
          </Link>
        ))}
      </div>
    </div>
  )
}
