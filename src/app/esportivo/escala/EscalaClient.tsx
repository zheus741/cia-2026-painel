'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, Clock, Plus, X, UserCheck, Loader2 } from 'lucide-react'
import { atribuirDelegado, removerDelegado, confirmarChegada } from './actions'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Setor   { id: string; nome: string }
export interface Dia     { id: string; nome_dia: string; data: string }
export interface Perfil  { id: string; nome: string; role: string }
export interface Escala  {
  id: string
  setor_id: string
  dia_id: string
  user_id: string
  confirmado_em: string | null
  criado_em: string
  perfil: { id: string; nome: string; foto_url?: string | null } | null
}

interface Props {
  setores:  Setor[]
  dias:     Dia[]
  escalas:  Escala[]
  perfis:   Perfil[]   // só preenchido para coord/admin
  isCoord:  boolean
  userId:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtConfirmado(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function Initials({ nome }: { nome: string }) {
  const parts = nome.trim().split(/\s+/)
  const letters = (parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : nome.slice(0, 2)
  ).toUpperCase()
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--green-dim)]/40 text-[9px] font-bold text-[var(--green-bright)] shrink-0">
      {letters}
    </span>
  )
}

// ── Cell de atribuição ────────────────────────────────────────────────────────

function EscalaCell({
  setorId, diaId, escalasCell, perfis, isCoord, userId,
  onAdd, onRemove,
}: {
  setorId: string
  diaId: string
  escalasCell: Escala[]
  perfis: Perfil[]
  isCoord: boolean
  userId: string
  onAdd: (setorId: string, diaId: string, userId: string) => void
  onRemove: (escalaId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState('')

  // Filtra perfis que ainda não estão nessa célula
  const assignedIds = new Set(escalasCell.map(e => e.user_id))
  const available = perfis.filter(p => !assignedIds.has(p.id))

  function handleSelect(uid: string) {
    if (!uid) return
    onAdd(setorId, diaId, uid)
    setSelected('')
    setAdding(false)
  }

  return (
    <div className="min-h-[52px] flex flex-col gap-1">
      {escalasCell.map(e => {
        const nome = e.perfil?.nome ?? '—'
        const isMe = e.user_id === userId
        return (
          <div
            key={e.id}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${
              isMe
                ? e.confirmado_em
                  ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15'
                  : 'border-amber-500/40 bg-amber-500/5'
                : 'border-[var(--border)] bg-[var(--card)]/40'
            }`}
          >
            <Initials nome={nome} />
            <span className="truncate font-medium text-[var(--foreground)] flex-1">
              {nome.split(' ')[0]}
            </span>
            {e.confirmado_em
              ? <CheckCircle2 className="h-3 w-3 shrink-0 text-[var(--green-bright)]" />
              : isMe
                ? null  // confirm button is in "Minha Escala" section
                : <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60 shrink-0" />
            }
            {isCoord && (
              <button
                onClick={() => onRemove(e.id)}
                title="Remover delegado"
                className="ml-0.5 shrink-0 rounded p-0.5 text-[var(--muted-foreground)]/30 hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )
      })}

      {isCoord && (
        adding ? (
          <select
            autoFocus
            value={selected}
            onChange={e => handleSelect(e.target.value)}
            onBlur={() => { setAdding(false); setSelected('') }}
            className="w-full rounded-lg border border-[var(--green)]/40 bg-[var(--card)] px-2 py-1 text-[11px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--green)]/30"
          >
            <option value="">— escolher —</option>
            {available.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        ) : available.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]/50 transition-all hover:border-[var(--green)]/40 hover:text-[var(--green-bright)]"
          >
            <Plus className="h-3 w-3" />
            Atribuir
          </button>
        )
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function EscalaClient({ setores, dias, escalas: initialEscalas, perfis, isCoord, userId }: Props) {
  const router = useRouter()
  const [escalas, setEscalas] = useState<Escala[]>(initialEscalas)
  const [isPending, startTransition] = useTransition()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // ── Dia ativo (tab) ─────────────────────────────────────────────────────────
  const hoje = new Date().toISOString().slice(0, 10)
  const defaultDia = dias.find(d => d.data >= hoje)?.id ?? dias[0]?.id ?? ''
  const [diaAtivo, setDiaAtivo] = useState(defaultDia)

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getCell(setorId: string, diaId: string) {
    return escalas.filter(e => e.setor_id === setorId && e.dia_id === diaId)
  }

  const minhasEscalas = escalas
    .filter(e => e.user_id === userId)
    .sort((a, b) => {
      const da = dias.findIndex(d => d.id === a.dia_id)
      const db = dias.findIndex(d => d.id === b.dia_id)
      return da - db
    })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleAdd(setorId: string, diaId: string, uid: string) {
    const perfil = perfis.find(p => p.id === uid) ?? null
    const temp: Escala = {
      id: `temp-${Date.now()}`,
      setor_id: setorId,
      dia_id: diaId,
      user_id: uid,
      confirmado_em: null,
      criado_em: new Date().toISOString(),
      perfil: perfil ? { id: perfil.id, nome: perfil.nome } : null,
    }
    setEscalas(prev => [...prev, temp])
    startTransition(async () => {
      const res = await atribuirDelegado(setorId, diaId, uid)
      if (!res.ok) {
        setEscalas(prev => prev.filter(e => e.id !== temp.id))
      } else {
        router.refresh()
      }
    })
  }

  function handleRemove(escalaId: string) {
    setEscalas(prev => prev.filter(e => e.id !== escalaId))
    startTransition(async () => {
      const res = await removerDelegado(escalaId)
      if (!res.ok) router.refresh()
    })
  }

  function handleConfirmar(escalaId: string) {
    setConfirmingId(escalaId)
    startTransition(async () => {
      const res = await confirmarChegada(escalaId)
      setConfirmingId(null)
      if (res.ok) {
        setEscalas(prev => prev.map(e =>
          e.id === escalaId ? { ...e, confirmado_em: new Date().toISOString() } : e
        ))
      }
    })
  }

  const diaAtivoData = dias.find(d => d.id === diaAtivo)

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="cia-page-header">
        <p className="cia-page-header__eyebrow">Esportivo</p>
        <h1 className="cia-page-header__title">Escala de Delegados</h1>
        <p className="cia-page-header__subtitle">
          {isCoord
            ? 'Atribua delegados a cada praça esportiva por dia. O delegado recebe uma notificação e confirma a chegada pelo app.'
            : 'Sua escala para o evento. Confirme a chegada quando chegar à praça.'}
        </p>
      </div>

      {/* ── Minha Escala (visível para todos) ───────────────────────────────── */}
      {minhasEscalas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Minha Escala</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {minhasEscalas.map(e => {
              const dia   = dias.find(d => d.id === e.dia_id)
              const setor = setores.find(s => s.id === e.setor_id)
              const isConfirming = confirmingId === e.id
              return (
                <div
                  key={e.id}
                  className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                    e.confirmado_em
                      ? 'border-[var(--green-bright)]/30 bg-[var(--green-dim)]/10'
                      : 'border-amber-500/30 bg-amber-500/5'
                  }`}
                >
                  {/* Status indicator */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                    e.confirmado_em ? 'bg-[var(--green-bright)]/50' : 'bg-amber-400/50'
                  }`} />

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/60">
                        {dia?.nome_dia ?? '—'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--green-bright)]" />
                        {setor?.nome ?? '—'}
                      </p>
                    </div>
                    {e.confirmado_em && (
                      <CheckCircle2 className="h-5 w-5 text-[var(--green-bright)] shrink-0" />
                    )}
                  </div>

                  {e.confirmado_em ? (
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--green-bright)]">
                      <Clock className="h-3 w-3" />
                      Chegada confirmada às {fmtConfirmado(e.confirmado_em)}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleConfirmar(e.id)}
                      disabled={isPending || isConfirming}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-500 transition-all hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      {isConfirming
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <UserCheck className="h-3.5 w-3.5" />
                      }
                      Confirmar chegada
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Grid de escalas (somente coord/admin) ───────────────────────────── */}
      {isCoord && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Grade de Delegados
            {isPending && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-[var(--muted-foreground)]" />}
          </h2>

          {/* Tabs de dias */}
          <div className="flex flex-wrap gap-2">
            {dias.map(dia => (
              <button
                key={dia.id}
                onClick={() => setDiaAtivo(dia.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  diaAtivo === dia.id
                    ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/20 text-[var(--green-bright)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)] hover:text-[var(--foreground)]'
                }`}
              >
                {dia.nome_dia}
                {' '}
                <span className="text-[10px] opacity-60">
                  {escalas.filter(e => e.dia_id === dia.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Tabela */}
          {diaAtivoData && (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/60">
                      Praça esportiva
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/60">
                      Delegados — {diaAtivoData.nome_dia}
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/60">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {setores.map((setor, i) => {
                    const cell = getCell(setor.id, diaAtivo)
                    const confirmed = cell.filter(e => e.confirmado_em).length
                    return (
                      <tr
                        key={setor.id}
                        className={`border-b border-[var(--border)]/40 last:border-0 ${
                          i % 2 === 0 ? '' : 'bg-[var(--card)]/20'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-[var(--green-bright)]/60" />
                            {setor.nome}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <EscalaCell
                            setorId={setor.id}
                            diaId={diaAtivo}
                            escalasCell={cell}
                            perfis={perfis}
                            isCoord={isCoord}
                            userId={userId}
                            onAdd={handleAdd}
                            onRemove={handleRemove}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {cell.length === 0 ? (
                            <span className="text-[10px] text-[var(--muted-foreground)]/40">Vazio</span>
                          ) : (
                            <span className={`text-[10px] font-semibold ${
                              confirmed === cell.length
                                ? 'text-[var(--green-bright)]'
                                : 'text-amber-400'
                            }`}>
                              {confirmed}/{cell.length} confirmado{cell.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {setores.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhum setor cadastrado. Adicione setores em /admin/competicao.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state para operador sem escala */}
      {!isCoord && minhasEscalas.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-16 text-center">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Você ainda não foi escalado para nenhuma praça.
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
            O coordenador esportivo vai te atribuir em breve.
          </p>
        </div>
      )}
    </div>
  )
}
