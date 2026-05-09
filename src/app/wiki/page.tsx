import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Camera, Video, Share2, Mic, Edit3, Cpu, Users, Crosshair } from 'lucide-react'
import { WikiNewButton } from './WikiNewButton'

const funcaoIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  foto: Camera,
  video: Video,
  social: Share2,
  reporter: Mic,
  editor: Edit3,
  drone: Crosshair,
  design: Cpu,
  coordenacao: Users,
}

const categoriaLabel: Record<string, string> = {
  briefing: 'Briefing',
  manual: 'Manual',
  contatos: 'Contatos',
  tom_de_voz: 'Tom de Voz',
}

export default async function WikiPage() {
  const supabase = await createClient()

  const [{ data: docs }, { data: { user } }] = await Promise.all([
    supabase
      .from('docs')
      .select('id, titulo, slug, categoria, funcao, atualizado_em')
      .eq('publicado', true)
      .order('ordem'),
    supabase.auth.getUser(),
  ])

  let canEdit = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle()
    canEdit = ['admin', 'coordenacao'].includes(profile?.role ?? '')
  }

  const rows = docs ?? []

  const byCategoria = rows.reduce<Record<string, typeof rows>>((acc, doc) => {
    const cat = doc.categoria ?? 'outros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="cia-page-header" style={{ marginBottom: 0 }}>
            <p className="cia-page-header__eyebrow">Documentação</p>
            <h1 className="cia-page-header__title">Wiki</h1>
            <p className="cia-page-header__subtitle">Briefings, manuais e protocolos por função — substitui o Notion.</p>
          </div>
        </div>
        {canEdit && <WikiNewButton />}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Nenhum documento publicado.</p>
        </div>
      ) : (
        Object.entries(byCategoria).map(([cat, catDocs]) => (
          <div key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              {categoriaLabel[cat] ?? cat}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catDocs.map((doc) => {
                const Icon = doc.funcao ? (funcaoIcon[doc.funcao] ?? BookOpen) : BookOpen
                return (
                  <Link
                    key={doc.id}
                    href={`/wiki/${doc.slug}`}
                    className="group flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-black">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug">{doc.titulo}</p>
                      {doc.funcao && (
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                          {doc.funcao}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--muted-foreground)]/60">
                        Atualizado {new Date(doc.atualizado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
