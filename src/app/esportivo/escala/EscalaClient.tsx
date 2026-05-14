'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, MapPin, Clock, Plus, X, UserCheck,
  Loader2, AlertTriangle, Users, ChevronDown, Search,
} from 'lucide-react'
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
  perfis:   Perfil[]
  isCoord:  boolean
  userId:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtConfirmado(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function Initials({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' }) {
  const parts = nome.trim().split(/\s+/)
  const letters = (parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : nome.slice(0, 2)
  ).toUpperCase()
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-[var(--green-dim)]/50 font-bold text-[var(--green-bright)] shrink-0 ${
      size === 'sm' ? 'h-5 w-5 text-[8px]' : 'h-7 w-7 text-[10px]'
    }`}>
      {letters}
    </span>
  )
}

// ── Dialogo de confirmação de remoção ─────────────────────────────────────────

function RemoveDialog({ nome, onConfirm, onCancel }: {
  nome: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'scaleIn 150ms ease-out' }}
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">Remover delegado?</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">{nome}</span> será removido desta praça.
          Ele não receberá notificação.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dropdown de usuário (substitui <select> nativo) ───────────────────────────

function UserPicker({ perfis, onSelect, onClose }: {
  perfis: Perfil[]
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = perfis.filter(p =>
    !query || p.nome.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      ref={ref}
      className="absolute z-30 left-0 top-full mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden"
      style={{ animation: 'scaleIn 120ms ease-out' }}
    >
      <div className="border-b border-[var(--border)] px-3 py-2 flex items-center gap-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]/40" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 bg-transparent text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--muted-foreground)]/50 text-center">Nenhum resultado</p>
        ) : filtered.map(p => (
          <button
            key={p.id}
            onMouseDown={() => onSelect(p.id)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--green-dim)]/10 hover:text-[var(--green-bright)]"
          >
            <Initials nome={p.nome} size="sm" />
            <span className="truncate">{p.nome}</span>
          </button>
        ))}
      </div>
    </div>
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
  onRemove: (escalaId: string, nome: string) => void
}) {
  const [picking, setPicking] = useState(false)
  const assignedIds = new Set(escalasCell.map(e => e.user_id))
  const available = perfis.filter(p => !assignedIds.has(p.id))

  function handleSelect(uid: string) {
    onAdd(setorId, diaId, uid)
    setPicking(false)
  }

  return (
    <div className="relative flex flex-col gap-1.5 min-h-[44px]">
      {escalasCell.map(e => {
        const nome = e.perfil?.nome ?? '—'
        const isMe = e.user_id === userId
        return (
          <div
            key={e.id}
            className={`group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
              isMe
                ? e.confirmado_em
                  ? 'border-[var(--green-bright)]/30 bg-[var(--green-dim)]/15 text-[var(--green-bright)]'
                  : 'border-amber-500/30 bg-amber-500/5 text-amber-400'
                : 'border-[var(--border)] bg-[var(--card)]/50 text-[var(--foreground)]'
            }`}
          >
            <Initials nome={nome} size="sm" />
            <span className="truncate font-medium flex-1">{nome.split(' ')[0]}</span>
            {e.confirmado_em
              ? <CheckCircle2 className="h-3 w-3 shrink-0 text-[var(--green-bright)]" />
              : <span className="h-1.5 w-1.5 rounded-full bg-amber-400/50 shrink-0" />
            }
            {isCoord && (
              <button
                onClick={() => onRemove(e.id, nome)}
                title={`Remover ${nome}`}
                className="ml-0.5 flex h-5 w-5 items-center justify-center rounded shrink-0 text-[var(--muted-foreground)]/20 transition-colors hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-400/30"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )
      })}

      {isCoord && (
        <div className="relative">
          {picking && (
            <UserPicker
              perfis={available}
              onSelect={handleSelect}
              onClose={() => setPicking(false)}
            />
          )}
          {available.length > 0 && (
            <button
              onClick={() => setPicking(v => !v)}
              className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-2 py-1.5 text-[11px] font-medium text-[var(--muted-foreground)]/50 transition-all hover:border-[var(--green)]/50 hover:bg-[var(--green-dim)]/8 hover:text-[var(--green-bright)]"
            >
              <Plus className="h-3 w-3" />
              Atribuir
            </button>
          )}
          {available.length === 0 && escalasCell.length > 0 && (
            <p className="text-center text-[9px] text-[var(--muted-foreground)]/30 py-0.5">Todos atribuídos</p>
          )}
        </div>
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
  const [confirmedId, setConfirmedId] = useState<string | null>(null)
  const [removeDialog, setRemoveDialog] = useState<{ id: string; nome: string } | null>(null)

  const hoje = new Date().toISOString().slice(0, 10)
  const defaultDia = dias.find(d => d.data >= hoje)?.id ?? dias[0]?.id ?? ''
  const [diaAtivo, setDiaAtivo] = useState(defaultDia)

  function getCell(setorId: string, diaId: string) {
    return escalas.filter(e => e.setor_id === setorId && e.dia_id === diaId)
  }

  const minhasEscalas = escalas
    .filter(e => e.user_id === userId)
    .sort((a, b) => dias.findIndex(d => d.id === a.dia_id) - dias.findIndex(d => d.id === b.dia_id))

  // Cobertura da grade (dia ativo)
  const setoresComDelegado = setores.filter(s => getCell(s.id, diaAtivo).length > 0).length
  const setoresConfirmados = setores.filter(s => getCell(s.id, diaAtivo).some(e => e.confirmado_em)).length

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleAdd(setorId: string, diaId: string, uid: string) {
    const perfil = perfis.find(p => p.id === uid) ?? null
    const temp: Escala = {
      id: `temp-${Date.now()}`,
      setor_id: setorId, dia_id: diaId, user_id: uid,
      confirmado_em: null, criado_em: new Date().toISOString(),
      perfil: perfil ? { id: perfil.id, nome: perfil.nome } : null,
    }
    setEscalas(prev => [...prev, temp])
    startTransition(async () => {
      const res = await atribuirDelegado(setorId, diaId, uid)
      if (!res.ok) setEscalas(prev => prev.filter(e => e.id !== temp.id))
      else router.refresh()
    })
  }

  function handleRemoveRequest(id: string, nome: string) {
    setRemoveDialog({ id, nome })
  }

  function handleRemoveConfirm() {
    if (!removeDialog) return
    const { id } = removeDialog
    setRemoveDialog(null)
    setEscalas(prev => prev.filter(e => e.id !== id))
    startTransition(async () => {
      const res = await removerDelegado(id)
      if (!res.ok) router.refresh()
    })
  }

  function handleConfirmar(escalaId: string) {
    setConfirmingId(escalaId)
    startTransition(async () => {
      const res = await confirmarChegada(escalaId)
      setConfirmingId(null)
      if (res.ok) {
        setConfirmedId(escalaId)
        setEscalas(prev => prev.map(e =>
          e.id === escalaId ? { ...e, confirmado_em: new Date().toISOString() } : e
        ))
        setTimeout(() => setConfirmedId(null), 2000)
      }
    })
  }

  const diaAtivoData = dias.find(d => d.id === diaAtivo)

  return (
    <>
      {/* Dialogo de remoção */}
      {removeDialog && (
        <RemoveDialog
          nome={removeDialog.nome}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveDialog(null)}
        />
      )}

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confirmPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .confirm-pop { animation: confirmPop 350ms ease-out; }
      `}</style>

      <div className="space-y-8">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="cia-page-header">
          <p className="cia-page-header__eyebrow">Esportivo</p>
          <h1 className="cia-page-header__title">Escala de Delegados</h1>
          <p className="cia-page-header__subtitle">
            {isCoord
              ? 'Atribua delegados a cada praça por dia. O delegado recebe notificação e confirma a chegada pelo app.'
              : 'Sua escala para o evento. Confirme a chegada quando chegar à praça.'}
          </p>
        </div>

        {/* ── Minha Escala ───────────────────────────────────────────────── */}
        {minhasEscalas.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60">
              <UserCheck className="h-3.5 w-3.5" />
              Minha Escala
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {minhasEscalas.map(e => {
                const dia   = dias.find(d => d.id === e.dia_id)
                const setor = setores.find(s => s.id === e.setor_id)
                const isConfirming = confirmingId === e.id
                const justConfirmed = confirmedId === e.id
                return (
                  <div
                    key={e.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
                      justConfirmed ? 'confirm-pop' : ''
                    } ${
                      e.confirmado_em
                        ? 'border-[var(--green-bright)]/25 bg-[var(--green-dim)]/8'
                        : 'border-amber-500/25 bg-amber-500/4'
                    }`}
                  >
                    {/* Top accent bar */}
                    <div className={`absolute inset-x-0 top-0 h-0.5 ${
                      e.confirmado_em ? 'bg-gradient-to-r from-transparent via-[var(--green-bright)]/60 to-transparent' : 'bg-gradient-to-r from-transparent via-amber-400/50 to-transparent'
                    }`} />

                    <div className="mb-4">
                      {/* Dia */}
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50">
                        {dia?.nome_dia ?? '—'}
                      </p>
                      {/* Setor — hierarquia principal */}
                      <p className="flex items-center gap-2 text-base font-bold text-[var(--foreground)] leading-tight">
                        <MapPin className="h-4 w-4 shrink-0 text-[var(--green-bright)]" />
                        {setor?.nome ?? '—'}
                      </p>
                    </div>

                    {e.confirmado_em ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--green-bright)]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Confirmado às {fmtConfirmado(e.confirmado_em)}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConfirmar(e.id)}
                        disabled={isPending || !!isConfirming}
                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-2.5 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-500/15 hover:border-amber-400/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isConfirming
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <UserCheck className="h-4 w-4" />
                        }
                        {isConfirming ? 'Confirmando…' : 'Confirmar chegada'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Grade (coord/admin) ────────────────────────────────────────── */}
        {isCoord && (
          <section className="space-y-4">

            {/* Título + stats */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60">
                <Users className="h-3.5 w-3.5" />
                Grade de Delegados
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              </h2>
              {/* Cobertura do dia ativo */}
              <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]/60">
                <span>
                  <span className={`font-bold tabular-nums ${
                    setoresComDelegado === setores.length ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]'
                  }`}>{setoresComDelegado}</span>
                  /{setores.length} com delegado
                </span>
                {setoresComDelegado > 0 && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span>
                      <span className="font-bold tabular-nums text-[var(--green-bright)]">{setoresConfirmados}</span>
                      /{setoresComDelegado} confirmados
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Tabs de dias */}
            <div className="flex flex-wrap gap-2">
              {dias.map(dia => {
                const count = escalas.filter(e => e.dia_id === dia.id).length
                const isAtivo = diaAtivo === dia.id
                return (
                  <button
                    key={dia.id}
                    onClick={() => setDiaAtivo(dia.id)}
                    className={`relative flex min-h-[40px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      isAtivo
                        ? 'border-[var(--green-bright)]/35 bg-[var(--green-dim)]/15 text-[var(--green-bright)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]/50 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {dia.nome_dia}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${
                        isAtivo ? 'bg-[var(--green-bright)]/20 text-[var(--green-bright)]' : 'bg-[var(--border)]/60 text-[var(--muted-foreground)]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tabela */}
            {diaAtivoData && setores.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50 w-48">
                        Praça esportiva
                      </th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50">
                        Delegados — {diaAtivoData.nome_dia}
                      </th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50 w-36">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {setores.map((setor, i) => {
                      const cell = getCell(setor.id, diaAtivo)
                      const confirmed = cell.filter(e => e.confirmado_em).length
                      const isEmpty = cell.length === 0
                      return (
                        <tr
                          key={setor.id}
                          className={`border-b border-[var(--border)]/30 last:border-0 transition-colors ${
                            i % 2 === 1 ? 'bg-[var(--card)]/15' : ''
                          } hover:bg-[var(--green-dim)]/4`}
                        >
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--green-bright)]/50" />
                              {setor.nome}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <EscalaCell
                              setorId={setor.id}
                              diaId={diaAtivo}
                              escalasCell={cell}
                              perfis={perfis}
                              isCoord={isCoord}
                              userId={userId}
                              onAdd={handleAdd}
                              onRemove={handleRemoveRequest}
                            />
                          </td>
                          <td className="px-5 py-3 text-right">
                            {isEmpty ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[10px] font-semibold text-amber-500/60">
                                Vazio
                              </span>
                            ) : confirmed === cell.length ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--green-bright)]/25 bg-[var(--green-dim)]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--green-bright)]">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {confirmed}/{cell.length}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[var(--muted-foreground)]/60 tabular-nums">
                                {confirmed}/{cell.length}
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
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum setor cadastrado. Adicione em <span className="font-mono text-xs">/admin/competicao</span>.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Empty state operador sem escala */}
        {!isCoord && minhasEscalas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60">
              <MapPin className="h-6 w-6 text-[var(--muted-foreground)]/20" />
            </div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              Você ainda não foi escalado.
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]/50">
              O coordenador esportivo vai te atribuir em breve.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
