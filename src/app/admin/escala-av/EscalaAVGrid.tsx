'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle, Wifi,
  UtensilsCrossed, MapPin, Camera, Video, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createTurnoAV, updateTurnoAV, deleteTurnoAV, type TurnoAVPayload } from './actions'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Dia       { id: string; nome_dia: string; data: string }
export interface Setor     {
  id: string; nome: string; tipo: string
  tem_wifi: boolean | null; tem_ponto_apoio: boolean | null
  alimentacao: string | null; maps_url: string | null; notas_acesso: string | null
}
export interface Parceiro  { id: string; nome: string; tipo: string; cor_hex: string }
export interface ProfileAV { id: string; nome: string; funcao_principal: string | null; parceiro_id: string | null }
export interface TurnoAV   {
  id: string; dia_id: string; setor_id: string | null
  funcao: string; inicio: string; fim: string
  user_id: string | null; is_roaming: boolean
  prioridade: string | null; briefing_editorial: string | null
  conteudos_esperados: string | null; status_escala: string | null
  parceiro_id: string | null
  setor:    { nome: string } | null
  user:     { id: string; nome: string; funcao_principal: string | null } | null
  parceiro: { nome: string; cor_hex: string } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtHora(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function buildTimestamp(data: string, hhmm: string, nextDay = false): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${data}T00:00:00`)
  if (nextDay) d.setDate(d.getDate() + 1)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const PRIORIDADE_CONFIG = {
  alta:  { label: 'Alta',  bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)',  text: '#dc2626', dot: '#ef4444' },
  media: { label: 'Média', bg: 'rgba(234,179,8,0.10)',  border: 'rgba(234,179,8,0.30)',  text: '#b45309', dot: '#f59e0b' },
  baixa: { label: 'Baixa', bg: 'rgba(46,107,66,0.08)',  border: 'rgba(46,107,66,0.20)',  text: '#2e6b42', dot: '#4a8a5c' },
}

const STATUS_CONFIG = {
  rascunho:   { label: 'Rascunho',   text: '#94a3b8' },
  confirmado: { label: 'Confirmado', text: '#2e6b42' },
  em_campo:   { label: 'Em campo',   text: '#2563eb' },
  finalizado: { label: 'Finalizado', text: '#059669' },
  faltou:     { label: 'Faltou',     text: '#dc2626' },
}

// ─────────────────────────────────────────────────────────────────────────────
// groupSetores — agrupa praças por prefixo numérico
// Ex: "CEMEA 01", "CEMEA 02" → grupo "CEMEA" com itens [01, 02]
// ─────────────────────────────────────────────────────────────────────────────

interface SetorGroup {
  prefix: string
  items:  { setor: Setor; suffix: string | null }[]
}

function groupSetores(setores: Setor[]): SetorGroup[] {
  const map = new Map<string, SetorGroup>()

  for (const s of setores) {
    const match  = s.nome.match(/^(.+?)\s+(\d{1,2})$/)
    const prefix = match ? match[1].trim() : s.nome
    const suffix = match ? match[2] : null

    if (!map.has(prefix)) map.set(prefix, { prefix, items: [] })
    map.get(prefix)!.items.push({ setor: s, suffix })
  }

  // Ordena os itens dentro de cada grupo pelo número
  for (const g of map.values()) {
    g.items.sort((a, b) =>
      a.suffix && b.suffix ? Number(a.suffix) - Number(b.suffix) : 0
    )
  }

  return Array.from(map.values())
}

// ─────────────────────────────────────────────────────────────────────────────
// TurnoDialog — criar / editar turno (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

interface TurnoDialogProps {
  open:          boolean
  onClose:       () => void
  dia:           Dia
  setores:       Setor[]
  parceiros:     Parceiro[]
  profiles:      ProfileAV[]
  defaultFuncao: 'foto' | 'video'
  defaultSetorId?: string
  editing?:      TurnoAV
}

function TurnoDialog({
  open, onClose, dia, setores, parceiros, profiles,
  defaultFuncao, defaultSetorId, editing,
}: TurnoDialogProps) {
  const router  = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error,   setError]   = React.useState<string | null>(null)

  const [funcao,    setFuncao]    = React.useState<'foto' | 'video'>(editing?.funcao as 'foto' | 'video' ?? defaultFuncao)
  const [setorId,   setSetorId]   = React.useState(editing?.setor_id ?? defaultSetorId ?? '')
  const [parceiro,  setParceiro]  = React.useState(editing?.parceiro_id ?? '')
  const [userId,    setUserId]    = React.useState(editing?.user_id ?? '')
  const [horaInicio, setHoraInicio] = React.useState('08:00')
  const [horaFim,    setHoraFim]    = React.useState('21:30')
  const [prioridade, setPrioridade] = React.useState<'alta' | 'media' | 'baixa'>(
    (editing?.prioridade as 'alta' | 'media' | 'baixa') ?? 'media'
  )
  const [briefing,   setBriefing]   = React.useState(editing?.briefing_editorial ?? '')
  const [conteudos,  setConteudos]  = React.useState(editing?.conteudos_esperados ?? '')

  React.useEffect(() => {
    if (open) {
      setError(null)
      setFuncao(editing?.funcao as 'foto' | 'video' ?? defaultFuncao)
      setSetorId(editing?.setor_id ?? defaultSetorId ?? '')
      setParceiro(editing?.parceiro_id ?? '')
      setUserId(editing?.user_id ?? '')
      setPrioridade((editing?.prioridade as 'alta' | 'media' | 'baixa') ?? 'media')
      setBriefing(editing?.briefing_editorial ?? '')
      setConteudos(editing?.conteudos_esperados ?? '')
      if (editing) {
        setHoraInicio(new Date(editing.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }))
        setHoraFim(new Date(editing.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }))
      } else {
        setHoraInicio('08:00')
        setHoraFim('21:30')
      }
    }
  }, [open, editing, defaultFuncao, defaultSetorId])

  const profilesFiltrados = profiles.filter(
    p => p.funcao_principal === funcao ||
         p.funcao_principal === 'foto' ||
         p.funcao_principal === 'video'
  )

  async function submit() {
    if (!userId) { setError('Selecione um colaborador.'); return }

    setLoading(true)
    setError(null)
    try {
      const isNight = horaFim < horaInicio
      const payload: TurnoAVPayload = {
        dia_id:              dia.id,
        setor_id:            setorId || null,
        funcao:              funcao,
        parceiro_id:         parceiro && parceiro !== '__none__' ? parceiro : null,
        user_id:             userId || null,
        inicio:              buildTimestamp(dia.data, horaInicio),
        fim:                 buildTimestamp(dia.data, horaFim, isNight),
        prioridade,
        briefing_editorial:  briefing  || null,
        conteudos_esperados: conteudos || null,
      }

      const res = editing
        ? await updateTurnoAV(editing.id, payload)
        : await createTurnoAV(payload)

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
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar turno' : 'Novo turno'} · {dia.nome_dia} {dia.data}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Setor */}
          <div>
            <Label className="mb-1.5 block text-xs">Setor</Label>
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="— selecione o setor —" />
              </SelectTrigger>
              <SelectContent>
                {setores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Função FOTO / VÍDEO */}
          <div>
            <Label className="mb-1.5 block text-xs">Função</Label>
            <div className="flex gap-2">
              {(['foto', 'video'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFuncao(f); setUserId('') }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition-all',
                    funcao === f
                      ? f === 'foto'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]',
                  )}
                >
                  {f === 'foto' ? <Camera className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Parceiro + Colaborador */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Empresa / Parceiro</Label>
              <Select value={parceiro} onValueChange={setParceiro}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="— empresa —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem empresa</SelectItem>
                  {parceiros
                    .filter(p => p.tipo === 'ambos' || p.tipo === funcao)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: p.cor_hex }}
                          />
                          {p.nome}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Colaborador</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="— pessoa —" />
                </SelectTrigger>
                <SelectContent>
                  {profilesFiltrados.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Início</Label>
              <input
                type="time"
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Fim</Label>
              <input
                type="time"
                value={horaFim}
                onChange={e => setHoraFim(e.target.value)}
                className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
              />
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <Label className="mb-1.5 block text-xs">Prioridade editorial</Label>
            <div className="flex gap-2">
              {(['alta', 'media', 'baixa'] as const).map(p => {
                const cfg = PRIORIDADE_CONFIG[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridade(p)}
                    className="flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all"
                    style={{
                      background:  prioridade === p ? cfg.bg    : 'transparent',
                      borderColor: prioridade === p ? cfg.dot   : 'rgba(46,107,66,0.15)',
                      color:       prioridade === p ? cfg.text  : 'rgba(46,107,66,0.45)',
                    }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Briefing */}
          <div>
            <Label className="mb-1.5 block text-xs">Briefing editorial</Label>
            <textarea
              rows={2}
              value={briefing}
              onChange={e => setBriefing(e.target.value)}
              placeholder='Ex: "Estreia de vôlei de praia — captar abertura e comemoração"'
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Conteúdos esperados */}
          <div>
            <Label className="mb-1.5 block text-xs">
              Conteúdos esperados{' '}
              <span className="text-[var(--muted-foreground)] font-normal">(opcional)</span>
            </Label>
            <input
              type="text"
              value={conteudos}
              onChange={e => setConteudos(e.target.value)}
              placeholder='Ex: "1 reels + 5 stories + 3 cards de placar"'
              className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
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

// ─────────────────────────────────────────────────────────────────────────────
// EmpresaCell — célula da coluna "Empresa" para uma função
// ─────────────────────────────────────────────────────────────────────────────

function EmpresaCell({
  turnos, funcao, temEvento, onAdd,
}: {
  turnos: TurnoAV[]
  funcao: 'foto' | 'video'
  temEvento: boolean
  onAdd: () => void
}) {
  const cor = funcao === 'foto' ? '#7c3aed' : '#1a5c5c'

  if (turnos.length === 0) {
    return (
      <button
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-[10px] font-medium transition-all hover:border-solid"
        style={{
          borderColor: temEvento ? `${cor}40` : 'rgba(46,107,66,0.10)',
          color:       temEvento ? `${cor}80` : 'rgba(46,107,66,0.25)',
          minHeight: 36,
        }}
      >
        <Plus className="h-3 w-3" />
        empresa
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {turnos.map(t => (
        <div
          key={t.id}
          className="flex items-center justify-center rounded-lg px-2 py-1.5"
          style={{
            background: t.parceiro ? `${t.parceiro.cor_hex}12` : 'rgba(46,107,66,0.06)',
            border:     `1px solid ${t.parceiro ? `${t.parceiro.cor_hex}25` : 'rgba(46,107,66,0.12)'}`,
          }}
        >
          {t.parceiro ? (
            <span
              className="text-[10px] font-bold uppercase tracking-wider truncate"
              style={{ color: t.parceiro.cor_hex }}
            >
              {t.parceiro.nome}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted-foreground)]/50">—</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ColaboradorCell — célula da coluna "Colaborador" para uma função
// ─────────────────────────────────────────────────────────────────────────────

function ColaboradorCell({
  turnos, funcao, temEvento, onAdd, onEdit, onDelete,
}: {
  turnos: TurnoAV[]
  funcao: 'foto' | 'video'
  temEvento: boolean
  onAdd: () => void
  onEdit: (t: TurnoAV) => void
  onDelete: (id: string) => void
}) {
  const cor = funcao === 'foto' ? '#7c3aed' : '#1a5c5c'

  if (turnos.length === 0) {
    return (
      <button
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-[10px] font-medium transition-all hover:border-solid"
        style={{
          borderColor: temEvento ? `${cor}40` : 'rgba(46,107,66,0.10)',
          color:       temEvento ? `${cor}80` : 'rgba(46,107,66,0.25)',
          minHeight: 36,
        }}
      >
        <Plus className="h-3 w-3" />
        colaborador
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {turnos.map(t => {
        const status = (t.status_escala ?? 'rascunho') as keyof typeof STATUS_CONFIG
        const stCfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.rascunho

        return (
          <div
            key={t.id}
            className="group relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{
              background:  'rgba(46,107,66,0.03)',
              borderColor: 'rgba(46,107,66,0.12)',
              minHeight: 36,
            }}
          >
            {/* Status dot */}
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: stCfg.text }}
              title={stCfg.label}
            />

            {/* Nome */}
            <span className="flex-1 truncate text-[11px] font-semibold text-[var(--foreground)]">
              {t.user?.nome ?? '?'}
            </span>

            {/* Horário */}
            <span
              className="shrink-0 tabular-nums text-[9px] text-[var(--muted-foreground)]/60"
              style={{ fontFamily: 'Orbitron, monospace' }}
            >
              {fmtHora(t.inicio)}–{fmtHora(t.fim)}
            </span>

            {/* Ações no hover */}
            <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-[var(--card)] p-0.5 shadow-sm group-hover:flex"
              style={{ border: '1px solid rgba(46,107,66,0.12)' }}
            >
              <button
                onClick={() => onEdit(t)}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--muted)]"
                title="Editar"
              >
                <Pencil className="h-2.5 w-2.5 text-[var(--muted-foreground)]" />
              </button>
              <button
                onClick={() => onDelete(t.id)}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-red-50 hover:text-red-500"
                title="Remover"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EscalaTable — tabela agrupada por prefixo de praça
// ─────────────────────────────────────────────────────────────────────────────

function EscalaTable({
  setores,
  turnosPorSetor,
  setoresComEvento,
  onAdd,
  onEdit,
  onDelete,
}: {
  setores:          Setor[]
  turnosPorSetor:   Map<string, TurnoAV[]>
  setoresComEvento: Set<string>
  onAdd:    (funcao: 'foto' | 'video', setorId: string) => void
  onEdit:   (turno: TurnoAV) => void
  onDelete: (id: string) => void
}) {
  const groups = React.useMemo(() => groupSetores(setores), [setores])
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())

  function toggleGroup(prefix: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(prefix)) next.delete(prefix)
      else next.add(prefix)
      return next
    })
  }

  // Filtra grupos sem nenhum evento E sem nenhum turno
  const activeGroups = groups.filter(g =>
    g.items.some(({ setor }) => {
      const ts = turnosPorSetor.get(setor.id) ?? []
      return setoresComEvento.has(setor.id) || ts.length > 0
    })
  )

  if (activeGroups.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]/50">
        Sem setores com eventos neste dia.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        {/* ── Cabeçalho ── */}
        <thead>
          <tr>
            {/* Praça */}
            <th
              className="sticky left-0 z-10 border-b border-r px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.20em] text-[var(--muted-foreground)]"
              style={{
                background:  'var(--card)',
                borderColor: 'rgba(46,107,66,0.12)',
                width: 180,
                minWidth: 140,
              }}
            >
              Praça
            </th>

            {/* FOTO */}
            <th
              colSpan={2}
              className="border-b border-r px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ color: '#7c3aed', borderColor: 'rgba(46,107,66,0.12)', background: 'rgba(124,58,237,0.03)' }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                FOTO
              </div>
            </th>

            {/* VÍDEO */}
            <th
              colSpan={2}
              className="border-b px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ color: '#1a5c5c', borderColor: 'rgba(46,107,66,0.12)', background: 'rgba(26,92,92,0.03)' }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Video className="h-3.5 w-3.5" />
                VÍDEO
              </div>
            </th>
          </tr>

          {/* Sub-cabeçalhos */}
          <tr>
            <th
              className="sticky left-0 z-10 border-b border-r"
              style={{ background: 'var(--card)', borderColor: 'rgba(46,107,66,0.12)' }}
            />
            {(['foto', 'video'] as const).flatMap(funcao => [
              <th
                key={`${funcao}-empresa`}
                className="border-b px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
                style={{
                  borderColor: 'rgba(46,107,66,0.12)',
                  borderRight: funcao === 'foto' ? '1px solid rgba(124,58,237,0.15)' : undefined,
                  background:  funcao === 'foto' ? 'rgba(124,58,237,0.02)' : 'rgba(26,92,92,0.02)',
                  width: 140,
                }}
              >
                Empresa
              </th>,
              <th
                key={`${funcao}-colab`}
                className="border-b px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
                style={{
                  borderColor: 'rgba(46,107,66,0.12)',
                  borderRight: funcao === 'foto' ? '1px solid rgba(46,107,66,0.12)' : undefined,
                  background:  funcao === 'foto' ? 'rgba(124,58,237,0.02)' : 'rgba(26,92,92,0.02)',
                  width: 200,
                }}
              >
                Colaborador
              </th>,
            ])}
          </tr>
        </thead>

        <tbody>
          {activeGroups.map((group, gIdx) => {
            const isCollapsed = collapsed.has(group.prefix)
            const isSolo      = group.items.length === 1 && group.items[0].suffix === null

            // Filtra itens do grupo que têm evento ou turno
            const activeItems = group.items.filter(({ setor }) => {
              const ts = turnosPorSetor.get(setor.id) ?? []
              return setoresComEvento.has(setor.id) || ts.length > 0
            })

            if (activeItems.length === 0) return null

            return (
              <React.Fragment key={group.prefix}>

                {/* ── Linha de grupo ── */}
                {!isSolo && (
                  <tr>
                    <td
                      colSpan={5}
                      className="sticky left-0 z-10"
                      style={{
                        background: gIdx % 2 === 0 ? 'rgba(46,107,66,0.04)' : 'rgba(26,92,92,0.03)',
                        borderBottom: '1px solid rgba(46,107,66,0.10)',
                        borderTop: gIdx > 0 ? '2px solid rgba(46,107,66,0.14)' : undefined,
                        padding: 0,
                      }}
                    >
                      <button
                        onClick={() => toggleGroup(group.prefix)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(46,107,66,0.06)]"
                      >
                        {isCollapsed
                          ? <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                          : <ChevronDown  className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                        }
                        <span className="text-xs font-bold tracking-[0.12em] text-[var(--foreground)]">
                          {group.prefix}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold tabular-nums"
                          style={{ background: 'rgba(46,107,66,0.10)', color: '#2e6b42' }}
                        >
                          {activeItems.length}
                        </span>

                        {/* Cobertura resumida do grupo */}
                        {(() => {
                          const missing = activeItems.filter(({ setor }) => {
                            if (!setoresComEvento.has(setor.id)) return false
                            const ts = turnosPorSetor.get(setor.id) ?? []
                            return !ts.some(t => t.funcao === 'foto') || !ts.some(t => t.funcao === 'video')
                          })
                          if (missing.length === 0) return null
                          return (
                            <span className="ml-auto flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-600">
                              <AlertCircle className="h-2.5 w-2.5" />
                              {missing.length} sem cobertura
                            </span>
                          )
                        })()}
                      </button>
                    </td>
                  </tr>
                )}

                {/* ── Linhas de setor ── */}
                {!isCollapsed && activeItems.map(({ setor, suffix }, rowIdx) => {
                  const ts        = turnosPorSetor.get(setor.id) ?? []
                  const fotoTs    = ts.filter(t => t.funcao === 'foto')
                  const videoTs   = ts.filter(t => t.funcao === 'video')
                  const temEvento = setoresComEvento.has(setor.id)
                  const faltaFoto  = temEvento && fotoTs.length === 0
                  const faltaVideo = temEvento && videoTs.length === 0
                  const isLast     = rowIdx === activeItems.length - 1

                  return (
                    <tr
                      key={setor.id}
                      style={{
                        borderBottom: isLast ? undefined : '1px solid rgba(46,107,66,0.07)',
                        background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(46,107,66,0.01)',
                      }}
                    >
                      {/* ── Praça (sticky) ── */}
                      <td
                        className="sticky left-0 z-10 border-r px-4 py-3"
                        style={{
                          background:  rowIdx % 2 === 0 ? 'var(--card)' : 'color-mix(in srgb, var(--card) 98%, #2e6b42)',
                          borderColor: 'rgba(46,107,66,0.12)',
                          verticalAlign: 'middle',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {/* Indicador de cobertura */}
                          <div className="flex flex-col gap-0.5">
                            <span style={{ fontSize: 8, opacity: !faltaFoto && fotoTs.length > 0 ? 1 : 0.2 }}>📸</span>
                            <span style={{ fontSize: 8, opacity: !faltaVideo && videoTs.length > 0 ? 1 : 0.2 }}>🎬</span>
                          </div>

                          <div className="min-w-0">
                            {/* Nome do setor */}
                            <p className="text-xs font-semibold text-[var(--foreground)] leading-tight truncate">
                              {isSolo
                                ? setor.nome
                                : suffix
                                ? <><span className="font-bold">{suffix}</span></>
                                : setor.nome
                              }
                            </p>

                            {/* Venue icons */}
                            <div className="mt-0.5 flex items-center gap-1">
                              {setor.tem_wifi && (
                                <Wifi className="h-2.5 w-2.5 text-[var(--green-bright)]" />
                              )}
                              {setor.alimentacao && setor.alimentacao !== 'nenhuma' && (
                                <UtensilsCrossed className="h-2.5 w-2.5" style={{ color: '#b07a0a' }} />
                              )}
                              {setor.maps_url && (
                                <a href={setor.maps_url} target="_blank" rel="noopener noreferrer">
                                  <MapPin className="h-2.5 w-2.5 text-[var(--muted-foreground)]/40 hover:text-[var(--accent)]" />
                                </a>
                              )}
                              {setor.notas_acesso && (
                                <span className="text-[8px] text-amber-500">⚠️</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ── FOTO: Empresa ── */}
                      <td
                        className="px-2 py-2"
                        style={{
                          borderRight:   '1px solid rgba(124,58,237,0.10)',
                          verticalAlign: 'top',
                          background:    faltaFoto ? 'rgba(239,68,68,0.02)' : 'rgba(124,58,237,0.01)',
                          minWidth: 120,
                        }}
                      >
                        <EmpresaCell
                          turnos={fotoTs}
                          funcao="foto"
                          temEvento={temEvento}
                          onAdd={() => onAdd('foto', setor.id)}
                        />
                      </td>

                      {/* ── FOTO: Colaborador ── */}
                      <td
                        className="px-2 py-2"
                        style={{
                          borderRight:   '1px solid rgba(46,107,66,0.12)',
                          verticalAlign: 'top',
                          background:    faltaFoto ? 'rgba(239,68,68,0.02)' : 'rgba(124,58,237,0.01)',
                          minWidth: 180,
                        }}
                      >
                        <ColaboradorCell
                          turnos={fotoTs}
                          funcao="foto"
                          temEvento={temEvento}
                          onAdd={() => onAdd('foto', setor.id)}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </td>

                      {/* ── VÍDEO: Empresa ── */}
                      <td
                        className="px-2 py-2"
                        style={{
                          borderRight:   '1px solid rgba(26,92,92,0.10)',
                          verticalAlign: 'top',
                          background:    faltaVideo ? 'rgba(239,68,68,0.02)' : 'rgba(26,92,92,0.01)',
                          minWidth: 120,
                        }}
                      >
                        <EmpresaCell
                          turnos={videoTs}
                          funcao="video"
                          temEvento={temEvento}
                          onAdd={() => onAdd('video', setor.id)}
                        />
                      </td>

                      {/* ── VÍDEO: Colaborador ── */}
                      <td
                        className="px-2 py-2"
                        style={{
                          verticalAlign: 'top',
                          background:    faltaVideo ? 'rgba(239,68,68,0.02)' : 'rgba(26,92,92,0.01)',
                          minWidth: 180,
                        }}
                      >
                        <ColaboradorCell
                          turnos={videoTs}
                          funcao="video"
                          temEvento={temEvento}
                          onAdd={() => onAdd('video', setor.id)}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EscalaAVGrid — componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface EscalaAVGridProps {
  dias:           Dia[]
  setores:        Setor[]
  parceiros:      Parceiro[]
  profiles:       ProfileAV[]
  turnos:         TurnoAV[]
  eventosSetores: { dia_id: string; setor_id: string }[]
}

export function EscalaAVGrid({
  dias, setores, parceiros, profiles, turnos, eventosSetores,
}: EscalaAVGridProps) {
  const router = useRouter()

  const [activeDiaIdx, setActiveDiaIdx] = React.useState(0)
  const [dialog, setDialog] = React.useState<{
    open: boolean
    defaultFuncao: 'foto' | 'video'
    defaultSetorId?: string
    editing?: TurnoAV
  }>({ open: false, defaultFuncao: 'foto' })
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const dia = dias[activeDiaIdx]

  const setoresComEvento = React.useMemo(() => {
    if (!dia) return new Set<string>()
    return new Set(
      eventosSetores
        .filter(e => e.dia_id === dia.id)
        .map(e => e.setor_id)
    )
  }, [eventosSetores, dia])

  const turnosDia = React.useMemo(
    () => (!dia ? [] : turnos.filter(t => t.dia_id === dia.id)),
    [turnos, dia],
  )

  const turnosPorSetor = React.useMemo(() => {
    const map = new Map<string, TurnoAV[]>()
    for (const t of turnosDia) {
      const key = t.setor_id ?? '__sem_setor__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [turnosDia])

  const buracos = React.useMemo(() => {
    const result: { setor: Setor; faltaFoto: boolean; faltaVideo: boolean }[] = []
    for (const setorId of setoresComEvento) {
      const setor = setores.find(s => s.id === setorId)
      if (!setor) continue
      const ts = turnosPorSetor.get(setorId) ?? []
      const temFoto  = ts.some(t => t.funcao === 'foto')
      const temVideo = ts.some(t => t.funcao === 'video')
      if (!temFoto || !temVideo) {
        result.push({ setor, faltaFoto: !temFoto, faltaVideo: !temVideo })
      }
    }
    return result
  }, [setoresComEvento, turnosPorSetor, setores])

  const totalFoto  = turnosDia.filter(t => t.funcao === 'foto').length
  const totalVideo = turnosDia.filter(t => t.funcao === 'video').length

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    await deleteTurnoAV(deleteConfirm)
    setDeleting(false)
    setDeleteConfirm(null)
    router.refresh()
  }

  if (!dia) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Nenhum dia cadastrado.
      </div>
    )
  }

  return (
    <div>
      {/* ── Tabs de dia ── */}
      <div className="flex gap-1 border-b border-[var(--border)] px-6 pb-0 pt-2">
        {dias.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setActiveDiaIdx(i)}
            className={cn(
              'relative rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-all',
              i === activeDiaIdx
                ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
            style={{
              borderBottom: i === activeDiaIdx ? '2px solid #2e6b42' : '2px solid transparent',
            }}
          >
            {d.nome_dia}
            <span className="ml-1.5 text-[10px] opacity-60">{d.data}</span>
          </button>
        ))}
      </div>

      {/* ── Stats bar ── */}
      <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] px-6 py-3">
        <div className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5" style={{ color: '#7c3aed' }} />
          <span className="text-xs text-[var(--muted-foreground)]">Foto</span>
          <span className="tabular-nums text-sm font-bold" style={{ fontFamily: 'Orbitron, monospace', color: '#7c3aed' }}>
            {totalFoto}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Video className="h-3.5 w-3.5" style={{ color: '#1a5c5c' }} />
          <span className="text-xs text-[var(--muted-foreground)]">Vídeo</span>
          <span className="tabular-nums text-sm font-bold" style={{ fontFamily: 'Orbitron, monospace', color: '#1a5c5c' }}>
            {totalVideo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">Setores c/ evento</span>
          <span className="tabular-nums text-sm font-bold text-[var(--foreground)]" style={{ fontFamily: 'Orbitron, monospace' }}>
            {setoresComEvento.size}
          </span>
        </div>
        {buracos.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            <span className="text-[11px] font-semibold text-red-600">
              {buracos.length} sem cobertura completa
            </span>
          </div>
        )}
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() => setDialog({ open: true, defaultFuncao: 'foto' })}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar turno
          </Button>
        </div>
      </div>

      {/* ── Tabela de escala ── */}
      <div
        className="border-[var(--border)]"
        style={{ background: 'var(--card)' }}
      >
        <EscalaTable
          setores={setores}
          turnosPorSetor={turnosPorSetor}
          setoresComEvento={setoresComEvento}
          onAdd={(funcao, setorId) => setDialog({ open: true, defaultFuncao: funcao, defaultSetorId: setorId })}
          onEdit={t => setDialog({ open: true, defaultFuncao: t.funcao as 'foto' | 'video', defaultSetorId: t.setor_id ?? undefined, editing: t })}
          onDelete={id => setDeleteConfirm(id)}
        />
      </div>

      {/* Dialog criar/editar */}
      {dialog.open && (
        <TurnoDialog
          open={dialog.open}
          onClose={() => setDialog({ open: false, defaultFuncao: 'foto' })}
          dia={dia}
          setores={setores}
          parceiros={parceiros}
          profiles={profiles}
          defaultFuncao={dialog.defaultFuncao}
          defaultSetorId={dialog.defaultSetorId}
          editing={dialog.editing}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover turno?</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            O colaborador será notificado da remoção. Esta ação não pode ser desfeita.
          </p>
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
