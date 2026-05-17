'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle, Wifi,
  UtensilsCrossed, MapPin, Camera, Video, ChevronDown, ChevronRight,
  Search, AlertTriangle, Sun, Sunset, Moon, Copy, Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createTurnoAV, updateTurnoAV, deleteTurnoAV, replicarDiaAV, type TurnoAVPayload } from './actions'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/confirm-dialog'

// ─── Brand colors Foto vs Vídeo (mantém o decoupling visual histórico) ──────
// Foto = roxo · Vídeo = teal. Cores fixas pra distinguir mídia (não muda com tema).
const FOTO_COLOR  = '#7c3aed'
const VIDEO_COLOR = '#1a5c5c'
const FOTO_BG     = 'rgba(124,58,237,0.06)'
const FOTO_BORDER = 'rgba(124,58,237,0.30)'
const VIDEO_BG    = 'rgba(26,92,92,0.06)'
const VIDEO_BORDER = 'rgba(26,92,92,0.30)'

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
              <SelectTrigger className="h-10 text-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Empresa / Parceiro</Label>
              <Select value={parceiro} onValueChange={setParceiro}>
                <SelectTrigger className="h-10 text-sm">
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
                <SelectTrigger className="h-10 text-sm">
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
          <div>
            <Label className="mb-1.5 block text-xs">Horário</Label>

            {/* Templates rápidos */}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[
                { label: 'Manhã',    ini: '07:30', fim: '13:00', Icon: Sun     },
                { label: 'Tarde',    ini: '13:00', fim: '18:30', Icon: Sunset  },
                { label: 'Noite',    ini: '18:30', fim: '23:30', Icon: Moon    },
                { label: 'Dia inteiro', ini: '08:00', fim: '21:30', Icon: Sun  },
              ].map(t => {
                const active = horaInicio === t.ini && horaFim === t.fim
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => { setHoraInicio(t.ini); setHoraFim(t.fim) }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all',
                      active
                        ? 'border-[var(--green-bright)] bg-[var(--green-dim)]/30 text-[var(--green-bright)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)] hover:text-[var(--foreground)]',
                    )}
                  >
                    <t.Icon className="h-2.5 w-2.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/70">Início</Label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm tabular-nums focus:border-[var(--green-bright)] focus:outline-none"
                />
              </div>
              <div>
                <Label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/70">Fim</Label>
                <input
                  type="time"
                  value={horaFim}
                  onChange={e => setHoraFim(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm tabular-nums focus:border-[var(--green-bright)] focus:outline-none"
                />
              </div>
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
  turnos, funcao, temEvento, conflitos, onAdd, onEdit, onDelete,
}: {
  turnos: TurnoAV[]
  funcao: 'foto' | 'video'
  temEvento: boolean
  conflitos?: Set<string>
  onAdd: () => void
  onEdit: (t: TurnoAV) => void
  onDelete: (id: string) => void
}) {
  const cor = funcao === 'foto' ? FOTO_COLOR : VIDEO_COLOR

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
        const isConflito = conflitos?.has(t.id) ?? false

        return (
          <div
            key={t.id}
            className="group relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{
              background:  isConflito ? 'rgba(239,68,68,0.06)' : 'rgba(46,107,66,0.03)',
              borderColor: isConflito ? 'rgba(239,68,68,0.40)' : 'rgba(46,107,66,0.12)',
              minHeight: 36,
            }}
            title={isConflito ? `⚠ Conflito: ${t.user?.nome ?? 'colaborador'} está em outro turno sobreposto` : undefined}
          >
            {/* Indicador de conflito (substitui status dot quando há conflito) */}
            {isConflito ? (
              <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
            ) : (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: stCfg.text }}
                title={stCfg.label}
              />
            )}

            {/* Nome */}
            <span
              className={cn(
                'flex-1 truncate text-[11px] font-semibold',
                isConflito ? 'text-red-600' : 'text-[var(--foreground)]',
              )}
            >
              {t.user?.nome ?? '?'}
            </span>

            {/* Horário */}
            <span className="shrink-0 tabular-nums text-[9px] text-[var(--muted-foreground)]/60">
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
  conflitos,
  onAdd,
  onEdit,
  onDelete,
}: {
  setores:          Setor[]
  turnosPorSetor:   Map<string, TurnoAV[]>
  setoresComEvento: Set<string>
  conflitos:        Set<string>
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
                          conflitos={conflitos}
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
                          conflitos={conflitos}
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
  const [filterFuncao, setFilterFuncao] = React.useState<'all' | 'foto' | 'video'>('all')
  const [searchQuery,  setSearchQuery]  = React.useState('')
  const [replicarOpen, setReplicarOpen] = React.useState(false)
  const [dialog, setDialog] = React.useState<{
    open: boolean
    defaultFuncao: 'foto' | 'video'
    defaultSetorId?: string
    editing?: TurnoAV
  }>({ open: false, defaultFuncao: 'foto' })
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [replicating, startReplicarTransition] = React.useTransition()

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
    const q = searchQuery.trim().toLowerCase()
    const filtered = turnosDia.filter(t => {
      if (filterFuncao !== 'all' && t.funcao !== filterFuncao) return false
      if (q) {
        const nameMatch = t.user?.nome?.toLowerCase().includes(q) ?? false
        const partnerMatch = t.parceiro?.nome?.toLowerCase().includes(q) ?? false
        const setorMatch = t.setor?.nome?.toLowerCase().includes(q) ?? false
        if (!nameMatch && !partnerMatch && !setorMatch) return false
      }
      return true
    })
    for (const t of filtered) {
      const key = t.setor_id ?? '__sem_setor__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [turnosDia, filterFuncao, searchQuery])

  // Conflitos: mesmo colaborador em 2+ turnos sobrepostos no MESMO dia.
  const conflitos = React.useMemo(() => {
    const byUser = new Map<string, TurnoAV[]>()
    for (const t of turnosDia) {
      if (!t.user_id) continue
      if (!byUser.has(t.user_id)) byUser.set(t.user_id, [])
      byUser.get(t.user_id)!.push(t)
    }
    const ids = new Set<string>()
    for (const [, ts] of byUser) {
      if (ts.length < 2) continue
      const sorted = [...ts].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1]
        const aEnd = new Date(a.fim).getTime()
        const bStart = new Date(b.inicio).getTime()
        if (bStart < aEnd) { ids.add(a.id); ids.add(b.id) }
      }
    }
    return ids
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
    <div className="space-y-4">
      {/* ── Tabs de dia como cards visuais ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {dias.map((d, i) => {
          const turnosNoDia = turnos.filter(t => t.dia_id === d.id)
          const fotoCount  = turnosNoDia.filter(t => t.funcao === 'foto').length
          const videoCount = turnosNoDia.filter(t => t.funcao === 'video').length
          const isAtivo = i === activeDiaIdx
          return (
            <button
              key={d.id}
              onClick={() => setActiveDiaIdx(i)}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all',
                isAtivo
                  ? 'border-[var(--green-bright)]/55 bg-gradient-to-br from-[var(--green-dim)]/30 via-[var(--card)] to-[var(--card)] shadow-[0_4px_20px_rgba(46,107,66,0.10)]'
                  : 'border-[var(--border)] bg-[var(--card)]/40 hover:-translate-y-0.5 hover:border-[var(--green-dim)] hover:shadow-sm',
              )}
            >
              {isAtivo && (
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl"
                  style={{ background: 'radial-gradient(circle, var(--green-bright), transparent 70%)' }}
                />
              )}
              <div className="relative">
                <p
                  className={cn(
                    'font-extrabold leading-none tracking-tight',
                    isAtivo ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]',
                  )}
                  style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 17 }}
                >
                  {d.nome_dia}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65">
                  {d.data}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1" style={{ color: FOTO_COLOR }}>
                    <Camera className="h-2.5 w-2.5" />
                    <span className="tabular-nums">{fotoCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1" style={{ color: VIDEO_COLOR }}>
                    <Video className="h-2.5 w-2.5" />
                    <span className="tabular-nums">{videoCount}</span>
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Stats hero + actions ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 p-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* Stats principais */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <Stat label="Setores" value={setoresComEvento.size} />
            <span className="hidden sm:inline-block h-6 w-px bg-[var(--border)]" />
            <Stat label="Foto"  value={totalFoto}  color={FOTO_COLOR} />
            <Stat label="Vídeo" value={totalVideo} color={VIDEO_COLOR} />
            {conflitos.size > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {conflitos.size / 2} conflito{conflitos.size > 2 ? 's' : ''}
              </span>
            )}
            {buracos.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                <AlertCircle className="h-3 w-3" />
                {buracos.length} sem cobertura
              </span>
            )}
          </div>

          {/* Filtros + Search */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Função filter */}
            <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--card)] p-0.5">
              {(['all', 'foto', 'video'] as const).map(f => {
                const isActive = filterFuncao === f
                const color = f === 'foto' ? FOTO_COLOR : f === 'video' ? VIDEO_COLOR : 'var(--foreground)'
                return (
                  <button
                    key={f}
                    onClick={() => setFilterFuncao(f)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all',
                      isActive ? 'shadow-sm' : 'opacity-60 hover:opacity-100',
                    )}
                    style={{
                      background: isActive
                        ? f === 'foto'  ? FOTO_BG
                        : f === 'video' ? VIDEO_BG
                        : 'var(--muted)'
                        : 'transparent',
                      color: isActive ? color : 'var(--muted-foreground)',
                    }}
                  >
                    {f === 'foto'  && <Camera className="h-2.5 w-2.5" />}
                    {f === 'video' && <Video  className="h-2.5 w-2.5" />}
                    {f === 'all' ? 'Todos' : f}
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5">
              <Search className="h-3 w-3 text-[var(--muted-foreground)]/55" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar colaborador, parceiro, setor…"
                className="w-32 bg-transparent text-[11px] outline-none placeholder:text-[var(--muted-foreground)]/40 sm:w-48"
              />
            </div>

            {/* Replicar dia */}
            {dias.length > 1 && (
              <button
                onClick={() => setReplicarOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)]"
                title="Copia turnos de outro dia pra este"
              >
                <Copy className="h-3 w-3" />
                Replicar dia
              </button>
            )}

            {/* Export PDF (via página de print) */}
            <a
              href={`/admin/escala-av/print?dia=${dia.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] transition-all hover:border-[var(--gold-bright)]/40 hover:text-[var(--gold-bright)]"
              title="Abre versão imprimível pra exportar PDF (Ctrl+P)"
            >
              <Download className="h-3 w-3" />
              Export PDF
            </a>

            {/* Adicionar turno */}
            <Button size="sm" onClick={() => setDialog({ open: true, defaultFuncao: 'foto' })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabela de escala ── */}
      <div
        className="rounded-2xl border border-[var(--border)] overflow-hidden"
        style={{ background: 'var(--card)' }}
      >
        <EscalaTable
          setores={setores}
          turnosPorSetor={turnosPorSetor}
          setoresComEvento={setoresComEvento}
          conflitos={conflitos}
          onAdd={(funcao, setorId) => setDialog({ open: true, defaultFuncao: funcao, defaultSetorId: setorId })}
          onEdit={t => setDialog({ open: true, defaultFuncao: t.funcao as 'foto' | 'video', defaultSetorId: t.setor_id ?? undefined, editing: t })}
          onDelete={id => setDeleteConfirm(id)}
        />
      </div>

      {/* Replicar dia dialog */}
      <ReplicarDiaDialog
        open={replicarOpen}
        onClose={() => setReplicarOpen(false)}
        dias={dias}
        diaDestino={dia}
        loading={replicating}
        onConfirm={(origemId) => {
          startReplicarTransition(async () => {
            const r = await replicarDiaAV(origemId, dia.id)
            if (r.ok && r.data) {
              toast.success(
                `Escala replicada · ${r.data.criados} criados${r.data.pulados > 0 ? ` · ${r.data.pulados} pulados (duplicatas)` : ''}`,
              )
              router.refresh()
              setReplicarOpen(false)
            } else {
              toast.error('Falha ao replicar dia', { description: r.error })
            }
          })
        }}
      />

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

// ─── Stat ───────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-xl font-extrabold tabular-nums leading-none"
        style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          color: color ?? 'var(--foreground)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65">
        {label}
      </span>
    </div>
  )
}

// ─── ReplicarDiaDialog ──────────────────────────────────────────────────────

function ReplicarDiaDialog({
  open, onClose, dias, diaDestino, loading, onConfirm,
}: {
  open:       boolean
  onClose:    () => void
  dias:       Dia[]
  diaDestino: Dia
  loading:    boolean
  onConfirm:  (origemId: string) => void
}) {
  const [origemId, setOrigemId] = React.useState<string>('')

  React.useEffect(() => {
    if (open) {
      const firstOther = dias.find(d => d.id !== diaDestino.id)
      setOrigemId(firstOther?.id ?? '')
    }
  }, [open, dias, diaDestino])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Replicar dia</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            Copia todos os turnos de outro dia pra <strong className="text-[var(--foreground)]">{diaDestino.nome_dia} {diaDestino.data}</strong>.
            Mantém setor, função, parceiro, colaborador, horários e briefing.
            Turnos duplicados (mesmo setor+função+horário) são ignorados.
          </p>

          <div>
            <Label className="mb-1.5 block text-xs">Copiar a partir de</Label>
            <Select value={origemId} onValueChange={setOrigemId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="— escolha um dia —" />
              </SelectTrigger>
              <SelectContent>
                {dias.filter(d => d.id !== diaDestino.id).map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nome_dia} · {d.data}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={loading || !origemId} onClick={() => onConfirm(origemId)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Copy className="mr-1.5 h-4 w-4" />
            Replicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
