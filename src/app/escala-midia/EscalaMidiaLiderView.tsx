'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Video, MapPin, Clock, User, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { assignTurnoUser } from './actions'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TurnoMidiaEx {
  id: string
  dia_id: string
  funcao: 'foto' | 'video'
  setor_id: string | null
  inicio: string
  fim: string
  user_id: string | null
  nome_pessoa: string | null
  is_roaming: boolean
  observacoes: string | null
  setor?: { nome: string }
  user?: { nome: string }
  dia?: { nome_dia: string; data: string }
}

interface Profile { id: string; nome: string; funcao_principal: string | null }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function fmtDate(data: string) {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
}

// ── Single slot card ───────────────────────────────────────────────────────────

function SlotRow({
  turno,
  isLider,
  teamProfiles,
  onAssign,
}: {
  turno: TurnoMidiaEx
  isLider: boolean
  teamProfiles: Profile[]
  onAssign: (turnoId: string, userId: string | null) => Promise<void>
}) {
  const [saving, setSaving] = React.useState(false)
  const isAssigned = !!turno.user_id

  async function handleAssign(v: string) {
    setSaving(true)
    await onAssign(turno.id, v === '__none__' ? null : v)
    setSaving(false)
  }

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border px-4 py-3 transition-all',
        isAssigned
          ? 'border-[var(--green)]/25 bg-[var(--green)]/[0.04]'
          : 'border-dashed border-[var(--border)] bg-[var(--card)]',
      )}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {isAssigned
          ? <CheckCircle2 className="h-4 w-4 text-[var(--green)]" />
          : <Circle className="h-4 w-4 text-[var(--border)]" />
        }
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1">
        {/* Time */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 tabular-nums text-sm font-semibold">
            <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {fmtTime(turno.inicio)} – {fmtTime(turno.fim)}
          </span>
          {turno.setor && (
            <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <MapPin className="h-3 w-3 shrink-0" />
              {turno.setor.nome}
            </span>
          )}
        </div>

        {turno.observacoes && (
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]/60">{turno.observacoes}</p>
        )}

        {/* Assignment */}
        <div className="mt-2">
          {isLider ? (
            <Select
              value={turno.user_id ?? '__none__'}
              onValueChange={handleAssign}
              disabled={saving}
            >
              <SelectTrigger className="h-7 w-56 text-xs">
                {saving
                  ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</span>
                  : <SelectValue />
                }
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem atribuição —</SelectItem>
                {teamProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                isAssigned
                  ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                  : 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]',
              )}
            >
              <User className="h-3 w-3" />
              {turno.user?.nome ?? turno.nome_pessoa ?? 'Não atribuído'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────────

interface Props {
  funcao: 'foto' | 'video'
  isLider: boolean
  turnos: TurnoMidiaEx[]
  dias: { id: string; nome_dia: string; data: string }[]
  teamProfiles: Profile[]
}

export function EscalaMidiaLiderView({ funcao, isLider, turnos, dias, teamProfiles }: Props) {
  const router = useRouter()
  const [selectedDia, setSelectedDia] = React.useState<string | null>(dias[0]?.id ?? null)

  const FuncaoIcon = funcao === 'foto' ? Camera : Video
  const funcaoLabel = funcao === 'foto' ? 'Fotografia' : 'Vídeo'
  const funcaoColor = funcao === 'foto' ? 'text-purple-700' : 'text-blue-700'
  const funcaoBg    = funcao === 'foto' ? 'bg-purple-500/[0.06] border-purple-500/20' : 'bg-blue-500/[0.06] border-blue-500/20'

  const turnosFiltrados = selectedDia
    ? turnos.filter((t) => t.dia_id === selectedDia)
    : turnos

  const assigned   = turnosFiltrados.filter((t) => !!t.user_id).length
  const unassigned = turnosFiltrados.length - assigned

  async function handleAssign(turnoId: string, userId: string | null) {
    await assignTurnoUser(turnoId, userId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          {isLider ? 'Gestão de equipe' : 'Minha escala'}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FuncaoIcon className={cn('h-6 w-6', funcaoColor)} />
          <span>Escala — {funcaoLabel}</span>
        </h1>
        {isLider && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Atribua os membros da sua equipe aos slots criados pela coordenação.
          </p>
        )}
      </div>

      {/* Stats + day filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={cn('flex items-center gap-2 rounded-xl border px-4 py-2 text-xs', funcaoBg)}>
          <FuncaoIcon className={cn('h-3.5 w-3.5', funcaoColor)} />
          <span className={cn('font-semibold', funcaoColor)}>{funcaoLabel}</span>
          <span className="text-[var(--muted-foreground)]">
            {assigned}/{turnosFiltrados.length} atribuídos
          </span>
          {unassigned > 0 && isLider && (
            <span className="rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
              {unassigned} vago{unassigned > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Day tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedDia(null)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              selectedDia === null
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
            )}
          >
            Todos
          </button>
          {dias.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDia(d.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                selectedDia === d.id
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
              )}
            >
              {d.nome_dia}
            </button>
          ))}
        </div>
      </div>

      {/* Slots */}
      {turnosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
          <FuncaoIcon className={cn('mx-auto mb-3 h-8 w-8 opacity-30', funcaoColor)} />
          <p className="text-sm text-[var(--muted-foreground)]">
            {isLider
              ? 'Nenhum slot criado para este dia. Peça à coordenação para criar os slots.'
              : 'Nenhum turno atribuído a você ainda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Group by day when showing all */}
          {(selectedDia === null ? dias : dias.filter((d) => d.id === selectedDia)).map((d) => {
            const dTurnos = turnosFiltrados.filter((t) => t.dia_id === d.id)
            if (dTurnos.length === 0) return null
            return (
              <div key={d.id}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {d.nome_dia} · {fmtDate(d.data)}
                </p>
                <div className="space-y-2">
                  {dTurnos.map((t) => (
                    <SlotRow
                      key={t.id}
                      turno={t}
                      isLider={isLider}
                      teamProfiles={teamProfiles}
                      onAssign={handleAssign}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
