'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle, Wifi, WifiOff,
  UtensilsCrossed, MapPin, Camera, Video, ChevronDown, ChevronUp,
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
  rascunho:   { label: 'Rascunho',   bg: 'rgba(148,163,184,0.12)', text: '#64748b' },
  confirmado: { label: 'Confirmado', bg: 'rgba(46,107,66,0.12)',   text: '#2e6b42' },
  em_campo:   { label: 'Em campo',   bg: 'rgba(59,130,246,0.12)',  text: '#2563eb' },
  finalizado: { label: 'Finalizado', bg: 'rgba(16,185,129,0.12)',  text: '#059669' },
  faltou:     { label: 'Faltou',     bg: 'rgba(239,68,68,0.12)',   text: '#dc2626' },
}

// ─────────────────────────────────────────────────────────────────────────────
// PersonPill — chip de pessoa escalada dentro do card de setor
// ─────────────────────────────────────────────────────────────────────────────

function PersonPill({
  turno,
  onEdit,
  onDelete,
}: {
  turno:    TurnoAV
  onEdit:   () => void
  onDelete: () => void
}) {
  const nome   = turno.user?.nome ?? '?'
  const status = (turno.status_escala ?? 'rascunho') as keyof typeof STATUS_CONFIG
  const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.rascunho

  return (
    <div
      className="group relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all"
      style={{
        background:   'rgba(46,107,66,0.04)',
        borderColor:  'rgba(46,107,66,0.14)',
      }}
    >
      {/* Dot de status */}
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: cfg.text }}
        title={cfg.label}
      />

      {/* Nome */}
      <span className="flex-1 truncate font-semibold text-[var(--foreground)]">
        {nome}
      </span>

      {/* Empresa */}
      {turno.parceiro && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: `${turno.parceiro.cor_hex}18`,
            color:       turno.parceiro.cor_hex,
            border:      `1px solid ${turno.parceiro.cor_hex}30`,
          }}
        >
          {turno.parceiro.nome}
        </span>
      )}

      {/* Horário */}
      <span
        className="shrink-0 tabular-nums text-[9px] text-[var(--muted-foreground)]"
        style={{ fontFamily: 'Orbitron, monospace' }}
      >
        {fmtHora(turno.inicio)}–{fmtHora(turno.fim)}
      </span>

      {/* Ações no hover */}
      <div className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover:flex">
        <button
          onClick={onEdit}
          className="rounded p-1 hover:bg-[var(--muted)]"
          title="Editar"
        >
          <Pencil className="h-3 w-3 text-[var(--muted-foreground)]" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 hover:bg-red-50 hover:text-red-500"
          title="Remover"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SetorCard — card de um setor com seções FOTO / VÍDEO
// ─────────────────────────────────────────────────────────────────────────────

function SetorCard({
  setor,
  turnos,
  temEvento,
  onAdd,
  onEdit,
  onDelete,
}: {
  setor:     Setor
  turnos:    TurnoAV[]
  temEvento: boolean
  onAdd:     (funcao: 'foto' | 'video') => void
  onEdit:    (turno: TurnoAV) => void
  onDelete:  (id: string) => void
}) {
  const [briefingOpen, setBriefingOpen] = React.useState(false)

  const fotoTurnos  = turnos.filter(t => t.funcao === 'foto')
  const videoTurnos = turnos.filter(t => t.funcao === 'video')

  // Briefing: junta briefings únicos de todos os turnos deste setor
  const briefings = [...new Set(
    turnos.map(t => t.briefing_editorial).filter(Boolean) as string[]
  )]

  const temFoto  = fotoTurnos.length > 0
  const temVideo = videoTurnos.length > 0
  const buraco   = temEvento && (!temFoto || !temVideo)

  // Prioridade máxima dos turnos deste setor
  const prioOrdem = { alta: 0, media: 1, baixa: 2 }
  const prioMax = turnos.reduce<string | null>((acc, t) => {
    const p = t.prioridade ?? 'media'
    if (!acc) return p
    return (prioOrdem[p as keyof typeof prioOrdem] ?? 1) <
           (prioOrdem[acc as keyof typeof prioOrdem] ?? 1) ? p : acc
  }, null) ?? 'media'

  const prioCfg = PRIORIDADE_CONFIG[prioMax as keyof typeof PRIORIDADE_CONFIG] ?? PRIORIDADE_CONFIG.media

  return (
    <div
      className="flex flex-col rounded-2xl border"
      style={{
        background:  buraco ? 'rgba(239,68,68,0.02)' : 'rgba(16,29,18,0.01)',
        borderColor: buraco ? 'rgba(239,68,68,0.20)' : 'rgba(46,107,66,0.12)',
      }}
    >
      {/* ── Cabeçalho ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Badge prioridade (só se tiver turnos) */}
            {turnos.length > 0 && (
              <span
                className="shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{
                  background: prioCfg.bg,
                  border:     `1px solid ${prioCfg.border}`,
                  color:       prioCfg.text,
                }}
              >
                {prioCfg.label}
              </span>
            )}
            {/* Buraco alert */}
            {buraco && (
              <span className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600">
                {!temFoto && !temVideo ? 'Sem cobertura' : !temFoto ? 'Falta foto' : 'Falta vídeo'}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-bold text-[var(--foreground)] leading-tight">{setor.nome}</h3>
        </div>

        {/* Venue icons */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {setor.tem_wifi ? (
            <Wifi className="h-3.5 w-3.5 text-[var(--green-bright)]" aria-label="Wi-Fi disponível" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-30" />
          )}
          {setor.alimentacao && setor.alimentacao !== 'nenhuma' && (
            <UtensilsCrossed
              className="h-3.5 w-3.5"
              style={{ color: '#b07a0a' }}
            />
          )}
          {setor.maps_url && (
            <a href={setor.maps_url} target="_blank" rel="noopener noreferrer" aria-label="Abrir no Maps">
              <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-50 hover:text-[var(--accent)] hover:opacity-100 transition-opacity" />
            </a>
          )}
        </div>
      </div>

      {/* Briefings colapsáveis */}
      {briefings.length > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setBriefingOpen(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {briefingOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {briefingOpen ? 'Ocultar briefing' : 'Ver briefing'}
          </button>
          {briefingOpen && (
            <div
              className="mt-2 rounded-xl border-l-2 pl-3 py-2 text-[11px] text-[var(--muted-foreground)] italic leading-relaxed"
              style={{ borderColor: prioCfg.dot, background: prioCfg.bg }}
            >
              {briefings.join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Notas de acesso */}
      {setor.notas_acesso && (
        <div className="mx-4 mb-3 rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-1.5 text-[10px] text-amber-700">
          ⚠️ {setor.notas_acesso}
        </div>
      )}

      {/* Divisor */}
      <div className="mx-4 h-px" style={{ background: 'rgba(46,107,66,0.08)' }} />

      {/* ── FOTO / VÍDEO ── */}
      <div className="grid grid-cols-2 divide-x divide-[rgba(46,107,66,0.08)] px-0">
        {(['foto', 'video'] as const).map(funcao => {
          const list = funcao === 'foto' ? fotoTurnos : videoTurnos
          const Icon = funcao === 'foto' ? Camera : Video
          const cor  = funcao === 'foto' ? '#7c3aed' : '#1a5c5c'

          return (
            <div key={funcao} className="flex flex-col gap-2 p-4">
              {/* Header da coluna */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: cor }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: cor }}
                  >
                    {funcao}
                  </span>
                  {list.length > 0 && (
                    <span
                      className="rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums"
                      style={{ background: `${cor}15`, color: cor }}
                    >
                      {list.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onAdd(funcao)}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-dashed transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  style={{ borderColor: 'rgba(46,107,66,0.20)', color: 'rgba(46,107,66,0.40)' }}
                  title={`Adicionar ${funcao}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Pessoas */}
              {list.length === 0 ? (
                <div
                  className="rounded-xl border border-dashed py-3 text-center text-[10px]"
                  style={{
                    borderColor: !temEvento ? 'rgba(46,107,66,0.08)' : `${cor}30`,
                    color:       !temEvento ? 'rgba(46,107,66,0.25)' : `${cor}80`,
                  }}
                >
                  {temEvento ? '— vazio —' : 'sem evento'}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {list.map(t => (
                    <PersonPill
                      key={t.id}
                      turno={t}
                      onEdit={() => onEdit(t)}
                      onDelete={() => onDelete(t.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TurnoDialog — criar / editar turno
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

  // Inicializar horários do editing
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

  // Filtra profiles pela função selecionada
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
        parceiro_id:         parceiro || null,
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
              placeholder='Ex: "Estréia de vôlei de praia — captar abertura e comemoração"'
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

  // Setores com evento no dia ativo
  const setoresComEvento = React.useMemo(() => {
    if (!dia) return new Set<string>()
    return new Set(
      eventosSetores
        .filter(e => e.dia_id === dia.id)
        .map(e => e.setor_id)
    )
  }, [eventosSetores, dia])

  // Turnos do dia ativo
  const turnosDia = React.useMemo(
    () => (!dia ? [] : turnos.filter(t => t.dia_id === dia.id)),
    [turnos, dia],
  )

  // Turnos agrupados por setor
  const turnosPorSetor = React.useMemo(() => {
    const map = new Map<string, TurnoAV[]>()
    for (const t of turnosDia) {
      const key = t.setor_id ?? '__sem_setor__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [turnosDia])

  // Alertas de buraco: setores com evento mas sem foto ou sem vídeo
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

  // Resumo do dia
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
          <span
            className="tabular-nums text-sm font-bold"
            style={{ fontFamily: 'Orbitron, monospace', color: '#7c3aed' }}
          >
            {totalFoto}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Video className="h-3.5 w-3.5" style={{ color: '#1a5c5c' }} />
          <span className="text-xs text-[var(--muted-foreground)]">Vídeo</span>
          <span
            className="tabular-nums text-sm font-bold"
            style={{ fontFamily: 'Orbitron, monospace', color: '#1a5c5c' }}
          >
            {totalVideo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">Setores c/ evento</span>
          <span
            className="tabular-nums text-sm font-bold text-[var(--foreground)]"
            style={{ fontFamily: 'Orbitron, monospace' }}
          >
            {setoresComEvento.size}
          </span>
        </div>
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

      {/* ── Alertas de buracos ── */}
      {buracos.length > 0 && (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">
              {buracos.length} setor{buracos.length > 1 ? 'es' : ''} sem cobertura completa
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {buracos.map(b => (
              <span
                key={b.setor.id}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700"
              >
                {b.setor.nome}
                <span className="text-red-400">·</span>
                {b.faltaFoto && b.faltaVideo
                  ? 'sem cobertura'
                  : b.faltaFoto
                  ? 'falta foto'
                  : 'falta vídeo'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Grid de setores ── */}
      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {setores.map(setor => {
          const ts = turnosPorSetor.get(setor.id) ?? []
          const temEvento = setoresComEvento.has(setor.id)

          // Oculta setores sem evento e sem turno
          if (!temEvento && ts.length === 0) return null

          return (
            <SetorCard
              key={setor.id}
              setor={setor}
              turnos={ts}
              temEvento={temEvento}
              onAdd={funcao => setDialog({ open: true, defaultFuncao: funcao, defaultSetorId: setor.id })}
              onEdit={t => setDialog({ open: true, defaultFuncao: t.funcao as 'foto' | 'video', defaultSetorId: setor.id, editing: t })}
              onDelete={id => setDeleteConfirm(id)}
            />
          )
        })}
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
