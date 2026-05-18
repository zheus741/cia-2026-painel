'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, Search, Inbox, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ============ Types =================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'email'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'color'
  | 'tags'

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  helper?: string
  defaultValue?: string | number | boolean | string[] | null
  span?: 'full' | 'half'
}

export interface ColumnDef<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

export interface CardRenderActions {
  onEdit:   () => void
  onDelete: () => void
}

interface CrudClientProps<T extends { id: string }> {
  entityLabel: string                       // 'Setor' (singular)
  entityLabelPlural: string                 // 'Setores'
  columns: ColumnDef<T>[]
  fields: FieldDef[]
  data: T[]
  onCreate: (formData: FormData) => Promise<{ ok: boolean; error?: string }>
  onUpdate: (id: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>
  rowKey?: keyof T
  description?: string
  /** Eyebrow label do PageHeader (ex.: "Gestão"). Default: undefined. */
  eyebrow?: string
  /** Função opcional pra renderizar card customizado em mobile (e em desktop se cardOnly=true). */
  cardRender?: (row: T, actions: CardRenderActions) => React.ReactNode
  /** Quando true, força layout em cards mesmo em desktop. Útil pra páginas com identidade visual forte (Patrocinadores, Equipes). */
  cardOnly?: boolean
  /** Campos onde a busca client-side procura. Default: todas as colunas exibíveis. */
  searchKeys?: (keyof T | string)[]
}

// ============ Default card (mobile fallback) ========================
// Renderiza o registro como card vertical: primeira coluna em destaque,
// resto como pares label/value, e botões Edit/Delete no rodapé.

function DefaultCard<T extends { id: string }>({
  row, columns, onEdit, onDelete,
}: {
  row: T
  columns: ColumnDef<T>[]
  onEdit:   () => void
  onDelete: () => void
}) {
  const [primary, ...rest] = columns
  function renderValue(c: ColumnDef<T>) {
    return c.render
      ? c.render(row)
      : (row as unknown as Record<string, React.ReactNode>)[String(c.key)] ?? '—'
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      {/* Primary column como título */}
      {primary && (
        <div className="font-semibold text-[var(--foreground)] leading-tight">
          {renderValue(primary)}
        </div>
      )}
      {/* Resto como label/value */}
      {rest.length > 0 && (
        <dl className="grid gap-1.5 text-[12px]">
          {rest.map(c => (
            <div key={String(c.key)} className="flex items-baseline justify-between gap-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/50 shrink-0">
                {c.label}
              </dt>
              <dd className="text-right text-[var(--foreground)]/80 min-w-0 truncate">
                {renderValue(c)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {/* Ações */}
      <div className="mt-1 flex justify-end gap-1 border-t border-[var(--border)]/40 pt-2">
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Excluir">
          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
        </Button>
      </div>
    </div>
  )
}

// ============ Field renderer =========================================

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (field.type === 'textarea') {
    return (
      <Textarea
        name={field.name}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
    )
  }
  if (field.type === 'select') {
    return (
      <Select
        name={field.name}
        value={(value as string) ?? ''}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder ?? 'Selecione...'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={field.name}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
        <span>{field.helper ?? 'Sim'}</span>
      </label>
    )
  }
  if (field.type === 'tags' || field.type === 'multiselect') {
    const arr = Array.isArray(value) ? (value as string[]) : []
    return (
      <Input
        name={field.name}
        value={arr.join(', ')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholder={field.placeholder ?? 'separe por vírgula'}
      />
    )
  }
  return (
    <Input
      type={
        field.type === 'date'
          ? 'date'
          : field.type === 'datetime'
            ? 'datetime-local'
            : field.type === 'number'
              ? 'number'
              : field.type === 'email'
                ? 'email'
                : field.type === 'color'
                  ? 'color'
                  : 'text'
      }
      name={field.name}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
    />
  )
}

// ============ Form dialog ============================================

function buildInitialState<T extends { id: string }>(
  fields: FieldDef[],
  row: T | null,
): Record<string, unknown> {
  const state: Record<string, unknown> = {}
  for (const f of fields) {
    if (row && f.name in row) {
      state[f.name] = (row as unknown as Record<string, unknown>)[f.name]
    } else {
      state[f.name] = f.defaultValue ?? (f.type === 'tags' || f.type === 'multiselect' ? [] : '')
    }
  }
  return state
}

function FormDialog<T extends { id: string }>({
  open,
  onOpenChange,
  entityLabel,
  fields,
  row,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entityLabel: string
  fields: FieldDef[]
  row: T | null
  onCreate: CrudClientProps<T>['onCreate']
  onUpdate: CrudClientProps<T>['onUpdate']
}) {
  const router = useRouter()
  const [state, setState] = React.useState<Record<string, unknown>>(() =>
    buildInitialState(fields, row),
  )
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setState(buildInitialState(fields, row))
      setError(null)
    }
  }, [open, fields, row])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const fd = new FormData()
    for (const f of fields) {
      const v = state[f.name]
      if (v === undefined || v === null || v === '') continue
      if (Array.isArray(v)) {
        fd.set(f.name, JSON.stringify(v))
      } else if (typeof v === 'boolean') {
        fd.set(f.name, v ? 'true' : 'false')
      } else {
        fd.set(f.name, String(v))
      }
    }

    const res = row
      ? await onUpdate(row.id, fd)
      : await onCreate(fd)

    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Erro ao salvar.')
      return
    }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {row ? `Editar ${entityLabel}` : `Novo ${entityLabel}`}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div
                key={f.name}
                className={f.span === 'half' ? 'col-span-1' : 'col-span-2'}
              >
                <Label htmlFor={f.name} className="mb-1.5 block">
                  {f.label}
                  {f.required && <span className="text-[var(--destructive)] ml-0.5">*</span>}
                </Label>
                <FieldRenderer
                  field={f}
                  value={state[f.name]}
                  onChange={(v) => setState((s) => ({ ...s, [f.name]: v }))}
                />
                {f.helper && f.type !== 'boolean' && (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{f.helper}</p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="rounded-md bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============ Delete dialog =========================================

function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  entityLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => Promise<{ ok: boolean; error?: string }>
  entityLabel: string
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError]     = React.useState<string | null>(null)

  // Limpa o erro ao abrir/fechar
  React.useEffect(() => {
    if (!open) setError(null)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir {entityLabel}?</DialogTitle>
          <DialogDescription>
            Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              setError(null)
              const res = await onConfirm()
              setLoading(false)
              if (!res.ok) {
                setError(res.error ?? 'Erro ao excluir.')
              }
              // Sucesso: o CrudClient fecha via setDeleting(null)
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Main =================================================

export function CrudClient<T extends { id: string }>({
  entityLabel,
  entityLabelPlural,
  columns,
  fields,
  data,
  onCreate,
  onUpdate,
  onDelete,
  description,
  eyebrow,
  cardRender,
  cardOnly,
  searchKeys,
}: CrudClientProps<T>) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<T | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [deleting, setDeleting] = React.useState<T | null>(null)

  // ── Filtragem client-side ─────────────────────────────────────────────────
  // Busca em todas as colunas visíveis (ou nas searchKeys passadas).
  const keysToSearch = (searchKeys ?? columns.map(c => c.key)) as (keyof T | string)[]
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter(row =>
      keysToSearch.some(k => {
        const v = (row as unknown as Record<string, unknown>)[String(k)]
        if (v == null) return false
        return String(v).toLowerCase().includes(q)
      })
    )
  }, [data, query, keysToSearch])

  // Helpers de actions passadas ao cardRender
  const makeActions = (row: T): CardRenderActions => ({
    onEdit:   () => setEditing(row),
    onDelete: () => setDeleting(row),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={eyebrow}
        title={entityLabelPlural}
        subtitle={description}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        }
      />

      {/* Busca embutida — só aparece se há ≥ 5 itens (não polui se for lista curta) */}
      {data.length >= 5 && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]/40" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Buscar ${entityLabelPlural.toLowerCase()}…`}
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="text-[var(--muted-foreground)]/40 hover:text-[var(--foreground)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {query && (
            <span className="shrink-0 text-[10px] tabular-nums text-[var(--muted-foreground)]/60">
              {filtered.length}/{data.length}
            </span>
          )}
        </div>
      )}

      {/* ── Mobile: card grid (sempre)  + Desktop card grid (se cardOnly) ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" aria-hidden />
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {query
              ? `Nenhum resultado para "${query}"`
              : `Nenhum ${entityLabel.toLowerCase()} cadastrado ainda.`}
          </p>
          {!query && (
            <Button onClick={() => setCreating(true)} variant="outline" className="mt-4">
              <Plus className="h-4 w-4" />
              Criar primeiro {entityLabel.toLowerCase()}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Card grid: aparece em mobile sempre. Em desktop, só se cardOnly=true. */}
          <div className={cardOnly ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-3 sm:grid-cols-2 md:hidden'}>
            {filtered.map(row =>
              cardRender ? (
                <React.Fragment key={row.id}>{cardRender(row, makeActions(row))}</React.Fragment>
              ) : (
                <DefaultCard
                  key={row.id}
                  row={row}
                  columns={columns}
                  onEdit={() => setEditing(row)}
                  onDelete={() => setDeleting(row)}
                />
              )
            )}
          </div>

          {/* Tabela: só em desktop, e só se NÃO for cardOnly */}
          {!cardOnly && (
            <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={String(c.key)} className={c.className}>
                        {c.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((c) => (
                        <TableCell key={String(c.key)} className={c.className}>
                          {c.render
                            ? c.render(row)
                            : (row as unknown as Record<string, React.ReactNode>)[
                                String(c.key)
                              ] ?? '—'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditing(row)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleting(row)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <FormDialog<T>
        open={creating}
        onOpenChange={setCreating}
        entityLabel={entityLabel}
        fields={fields}
        row={null}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
      <FormDialog<T>
        open={Boolean(editing)}
        onOpenChange={(v) => !v && setEditing(null)}
        entityLabel={entityLabel}
        fields={fields}
        row={editing}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
      <DeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel={entityLabel}
        onConfirm={async () => {
          if (!deleting) return { ok: true }
          const res = await onDelete(deleting.id)
          if (res.ok) {
            setDeleting(null)
            router.refresh()
          }
          return res
        }}
      />
    </div>
  )
}
