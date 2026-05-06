'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle, ChevronRight,
  ChevronLeft, Search, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  createConteudo, updateConteudo, deleteConteudo, setStatus, advanceEstagio,
  type ConteudoPayload,
} from './actions'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Dia        { id: string; nome_dia: string; data: string }
export interface Setor      { id: string; nome: string }
export interface Patrocin   { id: string; nome: string }
export interface Template   { id: string; nome: string; tipo_conteudo: string }
export interface Estagio    { id: string; estagio: string; status: string; ordem: number; dono?: { nome: string } | null }

export interface Conteudo {
  id:               string
  titulo:           string
  tipo:             string
  status:           string
  prioridade:       number
  dia_id:           string | null
  setor_id:         string | null
  patrocinador_id:  string | null
  canal_publicacao: string | null
  briefing:         string | null
  link_publicado:   string | null
  pipeline_template_id: string | null
  dia?:             { nome_dia: string } | null
  patrocinador?:    { nome: string } | null
  estagios?:        Estagio[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUNAS = [
  { status: 'rascunho',    label: 'Rascunho',    color: 'text-[var(--muted-foreground)]',  dot: 'bg-[var(--muted-foreground)]' },
  { status: 'em_producao', label: 'Em produção', color: 'text-blue-400',                  dot: 'bg-blue-400' },
  { status: 'publicado',   label: 'Publicado',   color: 'text-[var(--green-bright)]',      dot: 'bg-[var(--green-bright)]' },
  { status: 'arquivado',   label: 'Arquivado',   color: 'text-[var(--muted-foreground)]',  dot: 'bg-[var(--muted-foreground)]' },
]

const NEXT_STATUS: Record<string, string> = {
  rascunho:    'em_producao',
  em_producao: 'publicado',
  publicado:   'arquivado',
}
const PREV_STATUS: Record<string, string> = {
  em_producao: 'rascunho',
  publicado:   'em_producao',
  arquivado:   'em_producao',
}

const TIPO_LABEL: Record<string, string> = {
  story_rapido:      'Story Rápido',
  story_editado:     'Story Edit.',
  reels:             'Reels',
  card_feed:         'Card Feed',
  card_patrocinado:  'Card Patro.',
  texto_legenda:     'Legenda',
  repost:            'Repost',
  cobertura_ao_vivo: 'Live',
}

const TIPO_COLOR: Record<string, string> = {
  story_rapido:      'bg-blue-500/15 text-blue-300 border-blue-500/30',
  story_editado:     'bg-blue-500/15 text-blue-300 border-blue-500/30',
  reels:             'bg-purple-500/15 text-purple-300 border-purple-500/30',
  card_feed:         'bg-[var(--green)]/15 text-[var(--green-bright)] border-[var(--green)]/30',
  card_patrocinado:  'bg-[var(--gold-dim)]/20 text-[var(--gold)] border-[var(--gold-dim)]/40',
  texto_legenda:     'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  repost:            'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  cobertura_ao_vivo: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const PRIORIDADE_COLOR: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-blue-400',
  5: 'bg-[var(--muted-foreground)]',
}

const ESTAGIO_LABEL: Record<string, string> = {
  captura:        'Captura',
  pesquisa:       'Pesquisa',
  edicao_video:   'Ed. Vídeo',
  edicao_foto:    'Ed. Foto',
  design_arte:    'Design',
  redacao:        'Redação',
  aprovacao_coord:'Aprv. Coord',
  aprovacao_patro:'Aprv. Patro',
  publicacao:     'Publicação',
}

const TIPO_CONTEUDO_OPTIONS = [
  { value: 'story_rapido',      label: 'Story Rápido' },
  { value: 'story_editado',     label: 'Story Editado' },
  { value: 'reels',             label: 'Reels' },
  { value: 'card_feed',         label: 'Card Feed' },
  { value: 'card_patrocinado',  label: 'Card Patrocinado' },
  { value: 'texto_legenda',     label: 'Texto / Legenda' },
  { value: 'repost',            label: 'Repost' },
  { value: 'cobertura_ao_vivo', label: 'Cobertura Ao Vivo' },
]

const CANAL_OPTIONS = [
  { value: 'instagram_feed',    label: 'Instagram Feed' },
  { value: 'instagram_stories', label: 'Instagram Stories' },
  { value: 'instagram_reels',   label: 'Instagram Reels' },
  { value: 'tiktok',            label: 'TikTok' },
  { value: 'youtube',           label: 'YouTube' },
  { value: 'youtube_shorts',    label: 'YouTube Shorts' },
  { value: 'twitter_x',         label: 'Twitter / X' },
  { value: 'whatsapp_status',   label: 'WhatsApp Status' },
  { value: 'outro',             label: 'Outro' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converte '' e '__none__' em null (sentinelas dos <Select> sem opção). */
function nullIfNone(v: string): string | null {
  return v === '' || v === '__none__' ? null : v
}

function estagioAtivo(estagios?: Estagio[]): Estagio | null {
  if (!estagios?.length) return null
  return (
    estagios.find((e) => e.status === 'em_andamento') ??
    estagios.find((e) => e.status === 'pendente') ??
    estagios.find((e) => e.status === 'pausado') ??
    estagios.find((e) => e.status === 'bloqueado') ??
    null
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ConteudoCard({
  c,
  onEdit,
  onDelete,
  onMove,
}: {
  c: Conteudo
  onEdit: () => void
  onDelete: () => void
  onMove: (status: string) => void
}) {
  const estagio = estagioAtivo(c.estagios)
  const hasPrev = !!PREV_STATUS[c.status]
  const hasNext = !!NEXT_STATUS[c.status]

  return (
    <div className="group relative rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-all hover:border-[var(--green)]/40 hover:shadow-[0_0_12px_rgba(74,138,92,0.08)]">
      {/* Priority dot */}
      <div className={cn('absolute left-0 top-3 w-1 rounded-r', PRIORIDADE_COLOR[c.prioridade] ?? 'bg-[var(--muted)]')} style={{ height: 28 }} />

      <div className="pl-2">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide', TIPO_COLOR[c.tipo] ?? '')}>
            {TIPO_LABEL[c.tipo] ?? c.tipo}
          </span>
          <p className="flex-1 text-xs font-medium leading-snug text-[var(--foreground)] line-clamp-2">{c.titulo}</p>
        </div>

        {/* Meta */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
          {c.dia && <span>📅 {c.dia.nome_dia}</span>}
          {c.patrocinador && <span className="text-[var(--gold)]">🤝 {c.patrocinador.nome}</span>}
          {estagio && (
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-medium">
              {ESTAGIO_LABEL[estagio.estagio] ?? estagio.estagio}
            </span>
          )}
          {c.link_publicado && (
            <a href={c.link_publicado} target="_blank" rel="noopener noreferrer"
              className="text-[var(--green-bright)] underline underline-offset-2">ver post</a>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {hasPrev && (
            <button
              title="Voltar status"
              onClick={() => onMove(PREV_STATUS[c.status])}
              className="rounded p-1 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          )}
          <button onClick={onEdit} title="Editar" className="rounded p-1 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <Pencil className="h-3 w-3" />
          </button>
          <button onClick={onDelete} title="Excluir" className="rounded p-1 hover:bg-red-500/20 text-[var(--muted-foreground)] hover:text-red-400">
            <Trash2 className="h-3 w-3" />
          </button>
          {hasNext && (
            <button
              title="Avançar status"
              onClick={() => onMove(NEXT_STATUS[c.status])}
              className="ml-auto rounded p-1 hover:bg-[var(--green)]/20 text-[var(--muted-foreground)] hover:text-[var(--green-bright)]"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dialog criar/editar ───────────────────────────────────────────────────────

interface ConteudoDialogProps {
  open: boolean
  onClose: () => void
  edicaoId: string
  dias: Dia[]
  setores: Setor[]
  patrocinadores: Patrocin[]
  templates: Template[]
  editing?: Conteudo
  defaultStatus?: string
}

function ConteudoDialog({ open, onClose, edicaoId, dias, setores, patrocinadores, templates, editing, defaultStatus }: ConteudoDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [titulo, setTitulo]         = React.useState(editing?.titulo ?? '')
  const [tipo, setTipo]             = React.useState(editing?.tipo ?? 'story_rapido')
  const [status, setStatus_]        = React.useState(editing?.status ?? defaultStatus ?? 'rascunho')
  const [prioridade, setPrioridade] = React.useState(String(editing?.prioridade ?? 3))
  const [diaId, setDiaId]           = React.useState(editing?.dia_id ?? '')
  const [setorId, setSetorId]       = React.useState(editing?.setor_id ?? '')
  const [patroId, setPatroId]       = React.useState(editing?.patrocinador_id ?? '')
  const [canal, setCanal]           = React.useState(editing?.canal_publicacao ?? '')
  const [tplId, setTplId]           = React.useState(editing?.pipeline_template_id ?? '')
  const [briefing, setBriefing]     = React.useState(editing?.briefing ?? '')
  const [link, setLink]             = React.useState(editing?.link_publicado ?? '')

  React.useEffect(() => {
    if (open) {
      setError(null)
      setLoading(false)
      setTitulo(editing?.titulo ?? '')
      setTipo(editing?.tipo ?? 'story_rapido')
      setStatus_(editing?.status ?? defaultStatus ?? 'rascunho')
      setPrioridade(String(editing?.prioridade ?? 3))
      setDiaId(editing?.dia_id ?? '')
      setSetorId(editing?.setor_id ?? '')
      setPatroId(editing?.patrocinador_id ?? '')
      setCanal(editing?.canal_publicacao ?? '')
      setTplId(editing?.pipeline_template_id ?? '')
      setBriefing(editing?.briefing ?? '')
      setLink(editing?.link_publicado ?? '')
    }
  }, [open, editing, defaultStatus])

  async function submit() {
    if (!titulo.trim()) { setError('Título obrigatório.'); return }
    setLoading(true)
    setError(null)
    try {
      const payload: ConteudoPayload & { link_publicado?: string } = {
        edicao_id:            edicaoId,
        titulo:               titulo.trim(),
        tipo,
        status,
        prioridade:           Number(prioridade),
        dia_id:               nullIfNone(diaId),
        setor_id:             nullIfNone(setorId),
        patrocinador_id:      nullIfNone(patroId),
        canal_publicacao:     nullIfNone(canal),
        pipeline_template_id: nullIfNone(tplId),
        briefing:             briefing || null,
        ...(link ? { link_publicado: link } : {}),
      }

      const res = editing
        ? await updateConteudo(editing.id, payload)
        : await createConteudo(payload)

      if (!res.ok) { setError(res.error ?? 'Erro ao salvar.'); return }
      router.refresh()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar conteúdo' : 'Novo conteúdo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs">Título *</Label>
            <Input className="text-sm" placeholder="Ex: Highlights Futsal Masculino Quinta" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_CONTEUDO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus_}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="em_producao">Em produção</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Dia</Label>
              <Select value={diaId} onValueChange={setDiaId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— dia —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem dia</SelectItem>
                  {dias.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome_dia} · {d.data}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">🔴 1 — Alta</SelectItem>
                  <SelectItem value="2">🟠 2 — Importante</SelectItem>
                  <SelectItem value="3">🟡 3 — Normal</SelectItem>
                  <SelectItem value="4">🔵 4 — Baixa</SelectItem>
                  <SelectItem value="5">⚪ 5 — Quando der</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Pipeline</Label>
              <Select value={tplId} onValueChange={setTplId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— template —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem pipeline</SelectItem>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— canal —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Indefinido</SelectItem>
                  {CANAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Setor / Área</Label>
              <Select value={setorId} onValueChange={setSetorId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— setor —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Geral</SelectItem>
                  {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Patrocinador</Label>
              <Select value={patroId} onValueChange={setPatroId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— patro —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {patrocinadores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Briefing / Descrição</Label>
            <textarea
              className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
              rows={3}
              placeholder="O que precisa ser capturado, editado, publicado..."
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
            />
          </div>

          {(status === 'publicado' || editing?.link_publicado) && (
            <div>
              <Label className="mb-1.5 block text-xs">Link publicado</Label>
              <Input className="text-xs" placeholder="https://instagram.com/p/..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />{error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  conteudos,
  onAdd,
  onEdit,
  onDelete,
  onMove,
}: {
  col: (typeof COLUNAS)[number]
  conteudos: Conteudo[]
  onAdd: () => void
  onEdit: (c: Conteudo) => void
  onDelete: (c: Conteudo) => void
  onMove: (c: Conteudo, status: string) => void
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--card)]/40">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className={cn('h-2 w-2 rounded-full', col.dot)} />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', col.color)}>{col.label}</span>
        <span className="ml-auto rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">
          {conteudos.length}
        </span>
        <button
          onClick={onAdd}
          title="Adicionar"
          className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {conteudos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-xs text-[var(--muted-foreground)]/60">Vazio</p>
            <button
              onClick={onAdd}
              className="rounded border border-dashed border-[var(--border)] px-3 py-1.5 text-[10px] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              + Adicionar
            </button>
          </div>
        ) : (
          conteudos.map((c) => (
            <ConteudoCard
              key={c.id}
              c={c}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
              onMove={(s) => onMove(c, s)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main KanbanBoard ──────────────────────────────────────────────────────────

interface KanbanBoardProps {
  edicaoId:      string
  conteudos:     Conteudo[]
  dias:          Dia[]
  setores:       Setor[]
  patrocinadores: Patrocin[]
  templates:     Template[]
}

export function KanbanBoard({ edicaoId, conteudos: initial, dias, setores, patrocinadores, templates }: KanbanBoardProps) {
  const router = useRouter()
  const [conteudos, setConteudos] = React.useState(initial)
  const [search, setSearch]       = React.useState('')
  const [filterDia, setFilterDia] = React.useState('')
  const [filterTipo, setFilterTipo] = React.useState('')

  const [dialog, setDialog] = React.useState<{
    open: boolean
    editing?: Conteudo
    defaultStatus?: string
  }>({ open: false })

  const [deleteTarget, setDeleteTarget] = React.useState<Conteudo | null>(null)
  const [deleting, setDeleting]         = React.useState(false)
  const [moving, setMoving]             = React.useState<string | null>(null)

  // Sync when server refreshes
  React.useEffect(() => { setConteudos(initial) }, [initial])

  // Filter
  const filtered = React.useMemo(() => {
    let list = conteudos
    if (search)    list = list.filter((c) => c.titulo.toLowerCase().includes(search.toLowerCase()))
    if (filterDia) list = list.filter((c) => c.dia_id === filterDia)
    if (filterTipo)list = list.filter((c) => c.tipo === filterTipo)
    return list
  }, [conteudos, search, filterDia, filterTipo])

  async function handleMove(c: Conteudo, status: string) {
    setMoving(c.id)
    const res = await setStatus(c.id, status)
    setMoving(null)
    if (res.ok) {
      setConteudos((prev) => prev.map((x) => x.id === c.id ? { ...x, status } : x))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteConteudo(deleteTarget.id)
    setDeleting(false)
    setConteudos((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const total      = filtered.length
  const publicados = filtered.filter((c) => c.status === 'publicado').length

  return (
    <div className="flex flex-col h-full">

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-6 py-3 bg-[var(--card)]/40 backdrop-blur-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--card)] pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] w-52"
            placeholder="Buscar conteúdo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Dia filter */}
        <Select value={filterDia} onValueChange={setFilterDia}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <Filter className="mr-1.5 h-3 w-3" />
            <SelectValue placeholder="Todos os dias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os dias</SelectItem>
            {dias.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome_dia}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Tipo filter */}
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {TIPO_CONTEUDO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span><span className="font-bold text-[var(--foreground)]">{total}</span> conteúdos</span>
          <span>
            <span className="font-bold text-[var(--green-bright)]">{publicados}</span> publicados
          </span>
          <span className="text-[var(--muted-foreground)]/50">
            {total > 0 ? Math.round((publicados / total) * 100) : 0}% entregues
          </span>
        </div>

        <Button size="sm" onClick={() => setDialog({ open: true })}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo conteúdo
        </Button>
      </div>

      {/* ── Kanban columns ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 min-w-max">
          {COLUNAS.map((col) => {
            const colConteudos = filtered
              .filter((c) => c.status === col.status)
              .sort((a, b) => a.prioridade - b.prioridade)

            return (
              <KanbanColumn
                key={col.status}
                col={col}
                conteudos={colConteudos}
                onAdd={() => setDialog({ open: true, defaultStatus: col.status })}
                onEdit={(c) => setDialog({ open: true, editing: c })}
                onDelete={(c) => setDeleteTarget(c)}
                onMove={handleMove}
              />
            )
          })}
        </div>
      </div>

      {/* Loading overlay on move */}
      {moving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-[var(--card)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--foreground)] shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--green-bright)]" />
          Movendo…
        </div>
      )}

      {/* Add/Edit dialog */}
      <ConteudoDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        edicaoId={edicaoId}
        dias={dias}
        setores={setores}
        patrocinadores={patrocinadores}
        templates={templates}
        editing={dialog.editing}
        defaultStatus={dialog.defaultStatus}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir conteúdo?</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            "<strong>{deleteTarget?.titulo}</strong>" será removido permanentemente.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
