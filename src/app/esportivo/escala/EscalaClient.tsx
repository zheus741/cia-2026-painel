'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, MapPin, Clock, Plus, X, UserCheck,
  Loader2, AlertTriangle, Users, Search, Radio, ChevronDown, ChevronUp, ArrowRight,
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
export interface JogoEscala {
  id: string
  setor_id: string | null
  dia_id: string
  inicio: string | null
  status: string
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  modalidade: { nome: string; icone: string } | null
}

interface Props {
  setores:  Setor[]
  dias:     Dia[]
  escalas:  Escala[]
  perfis:   Perfil[]
  jogos:    JogoEscala[]
  isCoord:  boolean
  userId:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHora(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtRange(jogos: JogoEscala[]) {
  const horarios = jogos
    .map(j => j.inicio)
    .filter((v): v is string => !!v)
    .sort()
  if (horarios.length === 0) return null
  if (horarios.length === 1) return fmtHora(horarios[0])
  return `${fmtHora(horarios[0])} → ${fmtHora(horarios[horarios.length - 1])}`
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : nome.slice(0, 2)).toUpperCase()
}

// ── Remove dialog ─────────────────────────────────────────────────────────────

function RemoveDialog({ nome, onConfirm, onCancel }: {
  nome: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl" onClick={e => e.stopPropagation()} style={{ animation: 'popIn 150ms ease-out' }}>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">Remover delegado?</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">{nome}</span> será removido desta praça.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20">
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User picker dropdown ──────────────────────────────────────────────────────

function UserPicker({ perfis, onSelect, onClose }: {
  perfis: Perfil[]; onSelect: (id: string) => void; onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = perfis.filter(p => !query || p.nome.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={ref} className="absolute z-30 left-0 top-full mt-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden" style={{ animation: 'popIn 120ms ease-out' }}>
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]/40" />
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..." className="flex-1 bg-transparent text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none" />
      </div>
      <div className="max-h-44 overflow-y-auto py-1">
        {filtered.length === 0
          ? <p className="px-3 py-2 text-center text-xs text-[var(--muted-foreground)]/40">Nenhum resultado</p>
          : filtered.map(p => (
            <button key={p.id} onMouseDown={() => onSelect(p.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--green-dim)]/10 hover:text-[var(--green-bright)]">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-dim)]/40 text-[8px] font-bold text-[var(--green-bright)]">
                {getInitials(p.nome)}
              </span>
              <span className="truncate">{p.nome}</span>
            </button>
          ))
        }
      </div>
    </div>
  )
}

// ── Setor Card ────────────────────────────────────────────────────────────────

function SetorCard({ setor, diaId, escalasCell, jogosCell, perfis, isCoord, userId, highlighted, onAdd, onRemove }: {
  setor: Setor
  diaId: string
  escalasCell: Escala[]
  jogosCell: JogoEscala[]
  perfis: Perfil[]
  isCoord: boolean
  userId: string
  highlighted: boolean
  onAdd: (setorId: string, diaId: string, userId: string) => void
  onRemove: (escalaId: string, nome: string) => void
}) {
  const [picking, setPicking] = useState(false)
  const [expandJogos, setExpandJogos] = useState(highlighted) // já expande se vier por deep-link
  const assignedIds = new Set(escalasCell.map(e => e.user_id))
  const available = perfis.filter(p => !assignedIds.has(p.id))
  const confirmed = escalasCell.filter(e => e.confirmado_em).length
  const isEmpty = escalasCell.length === 0
  const allConfirmed = escalasCell.length > 0 && confirmed === escalasCell.length
  const range = fmtRange(jogosCell)
  const aoVivoCount = jogosCell.filter(j => j.status === 'ao_vivo').length

  return (
    <div
      id={`setor-${setor.id}`}
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition-all scroll-mt-24 ${
        highlighted
          ? 'border-[var(--green-bright)]/60 bg-[var(--green-dim)]/15 shadow-[0_0_24px_rgba(74,138,92,0.18)] ring-2 ring-[var(--green-bright)]/40'
          : allConfirmed
          ? 'border-[var(--green-bright)]/20 bg-[var(--green-dim)]/6'
          : isEmpty
          ? 'border-[var(--border)]/60 bg-[var(--card)]/30'
          : 'border-[var(--border)] bg-[var(--card)]/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold leading-tight text-[var(--foreground)]">
          <MapPin className="h-3 w-3 shrink-0 text-[var(--green-bright)]/60" />
          {setor.nome}
        </p>
        {/* Status badge */}
        {allConfirmed ? (
          <span className="shrink-0 flex items-center gap-1 rounded-full border border-[var(--green-bright)]/25 bg-[var(--green-dim)]/15 px-2 py-0.5 text-[9px] font-bold text-[var(--green-bright)]">
            <CheckCircle2 className="h-2.5 w-2.5" /> {confirmed}/{escalasCell.length}
          </span>
        ) : escalasCell.length > 0 ? (
          <span className="shrink-0 text-[9px] font-semibold tabular-nums text-[var(--muted-foreground)]/50">
            {confirmed}/{escalasCell.length}
          </span>
        ) : null}
      </div>

      {/* Delegate chips */}
      <div className="flex flex-wrap gap-1.5">
        {escalasCell.map(e => {
          const nome = e.perfil?.nome ?? '—'
          const firstName = nome.split(' ')[0]
          const isMe = e.user_id === userId
          return (
            <div key={e.id} className={`group flex items-center gap-1.5 rounded-full border pl-1.5 pr-1 py-0.5 text-[11px] font-medium transition-all ${
              e.confirmado_em
                ? 'border-[var(--green-bright)]/25 bg-[var(--green-dim)]/15 text-[var(--green-bright)]'
                : isMe
                ? 'border-amber-400/30 bg-amber-400/8 text-amber-400'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]'
            }`}>
              <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-bold ${
                e.confirmado_em ? 'bg-[var(--green-dim)]/40 text-[var(--green-bright)]' : 'bg-[var(--border)]/60 text-[var(--muted-foreground)]'
              }`}>
                {getInitials(nome)}
              </span>
              {firstName}
              {e.confirmado_em && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
              {isCoord && (
                <button
                  onClick={() => onRemove(e.id, nome)}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)]/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title={`Remover ${nome}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )
        })}

        {/* Add button — inline, chip-sized */}
        {isCoord && available.length > 0 && (
          <div className="relative">
            {picking && (
              <UserPicker perfis={available} onSelect={uid => { onAdd(setor.id, diaId, uid); setPicking(false) }} onClose={() => setPicking(false)} />
            )}
            <button
              onClick={() => setPicking(v => !v)}
              className="flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]/40 transition-all hover:border-[var(--green)]/50 hover:bg-[var(--green-dim)]/10 hover:text-[var(--green-bright)]"
            >
              <Plus className="h-2.5 w-2.5" />
              Atribuir
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && !isCoord && (
        <p className="text-[10px] text-[var(--muted-foreground)]/30">Sem delegado</p>
      )}

      {/* ── Footer: jogos da praça neste dia ────────────────────────────── */}
      {jogosCell.length > 0 ? (
        <div className="mt-1 border-t border-[var(--border)]/40 pt-2.5">
          <button
            onClick={() => setExpandJogos(v => !v)}
            className="group flex w-full items-center justify-between text-left transition-colors"
            aria-expanded={expandJogos}
          >
            <span className="flex items-center gap-2 text-[11px] font-medium text-[var(--muted-foreground)]/80 group-hover:text-[var(--foreground)]">
              {aoVivoCount > 0 ? (
                <Radio className="h-3 w-3 text-red-400 animate-pulse" />
              ) : (
                <Clock className="h-3 w-3 text-[var(--muted-foreground)]/40" />
              )}
              <span>
                <span className="font-semibold tabular-nums">{jogosCell.length}</span>
                {' '}{jogosCell.length === 1 ? 'jogo' : 'jogos'}
                {range && <span className="text-[var(--muted-foreground)]/40"> · {range}</span>}
              </span>
            </span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-[var(--muted-foreground)]/40 transition-transform ${expandJogos ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {/* Lista expandida */}
          {expandJogos && (
            <div className="mt-2 space-y-1" style={{ animation: 'popIn 150ms ease-out' }}>
              {jogosCell.map(j => {
                const aoVivo = j.status === 'ao_vivo'
                const encerrado = j.status === 'encerrado'
                return (
                  <Link
                    key={j.id}
                    href="/placar"
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)]/50 bg-[var(--card)]/40 px-2.5 py-1.5 text-[10.5px] transition-all hover:border-[var(--green)]/40 hover:bg-[var(--green-dim)]/8"
                    title="Ver no placar ao vivo"
                  >
                    <span className={`tabular-nums font-bold w-9 shrink-0 ${aoVivo ? 'text-red-400' : 'text-[var(--muted-foreground)]/60'}`}>
                      {j.inicio ? fmtHora(j.inicio) : '—'}
                    </span>
                    {aoVivo && <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse shrink-0" aria-label="Ao vivo" />}
                    <span className={`truncate flex-1 ${encerrado ? 'text-[var(--muted-foreground)]/50 line-through' : 'text-[var(--foreground)]'}`}>
                      {j.equipe_a_nome ?? '—'} <span className="text-[var(--muted-foreground)]/40">×</span> {j.equipe_b_nome ?? '—'}
                    </span>
                    {j.modalidade && (
                      <span className="shrink-0 text-[9px] text-[var(--muted-foreground)]/50">{j.modalidade.icone}</span>
                    )}
                  </Link>
                )
              })}
              <Link
                href="/placar"
                className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)]/40 px-2 py-1 text-[10px] font-semibold text-[var(--muted-foreground)]/40 transition-all hover:border-[var(--green)]/40 hover:text-[var(--green-bright)]"
              >
                Ver tudo no placar <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        // Praça sem jogos no dia — info discreta só pra contexto
        !isEmpty && (
          <div className="mt-1 border-t border-[var(--border)]/40 pt-2">
            <p className="text-[10px] text-[var(--muted-foreground)]/30 italic">Sem jogos agendados</p>
          </div>
        )
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function EscalaClient({ setores, dias, escalas: initialEscalas, perfis, jogos, isCoord, userId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [escalas, setEscalas] = useState<Escala[]>(initialEscalas)
  const [isPending, startTransition] = useTransition()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmedId, setConfirmedId] = useState<string | null>(null)
  const [removeDialog, setRemoveDialog] = useState<{ id: string; nome: string } | null>(null)
  const [busca, setBusca] = useState('')
  const [highlightedSetorId, setHighlightedSetorId] = useState<string | null>(null)

  // Honra ?dia=<uuid> da URL (deep-link de outras seções)
  const diaFromUrl = searchParams.get('dia')
  const hoje = new Date().toISOString().slice(0, 10)
  const defaultDia = (diaFromUrl && dias.some(d => d.id === diaFromUrl))
    ? diaFromUrl
    : (dias.find(d => d.data >= hoje)?.id ?? dias[0]?.id ?? '')
  const [diaAtivo, setDiaAtivo] = useState(defaultDia)

  // Deep-link: #setor-<id> → scroll + highlight + filtra busca pra encontrar
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    const match = /^#setor-([0-9a-f-]+)$/i.exec(hash)
    if (!match) return
    const setorId = match[1]
    // Limpa busca pra garantir que o setor seja renderizado
    setBusca('')
    setHighlightedSetorId(setorId)
    const timer = setTimeout(() => {
      const el = document.getElementById(`setor-${setorId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Remove highlight após 4s (mais lento que jogo pra dar tempo de ler)
      setTimeout(() => setHighlightedSetorId(null), 4000)
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  function getCell(setorId: string, diaId: string) {
    return escalas.filter(e => e.setor_id === setorId && e.dia_id === diaId)
  }
  function getJogosCell(setorId: string, diaId: string) {
    return jogos.filter(j => j.setor_id === setorId && j.dia_id === diaId)
  }

  const minhasEscalas = escalas
    .filter(e => e.user_id === userId)
    .sort((a, b) => dias.findIndex(d => d.id === a.dia_id) - dias.findIndex(d => d.id === b.dia_id))

  // Setores filtrados pela busca
  const setoresFiltrados = busca
    ? setores.filter(s => s.nome.toLowerCase().includes(busca.toLowerCase()))
    : setores

  // Stats do dia ativo
  const setoresComDelegado = setores.filter(s => getCell(s.id, diaAtivo).length > 0).length
  const setoresConfirmados = setores.filter(s => getCell(s.id, diaAtivo).every(e => e.confirmado_em) && getCell(s.id, diaAtivo).length > 0).length

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleAdd(setorId: string, diaId: string, uid: string) {
    const perfil = perfis.find(p => p.id === uid) ?? null
    const temp: Escala = {
      id: `temp-${Date.now()}`, setor_id: setorId, dia_id: diaId, user_id: uid,
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
        setEscalas(prev => prev.map(e => e.id === escalaId ? { ...e, confirmado_em: new Date().toISOString() } : e))
        setTimeout(() => setConfirmedId(null), 2000)
      }
    })
  }

  return (
    <>
      {removeDialog && (
        <RemoveDialog
          nome={removeDialog.nome}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveDialog(null)}
        />
      )}

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confirmPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(74,184,122,0); }
          50%     { box-shadow: 0 0 0 6px rgba(74,184,122,0.15); }
        }
        .confirm-anim { animation: confirmPulse 600ms ease-out; }
      `}</style>

      <div className="space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="cia-page-header">
          <p className="cia-page-header__eyebrow">Esportivo</p>
          <h1 className="cia-page-header__title">Escala de Delegados</h1>
          <p className="cia-page-header__subtitle">
            {isCoord
              ? 'Atribua delegados a cada praça por dia — o delegado recebe notificação e confirma chegada pelo app.'
              : 'Sua escala para o evento. Confirme a chegada quando chegar à praça.'}
          </p>
        </div>

        {/* ── Minha Escala ───────────────────────────────────────────────── */}
        {minhasEscalas.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60">
              <UserCheck className="h-3.5 w-3.5" /> Minha Escala
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {minhasEscalas.map(e => {
                const dia   = dias.find(d => d.id === e.dia_id)
                const setor = setores.find(s => s.id === e.setor_id)
                const jogosMeu = jogos.filter(j => j.setor_id === e.setor_id && j.dia_id === e.dia_id)
                const rangeMeu = fmtRange(jogosMeu)
                const aoVivoMeu = jogosMeu.some(j => j.status === 'ao_vivo')
                const isConfirming = confirmingId === e.id
                return (
                  <div
                    key={e.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                      confirmedId === e.id ? 'confirm-anim' : ''
                    } ${
                      e.confirmado_em
                        ? 'border-[var(--green-bright)]/25 bg-[var(--green-dim)]/8'
                        : 'border-amber-500/25 bg-amber-500/4'
                    }`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-0.5 ${
                      e.confirmado_em
                        ? 'bg-gradient-to-r from-transparent via-[var(--green-bright)]/50 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-amber-400/40 to-transparent'
                    }`} />

                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50">
                      {dia?.nome_dia ?? '—'}
                    </p>
                    <p className="mb-2 flex items-center gap-1.5 text-base font-bold text-[var(--foreground)]">
                      <MapPin className="h-4 w-4 shrink-0 text-[var(--green-bright)]" />
                      {setor?.nome ?? '—'}
                    </p>

                    {/* Info dos jogos da praça */}
                    {jogosMeu.length > 0 && (
                      <Link
                        href="/placar"
                        className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/40 px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--green)]/40 hover:text-[var(--green-bright)]"
                      >
                        {aoVivoMeu ? (
                          <Radio className="h-3 w-3 text-red-400 animate-pulse" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span className="tabular-nums font-semibold">{jogosMeu.length}</span>
                        {jogosMeu.length === 1 ? ' jogo' : ' jogos'}
                        {rangeMeu && <span className="opacity-60">· {rangeMeu}</span>}
                        <ArrowRight className="h-2.5 w-2.5 ml-0.5 opacity-50" />
                      </Link>
                    )}

                    {e.confirmado_em ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--green-bright)]">
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmado às {fmtHora(e.confirmado_em)}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConfirmar(e.id)}
                        disabled={isPending || !!isConfirming}
                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-500/15 active:scale-95 disabled:opacity-50"
                      >
                        {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
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
          <section className="space-y-5">

            {/* Topo: título + stats + busca */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60">
                  <Users className="h-3.5 w-3.5" />
                  Grade de Delegados
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                </h2>
                {/* Stats do dia ativo */}
                <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]/50">
                  <span className={`font-bold tabular-nums ${setoresComDelegado === setores.length ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]'}`}>
                    {setoresComDelegado}
                  </span>/{setores.length} preenchidas
                  {setoresComDelegado > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-bold tabular-nums text-[var(--green-bright)]">{setoresConfirmados}</span> confirmadas
                    </>
                  )}
                </div>
              </div>
              {/* Busca */}
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2 text-xs">
                <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)]/40" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Filtrar praças…"
                  className="w-36 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none"
                />
                {busca && (
                  <button onClick={() => setBusca('')} className="text-[var(--muted-foreground)]/40 hover:text-[var(--foreground)]">
                    <X className="h-3 w-3" />
                  </button>
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
                    className={`flex min-h-[40px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      isAtivo
                        ? 'border-[var(--green-bright)]/35 bg-[var(--green-dim)]/15 text-[var(--green-bright)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]/50 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {dia.nome_dia}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${
                        isAtivo ? 'bg-[var(--green-bright)]/20 text-[var(--green-bright)]' : 'bg-[var(--border)]/60 text-[var(--muted-foreground)]'
                      }`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Cards grid */}
            {setoresFiltrados.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {setoresFiltrados.map(setor => (
                  <SetorCard
                    key={setor.id}
                    setor={setor}
                    diaId={diaAtivo}
                    escalasCell={getCell(setor.id, diaAtivo)}
                    jogosCell={getJogosCell(setor.id, diaAtivo)}
                    perfis={perfis}
                    isCoord={isCoord}
                    userId={userId}
                    highlighted={highlightedSetorId === setor.id}
                    onAdd={handleAdd}
                    onRemove={(id, nome) => setRemoveDialog({ id, nome })}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhuma praça encontrada para "<span className="font-medium">{busca}</span>"
                </p>
              </div>
            )}
          </section>
        )}

        {/* Empty state operador */}
        {!isCoord && minhasEscalas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60">
              <MapPin className="h-6 w-6 text-[var(--muted-foreground)]/20" />
            </div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Você ainda não foi escalado.</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]/50">O coordenador esportivo vai te atribuir em breve.</p>
          </div>
        )}
      </div>
    </>
  )
}
