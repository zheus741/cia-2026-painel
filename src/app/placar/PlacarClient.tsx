'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Radio, CheckCircle2, XCircle, Minus, Plus, AlertCircle, ArrowUpRight, Zap } from 'lucide-react'
import { setJogoAoVivo, encerrarJogo, atualizarPlacar, cancelarJogo } from './actions'
import { getConferencia } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/client'

interface EquipeRef {
  slug: string
  divisao: string | null
  conferencia: string | null
  cor_primaria: string | null
  universidade: string | null
}

interface Jogo {
  id: string
  equipe_a_id: string | null
  equipe_b_id: string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  placar_a: number | null
  placar_b: number | null
  status: string
  inicio: string | null
  divisao: string | null
  fase: string | null
  categoria: string | null
  modalidade: { nome: string; icone: string } | null
  setor: { nome: string } | null
  equipe_a: EquipeRef | null
  equipe_b: EquipeRef | null
}

// ── Identity helpers ─────────────────────────────────────────────────────────

const DIV_COLORS: Record<string, string> = {
  '1ª Divisão': '#A67D14',
  '2ª Divisão': '#2e6b42',
  'Super 08':   '#D8845F',
}

const FASE_LABEL: Record<string, string> = {
  grupos:    'Grupos',
  oitavas:   'Oitavas',
  quartas:   'Quartas',
  semifinal: 'Semi',
  final:     'Final',
}

/** Cor do lado da equipe — usa conferência se houver, senão cor da divisão. */
function teamAccent(eq: EquipeRef | null, fallbackDiv: string | null): string {
  if (eq?.conferencia) {
    return getConferencia(eq.conferencia)?.cor ?? '#94a3b8'
  }
  const div = eq?.divisao ?? fallbackDiv
  if (div && DIV_COLORS[div]) return DIV_COLORS[div]
  return '#94a3b8'
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

/** Nome da equipe — link pra wiki se houver equipe_id, senão texto puro. */
function TeamName({ eq, fallback, accent }: { eq: EquipeRef | null; fallback: string | null; accent: string }) {
  const display = fallback ?? '—'
  if (!eq?.slug) {
    return (
      <p className="text-center text-sm font-semibold leading-snug">
        {display}
      </p>
    )
  }
  return (
    <Link
      href={`/atleticas/${eq.slug}`}
      className="group/team inline-flex flex-col items-center gap-0.5 text-center transition-colors"
      style={{ textDecoration: 'none' }}
    >
      <span className="inline-flex items-center gap-1 text-sm font-semibold leading-snug">
        {display}
        <ArrowUpRight
          className="h-3 w-3 opacity-0 transition-all group-hover/team:opacity-60"
          style={{ color: accent }}
        />
      </span>
      {eq.universidade && (
        <span className="text-[9.5px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]/60">
          {eq.universidade}
        </span>
      )}
    </Link>
  )
}

function PlacarCard({ jogo, onLocalUpdate, recentlyChanged }: {
  jogo: Jogo
  onLocalUpdate: (id: string, patch: Partial<Jogo>) => void
  recentlyChanged: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const placarA = jogo.placar_a ?? 0
  const placarB = jogo.placar_b ?? 0

  function adjustScore(team: 'a' | 'b', delta: number) {
    const na = team === 'a' ? Math.max(0, placarA + delta) : placarA
    const nb = team === 'b' ? Math.max(0, placarB + delta) : placarB
    onLocalUpdate(jogo.id, { placar_a: na, placar_b: nb })
    startTransition(async () => {
      await atualizarPlacar(jogo.id, na, nb)
    })
  }

  function handleAoVivo() {
    onLocalUpdate(jogo.id, { status: 'ao_vivo', placar_a: 0, placar_b: 0 })
    startTransition(async () => { await setJogoAoVivo(jogo.id) })
  }

  function handleEncerrar() {
    onLocalUpdate(jogo.id, { status: 'encerrado' })
    startTransition(async () => { await encerrarJogo(jogo.id) })
  }

  function handleCancelar() {
    onLocalUpdate(jogo.id, { status: 'cancelado' })
    startTransition(async () => { await cancelarJogo(jogo.id) })
  }

  const isAoVivo = jogo.status === 'ao_vivo'
  const isEncerrado = jogo.status === 'encerrado'
  const isCancelado = jogo.status === 'cancelado'
  const isAgendado = jogo.status === 'agendado'

  // Identity
  const accentA = teamAccent(jogo.equipe_a, jogo.divisao)
  const accentB = teamAccent(jogo.equipe_b, jogo.divisao)
  const divisaoLabel = jogo.divisao ?? jogo.equipe_a?.divisao ?? jogo.equipe_b?.divisao ?? null
  const divisaoColor = divisaoLabel ? DIV_COLORS[divisaoLabel] : null
  const faseLabel = jogo.fase ? (FASE_LABEL[jogo.fase] ?? jogo.fase) : null
  const confMeta = jogo.equipe_a?.conferencia ? getConferencia(jogo.equipe_a.conferencia) : null

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
      isAoVivo
        ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/10 shadow-[0_0_20px_rgba(74,138,92,0.08)]'
        : isEncerrado
        ? 'border-[var(--border)]/50 bg-[var(--card)]/40 opacity-70'
        : isCancelado
        ? 'border-red-800/30 bg-red-900/10 opacity-50'
        : 'border-[var(--border)] bg-[var(--card)]/60'
    }`}>
      {isAoVivo && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-[var(--green-bright)] animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--green-bright)]">Ao vivo</span>
        </div>
      )}

      {/* Pulse de update remoto */}
      {recentlyChanged && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[var(--green-bright)]/50 animate-[pulse_1.2s_ease-out_1]"
          style={{ boxShadow: '0 0 24px rgba(106,184,126,0.25)' }}
        />
      )}
      {recentlyChanged && (
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[var(--green-dim)]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--green-bright)]">
          <Zap className="h-2.5 w-2.5" />
          Sync
        </div>
      )}

      {/* Meta + identity badges */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
        {jogo.inicio && <span className="tabular-nums">{fmtTime(jogo.inicio)}</span>}
        {jogo.modalidade && (
          <>
            <span>·</span>
            <span>{jogo.modalidade.icone} {jogo.modalidade.nome}</span>
          </>
        )}
        {jogo.categoria && (
          <>
            <span>·</span>
            <span>{jogo.categoria}</span>
          </>
        )}
        {jogo.setor && (
          <>
            <span>·</span>
            <span>{jogo.setor.nome}</span>
          </>
        )}

        {/* Divisão badge */}
        {divisaoLabel && divisaoColor && (
          <span
            className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{
              background: `${divisaoColor}22`,
              color: divisaoColor,
              border: `1px solid ${divisaoColor}44`,
            }}
          >
            {divisaoLabel}
          </span>
        )}

        {/* Conferência badge (Super 08) */}
        {confMeta && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{
              background: `${confMeta.cor}22`,
              color: confMeta.cor,
              border: `1px solid ${confMeta.cor}44`,
            }}
          >
            <span>{confMeta.icone}</span>
            {confMeta.nome}
          </span>
        )}

        {/* Fase */}
        {faseLabel && (
          <span className="inline-flex items-center rounded-full bg-[var(--card)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] border border-[var(--border)]">
            {faseLabel}
          </span>
        )}

        {isEncerrado && (
          <>
            <span>·</span>
            <span className="text-[var(--muted-foreground)]/60">Encerrado</span>
          </>
        )}
        {isCancelado && (
          <>
            <span>·</span>
            <span className="text-red-400">Cancelado</span>
          </>
        )}
      </div>

      {/* Placar */}
      <div className="relative flex items-stretch gap-3">

        {/* Equipe A */}
        <div className="relative flex flex-1 flex-col items-center gap-2 pl-3">
          {/* color stripe */}
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
            style={{ background: accentA }}
          />
          <TeamName eq={jogo.equipe_a} fallback={jogo.equipe_a_nome} accent={accentA} />
          {(isAoVivo || isEncerrado) && (
            <div className="flex items-center gap-1">
              {isAoVivo && (
                <button
                  onClick={() => adjustScore('a', -1)}
                  disabled={isPending || placarA === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--green)] hover:text-[var(--green-bright)] disabled:opacity-30"
                >
                  <Minus className="h-3 w-3" />
                </button>
              )}
              <span className={`tabular-nums font-bold ${isAoVivo ? 'text-3xl' : 'text-2xl text-[var(--muted-foreground)]'}`}>
                {placarA}
              </span>
              {isAoVivo && (
                <button
                  onClick={() => adjustScore('a', 1)}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--green)] hover:text-[var(--green-bright)] disabled:opacity-30"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* VS / X */}
        <div className="shrink-0 self-center text-lg font-bold text-[var(--muted-foreground)]/40">×</div>

        {/* Equipe B */}
        <div className="relative flex flex-1 flex-col items-center gap-2 pr-3">
          {/* color stripe */}
          <span
            aria-hidden
            className="absolute right-0 top-0 bottom-0 w-[3px] rounded-full"
            style={{ background: accentB }}
          />
          <TeamName eq={jogo.equipe_b} fallback={jogo.equipe_b_nome} accent={accentB} />
          {(isAoVivo || isEncerrado) && (
            <div className="flex items-center gap-1">
              {isAoVivo && (
                <button
                  onClick={() => adjustScore('b', -1)}
                  disabled={isPending || placarB === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--green)] hover:text-[var(--green-bright)] disabled:opacity-30"
                >
                  <Minus className="h-3 w-3" />
                </button>
              )}
              <span className={`tabular-nums font-bold ${isAoVivo ? 'text-3xl' : 'text-2xl text-[var(--muted-foreground)]'}`}>
                {placarB}
              </span>
              {isAoVivo && (
                <button
                  onClick={() => adjustScore('b', 1)}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--green)] hover:text-[var(--green-bright)] disabled:opacity-30"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Aviso: equipe sem vínculo */}
      {(!jogo.equipe_a_id || !jogo.equipe_b_id) && jogo.equipe_a_nome && jogo.equipe_b_nome && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>Equipe sem vínculo — corrija em /admin/competicao</span>
        </div>
      )}

      {/* Ações */}
      {!isEncerrado && !isCancelado && (
        <div className="mt-4 flex gap-2">
          {isAgendado && (
            <button
              onClick={handleAoVivo}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--green-dim)] py-2 text-xs font-semibold text-[var(--green-bright)] transition-colors hover:bg-[var(--green)] hover:text-black disabled:opacity-40"
            >
              <Radio className="h-3.5 w-3.5" />
              Iniciar
            </button>
          )}
          {isAoVivo && (
            <button
              onClick={handleEncerrar}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--green-dim)]/40 bg-[var(--card)] py-2 text-xs font-semibold text-[var(--green-bright)] transition-colors hover:bg-[var(--green-dim)]/20 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Encerrar
            </button>
          )}
          <button
            onClick={handleCancelar}
            disabled={isPending}
            className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:border-red-700/40 hover:text-red-400 disabled:opacity-30"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

interface Props {
  dias: { id: string; nome_dia: string; data: string }[]
  jogosPorDia: Record<string, Jogo[]>
  diaAtivo: string
}

// Campos escalares que o realtime pode atualizar in-place (sem perder joins).
const REALTIME_MERGEABLE: (keyof Jogo)[] = [
  'status', 'placar_a', 'placar_b',
  'equipe_a_nome', 'equipe_b_nome',
  'inicio', 'fase', 'categoria', 'divisao',
]

export function PlacarBoard({ dias, jogosPorDia: initialJogosPorDia, diaAtivo }: Props) {
  const router = useRouter()
  const [jogosPorDia, setJogosPorDia] = useState(initialJogosPorDia)
  const [diaId, setDiaId] = useState(diaAtivo)
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set())
  const [conectado, setConectado] = useState(false)

  const lastLocalChangeRef = useRef<Map<string, number>>(new Map())

  // Quando server re-renderiza (router.refresh), sincroniza state local
  useEffect(() => {
    setJogosPorDia(initialJogosPorDia)
  }, [initialJogosPorDia])

  // Helper: aplica patch local em um jogo (otimístico ou via realtime)
  const handleLocalUpdate = useCallback((id: string, patch: Partial<Jogo>) => {
    lastLocalChangeRef.current.set(id, Date.now())
    setJogosPorDia(prev => {
      let changed = false
      const next: typeof prev = {}
      for (const dia of Object.keys(prev)) {
        const list = prev[dia]
        const idx = list.findIndex(j => j.id === id)
        if (idx >= 0) {
          next[dia] = [...list.slice(0, idx), { ...list[idx], ...patch }, ...list.slice(idx + 1)]
          changed = true
        } else {
          next[dia] = list
        }
      }
      return changed ? next : prev
    })
  }, [])

  // Helper: flag um jogo como "atualizado agora" por 1.5s
  const flashRecent = useCallback((id: string) => {
    setRecentIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setTimeout(() => {
      setRecentIds(prev => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 1500)
  }, [])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => { router.refresh() }, 1000)
    }

    const channel = supabase
      .channel('placar-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jogos',
      }, (payload) => {
        const newRow = payload.new as Partial<Jogo> & { id: string }
        const oldRow = payload.old as Partial<Jogo>

        // Mudança de equipe/modalidade/setor/dia → precisa re-fetch pros joins
        if (
          newRow.equipe_a_id !== oldRow.equipe_a_id ||
          newRow.equipe_b_id !== oldRow.equipe_b_id
        ) {
          scheduleRefresh()
          return
        }

        // Detecta mudança real (ignora echo da nossa própria edição < 800ms)
        const lastLocal = lastLocalChangeRef.current.get(newRow.id) ?? 0
        const wasRecentLocal = Date.now() - lastLocal < 800

        // Aplica patch escalar
        const patch: Partial<Jogo> = {}
        for (const key of REALTIME_MERGEABLE) {
          if (newRow[key] !== undefined) {
            (patch as Record<string, unknown>)[key] = newRow[key]
          }
        }
        handleLocalUpdate(newRow.id, patch)

        // Flash visual só se mudança veio de fora
        if (!wasRecentLocal) {
          flashRecent(newRow.id)
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'jogos',
      }, () => { scheduleRefresh() })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'jogos',
      }, () => { scheduleRefresh() })
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
      })

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      supabase.removeChannel(channel)
    }
  }, [router, handleLocalUpdate, flashRecent])

  const jogos = jogosPorDia[diaId] ?? []
  const aoVivo = jogos.filter((j) => j.status === 'ao_vivo').length
  const agendados = jogos.filter((j) => j.status === 'agendado').length
  const encerrados = jogos.filter((j) => j.status === 'encerrado').length

  return (
    <div className="space-y-6">
      {/* Tabs de dias */}
      <div className="flex flex-wrap gap-2">
        {dias.map((dia) => {
          const jogsDia = jogosPorDia[dia.id] ?? []
          const vivo = jogsDia.some((j) => j.status === 'ao_vivo')
          return (
            <button
              key={dia.id}
              onClick={() => setDiaId(dia.id)}
              className={`relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                diaId === dia.id
                  ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/20 text-[var(--green-bright)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)] hover:text-[var(--foreground)]'
              }`}
            >
              {vivo && (
                <span className="h-2 w-2 rounded-full bg-[var(--green-bright)] shadow-[0_0_6px_rgba(106,184,126,0.8)] animate-pulse" />
              )}
              {dia.nome_dia}
              <span className="text-[10px] text-[var(--muted-foreground)]">{jogsDia.length}</span>
            </button>
          )
        })}
      </div>

      {/* Stats rápidas + status realtime */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {aoVivo > 0 && (
          <span className="flex items-center gap-1.5 font-semibold text-[var(--green-bright)]">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            {aoVivo} ao vivo
          </span>
        )}
        <span className="text-[var(--muted-foreground)]">{agendados} agendados</span>
        <span className="text-[var(--muted-foreground)]">{encerrados} encerrados</span>

        {/* Indicador de realtime */}
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            conectado
              ? 'border-[var(--green-bright)]/30 bg-[var(--green-dim)]/10 text-[var(--green-bright)]'
              : 'border-[var(--border)] bg-[var(--card)]/40 text-[var(--muted-foreground)]'
          }`}
          title={conectado ? 'Sincronizado em tempo real' : 'Conectando...'}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              conectado ? 'bg-[var(--green-bright)] animate-pulse' : 'bg-[var(--muted-foreground)]/50'
            }`}
          />
          {conectado ? 'Tempo real' : 'Conectando'}
        </span>
      </div>

      {/* Grid de jogos */}
      {jogos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum jogo neste dia.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jogos.map((jogo) => (
            <PlacarCard
              key={jogo.id}
              jogo={jogo}
              onLocalUpdate={handleLocalUpdate}
              recentlyChanged={recentIds.has(jogo.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
