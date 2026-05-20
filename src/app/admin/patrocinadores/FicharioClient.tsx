'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Crown, Upload, Loader2, Mail, Phone, PowerOff, Plus, ChevronDown,
  ChevronRight, Pencil, Trash2, Eye, AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { uploadLogoPatrocinador } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatrocinadorRow {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  cor_marca: string | null
  cota: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  observacoes: string | null
  ativo: boolean
}

export interface ConteudoStat {
  patrocinador_id: string
  publicados: number
  em_producao: number
  total: number
}

interface Props {
  patrocinadores: PatrocinadorRow[]
  conteudoStats: ConteudoStat[]
  onCreate: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
  onUpdate: (id: string, fd: FormData) => Promise<{ ok: boolean; error?: string }>
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>
}

// ── Cota config ───────────────────────────────────────────────────────────────

const COTA_ORDER = ['Master', 'Ouro', 'Prata', 'Apoio']

const COTA_CFG: Record<string, {
  label: string
  border: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  sectionTitle: string
}> = {
  Master: {
    label: 'Master',
    border: '#D4AF37',
    badgeBg: 'rgba(212,175,55,0.12)',
    badgeText: '#A67D14',
    badgeBorder: 'rgba(212,175,55,0.40)',
    sectionTitle: '#D4AF37',
  },
  Ouro: {
    label: 'Ouro',
    border: '#F59E0B',
    badgeBg: 'rgba(245,158,11,0.10)',
    badgeText: '#92651a',
    badgeBorder: 'rgba(245,158,11,0.30)',
    sectionTitle: '#F59E0B',
  },
  Prata: {
    label: 'Prata',
    border: '#94A3B8',
    badgeBg: 'rgba(148,163,184,0.12)',
    badgeText: '#64748b',
    badgeBorder: 'rgba(148,163,184,0.30)',
    sectionTitle: '#94A3B8',
  },
  Apoio: {
    label: 'Apoio',
    border: '#2e6b42',
    badgeBg: 'rgba(46,107,66,0.10)',
    badgeText: '#2e6b42',
    badgeBorder: 'rgba(46,107,66,0.25)',
    sectionTitle: '#4aa066',
  },
}

// ── Form dialog ───────────────────────────────────────────────────────────────

interface FormState {
  nome: string
  cota: string
  cor_marca: string
  ativo: boolean
  contato_nome: string
  contato_email: string
  contato_telefone: string
  slug: string
  observacoes: string
  logo_url: string
}

function emptyForm(): FormState {
  return {
    nome: '', cota: '', cor_marca: '', ativo: true,
    contato_nome: '', contato_email: '', contato_telefone: '',
    slug: '', observacoes: '', logo_url: '',
  }
}

function patToForm(p: PatrocinadorRow): FormState {
  return {
    nome: p.nome,
    cota: p.cota ?? '',
    cor_marca: p.cor_marca ?? '',
    ativo: p.ativo,
    contato_nome: p.contato_nome ?? '',
    contato_email: p.contato_email ?? '',
    contato_telefone: p.contato_telefone ?? '',
    slug: p.slug ?? '',
    observacoes: p.observacoes ?? '',
    logo_url: p.logo_url ?? '',
  }
}

function PatrocinadorFormDialog({
  open,
  onClose,
  editing,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  editing: PatrocinadorRow | null
  onCreate: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
  onUpdate: (id: string, fd: FormData) => Promise<{ ok: boolean; error?: string }>
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(editing ? patToForm(editing) : emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Reset when dialog opens
  const prevOpen = useRef(false)
  if (open !== prevOpen.current) {
    prevOpen.current = open
    if (open) {
      setForm(editing ? patToForm(editing) : emptyForm())
      setError(null)
    }
  }

  function set(k: keyof FormState, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)))

    startTransition(async () => {
      const res = editing
        ? await onUpdate(editing.id, fd)
        : await onCreate(fd)
      if (!res.ok) {
        setError(res.error ?? 'Erro ao salvar.')
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar patrocinador' : 'Novo patrocinador'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pf-nome">Nome *</Label>
              <Input id="pf-nome" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Itaipava" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-cota">Cota</Label>
              <Select value={form.cota} onValueChange={v => set('cota', v)}>
                <SelectTrigger id="pf-cota"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Master">Master</SelectItem>
                  <SelectItem value="Ouro">Ouro</SelectItem>
                  <SelectItem value="Prata">Prata</SelectItem>
                  <SelectItem value="Apoio">Apoio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-cor">Cor da marca</Label>
              <Input id="pf-cor" type="color" value={form.cor_marca || '#000000'} onChange={e => set('cor_marca', e.target.value)} className="h-9 cursor-pointer p-1" />
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-2">
            <input
              id="pf-ativo"
              type="checkbox"
              checked={form.ativo}
              onChange={e => set('ativo', e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            <Label htmlFor="pf-ativo">Ativo</Label>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pf-cname">Contato</Label>
              <Input id="pf-cname" value={form.contato_nome} onChange={e => set('contato_nome', e.target.value)} placeholder="João Silva" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-email">E-mail</Label>
              <Input id="pf-email" type="email" value={form.contato_email} onChange={e => set('contato_email', e.target.value)} placeholder="joao@marca.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-tel">Telefone</Label>
              <Input id="pf-tel" value={form.contato_telefone} onChange={e => set('contato_telefone', e.target.value)} placeholder="(34) 99999-9999" />
            </div>
          </div>

          {/* Slug + logo_url */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pf-slug">Slug</Label>
              <Input id="pf-slug" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="itaipava" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-logo">Logo URL</Label>
              <Input id="pf-logo" value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Observacoes */}
          <div className="space-y-1">
            <Label htmlFor="pf-obs">Observações</Label>
            <Textarea id="pf-obs" rows={3} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Anotações internas..." />
          </div>

          {error && (
            <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-xs text-[var(--destructive)]">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Logo button (with upload) ─────────────────────────────────────────────────

function LogoButton({ p, cor }: { p: PatrocinadorRow; cor: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startUpload] = useTransition()
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    setUploadErr(null)
    startUpload(async () => {
      const res = await uploadLogoPatrocinador(p.id, fd)
      if (!res.ok) setUploadErr(res.error ?? 'Erro ao fazer upload.')
      else router.refresh()
    })
    e.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={pending}
        title="Clique para trocar a logo"
        aria-label="Trocar logo"
        className="group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-lg disabled:cursor-not-allowed"
        style={{ borderColor: 'var(--border)' }}
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
        ) : p.logo_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo_url} alt={p.nome} className="h-full w-full object-contain p-1.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="h-4 w-4 text-white" />
            </span>
          </>
        ) : (
          <>
            <span className="text-base font-bold uppercase tracking-wider" style={{ color: cor }}>
              {p.nome.slice(0, 2)}
            </span>
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="h-4 w-4 text-white" />
            </span>
          </>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleFileChange} />
      {uploadErr && (
        <p className="col-span-full mt-0.5 rounded px-2 py-1 text-[10px] bg-[var(--destructive)]/10 text-[var(--destructive)]">{uploadErr}</p>
      )}
    </>
  )
}

// ── Ficha card ────────────────────────────────────────────────────────────────

function FichaCard({
  p,
  stat,
  cotaCfg,
  onEdit,
  onDelete,
}: {
  p: PatrocinadorRow
  stat: ConteudoStat | undefined
  cotaCfg: typeof COTA_CFG[string]
  onEdit: () => void
  onDelete: () => void
}) {
  const pct = stat && stat.total > 0 ? Math.round((stat.publicados / stat.total) * 100) : 0

  return (
    <article
      className={`relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-[var(--card)] p-4 transition-all hover:shadow-lg ${!p.ativo ? 'opacity-55' : ''}`}
      style={{ borderColor: 'var(--border)', borderLeftColor: cotaCfg.border, borderLeftWidth: 3 }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <LogoButton p={p} cor={cotaCfg.border} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-1.5">
            <h3 className="truncate text-sm font-bold leading-tight text-[var(--foreground)]">{p.nome}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: cotaCfg.badgeBg, color: cotaCfg.badgeText, border: `1px solid ${cotaCfg.badgeBorder}` }}
            >
              <Crown className="h-2.5 w-2.5" />
              {p.cota}
            </span>
            {!p.ativo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                <PowerOff className="h-2.5 w-2.5" />
                Inativo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contato */}
      {(p.contato_nome || p.contato_email || p.contato_telefone) && (
        <div className="space-y-0.5 text-[11px] text-[var(--muted-foreground)]">
          {p.contato_nome && (
            <p className="font-medium text-[var(--foreground)]/80">{p.contato_nome}</p>
          )}
          {p.contato_email && (
            <a href={`mailto:${p.contato_email}`} className="flex items-center gap-1.5 transition-colors hover:text-[var(--accent)]">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.contato_email}</span>
            </a>
          )}
          {p.contato_telefone && (() => {
            const tel = p.contato_telefone.replace(/\D/g, '')
            if (tel.length >= 8) {
              return (
                <a href={`tel:${tel}`} className="flex items-center gap-1.5 transition-colors hover:text-[var(--accent)]">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{p.contato_telefone}</span>
                </a>
              )
            }
            return (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{p.contato_telefone}</span>
              </span>
            )
          })()}
        </div>
      )}

      {/* Content progress */}
      {stat && stat.total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>
              <span className="font-semibold text-[var(--foreground)]">{stat.publicados}</span> publicados
              {' · '}
              <span className="font-semibold text-[var(--foreground)]">{stat.em_producao}</span> em produção
              {' · '}
              <span className="font-semibold">{stat.total}</span> total
            </span>
            <span className={`font-bold ${pct >= 70 ? 'text-[var(--green-bright)]' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct >= 70
                  ? 'linear-gradient(90deg, #2e6b42, #4aa066)'
                  : pct >= 40
                  ? 'linear-gradient(90deg, #B58812, #E8B82F)'
                  : 'linear-gradient(90deg, #A04A2E, #C46B4A)',
              }}
            />
          </div>
        </div>
      )}
      {stat && stat.total === 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
          Sem conteúdos vinculados
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-[var(--border)]/40 pt-2">
        <Link
          href={`/admin/patrocinadores/${p.id}`}
          className="flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <Eye className="h-3.5 w-3.5" />
          Ficha
        </Link>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

// ── Collapsible cota section ──────────────────────────────────────────────────

function CotaSection({
  cota,
  patrocinadores,
  conteudoStats,
  onEdit,
  onDelete,
  onAddNew,
}: {
  cota: string
  patrocinadores: PatrocinadorRow[]
  conteudoStats: ConteudoStat[]
  onEdit: (p: PatrocinadorRow) => void
  onDelete: (p: PatrocinadorRow) => void
  onAddNew: () => void
}) {
  const [open, setOpen] = useState(true)
  const cfg = COTA_CFG[cota] ?? COTA_CFG.Apoio
  const statsMap = new Map(conteudoStats.map(s => [s.patrocinador_id, s]))

  return (
    <section>
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mb-3 flex w-full items-center gap-2.5 text-left"
      >
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ background: cfg.border }}
        />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.sectionTitle }}>
          {cfg.label}
        </span>
        <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]">
          {patrocinadores.length}
        </span>
        <div className="ml-auto text-[var(--muted-foreground)]">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
      </button>

      {open && (
        patrocinadores.length === 0 ? (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted-foreground)]">
            <span>Nenhum patrocinador nesta cota.</span>
            <button
              type="button"
              onClick={onAddNew}
              className="ml-auto text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              + Adicionar
            </button>
          </div>
        ) : (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {patrocinadores.map(p => (
              <FichaCard
                key={p.id}
                p={p}
                stat={statsMap.get(p.id)}
                cotaCfg={cfg}
                onEdit={() => onEdit(p)}
                onDelete={() => onDelete(p)}
              />
            ))}
          </div>
        )
      )}
    </section>
  )
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ patrocinadores, conteudoStats }: { patrocinadores: PatrocinadorRow[]; conteudoStats: ConteudoStat[] }) {
  const ativos = patrocinadores.filter(p => p.ativo).length
  const inativos = patrocinadores.length - ativos
  const totalConteudos = conteudoStats.reduce((s, c) => s + c.total, 0)
  const totalPublicados = conteudoStats.reduce((s, c) => s + c.publicados, 0)

  const breakdown = COTA_ORDER.map(cota => ({
    cota,
    count: patrocinadores.filter(p => p.cota === cota).length,
    cfg: COTA_CFG[cota],
  })).filter(x => x.count > 0)

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Total</p>
        <p className="text-xl font-bold text-[var(--foreground)]">{patrocinadores.length}</p>
      </div>
      <div className="h-8 w-px bg-[var(--border)]" />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Ativos</p>
        <p className="text-xl font-bold text-[var(--green-bright)]">{ativos}</p>
      </div>
      {inativos > 0 && (
        <>
          <div className="h-8 w-px bg-[var(--border)]" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Inativos</p>
            <p className="text-xl font-bold text-[var(--muted-foreground)]">{inativos}</p>
          </div>
        </>
      )}
      <div className="h-8 w-px bg-[var(--border)]" />
      {breakdown.map(({ cota, count, cfg }) => (
        <div key={cota} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: cfg.border }} />
          <span className="text-xs font-semibold" style={{ color: cfg.sectionTitle }}>{count} {cota}</span>
        </div>
      ))}
      {totalConteudos > 0 && (
        <>
          <div className="ml-auto h-8 w-px bg-[var(--border)]" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Conteúdos</p>
            <p className="text-sm font-bold text-[var(--foreground)]">
              <span className="text-[var(--green-bright)]">{totalPublicados}</span>
              <span className="text-[var(--muted-foreground)]">/{totalConteudos}</span>
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FicharioClient({
  patrocinadores,
  conteudoStats,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PatrocinadorRow | null>(null)
  const [deletePending, startDelete] = useTransition()

  function openCreate(cota?: string) {
    setEditing(null)
    setDialogOpen(true)
    // Pre-select cota if coming from empty section — handled via editing=null and cota hint
    void cota
  }

  function openEdit(p: PatrocinadorRow) {
    setEditing(p)
    setDialogOpen(true)
  }

  function handleDelete(p: PatrocinadorRow) {
    if (!confirm(`Excluir "${p.nome}"? Esta ação não pode ser desfeita.`)) return
    startDelete(async () => {
      const res = await onDelete(p.id)
      if (!res.ok) alert(res.error ?? 'Erro ao excluir.')
      else router.refresh()
    })
  }

  const grouped = COTA_ORDER.reduce<Record<string, PatrocinadorRow[]>>((acc, cota) => {
    acc[cota] = patrocinadores.filter(p => p.cota === cota)
    return acc
  }, {})

  // Uncategorized
  const uncategorized = patrocinadores.filter(p => !p.cota || !COTA_ORDER.includes(p.cota))

  return (
    <div className="space-y-2 pb-10">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--accent)]">Gestão</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[var(--foreground)]">Patrocinadores</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Cadastre cada patrocinador. Escopo de entregas gerenciado dentro de cada ficha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          disabled={deletePending}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Novo patrocinador
        </button>
      </div>

      {/* Summary */}
      <SummaryStrip patrocinadores={patrocinadores} conteudoStats={conteudoStats} />

      {/* Cota sections */}
      {COTA_ORDER.map(cota => (
        <CotaSection
          key={cota}
          cota={cota}
          patrocinadores={grouped[cota] ?? []}
          conteudoStats={conteudoStats}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAddNew={() => openCreate(cota)}
        />
      ))}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <CotaSection
          cota="Apoio"
          patrocinadores={uncategorized}
          conteudoStats={conteudoStats}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAddNew={() => openCreate()}
        />
      )}

      {/* Form dialog */}
      <PatrocinadorFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
    </div>
  )
}
