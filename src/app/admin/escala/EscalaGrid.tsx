'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, AlertCircle, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createTurno, updateTurno, deleteTurno, type TurnoPayload } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Dia { id: string; nome_dia: string; data: string }
export interface Setor { id: string; nome: string }
export interface Profile { id: string; nome: string; funcao_principal: string | null }
export interface Turno {
  id: string
  dia_id: string
  setor_id: string | null
  funcao: string
  inicio: string
  fim: string
  nome_pessoa: string | null
  user_id: string | null
  is_roaming: boolean
  observacoes: string | null
  setor?: { nome: string }
  user?: { nome: string }
}

// Lista oficial de funções de cobertura — alinhada à organização CIA 2026
const FUNCOES = [
  { value: 'foto',              label: 'Foto' },
  { value: 'video',             label: 'Vídeo' },
  { value: 'editor',            label: 'Editor' },
  { value: 'design',            label: 'Design' },
  { value: 'coordenacao',       label: 'Coordenação' },
  { value: 'storymaker',        label: 'Storymaker' },
  { value: 'lider_cobertura',   label: 'Líder de Cobertura' },
]

// Shift templates — todos blocos de 12h (1 dia completo de cobertura = 2 turnos)
// Defasados a cada 4h pra cobrir diferentes janelas operacionais.
const SHIFTS = [
  { label: 'Diurno',      inicio: '08:00', fim: '20:00',   color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { label: 'Tarde-Noite', inicio: '12:00', fim: '00:00+1', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { label: 'Noite',       inicio: '14:00', fim: '02:00+1', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { label: 'Noturno',     inicio: '20:00', fim: '08:00+1', color: 'bg-purple-50 border-purple-200 text-purple-700' },
]

function shiftLabel(inicio: string, fim: string): string {
  const h = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${h(inicio)} – ${h(fim)}`
}

function shiftColor(inicio: string): string {
  const h = new Date(inicio).getHours()
  if (h >= 8 && h < 12) return 'bg-[var(--gold)]/15 border-[var(--gold)]/30'
  if (h >= 12 && h < 20) return 'bg-blue-50 border-blue-200'
  return 'bg-purple-50 border-purple-200'
}

function buildTimestamp(data: string, hhmm: string, nextDay = false): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${data}T00:00:00`)
  if (nextDay) d.setDate(d.getDate() + 1)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// ─── Person card ──────────────────────────────────────────────────────────────

function PersonCard({
  turno,
  onEdit,
  onDelete,
}: {
  turno: Turno
  onEdit: () => void
  onDelete: () => void
}) {
  const nome = turno.user?.nome ?? turno.nome_pessoa ?? '?'
  const funcaoLabel = FUNCOES.find((f) => f.value === turno.funcao)?.label ?? turno.funcao
  return (
    <div className={cn('group relative rounded border px-2 py-1.5 text-xs', shiftColor(turno.inicio))}>
      <div className="flex items-center gap-1">
        {turno.is_roaming && <MapPin className="h-3 w-3 shrink-0 text-[var(--accent)]" />}
        <span className="font-medium truncate">{nome}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
        <span>{shiftLabel(turno.inicio, turno.fim)}</span>
      </div>
      <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
        <button onClick={onEdit} className="rounded p-0.5 hover:bg-black/10">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={onDelete} className="rounded p-0.5 hover:bg-red-500/20 hover:text-red-600">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Add/Edit dialog ──────────────────────────────────────────────────────────

interface TurnoDialogProps {
  open: boolean
  onClose: () => void
  dia: Dia
  setores: Setor[]
  profiles: Profile[]
  defaultFuncao?: string
  defaultSetorId?: string
  editing?: Turno
}

function TurnoDialog({ open, onClose, dia, setores, profiles, defaultFuncao, defaultSetorId, editing }: TurnoDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [funcao, setFuncao] = React.useState(editing?.funcao ?? defaultFuncao ?? 'foto')
  const [setorId, setSetorId] = React.useState(editing?.setor_id ?? defaultSetorId ?? '')
  const [shift, setShift] = React.useState<number | 'custom'>(0) // index into SHIFTS ou 'custom'
  const [customInicio, setCustomInicio] = React.useState('08:00')
  const [customFim, setCustomFim] = React.useState('20:00')
  const [userId, setUserId] = React.useState(editing?.user_id ?? '')
  const [nomePessoa, setNomePessoa] = React.useState(editing?.nome_pessoa ?? '')
  const [isRoaming, setIsRoaming] = React.useState(editing?.is_roaming ?? false)
  const [obs, setObs] = React.useState(editing?.observacoes ?? '')

  // reset on open
  React.useEffect(() => {
    if (open) {
      setError(null)
      setLoading(false)
      setFuncao(editing?.funcao ?? defaultFuncao ?? 'foto')
      setSetorId(editing?.setor_id ?? defaultSetorId ?? '')
      setUserId(editing?.user_id ?? '')
      setNomePessoa(editing?.nome_pessoa ?? '')
      setIsRoaming(editing?.is_roaming ?? false)
      setObs(editing?.observacoes ?? '')

      // Detect shift: se editando, tenta casar com preset; senão fallback pra custom
      if (editing) {
        const iniHHMM = new Date(editing.inicio).toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
        const fimHHMM = new Date(editing.fim).toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
        const matchIdx = SHIFTS.findIndex(s =>
          s.inicio === iniHHMM && s.fim.replace('+1', '') === fimHHMM
        )
        if (matchIdx >= 0) {
          setShift(matchIdx)
        } else {
          setShift('custom')
          setCustomInicio(iniHHMM)
          setCustomFim(fimHHMM)
        }
      } else {
        setShift(0)
        setCustomInicio('08:00')
        setCustomFim('20:00')
      }
    }
  }, [open, editing, defaultFuncao, defaultSetorId])

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      // Resolve inicio/fim: preset ou custom
      let inicioHHMM: string
      let fimHHMM: string
      let nextDay: boolean

      if (shift === 'custom') {
        if (!customInicio || !customFim) {
          setError('Horários inválidos.')
          return
        }
        inicioHHMM = customInicio
        fimHHMM = customFim
        // Se fim ≤ inicio (em horas), considera virada de dia
        const [ih, im] = customInicio.split(':').map(Number)
        const [fh, fm] = customFim.split(':').map(Number)
        nextDay = fh * 60 + fm <= ih * 60 + im
      } else {
        const s = SHIFTS[shift]
        nextDay = s.fim.includes('+1')
        inicioHHMM = s.inicio
        fimHHMM = s.fim.replace('+1', '')
      }

      const inicio = buildTimestamp(dia.data, inicioHHMM)
      const fim    = buildTimestamp(dia.data, fimHHMM, nextDay)

      const payload: TurnoPayload = {
        dia_id: dia.id,
        funcao,
        setor_id: setorId || null,
        inicio,
        fim,
        user_id: userId || null,
        nome_pessoa: nomePessoa || null,
        is_roaming: isRoaming,
        observacoes: obs || null,
      }

      const res = editing
        ? await updateTurno(editing.id, payload)
        : await createTurno(payload)

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar turno' : 'Novo turno'} · {dia.nome_dia} {dia.data}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shift */}
          <div>
            <Label className="mb-1.5 block text-xs">Turno</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SHIFTS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setShift(i)}
                  className={cn(
                    'rounded-md border px-2.5 py-2 text-[11px] font-medium transition-colors text-left',
                    shift === i ? s.color : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]',
                  )}
                >
                  <div className="font-semibold">{s.label}</div>
                  <div className="opacity-70 text-[10px] tabular-nums">{s.inicio}–{s.fim.replace('+1', '')}</div>
                </button>
              ))}
              {/* Custom — modo "personalizado" */}
              <button
                type="button"
                onClick={() => setShift('custom')}
                className={cn(
                  'rounded-md border border-dashed px-2.5 py-2 text-[11px] font-medium transition-colors text-left',
                  shift === 'custom'
                    ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/10 text-[var(--green-bright)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]',
                )}
              >
                <div className="font-semibold">Personalizado</div>
                <div className="opacity-70 text-[10px]">defina horário</div>
              </button>
            </div>
            {/* Inputs custom — só quando "Personalizado" está selecionado */}
            {shift === 'custom' && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor="custom-inicio" className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Início</Label>
                  <input
                    id="custom-inicio"
                    type="time"
                    value={customInicio}
                    onChange={e => setCustomInicio(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm tabular-nums focus:border-[var(--green-bright)] focus:outline-none"
                  />
                </div>
                <span className="mt-5 text-[var(--muted-foreground)]">–</span>
                <div className="flex-1">
                  <Label htmlFor="custom-fim" className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Fim</Label>
                  <input
                    id="custom-fim"
                    type="time"
                    value={customFim}
                    onChange={e => setCustomFim(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm tabular-nums focus:border-[var(--green-bright)] focus:outline-none"
                  />
                </div>
              </div>
            )}
            {shift === 'custom' && (() => {
              const [ih, im] = customInicio.split(':').map(Number)
              const [fh, fm] = customFim.split(':').map(Number)
              const startMin = ih * 60 + im
              const endMin = fh * 60 + fm
              const totalMin = endMin <= startMin ? (endMin + 24 * 60 - startMin) : (endMin - startMin)
              const h = Math.floor(totalMin / 60)
              const m = totalMin % 60
              return (
                <p className="mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                  Duração: <span className="font-semibold tabular-nums">{h}h{m > 0 ? `${m}m` : ''}</span>
                  {endMin <= startMin && <span className="ml-1.5 text-amber-600">· vira o dia</span>}
                </p>
              )
            })()}
          </div>

          {/* Funcao + Setor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Função</Label>
              <Select value={funcao} onValueChange={setFuncao}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Setor / Área</Label>
              <Select value={setorId} onValueChange={setSetorId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="— setor —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem setor fixo</SelectItem>
                  {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pessoa */}
          <div>
            <Label className="mb-1.5 block text-xs">Pessoa</Label>
            <Select value={userId} onValueChange={(v) => { setUserId(v); if (v) setNomePessoa('') }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="— usuário cadastrado —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Pessoa genérica (preencha abaixo)</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!userId || userId === '__none__') && (
              <div className="mt-2">
                <Input
                  className="h-8 text-xs"
                  placeholder='Ex: "Fotógrafo 1", "Editor A"'
                  value={nomePessoa}
                  onChange={(e) => setNomePessoa(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                  Nome genérico — vincula ao usuário real depois do login deles.
                </p>
              </div>
            )}
          </div>

          {/* Roaming checkbox */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isRoaming}
              onChange={(e) => setIsRoaming(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            Roaming (sem setor fixo — circula entre áreas)
          </label>

          {/* Obs */}
          <div>
            <Label className="mb-1.5 block text-xs">Observações</Label>
            <Input className="h-8 text-xs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="opcional" />
          </div>

          {error && <p className="flex items-center gap-1.5 text-sm text-red-500"><AlertCircle className="h-4 w-4" />{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main EscalaGrid component ────────────────────────────────────────────────

interface EscalaGridProps {
  dias: Dia[]
  setores: Setor[]
  profiles: Profile[]
  turnos: Turno[]
}

export function EscalaGrid({ dias, setores, profiles, turnos }: EscalaGridProps) {
  const router = useRouter()
  const [activeDia, setActiveDia] = React.useState(0)
  const [filterSetorId, setFilterSetorId] = React.useState<string>('all')
  const [filterFuncao, setFilterFuncao] = React.useState<string>('all')
  const [dialog, setDialog] = React.useState<{
    open: boolean
    dia?: Dia
    defaultFuncao?: string
    defaultSetorId?: string
    editing?: Turno
  }>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const dia = dias[activeDia]

  const turnosByDia = React.useMemo(() => {
    if (!dia) return []
    return turnos.filter((t) => t.dia_id === dia.id)
  }, [turnos, dia])

  // Detect conflicts: same person in overlapping shifts
  const conflicts = React.useMemo(() => {
    const ids = new Set<string>()
    const byPerson: Record<string, Turno[]> = {}
    for (const t of turnosByDia) {
      const key = t.user_id ?? t.nome_pessoa ?? ''
      if (!key) continue
      if (!byPerson[key]) byPerson[key] = []
      byPerson[key].push(t)
    }
    for (const [, ts] of Object.entries(byPerson)) {
      for (let i = 0; i < ts.length; i++) {
        for (let j = i + 1; j < ts.length; j++) {
          const a = ts[i], b = ts[j]
          const aStart = new Date(a.inicio).getTime(), aEnd = new Date(a.fim).getTime()
          const bStart = new Date(b.inicio).getTime(), bEnd = new Date(b.fim).getTime()
          if (aStart < bEnd && bStart < aEnd) {
            ids.add(a.id)
            ids.add(b.id)
          }
        }
      }
    }
    return ids
  }, [turnosByDia])

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    await deleteTurno(deleteConfirm)
    setDeleting(false)
    setDeleteConfirm(null)
    router.refresh()
  }

  // Group turnos: funcao → setor → list
  function turnosFor(funcao: string, setorId: string | null) {
    return turnosByDia.filter(
      (t) => t.funcao === funcao && (setorId === null ? !t.setor_id : t.setor_id === setorId),
    )
  }

  const allSetores = [
    { id: '__roaming__', nome: 'Roaming' },
    ...setores,
    { id: '__sem_setor__', nome: 'Sem setor' },
  ]

  // Setores e funções visíveis após filtros
  const visibleSetores = filterSetorId === 'all'
    ? allSetores
    : allSetores.filter(s => s.id === filterSetorId)
  const visibleFuncoes = filterFuncao === 'all'
    ? FUNCOES
    : FUNCOES.filter(f => f.value === filterFuncao)

  if (!dia) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Nenhum dia cadastrado. Adicione dias na aba Dias primeiro.
      </div>
    )
  }

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-1 px-6 pt-6 pb-4 border-b border-[var(--border)]">
        {dias.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setActiveDia(i)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              i === activeDia
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
            )}
          >
            {d.nome_dia}
            <span className="ml-1.5 text-xs opacity-70">{d.data}</span>
          </button>
        ))}
      </div>

      {/* Conflict warning */}
      {conflicts.size > 0 && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{conflicts.size} turno(s) com conflito de horário detectado(s).</span>
        </div>
      )}

      {/* Summary: total people per shift — match por hora de início aproximada */}
      <div className="mx-6 mt-4 flex flex-wrap gap-2 items-center">
        {SHIFTS.map((s) => {
          const startH = parseInt(s.inicio.split(':')[0], 10)
          // Window de match: turnos cujo início cai numa janela de ±2h do preset
          const count = turnosByDia.filter((t) => {
            const h = new Date(t.inicio).getHours()
            const diff = Math.min(Math.abs(h - startH), 24 - Math.abs(h - startH))
            return diff <= 1
          }).length
          return (
            <div key={s.label} className={cn('rounded-md border px-3 py-1.5 text-[11px]', s.color)}>
              <span className="font-semibold">{s.label}</span>
              <span className="ml-1.5 opacity-70 tabular-nums">{s.inicio}–{s.fim.replace('+1', '')}</span>
              <span className="ml-2 font-bold tabular-nums">{count}</span>
            </div>
          )
        })}
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() => setDialog({ open: true, dia })}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar pessoa
          </Button>
        </div>
      </div>

      {/* ── Filtros: praça (setor) + função ─────────────────────────────── */}
      <div className="mx-6 mt-4 space-y-2">
        {/* Filtro de praças */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60 w-16">
            Praça
          </span>
          <button
            onClick={() => setFilterSetorId('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
              filterSetorId === 'all'
                ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40',
            )}
          >
            Todas
          </button>
          {allSetores.map(s => {
            const count = turnosByDia.filter(t => {
              if (s.id === '__roaming__') return t.is_roaming
              if (s.id === '__sem_setor__') return !t.setor_id && !t.is_roaming
              return t.setor_id === s.id && !t.is_roaming
            }).length
            const active = filterSetorId === s.id
            return (
              <button
                key={s.id}
                onClick={() => setFilterSetorId(prev => prev === s.id ? 'all' : s.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
                  active
                    ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15 text-[var(--green-bright)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]/50',
                )}
              >
                {s.nome}
                {count > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                    active ? 'bg-[var(--green-bright)]/20' : 'bg-[var(--border)]/40 text-[var(--muted-foreground)]',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {/* Filtro de funções */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60 w-16">
            Função
          </span>
          <button
            onClick={() => setFilterFuncao('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
              filterFuncao === 'all'
                ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40',
            )}
          >
            Todas
          </button>
          {FUNCOES.map(f => {
            const count = turnosByDia.filter(t => t.funcao === f.value).length
            const active = filterFuncao === f.value
            return (
              <button
                key={f.value}
                onClick={() => setFilterFuncao(prev => prev === f.value ? 'all' : f.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
                  active
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-amber-500/50',
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                    active ? 'bg-amber-500/20' : 'bg-[var(--border)]/40 text-[var(--muted-foreground)]',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {(filterSetorId !== 'all' || filterFuncao !== 'all') && (
          <button
            onClick={() => { setFilterSetorId('all'); setFilterFuncao('all') }}
            className="text-[10px] font-semibold text-[var(--muted-foreground)] underline hover:text-[var(--foreground)]"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Grid: funções × setores */}
      <div className="overflow-x-auto px-6 mt-4 pb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-28 border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Função
              </th>
              {visibleSetores.map((s) => (
                <th
                  key={s.id}
                  className="min-w-36 border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-left text-xs font-semibold"
                >
                  {s.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleFuncoes.map((f) => {
              const rowTurnos = turnosByDia.filter((t) => t.funcao === f.value)
              if (rowTurnos.length === 0 && turnosByDia.length > 0) {
                // still show row but empty
              }
              return (
                <tr key={f.value} className="group/row">
                  <td className="border border-[var(--border)] bg-[var(--card)] px-3 py-2 align-top">
                    <span className="text-xs font-medium">{f.label}</span>
                  </td>
                  {visibleSetores.map((s) => {
                    const sId = s.id === '__roaming__' ? null : s.id === '__sem_setor__' ? null : s.id
                    const isRoamingCol = s.id === '__roaming__'
                    const isSemSetor = s.id === '__sem_setor__'
                    const cellTurnos = turnosByDia.filter((t) => {
                      if (t.funcao !== f.value) return false
                      if (isRoamingCol) return t.is_roaming
                      if (isSemSetor) return !t.setor_id && !t.is_roaming
                      return t.setor_id === s.id && !t.is_roaming
                    })
                    return (
                      <td
                        key={s.id}
                        className="border border-[var(--border)] bg-[var(--card)] p-2 align-top"
                      >
                        <div className="space-y-1">
                          {cellTurnos.map((t) => (
                            <div key={t.id} className={conflicts.has(t.id) ? 'ring-1 ring-orange-400 rounded' : ''}>
                              <PersonCard
                                turno={t}
                                onEdit={() => setDialog({ open: true, dia, editing: t })}
                                onDelete={() => setDeleteConfirm(t.id)}
                              />
                            </div>
                          ))}
                          <button
                            onClick={() => setDialog({
                              open: true,
                              dia,
                              defaultFuncao: f.value,
                              defaultSetorId: s.id === '__roaming__' || s.id === '__sem_setor__' ? undefined : s.id,
                            })}
                            className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-[var(--border)] py-1 text-xs text-[var(--muted-foreground)] opacity-0 transition-opacity hover:border-[var(--primary)] hover:text-[var(--primary)] group-hover/row:opacity-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit dialog */}
      {dialog.dia && (
        <TurnoDialog
          open={dialog.open}
          onClose={() => setDialog({ open: false })}
          dia={dialog.dia}
          setores={setores}
          profiles={profiles}
          defaultFuncao={dialog.defaultFuncao}
          defaultSetorId={dialog.defaultSetorId}
          editing={dialog.editing}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover turno?</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
