'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
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
  onConfirm: () => Promise<void>
  entityLabel: string
}) {
  const [loading, setLoading] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir {entityLabel}?</DialogTitle>
          <DialogDescription>
            Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
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
              await onConfirm()
              setLoading(false)
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
}: CrudClientProps<T>) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<T | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState<T | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold tracking-tight">
            {entityLabelPlural}
          </h1>
          {description && (
            <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
          )}
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
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
            {data.length === 0 ? (
              <TableEmpty
                colSpan={columns.length + 1}
                message={`Nenhum ${entityLabel.toLowerCase()} cadastrado ainda.`}
              />
            ) : (
              data.map((row) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
          if (deleting) {
            await onDelete(deleting.id)
            setDeleting(null)
            router.refresh()
          }
        }}
      />
    </div>
  )
}
