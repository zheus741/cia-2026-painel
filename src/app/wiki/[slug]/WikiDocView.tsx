'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Clock, Edit3, X, Save, Eye, Code2 } from 'lucide-react'
import Link from 'next/link'
import { updateDoc } from '@/app/actions/wiki'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DocData {
  id:          string
  titulo:      string
  slug:        string
  conteudo_md: string
  categoria:   string | null
  funcao:      string | null
  atualizado_em: string
  autor:       { nome: string | null } | null
}

interface Props {
  doc:      DocData
  canEdit:  boolean
}

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { value: 'briefing',    label: 'Briefing' },
  { value: 'manual',      label: 'Manual' },
  { value: 'contatos',    label: 'Contatos' },
  { value: 'tom_de_voz',  label: 'Tom de Voz' },
]

const FUNCOES = [
  { value: '',           label: 'Todas as funções' },
  { value: 'foto',       label: 'Foto' },
  { value: 'video',      label: 'Vídeo' },
  { value: 'social',     label: 'Social' },
  { value: 'reporter',   label: 'Reporter' },
  { value: 'editor',     label: 'Editor' },
  { value: 'drone',      label: 'Drone' },
  { value: 'roaming',    label: 'Roaming' },
  { value: 'coordenacao', label: 'Coordenação' },
  { value: 'producao',   label: 'Produção' },
  { value: 'design',     label: 'Design' },
]

// ── Markdown renderer ─────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMd(raw: string): string {
  // Escape ALL HTML first — prevents XSS in headings, bold, tables, etc.
  // Markdown patterns (`**`, `#`, `|`) don't use HTML special chars so they
  // still match after escaping.
  const md = escHtml(raw)
  return md
    .replace(/```[\s\S]*?```/g, (m) => {
      // Input is already HTML-escaped; just strip the fence markers
      const code = m.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
      return `<pre class="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 text-xs"><code>${code}</code></pre>`
    })
    .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-2 text-base font-semibold">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-8 mb-3 text-lg font-bold">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-0 mb-4 font-[var(--font-display)] text-2xl font-bold">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-mono text-[var(--accent)]">$1</code>')
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.match(/^\|[-| :]+\|$/)) return ''
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      return '<tr>' + cells.map(c => `<td class="border border-[var(--border)] px-3 py-1.5 text-sm">${c}</td>`).join('') + '</tr>'
    })
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-[var(--border)]">$1</table></div>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2 py-0.5"><span class="h-4 w-4 rounded border border-[var(--border)] inline-flex items-center justify-center shrink-0"></span><span>$1</span></li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2 py-0.5 text-[var(--muted-foreground)] line-through"><span class="h-4 w-4 rounded bg-[var(--green-bright)] inline-flex items-center justify-center shrink-0 text-black text-[10px]">✓</span><span>$1</span></li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc py-0.5">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal py-0.5">$1</li>')
    .replace(/^---$/gm, '<hr class="my-6 border-[var(--border)]" />')
    .replace(/\n\n/g, '</p><p class="mt-3 text-sm leading-relaxed text-[var(--foreground)]">')
    .trim()
}

// ── WikiDocView ───────────────────────────────────────────────────────────────

export function WikiDocView({ doc, canEdit }: Props) {
  const router      = useRouter()
  const [editing,   setEditing]   = useState(false)
  const [tab,       setTab]       = useState<'md' | 'preview'>('md')
  const [titulo,    setTitulo]    = useState(doc.titulo)
  const [categoria, setCategoria] = useState(doc.categoria ?? '')
  const [funcao,    setFuncao]    = useState(doc.funcao ?? '')
  const [conteudo,  setConteudo]  = useState(doc.conteudo_md)
  const [error,     setError]     = useState('')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current
      ta.style.height = 'auto'
      ta.style.height = `${Math.max(360, ta.scrollHeight)}px`
    }
  }, [conteudo, editing])

  function handleCancel() {
    setTitulo(doc.titulo)
    setCategoria(doc.categoria ?? '')
    setFuncao(doc.funcao ?? '')
    setConteudo(doc.conteudo_md)
    setError('')
    setEditing(false)
  }

  function handleSave() {
    if (!titulo.trim()) { setError('Título obrigatório.'); return }
    if (!conteudo.trim()) { setError('Conteúdo obrigatório.'); return }
    setError('')
    startTransition(async () => {
      try {
        await updateDoc(doc.id, doc.slug, {
          titulo:      titulo.trim(),
          conteudo_md: conteudo,
          categoria:   categoria || null,
          funcao:      funcao || null,
        })
        setEditing(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  const html = renderMd(conteudo)

  // ── View mode ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/wiki"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Wiki
          </Link>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
        </div>

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
            {doc.autor?.nome && <span>por {doc.autor.nome}</span>}
          </div>
        </div>

        <div className="cia-gold-rule" />

        <article
          className="prose-sm max-w-none leading-relaxed text-[var(--foreground)]"
          dangerouslySetInnerHTML={{ __html: `<p class="mt-3 text-sm leading-relaxed">${html}</p>` }}
        />
      </div>
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-5">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            Editando
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--green-deep)] px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Título */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
          Título
        </label>
        <input
          type="text"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          className="mac-input w-full text-base font-bold"
          placeholder="Título do documento"
        />
      </div>

      {/* Categoria + Função */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Categoria
          </label>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            className="mac-input w-full"
          >
            <option value="">Sem categoria</option>
            {CATEGORIAS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Função
          </label>
          <select
            value={funcao}
            onChange={e => setFuncao(e.target.value)}
            className="mac-input w-full"
          >
            {FUNCOES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor tabs */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Conteúdo
          </label>
          <div className="flex rounded-lg border border-[var(--border)] p-0.5 text-xs">
            <button
              onClick={() => setTab('md')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                tab === 'md'
                  ? 'bg-[var(--accent)] text-black'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Code2 className="h-3 w-3" />
              Markdown
            </button>
            <button
              onClick={() => setTab('preview')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                tab === 'preview'
                  ? 'bg-[var(--accent)] text-black'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          </div>
        </div>

        {tab === 'md' ? (
          <textarea
            ref={textareaRef}
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            className="mac-input w-full resize-none font-mono text-xs leading-relaxed"
            style={{ minHeight: 360 }}
            placeholder="Escreva em Markdown…"
            spellCheck={false}
          />
        ) : (
          <div
            className="min-h-[360px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 prose-sm max-w-none text-[var(--foreground)]"
            dangerouslySetInnerHTML={{ __html: `<p class="mt-0 text-sm leading-relaxed">${html}</p>` }}
          />
        )}
      </div>
    </div>
  )
}
