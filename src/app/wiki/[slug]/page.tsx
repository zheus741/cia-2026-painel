import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

// Renderizador de markdown simples — sem biblioteca externa
function renderMd(md: string): string {
  return md
    // code blocks
    .replace(/```[\s\S]*?```/g, (m) => {
      const code = m.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
      return `<pre class="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 text-xs"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
    })
    // headings
    .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-2 text-base font-semibold">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-8 mb-3 text-lg font-bold">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-0 mb-4 font-[var(--font-display)] text-2xl font-bold">$1</h1>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-mono text-[var(--accent)]">$1</code>')
    // tables
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.match(/^\|[-| :]+\|$/)) return ''
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      return '<tr>' + cells.map(c => `<td class="border border-[var(--border)] px-3 py-1.5 text-sm">${c}</td>`).join('') + '</tr>'
    })
    // wrap table rows
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-[var(--border)]">$1</table></div>')
    // checkboxes
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2 py-0.5"><span class="h-4 w-4 rounded border border-[var(--border)] inline-flex items-center justify-center shrink-0"></span><span>$1</span></li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2 py-0.5 text-[var(--muted-foreground)] line-through"><span class="h-4 w-4 rounded bg-[var(--green-bright)] inline-flex items-center justify-center shrink-0 text-black text-[10px]">✓</span><span>$1</span></li>')
    // list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc py-0.5">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal py-0.5">$1</li>')
    // horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-[var(--border)]" />')
    // paragraphs (blank lines)
    .replace(/\n\n/g, '</p><p class="mt-3 text-sm leading-relaxed text-[var(--foreground)]">')
    .trim()
}

export default async function WikiDocPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('docs')
    .select('id, titulo, slug, conteudo_md, categoria, funcao, atualizado_em, autor:profiles(nome)')
    .eq('slug', slug)
    .eq('publicado', true)
    .single()

  if (!doc) notFound()

  const autor = doc.autor as unknown as { nome: string } | null
  const html = renderMd(doc.conteudo_md)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/wiki"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Wiki
      </Link>

      <div>
        {doc.funcao && (
          <p className="text-xs uppercase tracking-widest text-[var(--accent)]">{doc.funcao}</p>
        )}
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          {doc.titulo}
        </h1>
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Atualizado {new Date(doc.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          {autor && <span>por {autor.nome}</span>}
        </div>
      </div>

      <div className="cia-gold-rule" />

      {/* Conteúdo renderizado */}
      <article
        className="prose-sm max-w-none leading-relaxed text-[var(--foreground)]"
        dangerouslySetInnerHTML={{ __html: `<p class="mt-3 text-sm leading-relaxed">${html}</p>` }}
      />
    </div>
  )
}
