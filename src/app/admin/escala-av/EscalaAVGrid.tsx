'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Trash2, Loader2, AlertCircle, Camera, Video,
  ChevronDown, ChevronRight, Search, Bell, Building2, User, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createTurnoAV, updateTurnoAV, deleteTurnoAV, replicarDiaAV, type TurnoAVPayload } from './actions'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/confirm-dialog'

// ─── Brand colors Foto vs Vídeo ─────────────────────────────────────────────
const FOTO_COLOR  = '#7c3aed'
const VIDEO_COLOR = '#1a5c5c'

// ─────────────────────────────────────────────────────────────────────────────
// Types — contrato consumido por page.tsx (NÃO alterar)
// ─────────────────────────────────────────────────────────────────────────────

export interface Dia { id: string; nome_dia: string; data: string }
export interface Setor {
  id: string; nome: string; tipo: string
  nucleo: 'esportivo' | 'festivo' | null
  tem_wifi: boolean | null; tem_ponto_apoio: boolean | null
  alimentacao: string | null; maps_url: string | null; notas_acesso: string | null
}
export interface Parceiro { id: string; nome: string; tipo: string; cor_hex: string }
export interface ProfileAV {
  id: string; nome: string; funcao_principal: string | null
  empresa_cobertura: string | null; role: string
}
export interface TurnoAV {
  id: string; dia_id: string; setor_id: string | null
  funcao: string; user_id: string | null
  prioridade: string | null; status_escala: string | null; parceiro_id: string | null
  jogo_id: string | null
  setor: { nome: string } | null
  user: { id: string; nome: string; funcao_principal: string | null; foto_url: string | null } | null
  parceiro: { nome: string; cor_hex: string } | null
  jogo: JogoPreview | null
}

export interface JogoPreview {
  id: string
  inicio: string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  divisao: string | null
  categoria: string | null
  status: string | null
  modalidade_nome: string | null
  setor_id: string | null
  dia_id: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const PRIORIDADE_CONFIG = {
  alta:  { label: 'Alta',  dot: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: '#ef4444', text: '#dc2626' },
  media: { label: 'Média', dot: '#f59e0b', bg: 'rgba(234,179,8,0.10)',  border: '#f59e0b', text: '#b45309' },
  baixa: { label: 'Baixa', dot: '#4a8a5c', bg: 'rgba(46,107,66,0.08)',  border: '#4a8a5c', text: '#2e6b42' },
}

// Ordem fixa dos setores festivos
const FESTIVO_ORDER: Record<string, number> = {
  'PALCO PRINCIPAL':  0,
  'PALCO ELETRONICO': 1,
  'PALCO 360':        2,
  'PUBLICO NOTURNO':  3,
  'INSTITUCIONAL':    4,
  'PUBLICO ARENA':    5,
  'CIA CLUB':         6,
}

function norm(s: string) {
  return s.toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

function fmtHora(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Agrupamento esportivo — praças por prefixo numérico
// "CEMEA 01", "CEMEA 02" → grupo "CEMEA"
// ─────────────────────────────────────────────────────────────────────────────

interface PracaItem { setor: Setor; numero: string | null }
interface PracaGroup { prefix: string; items: PracaItem[]; isSolo: boolean }

function groupEsportivo(setores: Setor[]): PracaGroup[] {
  const map = new Map<string, PracaItem[]>()
  for (const s of setores) {
    const match  = s.nome.match(/^(.+?)\s*(\d{1,3})$/)
    const prefix = match ? match[1].trim() : s.nome
    const numero = match ? match[2].padStart(2, '0') : null
    if (!map.has(prefix)) map.set(prefix, [])
    map.get(prefix)!.push({ setor: s, numero })
  }
  const groups: PracaGroup[] = []
  for (const [prefix, items] of map) {
    items.sort((a, b) =>
      a.numero && b.numero ? Number(a.numero) - Number(b.numero) : 0,
    )
    const isSolo = items.length === 1 && items[0].numero === null
    groups.push({ prefix, items, isSolo })
  }
  groups.sort((a, b) => a.prefix.localeCompare(b.prefix, 'pt-BR'))
  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// TurnoDialog — criar / editar designação (SEM horário)
// ─────────────────────────────────────────────────────────────────────────────

interface TurnoDialogProps {
  open: boolean
  onClose: () => void
  dia: Dia
  setores: Setor[]
  parceiros: Parceiro[]
  profiles: ProfileAV[]
  jogos: JogoPreview[]
  defaultFuncao: 'foto' | 'video'
  defaultSetorId?: string
  editing?: TurnoAV
}

function TurnoDialog({
  open, onClose, dia, setores, parceiros, profiles, jogos,
  defaultFuncao, defaultSetorId, editing,
}: TurnoDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError]     = React.useState<string | null>(null)

  const [funcao, setFuncao]         = React.useState<'foto' | 'video'>(defaultFuncao)
  const [setorId, setSetorId]       = React.useState('')
  const [parceiro, setParceiro]     = React.useState('')
  const [userId, setUserId]         = React.useState('')
  const [prioridade, setPrioridade] = React.useState<'alta' | 'media' | 'baixa'>('media')
  const [jogoId, setJogoId]         = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setFuncao((editing?.funcao as 'foto' | 'video') ?? defaultFuncao)
    setSetorId(editing?.setor_id ?? defaultSetorId ?? '')
    setParceiro(editing?.parceiro_id ?? '')
    setUserId(editing?.user_id ?? '')
    setPrioridade((editing?.prioridade as 'alta' | 'media' | 'baixa') ?? 'media')
    setJogoId(editing?.jogo_id ?? '')
  }, [open, editing, defaultFuncao, defaultSetorId])

  // Filtra jogos pelo dia + setor selecionados
  const jogosDoContexto = React.useMemo(() => {
    if (!setorId) return [] as JogoPreview[]
    return jogos
      .filter(j => j.dia_id === dia.id && j.setor_id === setorId)
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''))
  }, [jogos, dia.id, setorId])

  // Se trocar setor e o jogo selecionado não pertence mais, limpa
  React.useEffect(() => {
    if (!jogoId) return
    if (!jogosDoContexto.some(j => j.id === jogoId)) setJogoId('')
  }, [jogosDoContexto, jogoId])

  const setorSel  = setores.find(s => s.id === setorId) ?? null
  const colabSel  = profiles.find(p => p.id === userId) ?? null
  const funcCor   = funcao === 'foto' ? FOTO_COLOR : VIDEO_COLOR
  const parceirosFiltrados = parceiros.filter(
    p => p.tipo === 'ambos' || p.tipo === funcao,
  )

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const payload: TurnoAVPayload = {
        dia_id:      dia.id,
        setor_id:    setorId || null,
        funcao,
        parceiro_id: parceiro && parceiro !== '__none__' ? parceiro : null,
        user_id:     userId || null,
        prioridade,
        jogo_id:     jogoId || null,
      }
      const res = editing
        ? await updateTurnoAV(editing.id, payload)
        : await createTurnoAV(payload)

      if (!res.ok) { setError(res.error ?? 'Erro ao salvar.'); setLoading(false); return }

      toast.success(editing ? 'Designação atualizada' : 'Designação criada', {
        description: colabSel
          ? `${colabSel.nome.split(' ')[0]} foi notificado.`
          : 'Slot aberto — designe o colaborador depois.',
      })
      onClose()
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar designação' : 'Nova designação'} · {dia.nome_dia}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Setor (contexto / chip) ── */}
          <div>
            <Label className="mb-1.5 block text-xs">Setor</Label>
            {setorSel ? (
              <div
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold"
                style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--green-bright)' }} />
                {setorSel.nome}
              </div>
            ) : (
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
            )}
          </div>

          {/* ── Função (toggle Foto / Vídeo) ── */}
          <div>
            <Label className="mb-1.5 block text-xs">Função</Label>
            <div className="flex gap-2">
              {(['foto', 'video'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFuncao(f); setUserId(''); setParceiro('') }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition-all',
                    funcao === f
                      ? f === 'foto'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]',
                  )}
                >
                  {f === 'foto' ? <Camera className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  {f === 'foto' ? 'Foto' : 'Vídeo'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Designação: empresa + colaborador ── */}
          <div
            className="rounded-xl border-2 p-3.5"
            style={{ borderColor: `${funcCor}33`, background: `${funcCor}08` }}
          >
            <p
              className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: funcCor }}
            >
              <Bell className="h-3 w-3" />
              Designação
            </p>

            {/* Empresa */}
            <div className="mb-3">
              <Label className="mb-1.5 flex items-center gap-1 text-xs">
                <Building2 className="h-3 w-3 text-[var(--muted-foreground)]" />
                Empresa / Parceiro
              </Label>
              <Select value={parceiro} onValueChange={setParceiro}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="— empresa —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem empresa</SelectItem>
                  {parceirosFiltrados.map(p => (
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

            {/* Colaborador */}
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-xs">
                <User className="h-3 w-3 text-[var(--muted-foreground)]" />
                Colaborador
              </Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="— pessoa —" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                      {p.empresa_cobertura && (
                        <span className="ml-1.5 text-[10px] text-[var(--muted-foreground)]">
                          · {p.empresa_cobertura}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                <Bell className="h-2.5 w-2.5" />
                {colabSel
                  ? `${colabSel.nome.split(' ')[0]} recebe notificação ao salvar.`
                  : 'Sem colaborador: vira slot aberto pra designar depois.'}
              </p>
            </div>
          </div>

          {/* ── Jogo vinculado (opcional) ───────────────────────────────── */}
          {setorId && (
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-xs">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: '#dc2626' }}
                />
                Jogo em foco
                <span className="ml-1 text-[10px] font-normal text-[var(--muted-foreground)]">
                  (opcional)
                </span>
              </Label>

              {jogosDoContexto.length === 0 ? (
                <div
                  className="rounded-lg border border-dashed px-3 py-2.5 text-[11px]"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--muted-foreground)',
                    background: 'var(--muted)',
                  }}
                >
                  Nenhum jogo deste setor neste dia. A cobertura será geral.
                </div>
              ) : (
                <>
                  <Select value={jogoId || '__none__'} onValueChange={v => setJogoId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-auto min-h-[44px] py-2 text-left text-sm">
                      <SelectValue placeholder="— selecione o jogo —">
                        {jogoId && (() => {
                          const j = jogosDoContexto.find(x => x.id === jogoId)
                          if (!j) return null
                          return (
                            <div className="flex w-full flex-col gap-0.5">
                              <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                                {fmtHora(j.inicio)}
                                {j.modalidade_nome ? ` · ${j.modalidade_nome}` : ''}
                                {j.divisao ? ` · ${j.divisao}` : ''}
                              </span>
                              <span className="text-sm font-semibold">
                                {(j.equipe_a_nome ?? 'A definir')}
                                <span className="mx-1.5 text-[var(--muted-foreground)]">×</span>
                                {(j.equipe_b_nome ?? 'A definir')}
                              </span>
                            </div>
                          )
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-[var(--muted-foreground)]">Sem jogo · cobertura geral</span>
                      </SelectItem>
                      {jogosDoContexto.map(j => (
                        <SelectItem key={j.id} value={j.id}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)]">
                              {fmtHora(j.inicio)}
                              {j.modalidade_nome ? ` · ${j.modalidade_nome}` : ''}
                              {j.divisao ? ` · ${j.divisao}` : ''}
                              {j.status === 'ao_vivo' && (
                                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600">
                                  ● ao vivo
                                </span>
                              )}
                            </span>
                            <span className="text-[12px] font-semibold">
                              {(j.equipe_a_nome ?? 'A definir')}
                              <span className="mx-1.5 text-[var(--muted-foreground)]">×</span>
                              {(j.equipe_b_nome ?? 'A definir')}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                    {jogoId
                      ? 'O colaborador vê o jogo destacado na escala dele.'
                      : `${jogosDoContexto.length} ${jogosDoContexto.length === 1 ? 'jogo' : 'jogos'} disponível${jogosDoContexto.length === 1 ? '' : 'is'} neste setor/dia.`}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Prioridade ── */}
          <div>
            <Label className="mb-1.5 block text-xs">Prioridade</Label>
            <div className="flex gap-2">
              {(['alta', 'media', 'baixa'] as const).map(p => {
                const cfg = PRIORIDADE_CONFIG[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridade(p)}
                    className="flex-1 rounded-lg border py-2 text-xs font-semibold transition-all"
                    style={{
                      background:  prioridade === p ? cfg.bg : 'transparent',
                      borderColor: prioridade === p ? cfg.border : 'var(--border)',
                      color:       prioridade === p ? cfg.text : 'var(--muted-foreground)',
                    }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
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
          <Button size="sm" onClick={submit} disabled={loading || !setorId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Salvar' : 'Criar designação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReplicarDialog — replica designações de outro dia
// ─────────────────────────────────────────────────────────────────────────────

function ReplicarDialog({
  open, onClose, dias, diaDestino,
}: {
  open: boolean
  onClose: () => void
  dias: Dia[]
  diaDestino: Dia
}) {
  const [loading, setLoading] = React.useState(false)
  const [origemId, setOrigemId] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) { setOrigemId(''); setError(null) }
  }, [open])

  async function submit() {
    if (!origemId) { setError('Selecione o dia de origem.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await replicarDiaAV(origemId, diaDestino.id)
      if (!res.ok) { setError(res.error ?? 'Erro ao replicar.'); setLoading(false); return }
      toast.success('Dia replicado', {
        description: `${res.data?.criados ?? 0} criados · ${res.data?.pulados ?? 0} já existiam.`,
      })
      onClose()
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
      setLoading(false)
    }
  }

  const outrosDias = dias.filter(d => d.id !== diaDestino.id)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Replicar dia</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Copia todas as designações de um dia para{' '}
            <span className="font-semibold text-[var(--foreground)]">{diaDestino.nome_dia}</span>.
            Designações já existentes (mesmo setor + função) não são duplicadas.
          </p>
          <div>
            <Label className="mb-1.5 block text-xs">Copiar a partir de</Label>
            <Select value={origemId} onValueChange={setOrigemId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="— dia de origem —" />
              </SelectTrigger>
              <SelectContent>
                {outrosDias.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.nome_dia} · {d.data}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            Replicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CellAvatar — avatar circular do colaborador (foto ou iniciais)
// ─────────────────────────────────────────────────────────────────────────────

function CellAvatar({
  nome, fotoUrl, cor,
}: {
  nome: string | null
  fotoUrl: string | null
  cor: string
}) {
  const iniciais = (nome ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase() || '?'

  if (fotoUrl) {
    return (
      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border)]">
        <Image src={fotoUrl} alt={nome ?? ''} fill sizes="28px" className="object-cover" />
      </div>
    )
  }
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
      style={{ background: `${cor}1f`, color: cor }}
    >
      {iniciais}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CoberturaCell — célula de uma função (foto OU vídeo) num setor
// ─────────────────────────────────────────────────────────────────────────────

function CoberturaCell({
  turno, funcao, temEvento, onAdd, onEdit, onDelete,
}: {
  turno: TurnoAV | undefined
  funcao: 'foto' | 'video'
  temEvento: boolean
  onAdd: () => void
  onEdit: (t: TurnoAV) => void
  onDelete: (t: TurnoAV) => void
}) {
  const cor = funcao === 'foto' ? FOTO_COLOR : VIDEO_COLOR

  // Vazio: setor com evento e sem cobertura → lacuna vermelha discreta
  if (!turno) {
    return (
      <button
        onClick={onAdd}
        className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed text-[11px] font-medium transition-all hover:border-solid"
        style={{
          borderColor: temEvento ? 'rgba(239,68,68,0.40)' : `${cor}2e`,
          background:  temEvento ? 'rgba(239,68,68,0.04)' : 'transparent',
          color:       temEvento ? '#dc2626' : `${cor}99`,
        }}
        aria-label={`Designar ${funcao}`}
      >
        <Plus className="h-3.5 w-3.5" />
        designar
      </button>
    )
  }

  const prio = (turno.prioridade as keyof typeof PRIORIDADE_CONFIG) ?? 'media'
  const prioCfg = PRIORIDADE_CONFIG[prio] ?? PRIORIDADE_CONFIG.media
  const semColab = !turno.user_id

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(turno)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(turno) } }}
      title={`Prioridade ${prioCfg.label}`}
      className="group relative flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border border-l-[3px] px-2.5 py-1.5 transition-all hover:shadow-sm"
      style={{
        borderColor:     'var(--border)',
        borderLeftColor: prioCfg.dot,
        background:      'var(--card)',
      }}
    >
      <CellAvatar
        nome={turno.user?.nome ?? null}
        fotoUrl={turno.user?.foto_url ?? null}
        cor={cor}
      />

      <div className="min-w-0 flex-1">
        {/* Linha 1: empresa (chip colorido) + nome colaborador */}
        <div className="flex items-center gap-1.5">
          {turno.parceiro && (
            <span
              className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase leading-none tracking-wider"
              style={{
                background: `${turno.parceiro.cor_hex}1F`,
                color:       turno.parceiro.cor_hex,
                border:      `1px solid ${turno.parceiro.cor_hex}40`,
              }}
              title={turno.parceiro.nome}
            >
              {turno.parceiro.nome}
            </span>
          )}
          <p
            className={cn(
              'truncate text-[12px] font-semibold leading-tight',
              semColab ? 'italic text-[var(--muted-foreground)]/70' : 'text-[var(--foreground)]',
            )}
          >
            {turno.user?.nome ?? 'Sem colaborador'}
          </p>
        </div>

        {/* Linha 2: jogo (se vinculado) */}
        {turno.jogo && (
          <p
            className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold"
            style={{ color: turno.jogo.status === 'ao_vivo' ? '#dc2626' : '#b45309' }}
            title={`${turno.jogo.equipe_a_nome ?? '?'} × ${turno.jogo.equipe_b_nome ?? '?'} · ${fmtHora(turno.jogo.inicio)}`}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: turno.jogo.status === 'ao_vivo' ? '#dc2626' : '#f59e0b',
                boxShadow: turno.jogo.status === 'ao_vivo' ? '0 0 6px rgba(220,38,38,0.7)' : 'none',
              }}
            />
            <span className="truncate">
              {fmtHora(turno.jogo.inicio)} · {turno.jogo.equipe_a_nome ?? '?'} × {turno.jogo.equipe_b_nome ?? '?'}
            </span>
          </p>
        )}
      </div>

      {/* Remover (hover) */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(turno) }}
        aria-label="Remover designação"
        className="absolute right-1.5 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-[var(--card)] shadow-sm hover:bg-red-50 hover:text-red-500 group-hover:flex"
        style={{ border: '1px solid var(--border)' }}
      >
        <Trash2 className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SetorRow — linha da grade (rótulo + colunas foto/vídeo)
// ─────────────────────────────────────────────────────────────────────────────

function SetorRow({
  label, setorId, turnos, temEvento, showFoto, showVideo, onAdd, onEdit, onDelete,
}: {
  label: string
  setorId: string
  turnos: TurnoAV[]
  temEvento: boolean
  showFoto: boolean
  showVideo: boolean
  onAdd: (funcao: 'foto' | 'video', setorId: string) => void
  onEdit: (t: TurnoAV) => void
  onDelete: (t: TurnoAV) => void
}) {
  // Múltiplas designações por (setor, função) — empresas diferentes podem cobrir
  // o mesmo setor simultaneamente (ex: CURUCLICKS + OLHAR ambas em CEMEA 01).
  const fotoTurnos  = turnos.filter(t => t.funcao === 'foto')
  const videoTurnos = turnos.filter(t => t.funcao === 'video')

  return (
    <div className="flex items-stretch gap-2 border-b border-[var(--border)] py-2 last:border-b-0">
      <div className="flex w-40 shrink-0 items-center pl-1">
        <span className="truncate text-xs font-semibold text-[var(--foreground)]">
          {label}
        </span>
      </div>
      {showFoto && (
        <div className="flex-1">
          <CoberturaStack
            turnos={fotoTurnos}
            funcao="foto"
            temEvento={temEvento}
            onAdd={() => onAdd('foto', setorId)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
      {showVideo && (
        <div className="flex-1">
          <CoberturaStack
            turnos={videoTurnos}
            funcao="video"
            temEvento={temEvento}
            onAdd={() => onAdd('video', setorId)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CoberturaStack — múltiplas designações empilhadas verticalmente
// (mesmo setor + função pode ter várias empresas: CURUCLICKS + OLHAR)
// ─────────────────────────────────────────────────────────────────────────────

function CoberturaStack({
  turnos, funcao, temEvento, onAdd, onEdit, onDelete,
}: {
  turnos: TurnoAV[]
  funcao: 'foto' | 'video'
  temEvento: boolean
  onAdd: () => void
  onEdit: (t: TurnoAV) => void
  onDelete: (t: TurnoAV) => void
}) {
  const cor = funcao === 'foto' ? FOTO_COLOR : VIDEO_COLOR

  // Vazio: usa o slot de "designar" original
  if (turnos.length === 0) {
    return (
      <CoberturaCell
        turno={undefined}
        funcao={funcao}
        temEvento={temEvento}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )
  }

  // Ordena: jogo ao vivo primeiro, depois por prioridade alta→baixa,
  // depois por nome da empresa pra estabilidade visual
  const PRIO_RANK: Record<string, number> = { alta: 0, media: 1, baixa: 2 }
  const ordenados = [...turnos].sort((a, b) => {
    const liveA = a.jogo?.status === 'ao_vivo' ? 0 : 1
    const liveB = b.jogo?.status === 'ao_vivo' ? 0 : 1
    if (liveA !== liveB) return liveA - liveB
    const prA = PRIO_RANK[a.prioridade ?? 'media'] ?? 1
    const prB = PRIO_RANK[b.prioridade ?? 'media'] ?? 1
    if (prA !== prB) return prA - prB
    return (a.parceiro?.nome ?? '').localeCompare(b.parceiro?.nome ?? '', 'pt-BR')
  })

  return (
    <div className="flex flex-col gap-1.5">
      {ordenados.map(t => (
        <CoberturaCell
          key={t.id}
          turno={t}
          funcao={funcao}
          temEvento={temEvento}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {/* Botão "+ adicionar mais" — discreto, embaixo da pilha */}
      <button
        onClick={onAdd}
        aria-label={`Adicionar outra designação de ${funcao}`}
        className="flex min-h-[28px] w-full items-center justify-center gap-1 rounded-md border border-dashed text-[10px] font-semibold uppercase tracking-wider transition-all hover:border-solid"
        style={{
          borderColor: `${cor}33`,
          color:       `${cor}AA`,
          background:  'transparent',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = `${cor}08`
          ;(e.currentTarget as HTMLElement).style.color = cor
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = `${cor}AA`
        }}
      >
        <Plus className="h-3 w-3" />
        + outra empresa
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NucleoSection — bloco de um núcleo com cabeçalho de colunas
// ─────────────────────────────────────────────────────────────────────────────

function NucleoSection({
  titulo, children, showFoto, showVideo, vazio, vazioMsg,
}: {
  titulo: string
  children: React.ReactNode
  showFoto: boolean
  showVideo: boolean
  vazio: boolean
  vazioMsg: string
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div
        className="border-b border-[var(--border)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
        style={{ background: 'var(--muted)' }}
      >
        {titulo}
      </div>

      {/* Cabeçalho de colunas */}
      {!vazio && (
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
          <div className="w-40 shrink-0" />
          {showFoto && (
            <div
              className="flex flex-1 items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: FOTO_COLOR }}
            >
              <Camera className="h-3 w-3" /> Foto
            </div>
          )}
          {showVideo && (
            <div
              className="flex flex-1 items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: VIDEO_COLOR }}
            >
              <Video className="h-3 w-3" /> Vídeo
            </div>
          )}
        </div>
      )}

      <div className="px-3">
        {vazio ? (
          <div className="py-10 text-center text-sm text-[var(--muted-foreground)]/60">
            {vazioMsg}
          </div>
        ) : children}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EscalaAVGrid — componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function EscalaAVGrid(props: {
  dias: Dia[]
  setores: Setor[]
  parceiros: Parceiro[]
  profiles: ProfileAV[]
  turnos: TurnoAV[]
  jogos: JogoPreview[]
  eventosSetores: { dia_id: string; setor_id: string }[]
}): React.JSX.Element {
  const { dias, setores, parceiros, profiles, turnos, jogos, eventosSetores } = props

  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Dia ativo (persistido na URL) ──
  const diaParam = searchParams.get('dia')
  const diaAtivo = React.useMemo(() => {
    return dias.find(d => d.id === diaParam) ?? dias[0] ?? null
  }, [dias, diaParam])

  function trocarDia(id: string) {
    router.replace(`/admin/escala-av?dia=${id}`, { scroll: false })
  }

  // ── Filtros ──
  const [filtroNucleo, setFiltroNucleo] = React.useState<'todos' | 'esportivo' | 'festivo'>('todos')
  const [filtroFuncao, setFiltroFuncao] = React.useState<'todos' | 'foto' | 'video'>('todos')
  const [busca, setBusca]               = React.useState('')

  // ── Grupos esportivos colapsáveis ──
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  function toggleGroup(prefix: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(prefix)) next.delete(prefix)
      else next.add(prefix)
      return next
    })
  }

  // ── Dialogs ──
  const [dialogState, setDialogState] = React.useState<{
    open: boolean; funcao: 'foto' | 'video'; setorId?: string; editing?: TurnoAV
  }>({ open: false, funcao: 'foto' })
  const [replicarOpen, setReplicarOpen] = React.useState(false)

  // ── Dados derivados do dia ativo ──
  const turnosDoDia = React.useMemo(
    () => (diaAtivo ? turnos.filter(t => t.dia_id === diaAtivo.id) : []),
    [turnos, diaAtivo],
  )

  const turnosPorSetor = React.useMemo(() => {
    const m = new Map<string, TurnoAV[]>()
    for (const t of turnosDoDia) {
      if (!t.setor_id) continue
      if (!m.has(t.setor_id)) m.set(t.setor_id, [])
      m.get(t.setor_id)!.push(t)
    }
    return m
  }, [turnosDoDia])

  // Setores com evento no dia ativo
  const setoresComEvento = React.useMemo(() => {
    const s = new Set<string>()
    if (!diaAtivo) return s
    for (const ev of eventosSetores) {
      if (ev.dia_id === diaAtivo.id) s.add(ev.setor_id)
    }
    return s
  }, [eventosSetores, diaAtivo])

  // ── Busca: um setor casa se nome, colaborador ou empresa bate ──
  const buscaNorm = norm(busca)
  const setorCasaBusca = React.useCallback((setor: Setor): boolean => {
    if (!buscaNorm) return true
    if (norm(setor.nome).includes(buscaNorm)) return true
    const ts = turnosPorSetor.get(setor.id) ?? []
    return ts.some(t =>
      (t.user && norm(t.user.nome).includes(buscaNorm)) ||
      (t.parceiro && norm(t.parceiro.nome).includes(buscaNorm)),
    )
  }, [buscaNorm, turnosPorSetor])

  // ── Setores esportivos: nucleo esportivo + tem evento no dia ──
  const setoresEsportivos = React.useMemo(
    () => setores.filter(s =>
      s.nucleo === 'esportivo' && setoresComEvento.has(s.id) && setorCasaBusca(s),
    ),
    [setores, setoresComEvento, setorCasaBusca],
  )
  const pracas = React.useMemo(() => groupEsportivo(setoresEsportivos), [setoresEsportivos])

  // ── Setores festivos: todos do nucleo festivo ──
  const setoresFestivos = React.useMemo(
    () => setores
      .filter(s => s.nucleo === 'festivo' && setorCasaBusca(s))
      .sort((a, b) =>
        (FESTIVO_ORDER[norm(a.nome)] ?? 99) - (FESTIVO_ORDER[norm(b.nome)] ?? 99),
      ),
    [setores, setorCasaBusca],
  )

  // ── Contadores ──
  const stats = React.useMemo(() => {
    const visiveis = [
      ...setores.filter(s => s.nucleo === 'esportivo' && setoresComEvento.has(s.id)),
      ...setores.filter(s => s.nucleo === 'festivo'),
    ]
    const visIds = new Set(visiveis.map(s => s.id))
    const fotoColabs  = new Set<string>()
    const videoColabs = new Set<string>()
    for (const t of turnosDoDia) {
      if (!t.user_id || !t.setor_id || !visIds.has(t.setor_id)) continue
      if (t.funcao === 'foto')  fotoColabs.add(t.user_id)
      if (t.funcao === 'video') videoColabs.add(t.user_id)
    }
    let cobertos = 0
    for (const s of visiveis) {
      if ((turnosPorSetor.get(s.id) ?? []).length > 0) cobertos++
    }
    return {
      fotoColabs:   fotoColabs.size,
      videoColabs:  videoColabs.size,
      cobertos,
      total:        visiveis.length,
      semCobertura: visiveis.length - cobertos,
    }
  }, [setores, setoresComEvento, turnosDoDia, turnosPorSetor])

  // ── Handlers ──
  function abrirCriar(funcao: 'foto' | 'video', setorId: string) {
    setDialogState({ open: true, funcao, setorId })
  }
  function abrirEditar(t: TurnoAV) {
    setDialogState({ open: true, funcao: t.funcao as 'foto' | 'video', editing: t })
  }
  async function removerTurno(t: TurnoAV) {
    const ok = await confirmDialog({
      title: 'Remover designação?',
      description: `${t.user?.nome ?? 'Slot aberto'} · ${t.setor?.nome ?? 'setor'} (${t.funcao}). Essa ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      destructive: true,
    })
    if (!ok) return
    const res = await deleteTurnoAV(t.id)
    if (!res.ok) { toast.error('Erro ao remover', { description: res.error }); return }
    toast.success('Designação removida')
    window.location.reload()
  }

  const showFoto      = filtroFuncao === 'todos' || filtroFuncao === 'foto'
  const showVideo     = filtroFuncao === 'todos' || filtroFuncao === 'video'
  const showEsportivo = filtroNucleo === 'todos' || filtroNucleo === 'esportivo'
  const showFestivo   = filtroNucleo === 'todos' || filtroNucleo === 'festivo'

  if (!diaAtivo) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Nenhum dia de evento cadastrado.
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ─── Barra de ações ─── */}
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">

        {/* Tabs de dia */}
        <div className="flex flex-wrap items-center gap-2">
          {dias.map(d => {
            const ativo = d.id === diaAtivo.id
            return (
              <button
                key={d.id}
                onClick={() => trocarDia(d.id)}
                className={cn(
                  'flex flex-col rounded-lg border px-3 py-1.5 text-left transition-all',
                  ativo
                    ? 'border-[var(--green-bright)] bg-[var(--green-dim)]/25'
                    : 'border-[var(--border)] hover:border-[var(--green-dim)]',
                )}
              >
                <span className={cn(
                  'text-xs font-bold',
                  ativo ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]',
                )}>
                  {d.nome_dia}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{d.data}</span>
              </button>
            )
          })}

          {/* Botões à direita */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplicarOpen(true)}
              className="min-h-[44px]"
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Replicar dia
            </Button>
            <Button
              size="sm"
              onClick={() => setDialogState({ open: true, funcao: 'foto' })}
              className="min-h-[44px]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Contadores */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${FOTO_COLOR}12`, color: FOTO_COLOR }}
          >
            <Camera className="h-3.5 w-3.5" />
            {stats.fotoColabs} Foto
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${VIDEO_COLOR}12`, color: VIDEO_COLOR }}
          >
            <Video className="h-3.5 w-3.5" />
            {stats.videoColabs} Vídeo
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)]">
            {stats.cobertos}/{stats.total} setores cobertos
          </div>
          {stats.semCobertura > 0 && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {stats.semCobertura} sem cobertura
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Núcleo */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
            {(['todos', 'esportivo', 'festivo'] as const).map(n => (
              <button
                key={n}
                onClick={() => setFiltroNucleo(n)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-all',
                  filtroNucleo === n
                    ? 'bg-[var(--green-dim)]/30 text-[var(--green-bright)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Função */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
            {(['todos', 'foto', 'video'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroFuncao(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-all',
                  filtroFuncao === f
                    ? 'bg-[var(--green-dim)]/30 text-[var(--green-bright)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                )}
              >
                {f === 'video' ? 'Vídeo' : f}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar colaborador, empresa ou setor…"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-2 text-sm focus:border-[var(--green-bright)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ─── Grade ─── */}
      <div className="space-y-4">

        {/* ── ESPORTIVO ── */}
        {showEsportivo && (
          <NucleoSection
            titulo="Esportivo"
            showFoto={showFoto}
            showVideo={showVideo}
            vazio={pracas.length === 0}
            vazioMsg="Nenhum setor esportivo com evento neste dia."
          >
            {pracas.map(grupo => {
              if (grupo.isSolo) {
                const item = grupo.items[0]
                return (
                  <SetorRow
                    key={item.setor.id}
                    label={item.setor.nome}
                    setorId={item.setor.id}
                    turnos={turnosPorSetor.get(item.setor.id) ?? []}
                    temEvento={setoresComEvento.has(item.setor.id)}
                    showFoto={showFoto}
                    showVideo={showVideo}
                    onAdd={abrirCriar}
                    onEdit={abrirEditar}
                    onDelete={removerTurno}
                  />
                )
              }
              const isCollapsed = collapsed.has(grupo.prefix)
              const semCobertura = grupo.items.filter(
                it => (turnosPorSetor.get(it.setor.id) ?? []).length === 0,
              ).length
              return (
                <div key={grupo.prefix}>
                  <button
                    onClick={() => toggleGroup(grupo.prefix)}
                    className="flex w-full items-center gap-2 border-b border-[var(--border)] py-2 text-left"
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />}
                    <span className="text-xs font-bold uppercase tracking-[0.10em] text-[var(--foreground)]">
                      {grupo.prefix}
                    </span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
                      style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      {grupo.items.length}
                    </span>
                    {semCobertura > 0 && (
                      <span
                        className="ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-semibold"
                        style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}
                      >
                        <AlertCircle className="h-2.5 w-2.5" />
                        {semCobertura} sem cobertura
                      </span>
                    )}
                  </button>
                  {!isCollapsed && grupo.items.map(it => (
                    <SetorRow
                      key={it.setor.id}
                      label={it.numero ? `Quadra ${it.numero}` : it.setor.nome}
                      setorId={it.setor.id}
                      turnos={turnosPorSetor.get(it.setor.id) ?? []}
                      temEvento={setoresComEvento.has(it.setor.id)}
                      showFoto={showFoto}
                      showVideo={showVideo}
                      onAdd={abrirCriar}
                      onEdit={abrirEditar}
                      onDelete={removerTurno}
                    />
                  ))}
                </div>
              )
            })}
          </NucleoSection>
        )}

        {/* ── FESTIVO ── */}
        {showFestivo && (
          <NucleoSection
            titulo="Festivo"
            showFoto={showFoto}
            showVideo={showVideo}
            vazio={setoresFestivos.length === 0}
            vazioMsg="Nenhum setor festivo cadastrado."
          >
            {setoresFestivos.map(s => (
              <SetorRow
                key={s.id}
                label={s.nome}
                setorId={s.id}
                turnos={turnosPorSetor.get(s.id) ?? []}
                temEvento={setoresComEvento.has(s.id)}
                showFoto={showFoto}
                showVideo={showVideo}
                onAdd={abrirCriar}
                onEdit={abrirEditar}
                onDelete={removerTurno}
              />
            ))}
          </NucleoSection>
        )}
      </div>

      {/* ─── Dialogs ─── */}
      {dialogState.open && (
        <TurnoDialog
          open={dialogState.open}
          onClose={() => setDialogState({ open: false, funcao: 'foto' })}
          dia={diaAtivo}
          setores={setores}
          parceiros={parceiros}
          profiles={profiles}
          jogos={jogos}
          defaultFuncao={dialogState.funcao}
          defaultSetorId={dialogState.setorId}
          editing={dialogState.editing}
        />
      )}

      {replicarOpen && (
        <ReplicarDialog
          open={replicarOpen}
          onClose={() => setReplicarOpen(false)}
          dias={dias}
          diaDestino={diaAtivo}
        />
      )}
    </div>
  )
}
