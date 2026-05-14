'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Save, FileText } from 'lucide-react'
import { createDoc } from '@/app/actions/wiki'
import { FAB } from '@/components/fab'

const CATEGORIAS = [
  { value: 'briefing',   label: 'Briefing' },
  { value: 'manual',     label: 'Manual' },
  { value: 'contatos',   label: 'Contatos' },
  { value: 'tom_de_voz', label: 'Tom de Voz' },
]

const FUNCOES = [
  { value: '',            label: 'Todas as funções' },
  { value: 'foto',        label: 'Foto' },
  { value: 'video',       label: 'Vídeo' },
  { value: 'social',      label: 'Social' },
  { value: 'reporter',    label: 'Reporter' },
  { value: 'editor',      label: 'Editor' },
  { value: 'drone',       label: 'Drone' },
  { value: 'roaming',     label: 'Roaming' },
  { value: 'coordenacao', label: 'Coordenação' },
  { value: 'producao',    label: 'Produção' },
  { value: 'design',      label: 'Design' },
]

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export function WikiNewButton() {
  const router = useRouter()
  const [open,      setOpen]      = useState(false)
  const [titulo,    setTitulo]    = useState('')
  const [slug,      setSlug]      = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [categoria, setCategoria] = useState('briefing')
  const [funcao,    setFuncao]    = useState('')
  const [conteudo,  setConteudo]  = useState('')
  const [error,     setError]     = useState('')
  const [isPending, startTransition] = useTransition()

  // Auto-gera slug a partir do título (enquanto não editado manualmente)
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(titulo))
  }, [titulo, slugEdited])

  function handleClose() {
    setOpen(false)
    setTitulo(''); setSlug(''); setSlugEdited(false)
    setCategoria('briefing'); setFuncao(''); setConteudo(''); setError('')
  }

  // Fecha com ESC
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit() {
    if (!titulo.trim())  { setError('Título obrigatório.'); return }
    if (!slug.trim())    { setError('Slug obrigatório.'); return }
    setError('')
    startTransition(async () => {
      try {
        const newSlug = await createDoc({
          titulo:      titulo.trim(),
          slug:        slug.trim(),
          conteudo_md: conteudo,
          categoria:   categoria || null,
          funcao:      funcao || null,
        })
        handleClose()
        router.push(`/wiki/${newSlug}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao criar documento.')
      }
    })
  }

  return (
    <>
      {/* Botão inline no header (desktop) — escondido em mobile (substituído pelo FAB) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-[var(--green-deep)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" />
        Novo documento
      </button>

      {/* FAB — aparece em mobile (o botão inline fica escondido) e também em desktop como atalho */}
      <FAB
        onClick={() => setOpen(true)}
        label="Novo documento"
        ariaLabel="Criar novo documento"
        hidden={open}
      />


      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
            style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.50)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--muted)]">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-bold">Novo documento</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Wiki · CIA 2026</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              {/* Título */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Título *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="mac-input w-full font-semibold"
                  placeholder="Ex: Manual de Fotografia"
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Slug (URL) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)] shrink-0">/wiki/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
                    className="mac-input flex-1 font-mono text-xs"
                    placeholder="manual-fotografia"
                  />
                </div>
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

              {/* Conteúdo */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Conteúdo (Markdown)
                </label>
                <textarea
                  value={conteudo}
                  onChange={e => setConteudo(e.target.value)}
                  className="mac-input w-full resize-none font-mono text-xs leading-relaxed"
                  rows={10}
                  placeholder={`# Título\n\nEscreva o conteúdo em Markdown…\n\n## Seção\n\n- Item 1\n- Item 2`}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !titulo.trim() || !slug.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--green-deep)] px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                {isPending ? 'Criando…' : 'Criar documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
