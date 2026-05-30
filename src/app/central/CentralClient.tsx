'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useRealtimeRevival } from '@/lib/supabase/use-realtime-revival'
import { uniqueChannel } from '@/lib/supabase/channel-name'
import { CONFERENCIAS } from '@/lib/conferencias'
import {
  Search, Radio, X, ChevronDown, ChevronRight,
  Trophy, MapPin, Layers, Users2, Zap,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EquipeRef {
  nome: string | null
  slug: string
  divisao: string | null
  conferencia: string | null
  cor_primaria: string | null
  universidade: string | null
  logo_url: string | null
}

export interface Jogo {
  id: string
  equipe_a_id: string | null
  equipe_b_id: string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  placar_a: number | null
  placar_b: number | null
  status: string
  wo: 'a' | 'b' | 'duplo' | null
  inicio: string | null
  divisao: string | null
  fase: string | null
  categoria: string | null
  teste: boolean | null
  modalidade: { nome: string; icone: string; slug: string } | null
  setor: { nome: string } | null
  equipe_a: EquipeRef | null
  equipe_b: EquipeRef | null
}

type Eixo = 'divisao' | 'conferencia' | 'praca' | 'modalidade'
type StatusFiltro = 'todos' | 'ao_vivo' | 'encerrado' | 'agendado'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function getGroupKey(jogo: Jogo, eixo: Eixo): string {
  switch (eixo) {
    case 'divisao':
      return jogo.divisao ?? jogo.equipe_a?.divisao ?? jogo.equipe_b?.divisao ?? 'Sem divisão'
    case 'conferencia': {
      const conf = jogo.equipe_a?.conferencia ?? jogo.equipe_b?.conferencia
      if (conf) return conf
      const div = jogo.divisao ?? jogo.equipe_a?.divisao ?? jogo.equipe_b?.divisao ?? ''
      return div || 'Sem conferência'
    }
    case 'praca':
      return jogo.setor?.nome ?? 'Sem praça'
    case 'modalidade':
      return jogo.modalidade?.nome ?? 'Sem modalidade'
  }
}

function eixoOrder(key: string, eixo: Eixo): number {
  if (eixo === 'divisao') {
    const map: Record<string, number> = { '1ª Divisão': 0, '2ª Divisão': 1, 'Super 08': 2 }
    return map[key] ?? 99
  }
  if (eixo === 'conferencia') {
    const c = CONFERENCIAS.find(c => c.nome === key)
    return c ? 10 + c.ordem : 0
  }
  return 0
}

function statusOrder(s: string): number {
  return s === 'ao_vivo' ? 0 : s === 'agendado' ? 1 : 2
}

function getConferenciaColor(nome: string): string {
  return CONFERENCIAS.find(c => c.nome === nome)?.cor ?? 'var(--green-bright)'
}

// Nome preferido: equipe_a.nome (do banco equipes) ou fallback equipe_a_nome
function nomeEquipe(jogo: Jogo, lado: 'a' | 'b'): string {
  const ref  = lado === 'a' ? jogo.equipe_a : jogo.equipe_b
  const nome = lado === 'a' ? jogo.equipe_a_nome : jogo.equipe_b_nome
  return ref?.nome ?? nome ?? '—'
}

// ── GameRow ───────────────────────────────────────────────────────────────────

function GameRow({ jogo, highlight }: { jogo: Jogo; highlight?: boolean }) {
  const aoVivo  = jogo.status === 'ao_vivo'
  const ended   = jogo.status === 'encerrado'
  const hasScore = jogo.placar_a != null && jogo.placar_b != null

  const nomeA = nomeEquipe(jogo, 'a')
  const nomeB = nomeEquipe(jogo, 'b')
  const corA  = jogo.equipe_a?.cor_primaria
  const corB  = jogo.equipe_b?.cor_primaria

  const winA = hasScore && (jogo.placar_a! > jogo.placar_b!)
  const winB = hasScore && (jogo.placar_b! > jogo.placar_a!)

  // WO overrides
  const woA = jogo.wo === 'a'
  const woB = jogo.wo === 'b'
  const woBoth = jogo.wo === 'duplo'

  const phase = jogo.fase
    ? jogo.fase.charAt(0).toUpperCase() + jogo.fase.slice(1).replace('_', ' ')
    : null

  return (
    <div
      className="group relative flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all"
      style={{
        background: highlight ? 'rgba(34,197,94,0.06)' : 'transparent',
        border: '1px solid',
        borderColor: aoVivo ? 'rgba(34,197,94,0.25)' : 'var(--border)',
      }}
    >
      {/* live pulse */}
      {aoVivo && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-0.5 rounded-full bg-[var(--green-bright)] animate-pulse" />
      )}

      {/* Modalidade icon */}
      <span className="shrink-0 text-base leading-none" title={jogo.modalidade?.nome ?? ''}>
        {jogo.modalidade?.icone ?? '🏅'}
      </span>

      {/* Teams + score */}
      <div className="min-w-0 flex-1">
        {/* Team A */}
        <div className="flex items-center gap-1.5">
          {corA && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: corA }} />
          )}
          <span
            className="truncate text-[13px] font-semibold leading-tight"
            style={{ color: ended && winA && !woA ? 'var(--green)' : ended && woA ? 'var(--muted-foreground)' : 'var(--foreground)' }}
          >
            {nomeA}
          </span>
          {woA && <span className="ml-0.5 rounded bg-red-100 px-1 py-px text-[9px] font-bold uppercase text-red-600">W.O.</span>}
          {woBoth && <span className="ml-0.5 rounded bg-red-100 px-1 py-px text-[9px] font-bold uppercase text-red-600">W.O.</span>}
        </div>
        {/* Team B */}
        <div className="mt-0.5 flex items-center gap-1.5">
          {corB && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: corB }} />
          )}
          <span
            className="truncate text-[13px] font-semibold leading-tight"
            style={{ color: ended && winB && !woB ? 'var(--green)' : ended && woB ? 'var(--muted-foreground)' : 'var(--foreground)' }}
          >
            {nomeB}
          </span>
          {woB && <span className="ml-0.5 rounded bg-red-100 px-1 py-px text-[9px] font-bold uppercase text-red-600">W.O.</span>}
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right min-w-[52px]">
        {hasScore ? (
          <>
            <div
              className="text-[16px] font-extrabold tabular-nums leading-tight"
              style={{ color: ended && winA ? 'var(--green)' : aoVivo ? 'var(--foreground)' : 'var(--muted-foreground)' }}
            >
              {jogo.placar_a}
            </div>
            <div
              className="text-[16px] font-extrabold tabular-nums leading-tight"
              style={{ color: ended && winB ? 'var(--green)' : aoVivo ? 'var(--foreground)' : 'var(--muted-foreground)' }}
            >
              {jogo.placar_b}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-[var(--muted-foreground)] font-mono tabular-nums">
            {fmtTime(jogo.inicio)}
          </div>
        )}
      </div>

      {/* Status tag */}
      <div className="shrink-0 w-[60px] text-right">
        {aoVivo ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bright)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        ) : ended ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            {phase ?? 'Enc.'}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
            {jogo.setor?.nome ? (
              <span className="flex items-center justify-end gap-0.5">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-[50px]">{jogo.setor.nome}</span>
              </span>
            ) : fmtTime(jogo.inicio)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── GroupBlock ────────────────────────────────────────────────────────────────

function GroupBlock({
  label, eixo, jogos, highlightIds, defaultOpen,
}: {
  label: string
  eixo: Eixo
  jogos: Jogo[]
  highlightIds: Set<string>
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const aoVivo = jogos.filter(j => j.status === 'ao_vivo').length
  const enc    = jogos.filter(j => j.status === 'encerrado').length
  const agen   = jogos.filter(j => j.status === 'agendado').length

  // conference color for header accent
  const accentColor = eixo === 'conferencia' ? getConferenciaColor(label) : undefined

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--muted)]/30 text-left"
      >
        {/* Color stripe for conferences */}
        {accentColor && (
          <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: accentColor }} />
        )}

        <span
          className="flex-1 text-[12px] font-extrabold uppercase tracking-widest"
          style={{ color: accentColor ?? 'var(--foreground)' }}
        >
          {label}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1.5">
          {aoVivo > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bright)] px-2 py-0.5 text-[9px] font-bold text-white">
              <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
              {aoVivo} live
            </span>
          )}
          {enc > 0 && (
            <span className="inline-flex rounded-full bg-[var(--muted)] px-2 py-0.5 text-[9px] font-bold text-[var(--muted-foreground)]">
              {enc} enc.
            </span>
          )}
          {agen > 0 && (
            <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-medium text-[var(--muted-foreground)]">
              {agen} ag.
            </span>
          )}
          <span className="text-[var(--muted-foreground)]">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        </div>
      </button>

      {/* Games */}
      {open && (
        <div className="space-y-1.5 px-3 pb-3">
          {jogos.map(j => (
            <GameRow
              key={j.id}
              jogo={j}
              highlight={highlightIds.has(j.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── AtleticaFocus ─────────────────────────────────────────────────────────────

function AtleticaFocus({ atletica, jogos, onClear }: {
  atletica: string
  jogos: Jogo[]
  onClear: () => void
}) {
  const ordered = [...jogos].sort((a, b) => statusOrder(a.status) - statusOrder(b.status))
  const aoVivo = jogos.filter(j => j.status === 'ao_vivo').length
  const vitorias = jogos.filter(j => {
    if (j.status !== 'encerrado') return false
    const norm = normalize(atletica)
    const nA = normalize(nomeEquipe(j, 'a'))
    const nB = normalize(nomeEquipe(j, 'b'))
    const isA = nA.includes(norm) || norm.includes(nA.split(' ')[0] ?? '')
    const isB = nB.includes(norm) || norm.includes(nB.split(' ')[0] ?? '')
    const lado = isA ? 'a' : isB ? 'b' : null
    if (!lado) return false
    if (j.wo === lado) return false
    if (j.wo && j.wo !== lado && j.wo !== 'duplo') return true
    const pa = j.placar_a ?? 0, pb = j.placar_b ?? 0
    return lado === 'a' ? pa > pb : pb > pa
  }).length

  // find conference / divisao from teams
  const ref = jogos[0]
  const equipeRef = ref
    ? (normalize(nomeEquipe(ref, 'a')).includes(normalize(atletica.split(' ')[0] ?? '')) ? ref.equipe_a : ref.equipe_b)
    : null
  const conf = equipeRef?.conferencia
  const div  = equipeRef?.divisao

  return (
    <div className="rounded-2xl border-2 border-[var(--green-bright)] bg-[var(--card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-[var(--border)]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--green)]">
            Modo Foco
          </p>
          <h2 className="mt-0.5 text-[17px] font-extrabold leading-tight text-[var(--foreground)] truncate">
            {atletica}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
            {div && <span>{div}</span>}
            {conf && (
              <span className="font-semibold" style={{ color: getConferenciaColor(conf) }}>
                {conf}
              </span>
            )}
            <span>{jogos.length} {jogos.length === 1 ? 'jogo' : 'jogos'}</span>
            <span>{vitorias} {vitorias === 1 ? 'vitória' : 'vitórias'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {aoVivo > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bright)] px-2.5 py-1 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              AO VIVO
            </span>
          )}
          <button
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--border)]"
            aria-label="Fechar foco"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Games */}
      <div className="space-y-1.5 p-3">
        {ordered.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
            Nenhum jogo encontrado para esta atlética.
          </p>
        ) : (
          ordered.map(j => <GameRow key={j.id} jogo={j} highlight />)
        )}
      </div>
    </div>
  )
}

// ── CentralClient (main) ──────────────────────────────────────────────────────

const EIXOS: { key: Eixo; label: string; icon: typeof Trophy }[] = [
  { key: 'divisao',     label: 'Divisão',     icon: Trophy },
  { key: 'conferencia', label: 'Conferência', icon: Layers },
  { key: 'praca',       label: 'Praça',       icon: MapPin },
  { key: 'modalidade',  label: 'Modalidade',  icon: Zap },
]

const REALTIME_FIELDS: (keyof Jogo)[] = [
  'status', 'placar_a', 'placar_b', 'wo',
]

export function CentralClient({ jogos: initial }: { jogos: Jogo[] }) {
  const router = useRouter()
  const [jogos, setJogos] = useState<Jogo[]>(initial)
  const [eixo, setEixo] = useState<Eixo>('divisao')
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos')
  const [busca, setBusca] = useState('')
  const [atleticaFoco, setAtleticaFoco] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends (...a: never[]) => infer R ? R : never>(null as never)
  useRealtimeRevival(channelRef as never, () => router.refresh())

  // Sync when server re-renders
  useEffect(() => { setJogos(initial) }, [initial])

  // Realtime patches
  const handlePatch = useCallback((id: string, patch: Partial<Jogo>) => {
    setJogos(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let timeout: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => router.refresh(), 1200)
    }

    const ch = supabase
      .channel(uniqueChannel('central-realtime'))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jogos' }, payload => {
        const row = payload.new as Partial<Jogo> & { id: string }
        const patch: Partial<Jogo> = {}
        for (const k of REALTIME_FIELDS) {
          if ((row as Record<string, unknown>)[k as string] !== undefined)
            (patch as Record<string, unknown>)[k as string] = (row as Record<string, unknown>)[k as string]
        }
        handlePatch(row.id, patch)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jogos' }, () => scheduleRefresh())
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setTimeout(() => ch.subscribe(), 2000)
        }
      })

    channelRef.current = ch as never

    return () => {
      if (timeout) clearTimeout(timeout)
      supabase.removeChannel(ch)
    }
  }, [router, handlePatch])

  // ── Derived state ──────────────────────────────────────────────────────────

  const aoVivoCount = useMemo(() => jogos.filter(j => j.status === 'ao_vivo').length, [jogos])

  // Atlética suggestions (debounced)
  const atleticasSugeridas = useMemo(() => {
    if (!busca || busca.length < 2) return []
    const q = normalize(busca)
    const seen = new Set<string>()
    const out: string[] = []
    for (const j of jogos) {
      for (const nome of [nomeEquipe(j, 'a'), nomeEquipe(j, 'b')]) {
        if (!nome || seen.has(nome)) continue
        seen.add(nome)
        if (normalize(nome).includes(q)) out.push(nome)
      }
    }
    return out.sort().slice(0, 8)
  }, [busca, jogos])

  // Jogos da atlética em foco
  const jogosFoco = useMemo(() => {
    if (!atleticaFoco) return []
    const q = normalize(atleticaFoco)
    return jogos.filter(j => {
      const nA = normalize(nomeEquipe(j, 'a'))
      const nB = normalize(nomeEquipe(j, 'b'))
      return nA === q || nB === q || nA.includes(q) || nB.includes(q)
    })
  }, [atleticaFoco, jogos])

  // Filtered + grouped jogos
  const grouped = useMemo(() => {
    let filtered = jogos.filter(j => {
      if (j.teste) return false
      if (statusFiltro === 'ao_vivo')   return j.status === 'ao_vivo'
      if (statusFiltro === 'encerrado') return j.status === 'encerrado'
      if (statusFiltro === 'agendado')  return j.status === 'agendado'
      return true
    })

    // If searching without foco, filter inline
    if (busca && !atleticaFoco) {
      const q = normalize(busca)
      filtered = filtered.filter(j =>
        normalize(nomeEquipe(j, 'a')).includes(q) ||
        normalize(nomeEquipe(j, 'b')).includes(q) ||
        normalize(j.modalidade?.nome ?? '').includes(q) ||
        normalize(j.setor?.nome ?? '').includes(q),
      )
    }

    const map = new Map<string, Jogo[]>()
    for (const j of filtered) {
      const key = getGroupKey(j, eixo)
      const arr = map.get(key) ?? []
      arr.push(j)
      map.set(key, arr)
    }

    // Sort games within each group
    for (const [k, arr] of map) {
      arr.sort((a, b) => statusOrder(a.status) - statusOrder(b.status) || (a.inicio ?? '').localeCompare(b.inicio ?? ''))
      map.set(k, arr)
    }

    // Sort groups
    return Array.from(map.entries()).sort(([kA], [kB]) => {
      const diff = eixoOrder(kA, eixo) - eixoOrder(kB, eixo)
      return diff !== 0 ? diff : kA.localeCompare(kB)
    })
  }, [jogos, eixo, statusFiltro, busca, atleticaFoco])

  const highlightIds = useMemo(() => {
    if (!atleticaFoco) return new Set<string>()
    return new Set(jogosFoco.map(j => j.id))
  }, [atleticaFoco, jogosFoco])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--green-dim)] text-[var(--green)]">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-[var(--foreground)]">
            Central de Jogos
          </h1>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            {jogos.length} jogos · {aoVivoCount > 0 ? (
              <span className="font-semibold text-[var(--green)]">{aoVivoCount} ao vivo agora</span>
            ) : 'nenhum ao vivo'}
          </p>
        </div>
        {aoVivoCount > 0 && (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--green-bright)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <Radio className="h-3 w-3 animate-pulse" />
            {aoVivoCount} Live
          </span>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); if (!e.target.value) setAtleticaFoco(null) }}
          placeholder="Buscar atlética, modalidade…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-9 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--green-bright)] focus:ring-2 focus:ring-[var(--green-bright)]/20 transition-all"
        />
        {busca && (
          <button
            onClick={() => { setBusca(''); setAtleticaFoco(null) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Suggestions dropdown */}
        {atleticasSugeridas.length > 0 && !atleticaFoco && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
            {atleticasSugeridas.map(nome => (
              <button
                key={nome}
                onClick={() => { setAtleticaFoco(nome); setBusca(nome) }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--muted)]/50"
              >
                <Users2 className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                <span className="truncate font-medium text-[var(--foreground)]">{nome}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Atlética foco ──────────────────────────────────────────────────── */}
      {atleticaFoco && (
        <AtleticaFocus
          atletica={atleticaFoco}
          jogos={jogosFoco}
          onClear={() => { setAtleticaFoco(null); setBusca('') }}
        />
      )}

      {/* ── Status pills ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: 'todos',      label: 'Todos' },
          { key: 'ao_vivo',    label: '● Ao Vivo' },
          { key: 'agendado',   label: 'Agendados' },
          { key: 'encerrado',  label: 'Encerrados' },
        ] as { key: StatusFiltro; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFiltro(key)}
            className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: statusFiltro === key
                ? key === 'ao_vivo' ? 'var(--green-bright)' : 'var(--foreground)'
                : 'var(--muted)',
              color: statusFiltro === key ? '#fff' : 'var(--muted-foreground)',
              border: '1px solid',
              borderColor: statusFiltro === key
                ? key === 'ao_vivo' ? 'var(--green-bright)' : 'var(--foreground)'
                : 'var(--border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Eixo tabs ──────────────────────────────────────────────────────── */}
      {!atleticaFoco && (
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-1">
          {EIXOS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setEixo(key)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: eixo === key ? 'var(--card)' : 'transparent',
                color: eixo === key ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: eixo === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Groups ─────────────────────────────────────────────────────────── */}
      {!atleticaFoco && (
        <div className="space-y-3">
          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
              <p className="text-[14px] font-medium text-[var(--muted-foreground)]">
                {busca ? `Nenhum jogo encontrado para "${busca}".` : 'Nenhum jogo encontrado.'}
              </p>
            </div>
          ) : (
            grouped.map(([key, jogosGrupo]) => (
              <GroupBlock
                key={key}
                label={key}
                eixo={eixo}
                jogos={jogosGrupo}
                highlightIds={highlightIds}
                defaultOpen={!collapsed.has(key)}
              />
            ))
          )}
        </div>
      )}

    </div>
  )
}
