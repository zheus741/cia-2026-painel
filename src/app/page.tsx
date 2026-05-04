import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CiaLogo } from '@/components/cia-logo'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Map,
  Users,
  Trophy,
  Music,
  Camera,
  Network,
  Megaphone,
  BookOpen,
  Cloud,
  Lightbulb,
  Heart,
} from 'lucide-react'
import { signOut } from './actions'

const modules = [
  { icon: Calendar, label: 'Cronograma', desc: 'Timeline master' },
  { icon: Map, label: 'Mapa', desc: 'Setores e equipe em campo' },
  { icon: Users, label: 'Escala', desc: 'Pessoa × função × turno' },
  { icon: Trophy, label: 'Modalidades', desc: 'Esportivas + cheer + bateria' },
  { icon: Music, label: 'Shows & Festas', desc: 'Rundown ao vivo' },
  { icon: Camera, label: 'Conteúdos', desc: 'Pipeline de produção' },
  { icon: Network, label: 'Redes', desc: 'Dashboard real-time' },
  { icon: Heart, label: 'Patrocinadores', desc: 'Escopo e entregas' },
  { icon: Lightbulb, label: 'Pautas', desc: 'Roaming e ideias' },
  { icon: BookOpen, label: 'Wiki', desc: 'Briefings por função' },
  { icon: Megaphone, label: 'Referências', desc: 'Banco de moodboard' },
  { icon: Cloud, label: 'Clima', desc: 'Previsão por dia' },
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // perfil pode ainda não existir se trigger demorar — não crashar
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, funcao_principal')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/80 px-6 backdrop-blur">
        <CiaLogo />
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="font-medium">{profile?.nome ?? user.email}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              {profile?.role ?? 'aguardando perfil'}
            </p>
          </div>
          <Link href="/admin">
            <Button variant="accent" size="sm">
              Cadastros
            </Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="relative flex-1 px-6 py-10">
        <div className="cia-bg-stars pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-[var(--accent)]">
              Sprint 0 · setup base
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
              Painel da CIA 2026
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Próximos sprints: cadastros, escala, kanban de conteúdo, dashboard de redes,
              wiki e mapa. Cada módulo abaixo vira uma rota navegável.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">{label}</h3>
                <p className="text-xs text-[var(--muted-foreground)]">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 p-6 text-sm text-[var(--muted-foreground)]">
            <p className="font-medium text-[var(--foreground)]">
              Ambiente conectado ao Supabase ✓
            </p>
            <p className="mt-1">
              Schema com 23 tabelas, RLS ativo, magic-link funcionando. Próximo passo:
              rodar a migration no banco e implementar os módulos um a um.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
