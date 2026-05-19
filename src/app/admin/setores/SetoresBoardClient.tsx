'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Loader2, Wifi, WifiOff, Utensils,
  ShieldCheck, MapPin, X, ChevronDown, ChevronRight, Youtube, Ticket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createSetor, updateSetor, deleteSetor } from './actions'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SetorRow {
  id: string
  nome: string
  tipo: string
  endereco: string | null
  lat: number | null
  lng: number | null
  capacidade_pessoas: number | null
  cor_hex: string | null
  observacoes: string | null
  maps_url: string | null
  tem_wifi: boolean
  tem_ponto_apoio: boolean
  alimentacao: string | null
  notas_acesso: string | null
  tem_youtube_live: boolean
}

type FormState = Omit<SetorRow, 'id'>

// ─── Constants ─────────────────────────────────────────────────────────────────

const TIPOS = [
  { value: 'esportivo', label: 'Esportivo',  emoji: '🏟️', desc: 'Ginásio, quadra, campo' },
  { value: 'palco',     label: 'Palco',      emoji: '🎤', desc: 'Shows e apresentações' },
  { value: 'festa',     label: 'Festa',      emoji: '🎉', desc: 'Áreas de festa e confraternização' },
  { value: 'apoio',     label: 'Apoio',      emoji: '🏕️', desc: 'Base, camarote, patrocinadores' },
  { value: 'externo',   label: 'Externo',    emoji: '🏙️', desc: 'Locais fora do complexo' },
] as const

const ALIMENTACAO_OPTS = [
  { value: 'nenhuma',     label: 'Nenhuma' },
  { value: 'praca_staff', label: 'Praça staff' },
  { value: 'voucher',     label: 'Voucher' },
]

const TIPO_COLORS: Record<string, string> = {
  esportivo: 'var(--accent)',
  palco:     '#7C3AED',
  festa:     '#DB2777',
  apoio:     '#0891B2',
  externo:   '#64748B',
}

// ─── Form ──────────────────────────────────────────────────────────────────────

function emptyForm(defaultTipo = 'esportivo'): FormState {
  return {
    nome: '', tipo: defaultTipo, endereco: null, lat: null, lng: null,
    capacidade_pessoas: null, cor_hex: null, observacoes: null,
    maps_url: null, tem_wifi: false, tem_ponto_apoio: false,
    alimentacao: null, notas_acesso: null, tem_youtube_live: false,
  }
}

function rowToForm(r: SetorRow): FormState {
  return {
    nome: r.nome, tipo: r.tipo, endereco: r.endereco, lat: r.lat, lng: r.lng,
    capacidade_pessoas: r.capacidade_pessoas, cor_hex: r.cor_hex,
    observacoes: r.observacoes, maps_url: r.maps_url,
    tem_wifi: r.tem_wifi, tem_ponto_apoio: r.tem_ponto_apoio,
    alimentacao: r.alimentacao, notas_acesso: r.notas_acesso,
    tem_youtube_live: r.tem_youtube_live,
  }
}

function formToFormData(state: FormState): FormData {
  const fd = new FormData()
  const entries: [string, string | null | undefined][] = [
    ['nome', state.nome],
    ['tipo', state.tipo],
    ['endereco', state.endereco],
    ['lat', state.lat != null ? String(state.lat) : null],
    ['lng', state.lng != null ? String(state.lng) : null],
    ['capacidade_pessoas', state.capacidade_pessoas != null ? String(state.capacidade_pessoas) : null],
    ['cor_hex', state.cor_hex],
    ['observacoes', state.observacoes],
    ['maps_url', state.maps_url],
    ['tem_wifi', state.tem_wifi ? 'true' : 'false'],
    ['tem_ponto_apoio', state.tem_ponto_apoio ? 'true' : 'false'],
    ['alimentacao', state.alimentacao],
    ['notas_acesso', state.notas_acesso],
    ['tem_youtube_live', state.tem_youtube_live ? 'true' : 'false'],
  ]
  for (const [k, v] of entries) {
    if (v != null && v !== '') fd.set(k, v)
  }
  return fd
}

// ─── SetorFormDialog ───────────────────────────────────────────────────────────

function SetorFormDialog({
  open, onOpenChange, row, defaultTipo = 'esportivo',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  row: SetorRow | null
  defaultTipo?: string
}) {
  const router = useRouter()
  const [state, setState] = React.useState<FormState>(() =>
    row ? rowToForm(row) : emptyForm(defaultTipo)
  )
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setState(row ? rowToForm(row) : emptyForm(defaultTipo))
      setErr(null)
    }
  }, [open, row, defaultTipo])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState(s => ({ ...s, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const fd = formToFormData(state)
    const res = row ? await updateSetor(row.id, fd) : await createSetor(fd)
    setSaving(false)
    if (!res.ok) { setErr(res.error ?? 'Erro ao salvar.'); return }
    onOpenChange(false)
    router.refresh()
  }

  const tipoInfo = TIPOS.find(t => t.value === state.tipo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? 'Editar setor' : 'Novo setor'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do local físico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="nome" className="mb-1.5 block">
                Nome <span className="text-[var(--destructive)]">*</span>
              </Label>
              <Input
                id="nome" value={state.nome} required
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: SESI Clube"
              />
            </div>
            <div>
              <Label htmlFor="tipo" className="mb-1.5 block">
                Tipo <span className="text-[var(--destructive)]">*</span>
              </Label>
              <Select value={state.tipo} onValueChange={v => set('tipo', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoInfo && (
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{tipoInfo.desc}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cor" className="mb-1.5 block">Cor</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color" id="cor"
                  value={state.cor_hex ?? '#00000000'}
                  onChange={e => set('cor_hex', e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-[var(--border)] bg-transparent p-0.5"
                />
                <Input
                  value={state.cor_hex ?? ''}
                  onChange={e => set('cor_hex', e.target.value || null)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Capacidade + Endereço */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Capacidade (pessoas)</Label>
              <Input
                type="number" min={0}
                value={state.capacidade_pessoas ?? ''}
                onChange={e => set('capacidade_pessoas', e.target.value ? Number(e.target.value) : null)}
                placeholder="500"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Link Google Maps</Label>
              <Input
                type="url"
                value={state.maps_url ?? ''}
                onChange={e => set('maps_url', e.target.value || null)}
                placeholder="https://maps.app.goo.gl/…"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Endereço</Label>
            <Input
              value={state.endereco ?? ''}
              onChange={e => set('endereco', e.target.value || null)}
              placeholder="Rua, número, bairro — Uberaba"
            />
          </div>

          {/* Coordenadas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Latitude</Label>
              <Input
                type="number" step="any"
                value={state.lat ?? ''}
                onChange={e => set('lat', e.target.value ? Number(e.target.value) : null)}
                placeholder="-19.7476"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Longitude</Label>
              <Input
                type="number" step="any"
                value={state.lng ?? ''}
                onChange={e => set('lng', e.target.value ? Number(e.target.value) : null)}
                placeholder="-47.9319"
              />
            </div>
          </div>

          {/* Infraestrutura */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]/60">
              Infraestrutura
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" checked={state.tem_wifi}
                  onChange={e => set('tem_wifi', e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                <Wifi className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                Wi-Fi disponível
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" checked={state.tem_ponto_apoio}
                  onChange={e => set('tem_ponto_apoio', e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                Ponto de apoio
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" checked={state.tem_youtube_live}
                  onChange={e => set('tem_youtube_live', e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                <Youtube className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                Transmissão YouTube
              </label>
              <div>
                <Label className="mb-1 block text-xs">Alimentação</Label>
                <Select
                  value={state.alimentacao ?? ''}
                  onValueChange={v => set('alimentacao', v || null)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIMENTACAO_OPTS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notas de acesso + Observações */}
          <div>
            <Label className="mb-1.5 block">Notas de acesso</Label>
            <Textarea
              value={state.notas_acesso ?? ''}
              onChange={e => set('notas_acesso', e.target.value || null)}
              placeholder="Como chegar, estacionamento, entrada VIP…"
              rows={2}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Observações gerais</Label>
            <Textarea
              value={state.observacoes ?? ''}
              onChange={e => set('observacoes', e.target.value || null)}
              placeholder="Informações extras para a equipe…"
              rows={2}
            />
          </div>

          {err && (
            <p className="rounded-md bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">
              {err}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Salvando…</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── DeleteDialog ──────────────────────────────────────────────────────────────

function DeleteDialog({ open, onOpenChange, setor }: {
  open: boolean; onOpenChange: (v: boolean) => void; setor: SetorRow | null
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => { if (!open) setErr(null) }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir setor?</DialogTitle>
          <DialogDescription>
            <strong>{setor?.nome}</strong> será removido permanentemente. Conteúdos e pautas vinculados a este setor perderão a referência.
          </DialogDescription>
        </DialogHeader>
        {err && (
          <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
            {err}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" disabled={loading} onClick={async () => {
            if (!setor) return
            setLoading(true); setErr(null)
            const res = await deleteSetor(setor.id)
            setLoading(false)
            if (!res.ok) { setErr(res.error ?? 'Erro ao excluir.'); return }
            onOpenChange(false)
            router.refresh()
          }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── SetorCard ─────────────────────────────────────────────────────────────────

function SetorCard({ setor, onEdit, onDelete }: {
  setor: SetorRow
  onEdit: () => void
  onDelete: () => void
}) {
  const color = setor.cor_hex ?? TIPO_COLORS[setor.tipo] ?? 'var(--accent)'

  return (
    <div
      className="group relative flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[var(--accent)]/30"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      {/* Nome */}
      <p className="font-semibold text-sm leading-tight text-[var(--foreground)] pr-12">
        {setor.nome}
      </p>

      {/* Badges de infra */}
      <div className="flex flex-wrap gap-1.5">
        {setor.capacidade_pessoas != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            {setor.capacidade_pessoas.toLocaleString('pt-BR')} pessoas
          </span>
        )}
        {setor.tem_wifi && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <Wifi className="h-2.5 w-2.5" /> Wi-Fi
          </span>
        )}
        {setor.tem_ponto_apoio && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-2.5 w-2.5" /> Apoio
          </span>
        )}
        {setor.tem_youtube_live && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
            <Youtube className="h-2.5 w-2.5" /> Live
          </span>
        )}
        {setor.alimentacao && setor.alimentacao !== 'nenhuma' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <Utensils className="h-2.5 w-2.5" />
            {setor.alimentacao === 'praca_staff' ? 'Praça staff' : 'Voucher'}
          </span>
        )}
        {setor.maps_url && (
          <a
            href={setor.maps_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <MapPin className="h-2.5 w-2.5" /> Maps
          </a>
        )}
        {setor.lat && setor.lng && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">
            {setor.lat.toFixed(4)}, {setor.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Ações — aparecem no hover */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
          aria-label="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── TipoSection ───────────────────────────────────────────────────────────────

function TipoSection({ tipo, setores, onAdd, onEdit, onDelete }: {
  tipo: typeof TIPOS[number]
  setores: SetorRow[]
  onAdd: (tipo: string) => void
  onEdit: (s: SetorRow) => void
  onDelete: (s: SetorRow) => void
}) {
  const [open, setOpen] = React.useState(true)
  const color = TIPO_COLORS[tipo.value] ?? 'var(--accent)'
  const isEsportivo = tipo.value === 'esportivo'

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 overflow-hidden">
      {/* Section header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[var(--muted)]/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm shrink-0"
            style={{ background: `${color}20`, color }}
          >
            {tipo.emoji}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{tipo.label}</span>
              <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--muted-foreground)]">
                {setores.length}
              </span>
              {isEsportivo && setores.length > 0 && (
                <span className="rounded-full border border-[var(--accent)]/30 px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                  planilha
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)]/60 truncate">{tipo.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={e => { e.stopPropagation(); onAdd(tipo.value) }}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
            style={{
              background: `${color}15`,
              color,
              border: `1px solid ${color}30`,
            }}
            aria-label={`Novo ${tipo.label.toLowerCase()}`}
          >
            <Plus className="h-3 w-3" /> Novo
          </button>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]/40" />
            : <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]/40" />}
        </div>
      </div>

      {/* Esportivo disclaimer */}
      {isEsportivo && open && setores.length > 0 && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/15 px-3 py-2 text-xs text-[var(--muted-foreground)]">
          <Ticket className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--accent)]/60" />
          <span>
            Praças esportivas importadas da planilha oficial. Edite coordenadas ou cor se necessário,
            mas evite renomear — o nome é chave de importação.
          </span>
        </div>
      )}

      {/* Cards */}
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 px-4 pb-4">
          {setores.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhum {tipo.label.toLowerCase()} cadastrado ainda
              </p>
              <button
                onClick={() => onAdd(tipo.value)}
                className="text-xs font-medium underline underline-offset-2 transition-colors hover:text-[var(--accent)]"
                style={{ color }}
              >
                Adicionar primeiro
              </button>
            </div>
          ) : (
            setores.map(s => (
              <SetorCard
                key={s.id} setor={s}
                onEdit={() => onEdit(s)}
                onDelete={() => onDelete(s)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main board ────────────────────────────────────────────────────────────────

export function SetoresBoardClient({ setores }: { setores: SetorRow[] }) {
  const [editing, setEditing] = React.useState<SetorRow | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [defaultTipo, setDefaultTipo] = React.useState('esportivo')
  const [deleting, setDeleting] = React.useState<SetorRow | null>(null)

  function handleAdd(tipo: string) {
    setDefaultTipo(tipo)
    setCreating(true)
  }

  // Group by tipo
  const byTipo = React.useMemo(() => {
    const map: Record<string, SetorRow[]> = {}
    for (const t of TIPOS) map[t.value] = []
    for (const s of setores) {
      if (map[s.tipo]) map[s.tipo].push(s)
      else map[s.tipo] = [s]
    }
    return map
  }, [setores])

  // Only show tipos that exist in data OR are the main event tipos
  const visibleTipos = TIPOS.filter(t =>
    (byTipo[t.value]?.length ?? 0) > 0 || ['palco', 'festa', 'apoio'].includes(t.value)
  )

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-2">
        {TIPOS.filter(t => (byTipo[t.value]?.length ?? 0) > 0).map(t => (
          <span
            key={t.value}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: `${TIPO_COLORS[t.value]}15`,
              color: TIPO_COLORS[t.value],
              border: `1px solid ${TIPO_COLORS[t.value]}25`,
            }}
          >
            {t.emoji} {t.label} <span className="font-mono opacity-70">{byTipo[t.value].length}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
          Total: {setores.length}
        </span>
      </div>

      {/* Sections */}
      {visibleTipos.map(t => (
        <TipoSection
          key={t.value}
          tipo={t}
          setores={byTipo[t.value] ?? []}
          onAdd={handleAdd}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      ))}

      {/* Dialogs */}
      <SetorFormDialog
        open={creating}
        onOpenChange={setCreating}
        row={null}
        defaultTipo={defaultTipo}
      />
      <SetorFormDialog
        open={Boolean(editing)}
        onOpenChange={v => !v && setEditing(null)}
        row={editing}
      />
      <DeleteDialog
        open={Boolean(deleting)}
        onOpenChange={v => !v && setDeleting(null)}
        setor={deleting}
      />
    </div>
  )
}
