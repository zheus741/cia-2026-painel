'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, AlertCircle, Camera, Video, MapPin, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createSlotMidia, deleteSlotMidia, assignTurnoUser } from '@/app/escala-midia/actions'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TurnoMidia {
  id: string
  dia_id: string
  setor_id: string | null
  funcao: 'foto' | 'video'
  inicio: string
  fim: string
  nome_pessoa: string | null
  user_id: string | null
  is_roaming: boolean
  observacoes: string | null
  setor?: { nome: string }
  user?: { nome: string }
}

interface Dia     { id: string; nome_dia: string; data: string }
interface Setor   { id: string; nome: string }
interface Profile { id: string; nome: string; funcao_principal: string | null }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function buildTimestamp(data: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${data}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// ── Slot card ──────────────────────────────────────────────────────────────────

function SlotCard({
  turno,
  profiles,
  onDelete,
  onAssign,
}: {
  turno: TurnoMidia
  profiles: Profile[]
  onDelete: () => void
  onAssign: (userId: string | null) => void
}) {
  const [assigning, setAssigning] = React.useState(false)
  const isAssigned = !!turno.user_id

  return (
    <div
      className={cn(
        'group relative rounded-xl border px-3 py-2.5 text-xs transition-all',
        isAssigned
          ? 'border-[var(--green)]/30 bg-[var(--green)]/[0.05]'
          : 'border-dashed border-[var(--border)] bg-[var(--card)]',
      )}
    >
      {/* Time + setor */}
      <div className="flex items-center justify-between gap-2">
        <span className="tabular-nums font-semibold text-[var(--foreground)]">
          {fmtTime(turno.inicio)} – {fmtTime(turno.fim)}
        </span>
        <button
          onClick={onDelete}
          className="hidden rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-600 group-hover:block"
          title="Remover slot"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {turno.setor && (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
          <MapPin className="h-3 w-3 shrink-0" />
          {turno.setor.nome}
        </div>
      )}

      {turno.observacoes && (
        <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]/60">{turno.observacoes}</p>
      )}

      {/* Assignment */}
      <div className="mt-2">
        {assigning ? (
          <Select
            value={turno.user_id ?? '__none__'}
            onValueChange={(v) => {
              onAssign(v === '__none__' ? null : v)
              setAssigning(false)
            }}
          >
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— sem atribuição —</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            onClick={() => setAssigning(true)}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] transition-colors',
              isAssigned
                ? 'bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/15'
                : 'border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green)]/40 hover:text-[var(--foreground)]',
            )}
          >
            <User className="h-3 w-3 shrink-0" />
            {turno.user?.nome ?? turno.nome_pessoa ?? 'Atribuir membro'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Add Slot dialog ────────────────────────────────────────────────────────────

function AddSlotDialog({
  open,
  onClose,
  dia,
  setores,
}: {
  open: boolean
  onClose: () => void
  dia: Dia
  setores: Setor[]
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [funcao, setFuncao] = React.useState<'foto' | 'video'>('foto')
  const [setorId, setSetorId] = React.useState('')
  const [inicio, setInicio] = React.useState('08:00')
  const [fim, setFim] = React.useState('20:00')
  const [obs, setObs] = React.useState('')

  React.useEffect(() => {
    if (open) { setError(null); setLoading(false) }
  }, [open])

  async function submit() {
    setLoading(true); setError(null)
    try {
      const res = await createSlotMidia({
        dia_id: dia.id,
        funcao,
        setor_id: setorId || null,
        inicio: buildTimestamp(dia.data, inicio),
        fim: buildTimestamp(dia.data, fim),
        observacoes: obs || null,
      })
      if (!res.ok) { setError(res.error ?? 'Erro ao criar slot.'); return }
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo slot · {dia.nome_dia}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Funcao */}
          <div>
            <Label className="mb-1.5 block text-xs">Função</Label>
            <div className="flex gap-2">
              {(['foto', 'video'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFuncao(f)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    funcao === f
                      ? f === 'foto'
                        ? 'border-purple-500/40 bg-purple-500/10 text-purple-700'
                        : 'border-blue-500/40 bg-blue-500/10 text-blue-700'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/20',
                  )}
                >
                  {f === 'foto' ? <Camera className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  {f === 'foto' ? 'Foto' : 'Vídeo'}
                </button>
              ))}
            </div>
          </div>

          {/* Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Início</Label>
              <Input
                type="time"
                className="h-8 text-xs"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Fim</Label>
              <Input
                type="time"
                className="h-8 text-xs"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </div>
          </div>

          {/* Setor */}
          <div>
            <Label className="mb-1.5 block text-xs">Setor / Local</Label>
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="— opcional —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem setor fixo / Roaming</SelectItem>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Obs */}
          <div>
            <Label className="mb-1.5 block text-xs">Observações</Label>
            <Input
              className="h-8 text-xs"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex: cobertura de abertura, credenciado área VIP..."
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Criar slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface EscalaMidiaAdminGridProps {
  dias: Dia[]
  setores: Setor[]
  profiles: Profile[]
  turnos: TurnoMidia[]
}

export function EscalaMidiaAdminGrid({ dias, setores, profiles, turnos }: EscalaMidiaAdminGridProps) {
  const router = useRouter()
  const [activeDia, setActiveDia] = React.useState(0)
  const [addDialog, setAddDialog] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const dia = dias[activeDia]

  const turnosHoje = React.useMemo(
    () => (dia ? turnos.filter((t) => t.dia_id === dia.id) : []),
    [dia, turnos],
  )

  const fotos  = turnosHoje.filter((t) => t.funcao === 'foto')
  const videos = turnosHoje.filter((t) => t.funcao === 'video')

  async function handleAssign(turnoId: string, userId: string | null) {
    await assignTurnoUser(turnoId, userId)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await deleteSlotMidia(deleteId)
    setDeleting(false)
    setDeleteId(null)
    router.refresh()
  }

  const statFoto  = { total: fotos.length,  assigned: fotos.filter(t => !!t.user_id).length }
  const statVideo = { total: videos.length, assigned: videos.filter(t => !!t.user_id).length }

  if (!dia) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Nenhum dia cadastrado. Adicione dias em /admin/dias.
      </div>
    )
  }

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] px-6 pb-4 pt-2">
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

      {/* Stat bar */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] px-4 py-2 text-xs">
          <Camera className="h-3.5 w-3.5 text-purple-600" />
          <span className="font-semibold text-purple-700">Foto</span>
          <span className="text-[var(--muted-foreground)]">{statFoto.assigned}/{statFoto.total} atribuídos</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2 text-xs">
          <Video className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-semibold text-blue-700">Vídeo</span>
          <span className="text-[var(--muted-foreground)]">{statVideo.assigned}/{statVideo.total} atribuídos</span>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAddDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo slot
          </Button>
        </div>
      </div>

      {/* Grid: Foto | Vídeo */}
      <div className="grid grid-cols-2 gap-0 px-6 pb-8">
        {/* Foto column */}
        <div className="border-r border-[var(--border)] pr-4">
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-700">Fotografia</h3>
            <span className="ml-auto text-xs text-[var(--muted-foreground)]">{fotos.length} slots</span>
          </div>
          <div className="space-y-2">
            {fotos.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted-foreground)]">
                Nenhum slot de foto criado.
                <br />
                <button
                  onClick={() => setAddDialog(true)}
                  className="mt-2 inline-flex items-center gap-1 text-[var(--green)] hover:underline"
                >
                  <Plus className="h-3 w-3" /> Criar slot
                </button>
              </div>
            )}
            {fotos.map((t) => (
              <SlotCard
                key={t.id}
                turno={t}
                profiles={profiles.filter((p) => p.funcao_principal === 'foto')}
                onDelete={() => setDeleteId(t.id)}
                onAssign={(uid) => handleAssign(t.id, uid)}
              />
            ))}
          </div>
        </div>

        {/* Vídeo column */}
        <div className="pl-4">
          <div className="mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-700">Vídeo</h3>
            <span className="ml-auto text-xs text-[var(--muted-foreground)]">{videos.length} slots</span>
          </div>
          <div className="space-y-2">
            {videos.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted-foreground)]">
                Nenhum slot de vídeo criado.
                <br />
                <button
                  onClick={() => setAddDialog(true)}
                  className="mt-2 inline-flex items-center gap-1 text-[var(--green)] hover:underline"
                >
                  <Plus className="h-3 w-3" /> Criar slot
                </button>
              </div>
            )}
            {videos.map((t) => (
              <SlotCard
                key={t.id}
                turno={t}
                profiles={profiles.filter((p) => p.funcao_principal === 'video')}
                onDelete={() => setDeleteId(t.id)}
                onAssign={(uid) => handleAssign(t.id, uid)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Add dialog */}
      {dia && (
        <AddSlotDialog
          open={addDialog}
          onClose={() => setAddDialog(false)}
          dia={dia}
          setores={setores}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover slot?</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            Se houver um membro atribuído, ele perderá a atribuição. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
