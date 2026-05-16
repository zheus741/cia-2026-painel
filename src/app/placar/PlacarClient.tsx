'use client'

import { useState, useTransition, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Radio, CheckCircle2, XCircle, Minus, Plus, AlertCircle, ArrowUpRight, Zap, Share2, RotateCcw, Filter, FlaskConical, UserX, Undo2, X, ChevronDown, Crown } from 'lucide-react'
import { setJogoAoVivo, encerrarJogo, atualizarPlacar, cancelarJogo, reativarJogo, criarJogoTeste, declararWO, removerWO, registrarEvento, removerEvento } from './actions'
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
  /** W.O. — Art. 58-65. 'a'=A não compareceu, 'b'=B, 'duplo'=ambas. */
  wo: 'a' | 'b' | 'duplo' | null
  inicio: string | null
  dia_id?: string
  setor_id?: string | null
  divisao: string | null
  fase: string | null
  categoria: string | null
  teste: boolean | null
  modalidade: { nome: string; icone: string } | null
  setor: { nome: string } | null
  equipe_a: EquipeRef | null
  equipe_b: EquipeRef | null
}

// ── Eventos helpers ──────────────────────────────────────────────────────────

interface EventoJogo {
  id: string
  jogo_id: string
  tipo: string
  equipe: 'a' | 'b'
  minuto: number | null
  criado_em: string
}

interface EventoCfg {
  label: string
  icon:  string
  cor:   string
}

// Eventos NÃO somam placar — são só registro histórico (timeline do jogo).
// O placar é controlado 100% pelos botões +/- manuais.
const EVENTOS_CONFIG: Record<string, EventoCfg> = {
  // Pontos / gols (histórico, não soma placar)
  gol:             { label: 'Gol',         icon: '⚽',  cor: '#4ab87a' },
  cesta_2:         { label: 'Cesta 2',     icon: '🏀',  cor: '#4ab87a' },
  cesta_3:         { label: 'Cesta 3',     icon: '🎯',  cor: '#22c55e' },
  lance_livre:     { label: 'Lance livre', icon: '⚡',  cor: '#60a5fa' },
  ace:             { label: 'Ace',         icon: '🎯',  cor: '#a78bfa' },
  bloqueio:        { label: 'Bloqueio',    icon: '🛡️',  cor: '#06b6d4' },
  set_ganho:       { label: 'Set ganho',   icon: '🏆',  cor: '#e8b94f' },
  // Disciplinares
  cartao_amarelo:  { label: 'Amarelo',     icon: '🟨',  cor: '#d97706' },
  cartao_vermelho: { label: 'Vermelho',    icon: '🟥',  cor: '#ef4444' },
  falta:           { label: 'Falta',       icon: '✋',  cor: '#ef4444' },
  falta_tecnica:   { label: 'Téc.',        icon: '⚠️',  cor: '#dc2626' },
  exclusao:        { label: '2 min',       icon: '⏳',  cor: '#f59e0b' },
  penalti:         { label: 'Pênalti',     icon: '🥅',  cor: '#f59e0b' },
  // Estratégicos
  timeout:         { label: 'Timeout',     icon: '⏱️',  cor: '#3b82f6' },
}

function getEventosTipos(modalidadeNome: string | null): string[] {
  if (!modalidadeNome) return []
  const n = modalidadeNome.toLowerCase()
  if (n.includes('futsal') || n.includes('futebol'))   return ['gol', 'cartao_amarelo', 'cartao_vermelho', 'falta']
  if (n.includes('hand'))                              return ['gol', 'cartao_amarelo', 'cartao_vermelho', 'exclusao']
  if (n.includes('basquete') || n.includes('basket'))  return ['cesta_2', 'cesta_3', 'lance_livre', 'falta']
  if (n.includes('vôlei') || n.includes('volei') || n.includes('vole')) return ['ace', 'bloqueio', 'set_ganho', 'timeout']
  return []
}

function fmtEventoTime(criado_em: string): string {
  const diff = Math.floor((Date.now() - new Date(criado_em).getTime()) / 1000)
  if (diff < 60)  return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return new Date(criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

/** Nome da equipe — link pra wiki se houver equipe_id, senão texto puro.
 *  Quando `loserByWO=true`, aplica strikethrough + opacidade reduzida. */
function TeamName({ eq, fallback, accent, loserByWO = false }: {
  eq: EquipeRef | null
  fallback: string | null
  accent: string
  loserByWO?: boolean
}) {
  const display = fallback ?? '—'
  const decorClass = loserByWO ? 'line-through opacity-50' : ''
  if (!eq?.slug) {
    return (
      <p className={`text-center text-sm font-semibold leading-snug ${decorClass}`}>
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
      <span className={`inline-flex items-center gap-1 text-sm font-semibold leading-snug ${decorClass}`}>
        {display}
        <ArrowUpRight
          className="h-3 w-3 opacity-0 transition-all group-hover/team:opacity-60"
          style={{ color: accent }}
        />
      </span>
      {eq.universidade && (
        <span className={`text-[9.5px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]/60 ${loserByWO ? 'line-through' : ''}`}>
          {eq.universidade}
        </span>
      )}
    </Link>
  )
}

function PlacarCard({ jogo, onLocalUpdate, recentlyChanged, canEdit }: {
  jogo: Jogo
  onLocalUpdate: (id: string, patch: Partial<Jogo>) => void
  recentlyChanged: boolean
  canEdit?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [woMode, setWoMode] = useState(false)
  const [eventos, setEventos] = useState<EventoJogo[]>([])

  const placarA = jogo.placar_a ?? 0
  const placarB = jogo.placar_b ?? 0

  // ── Contagem por tipo × equipe (sets, cartões, faltas, etc) ───────────────
  const eventCounts = useMemo(() => {
    const m: Record<string, { a: number; b: number }> = {}
    for (const ev of eventos) {
      if (!m[ev.tipo]) m[ev.tipo] = { a: 0, b: 0 }
      if (ev.equipe === 'a') m[ev.tipo].a++
      else if (ev.equipe === 'b') m[ev.tipo].b++
    }
    return m
  }, [eventos])

  function getCount(tipo: string, equipe: 'a' | 'b'): number {
    return eventCounts[tipo]?.[equipe] ?? 0
  }

  // Sets (vôlei) — placar fica "pontos (sets)"
  const setsA = getCount('set_ganho', 'a')
  const setsB = getCount('set_ganho', 'b')

  // Carrega eventos quando o jogo está ao vivo ou encerrado
  const isLoadable = jogo.status === 'ao_vivo' || jogo.status === 'encerrado'
  useEffect(() => {
    if (!isLoadable) return
    const supabase = createClient()
    supabase
      .from('eventos_jogo')
      .select('*')
      .eq('jogo_id', jogo.id)
      .order('criado_em')
      .then(({ data }) => setEventos(data ?? []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogo.id, isLoadable])

  function handleRegistrarEvento(tipo: string, equipe: 'a' | 'b') {
    // Otimista: adiciona evento temporário
    const temp: EventoJogo = {
      id: `temp-${Date.now()}`,
      jogo_id: jogo.id,
      tipo,
      equipe,
      minuto: null,
      criado_em: new Date().toISOString(),
    }
    setEventos(prev => [...prev, temp])

    // Eventos NÃO somam placar — só registro histórico.
    // Placar é controlado manualmente pelos botões +/-.
    startTransition(async () => {
      await registrarEvento(jogo.id, tipo, equipe)
      // Recarrega lista confirmada do servidor
      const supabase = createClient()
      const { data } = await supabase
        .from('eventos_jogo')
        .select('*')
        .eq('jogo_id', jogo.id)
        .order('criado_em')
      setEventos(data ?? [])
    })
  }

  function handleRemoverEvento(eventoId: string) {
    setEventos(prev => prev.filter(e => e.id !== eventoId))
    startTransition(async () => { await removerEvento(eventoId) })
  }

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

  function handleReativar() {
    onLocalUpdate(jogo.id, { status: 'agendado', placar_a: 0, placar_b: 0, wo: null })
    startTransition(async () => { await reativarJogo(jogo.id) })
  }

  // ── W.O. handlers (Art. 58-65 do regulamento) ─────────────────────────────
  function handleDeclararWO(lado: 'a' | 'b' | 'duplo') {
    onLocalUpdate(jogo.id, { wo: lado, status: 'encerrado' })
    setWoMode(false)
    startTransition(async () => { await declararWO(jogo.id, lado) })
  }

  function handleRemoverWO() {
    onLocalUpdate(jogo.id, { wo: null })
    startTransition(async () => { await removerWO(jogo.id) })
  }

  const isAoVivo    = jogo.status === 'ao_vivo'
  const isEncerrado = jogo.status === 'encerrado'
  const isCancelado = jogo.status === 'cancelado'
  const isAgendado  = jogo.status === 'agendado'
  const isTeste     = !!jogo.teste
  const eventoTipos = getEventosTipos(jogo.modalidade?.nome ?? null)
  // W.O. state derivado
  const hasWO       = !!jogo.wo
  const aPerdeuWO   = jogo.wo === 'a' || jogo.wo === 'duplo'
  const bPerdeuWO   = jogo.wo === 'b' || jogo.wo === 'duplo'

  // Identity
  const accentA = teamAccent(jogo.equipe_a, jogo.divisao)
  const accentB = teamAccent(jogo.equipe_b, jogo.divisao)
  const divisaoLabel = jogo.divisao ?? jogo.equipe_a?.divisao ?? jogo.equipe_b?.divisao ?? null
  const divisaoColor = divisaoLabel ? DIV_COLORS[divisaoLabel] : null
  const faseLabel = jogo.fase ? (FASE_LABEL[jogo.fase] ?? jogo.fase) : null
  const confMeta = jogo.equipe_a?.conferencia ? getConferencia(jogo.equipe_a.conferencia) : null

  return (
    <div
      id={`jogo-${jogo.id}`}
      className={`relative overflow-hidden rounded-2xl border transition-all scroll-mt-20 ${
        isAoVivo ? 'p-5 md:p-6' : 'p-4'
      } ${
        hasWO
          ? 'border-red-500/40 bg-red-500/5 opacity-90'
          : isTeste
          ? 'border-amber-600/40 bg-amber-500/5'
          : isAoVivo
          ? 'border-[var(--green-bright)]/45 bg-gradient-to-br from-[var(--green-dim)]/15 via-[var(--card)] to-[var(--card)] shadow-[0_4px_24px_rgba(46,107,66,0.10)]'
          : isEncerrado
          ? 'border-[var(--border)]/50 bg-[var(--card)]/40 opacity-75'
          : isCancelado
          ? 'border-red-800/30 bg-red-900/10 opacity-50'
          : 'border-[var(--border)] bg-[var(--card)]/60'
      }`}
    >
      {/* TESTE badge */}
      {isTeste && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5">
          <FlaskConical className="h-2.5 w-2.5 text-amber-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Teste</span>
        </div>
      )}

      {isAoVivo && !isTeste && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-[var(--green-bright)] animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--green-bright)]">Ao vivo</span>
        </div>
      )}
      {isAoVivo && isTeste && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-amber-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Ao vivo · Teste</span>
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

      {/* Meta header — split: o que (esq) | categoria badges (dir) */}
      <div className={`flex flex-wrap items-start justify-between gap-2 ${isAoVivo ? 'mb-5' : 'mb-3'}`}>
        {/* Esquerda: hora + modalidade + setor */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
          {jogo.inicio && (
            <span className="font-bold tabular-nums text-[var(--foreground)]">
              {fmtTime(jogo.inicio)}
            </span>
          )}
          {jogo.modalidade && (
            <span className="inline-flex items-center gap-1 font-semibold">
              <span aria-hidden>{jogo.modalidade.icone}</span>
              {jogo.modalidade.nome}
            </span>
          )}
          {jogo.categoria && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="text-[var(--muted-foreground)]/70">{jogo.categoria}</span>
            </>
          )}
          {jogo.setor && (
            <>
              <span className="text-[var(--border)]">·</span>
              {jogo.setor_id ? (
                <Link
                  href={`/esportivo/escala?dia=${jogo.dia_id ?? ''}#setor-${jogo.setor_id}`}
                  className="underline decoration-dotted decoration-[var(--muted-foreground)]/30 underline-offset-2 transition-colors hover:text-[var(--green-bright)] hover:decoration-[var(--green-bright)]/60"
                  title="Ver delegado e jogos desta praça"
                >
                  {jogo.setor.nome}
                </Link>
              ) : (
                <span className="text-[var(--muted-foreground)]/70">{jogo.setor.nome}</span>
              )}
            </>
          )}
          {isEncerrado && !hasWO && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="text-[var(--muted-foreground)]/60">Encerrado</span>
            </>
          )}
          {isCancelado && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="text-red-500/80 font-semibold">Cancelado</span>
            </>
          )}
        </div>

        {/* Direita: badges de categoria */}
        <div className="flex flex-wrap items-center gap-1">
          {divisaoLabel && divisaoColor && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: `${divisaoColor}18`,
                color: divisaoColor,
                border: `1px solid ${divisaoColor}40`,
              }}
            >
              {divisaoLabel}
            </span>
          )}
          {faseLabel && (
            <span className="inline-flex items-center rounded-full bg-[var(--card)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] border border-[var(--border)]">
              {faseLabel}
            </span>
          )}
          {confMeta && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: `${confMeta.cor}18`,
                color: confMeta.cor,
                border: `1px solid ${confMeta.cor}40`,
              }}
            >
              <span aria-hidden>{confMeta.icone}</span>
              {confMeta.nome}
            </span>
          )}
          {hasWO && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-red-500">
              <UserX className="h-2.5 w-2.5" />
              {jogo.wo === 'duplo' ? 'W.O. duplo' : 'W.O.'}
            </span>
          )}
        </div>
      </div>

      {/* Placar — dramaticamente maior pra ao vivo */}
      <div className={`relative grid items-stretch gap-2 ${isAoVivo ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-[1fr_auto_1fr]'}`}>

        {/* Equipe A */}
        <div className="relative flex flex-col items-center gap-2 pl-3">
          <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] rounded-full" style={{ background: accentA }} />
          <TeamName eq={jogo.equipe_a} fallback={jogo.equipe_a_nome} accent={accentA} loserByWO={aPerdeuWO} />
          {(isAoVivo || isEncerrado) && (
            <>
              {aPerdeuWO ? (
                <span className="inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500">
                  W.O.
                </span>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2">
                    {canEdit && isAoVivo && !hasWO && (
                      <button
                        onClick={() => adjustScore('a', -1)}
                        disabled={isPending || placarA === 0}
                        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--border)] text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)] hover:scale-110 hover:bg-[var(--green-dim)]/20 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                        aria-label="Diminuir placar"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                    <span
                      className="tabular-nums font-extrabold leading-none"
                      style={{
                        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                        fontSize: isAoVivo ? 'clamp(48px, 6vw, 68px)' : '32px',
                        color: isAoVivo ? 'var(--foreground)' : 'var(--muted-foreground)',
                        letterSpacing: '-0.04em',
                        minWidth: '1ch',
                        textAlign: 'center',
                      }}
                    >
                      {placarA}
                    </span>
                    {canEdit && isAoVivo && !hasWO && (
                      <button
                        onClick={() => adjustScore('a', 1)}
                        disabled={isPending}
                        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15 text-[var(--green-bright)] transition-all hover:border-[var(--green-bright)] hover:scale-110 hover:bg-[var(--green-dim)]/30 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                        aria-label="Aumentar placar"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {/* Sets ganhos (quando modalidade usa set_ganho) */}
                  {eventoTipos.includes('set_ganho') && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--muted)]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)] border border-[var(--border)]">
                      Sets <span className="tabular-nums text-[var(--foreground)] font-extrabold text-[12px]">{setsA}</span>
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* VS / × — centralizado entre as equipes */}
        <div
          className="flex shrink-0 items-center justify-center font-extrabold text-[var(--muted-foreground)]/30"
          style={{
            fontSize: isAoVivo ? 28 : 18,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            letterSpacing: '-0.05em',
            paddingTop: isAoVivo && (isAoVivo || isEncerrado) ? 28 : 0,
          }}
        >
          ×
        </div>

        {/* Equipe B */}
        <div className="relative flex flex-col items-center gap-2 pr-3">
          <span aria-hidden className="absolute right-0 top-0 bottom-0 w-[4px] rounded-full" style={{ background: accentB }} />
          <TeamName eq={jogo.equipe_b} fallback={jogo.equipe_b_nome} accent={accentB} loserByWO={bPerdeuWO} />
          {(isAoVivo || isEncerrado) && (
            <>
              {bPerdeuWO ? (
                <span className="inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500">
                  W.O.
                </span>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2">
                    {canEdit && isAoVivo && !hasWO && (
                      <button
                        onClick={() => adjustScore('b', -1)}
                        disabled={isPending || placarB === 0}
                        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--border)] text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)] hover:scale-110 hover:bg-[var(--green-dim)]/20 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                        aria-label="Diminuir placar"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                    <span
                      className="tabular-nums font-extrabold leading-none"
                      style={{
                        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                        fontSize: isAoVivo ? 'clamp(48px, 6vw, 68px)' : '32px',
                        color: isAoVivo ? 'var(--foreground)' : 'var(--muted-foreground)',
                        letterSpacing: '-0.04em',
                        minWidth: '1ch',
                        textAlign: 'center',
                      }}
                    >
                      {placarB}
                    </span>
                    {canEdit && isAoVivo && !hasWO && (
                      <button
                        onClick={() => adjustScore('b', 1)}
                        disabled={isPending}
                        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15 text-[var(--green-bright)] transition-all hover:border-[var(--green-bright)] hover:scale-110 hover:bg-[var(--green-dim)]/30 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                        aria-label="Aumentar placar"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {/* Sets ganhos (quando modalidade usa set_ganho) */}
                  {eventoTipos.includes('set_ganho') && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--muted)]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)] border border-[var(--border)]">
                      Sets <span className="tabular-nums text-[var(--foreground)] font-extrabold text-[12px]">{setsB}</span>
                    </span>
                  )}
                </div>
              )}
            </>
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

      {/* Compartilhar resultado (só pra encerrados) */}
      {isEncerrado && (
        <a
          href={`/api/og/resultado/${jogo.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:bg-[var(--green-dim)]/10 hover:text-[var(--green-bright)]"
          title="Abrir imagem do resultado em 1080×1080 (para compartilhar)"
        >
          <Share2 className="h-3 w-3" />
          Compartilhar resultado
        </a>
      )}

      {/* ── Painel de eventos por modalidade ─────────────────────────── */}
      {canEdit && isAoVivo && eventoTipos.length > 0 && (
        <div className="mt-5 rounded-xl border border-[var(--border)]/60 bg-[var(--muted)]/20 p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
              Registrar evento
            </p>
            <p className="text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]/40">
              {eventoTipos.length} {eventoTipos.length === 1 ? 'tipo' : 'tipos'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Coluna A */}
            <div>
              <p
                className="mb-2 truncate text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: accentA }}
              >
                {jogo.equipe_a_nome ?? 'Equipe A'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {eventoTipos.map(tipo => {
                  const cfg = EVENTOS_CONFIG[tipo]
                  const count = getCount(tipo, 'a')
                  return (
                    <button
                      key={tipo}
                      onClick={() => handleRegistrarEvento(tipo, 'a')}
                      disabled={isPending}
                      title={`${cfg.label} — ${jogo.equipe_a_nome ?? 'A'}${count > 0 ? ` (${count} registrado${count > 1 ? 's' : ''})` : ''}`}
                      className="group/evt relative flex flex-col items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2 transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${cfg.cor}66`; e.currentTarget.style.background = `${cfg.cor}10` }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)' }}
                    >
                      {count > 0 && (
                        <span
                          className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold tabular-nums text-white"
                          style={{ background: cfg.cor, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
                          aria-label={`${count} ${cfg.label.toLowerCase()} registrado${count > 1 ? 's' : ''}`}
                        >
                          {count}
                        </span>
                      )}
                      <span className="text-base leading-none" aria-hidden>{cfg.icon}</span>
                      <span
                        className="text-[10px] font-bold leading-none tracking-tight"
                        style={{ color: cfg.cor }}
                      >
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Coluna B */}
            <div>
              <p
                className="mb-2 truncate text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: accentB }}
              >
                {jogo.equipe_b_nome ?? 'Equipe B'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {eventoTipos.map(tipo => {
                  const cfg = EVENTOS_CONFIG[tipo]
                  const count = getCount(tipo, 'b')
                  return (
                    <button
                      key={tipo}
                      onClick={() => handleRegistrarEvento(tipo, 'b')}
                      disabled={isPending}
                      title={`${cfg.label} — ${jogo.equipe_b_nome ?? 'B'}${count > 0 ? ` (${count} registrado${count > 1 ? 's' : ''})` : ''}`}
                      className="relative flex flex-col items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2 transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${cfg.cor}66`; e.currentTarget.style.background = `${cfg.cor}10` }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)' }}
                    >
                      {count > 0 && (
                        <span
                          className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold tabular-nums text-white"
                          style={{ background: cfg.cor, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
                          aria-label={`${count} ${cfg.label.toLowerCase()} registrado${count > 1 ? 's' : ''}`}
                        >
                          {count}
                        </span>
                      )}
                      <span className="text-base leading-none" aria-hidden>{cfg.icon}</span>
                      <span
                        className="text-[10px] font-bold leading-none tracking-tight"
                        style={{ color: cfg.cor }}
                      >
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline de eventos ───────────────────────────────────────── */}
      {(isAoVivo || isEncerrado) && eventos.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/40">
            Eventos
          </p>
          <div className="space-y-1">
            {eventos.map(ev => {
              const cfg = EVENTOS_CONFIG[ev.tipo]
              const isTemp = ev.id.startsWith('temp-')
              const teamName = ev.equipe === 'a' ? jogo.equipe_a_nome : jogo.equipe_b_nome
              const teamColor = ev.equipe === 'a' ? accentA : accentB
              return (
                <div
                  key={ev.id}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-opacity ${
                    isTemp ? 'opacity-50' : 'bg-[var(--card)]/40'
                  }`}
                >
                  <span className="shrink-0">{cfg?.icon ?? '•'}</span>
                  <span className="font-semibold truncate" style={{ color: teamColor }}>
                    {teamName ?? (ev.equipe === 'a' ? 'A' : 'B')}
                  </span>
                  <span className="text-[var(--muted-foreground)]/60 shrink-0">
                    {cfg?.label ?? ev.tipo}
                  </span>
                  <span className="ml-auto text-[9px] text-[var(--muted-foreground)]/40 shrink-0 tabular-nums">
                    {isTemp ? '…' : fmtEventoTime(ev.criado_em)}
                  </span>
                  {canEdit && !isTemp && (
                    <button
                      onClick={() => handleRemoverEvento(ev.id)}
                      disabled={isPending}
                      title="Remover evento"
                      className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)]/30 transition-colors hover:text-red-400 disabled:opacity-40"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Painel inline de W.O. — substitui a barra de ações quando ativado */}
      {woMode && !hasWO && !isCancelado && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
            <AlertCircle className="h-3 w-3" />
            Qual equipe não compareceu?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDeclararWO('a')}
              disabled={isPending}
              className="rounded-md border border-red-500/30 bg-[var(--card)] px-2 py-2 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
              title={`${jogo.equipe_a_nome ?? 'A'} perde por W.O.`}
            >
              {jogo.equipe_a_nome ?? 'Equipe A'}
            </button>
            <button
              onClick={() => handleDeclararWO('b')}
              disabled={isPending}
              className="rounded-md border border-red-500/30 bg-[var(--card)] px-2 py-2 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
              title={`${jogo.equipe_b_nome ?? 'B'} perde por W.O.`}
            >
              {jogo.equipe_b_nome ?? 'Equipe B'}
            </button>
            <button
              onClick={() => handleDeclararWO('duplo')}
              disabled={isPending}
              className="col-span-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-40"
            >
              W.O. duplo — ambas não compareceram
            </button>
            <button
              onClick={() => setWoMode(false)}
              disabled={isPending}
              className="col-span-2 rounded-md border border-[var(--border)] px-2 py-1.5 text-[10px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-snug text-[var(--muted-foreground)]/70">
            Art. 59 §I: equipe(s) que não compareceram perdem 13 pts gerais. Reversível.
          </p>
        </div>
      )}

      {/* Ações */}
      {canEdit && !isEncerrado && !isCancelado && !woMode && (
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
          {/* W.O. — disponível em agendado e ao_vivo */}
          <button
            onClick={() => setWoMode(true)}
            disabled={isPending}
            className="flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-30"
            title="Declarar W.O. (não-comparecimento)"
          >
            <UserX className="h-3.5 w-3.5" />
            W.O.
          </button>
          <button
            onClick={handleCancelar}
            disabled={isPending}
            className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:border-red-700/40 hover:text-red-400 disabled:opacity-30"
            title="Cancelar jogo"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Jogo encerrado por W.O. — opção de reverter */}
      {hasWO && (
        <div className="mt-3">
          <button
            onClick={handleRemoverWO}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[11px] font-semibold text-[var(--muted-foreground)] transition-all hover:border-amber-500/40 hover:text-amber-400 disabled:opacity-40"
            title="Remover marcação de W.O. (em caso de erro)"
          >
            <Undo2 className="h-3 w-3" />
            Reverter W.O.
          </button>
        </div>
      )}

      {/* Resetar / Reativar */}
      {canEdit && (isCancelado || isEncerrado || isAoVivo) && (
        <div className="mt-3">
          <button
            onClick={handleReativar}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-600/30 bg-amber-500/8 px-3 py-2 text-xs font-semibold text-amber-500 transition-all hover:border-amber-500/50 hover:bg-amber-500/15 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isCancelado ? 'Reativar jogo' : 'Resetar jogo (volta a agendado, placar zerado)'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── JogoListItem — versão timeline compacta (linha clicável) ──────────────

function JogoListItem({ jogo, onLocalUpdate, recentlyChanged, canEdit }: {
  jogo: Jogo
  onLocalUpdate: (id: string, patch: Partial<Jogo>) => void
  recentlyChanged: boolean
  canEdit?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [woMode, setWoMode] = useState(false)

  const isAoVivo    = jogo.status === 'ao_vivo'
  const isEncerrado = jogo.status === 'encerrado'
  const isCancelado = jogo.status === 'cancelado'
  const isAgendado  = jogo.status === 'agendado'
  const hasWO       = !!jogo.wo
  const aPerdeuWO   = jogo.wo === 'a' || jogo.wo === 'duplo'
  const bPerdeuWO   = jogo.wo === 'b' || jogo.wo === 'duplo'

  // Vencedor (pra destacar nome em encerrado)
  let winner: 'a' | 'b' | null = null
  if (isEncerrado && !hasWO && jogo.placar_a != null && jogo.placar_b != null) {
    if (jogo.placar_a > jogo.placar_b) winner = 'a'
    else if (jogo.placar_b > jogo.placar_a) winner = 'b'
  }
  if (hasWO) {
    if (jogo.wo === 'a') winner = 'b'
    else if (jogo.wo === 'b') winner = 'a'
  }

  // Identity
  const accentA = teamAccent(jogo.equipe_a, jogo.divisao)
  const accentB = teamAccent(jogo.equipe_b, jogo.divisao)
  const divisaoLabel = jogo.divisao ?? jogo.equipe_a?.divisao ?? jogo.equipe_b?.divisao ?? null
  const divisaoColor = divisaoLabel ? DIV_COLORS[divisaoLabel] : null
  const faseLabel = jogo.fase ? (FASE_LABEL[jogo.fase] ?? jogo.fase) : null
  const confNome = jogo.equipe_a?.conferencia ?? jogo.equipe_b?.conferencia ?? null
  const confMeta = confNome ? getConferencia(confNome) : null

  // Handlers
  function handleAoVivo() {
    onLocalUpdate(jogo.id, { status: 'ao_vivo', placar_a: 0, placar_b: 0 })
    startTransition(async () => { await setJogoAoVivo(jogo.id) })
  }
  function handleCancelar() {
    onLocalUpdate(jogo.id, { status: 'cancelado' })
    startTransition(async () => { await cancelarJogo(jogo.id) })
  }
  function handleReativar() {
    onLocalUpdate(jogo.id, { status: 'agendado', placar_a: 0, placar_b: 0, wo: null })
    startTransition(async () => { await reativarJogo(jogo.id) })
  }
  function handleDeclararWO(lado: 'a' | 'b' | 'duplo') {
    onLocalUpdate(jogo.id, { wo: lado, status: 'encerrado' })
    setWoMode(false)
    startTransition(async () => { await declararWO(jogo.id, lado) })
  }
  function handleRemoverWO() {
    onLocalUpdate(jogo.id, { wo: null })
    startTransition(async () => { await removerWO(jogo.id) })
  }

  const placarA = jogo.placar_a ?? 0
  const placarB = jogo.placar_b ?? 0

  return (
    <div
      id={`jogo-${jogo.id}`}
      className={`group relative overflow-hidden rounded-lg border transition-all scroll-mt-20 ${
        recentlyChanged
          ? 'border-[var(--green-bright)]/50 bg-[var(--green-dim)]/15 shadow-[0_0_12px_rgba(46,107,66,0.15)]'
          : hasWO
          ? 'border-red-500/30 bg-red-500/5'
          : isCancelado
          ? 'border-[var(--border)] bg-[var(--card)]/30 opacity-50'
          : isEncerrado
          ? 'border-[var(--border)] bg-[var(--card)]/55'
          : 'border-[var(--border)] bg-[var(--card)]'
      } hover:border-[var(--green-dim)]/60`}
    >
      {/* Linha principal — botão clicável */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* Hora */}
        <span className="w-12 shrink-0 font-bold tabular-nums text-sm text-[var(--foreground)]">
          {jogo.inicio ? fmtTime(jogo.inicio) : '—'}
        </span>

        {/* Modalidade icon + nome + setor */}
        <div className="hidden md:flex items-center gap-1.5 w-44 shrink-0 min-w-0">
          {jogo.modalidade && <span className="text-sm leading-none shrink-0" aria-hidden>{jogo.modalidade.icone}</span>}
          <span className="truncate text-[11px] font-semibold text-[var(--muted-foreground)]">
            {jogo.modalidade?.nome ?? '—'}
            {jogo.setor && <span className="text-[var(--muted-foreground)]/55"> · {jogo.setor.nome}</span>}
          </span>
        </div>

        {/* Mobile: icon-only */}
        <span className="md:hidden text-sm shrink-0" aria-hidden>{jogo.modalidade?.icone ?? ''}</span>

        {/* Equipes + placar */}
        <div className="flex flex-1 min-w-0 items-center justify-center gap-2 sm:gap-3">
          {/* Equipe A */}
          <div className="flex flex-1 min-w-0 items-center justify-end gap-1.5">
            <span className={`truncate text-[12px] font-bold leading-tight ${
              winner === 'a' ? 'text-[var(--green-bright)]' :
              winner === 'b' ? 'text-[var(--muted-foreground)]/55' :
              aPerdeuWO ? 'line-through text-[var(--muted-foreground)]/50' :
              'text-[var(--foreground)]'
            }`}>
              {jogo.equipe_a_nome ?? '—'}
            </span>
            <span aria-hidden className="h-4 w-1 shrink-0 rounded-full" style={{ background: accentA }} />
          </div>

          {/* Centro: placar (live/encerrado) ou × (agendado) */}
          {(isAoVivo || isEncerrado) && !hasWO ? (
            <div
              className="shrink-0 inline-flex items-center gap-1.5 tabular-nums font-extrabold leading-none px-1.5"
              style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 18,
                letterSpacing: '-0.02em',
              }}
            >
              <span className={winner === 'a' ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]'}>{placarA}</span>
              <span className="text-[var(--muted-foreground)]/40 font-bold text-[13px]">×</span>
              <span className={winner === 'b' ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]'}>{placarB}</span>
            </div>
          ) : hasWO ? (
            <span className="shrink-0 inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
              W.O.
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/40 px-1.5">
              vs
            </span>
          )}

          {/* Equipe B */}
          <div className="flex flex-1 min-w-0 items-center gap-1.5">
            <span aria-hidden className="h-4 w-1 shrink-0 rounded-full" style={{ background: accentB }} />
            <span className={`truncate text-[12px] font-bold leading-tight ${
              winner === 'b' ? 'text-[var(--green-bright)]' :
              winner === 'a' ? 'text-[var(--muted-foreground)]/55' :
              bPerdeuWO ? 'line-through text-[var(--muted-foreground)]/50' :
              'text-[var(--foreground)]'
            }`}>
              {jogo.equipe_b_nome ?? '—'}
            </span>
          </div>
        </div>

        {/* Badges (divisão + conferência + fase) */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          {divisaoLabel && divisaoColor && (
            <span
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.10em]"
              style={{ background: `${divisaoColor}14`, color: divisaoColor, border: `1px solid ${divisaoColor}33` }}
            >
              {divisaoLabel}
            </span>
          )}
          {confMeta && (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.10em]"
              style={{ background: `${confMeta.cor}14`, color: confMeta.cor, border: `1px solid ${confMeta.cor}33` }}
            >
              <span aria-hidden>{confMeta.icone}</span>
              {confMeta.nome}
            </span>
          )}
          {faseLabel && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.10em] text-[var(--muted-foreground)] border border-[var(--border)]">
              {faseLabel}
            </span>
          )}
        </div>

        {/* Status indicator + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          {isAoVivo && (
            <Radio className="h-3.5 w-3.5 text-[var(--green-bright)] animate-pulse" aria-label="Ao vivo" />
          )}
          {winner && isEncerrado && !hasWO && (
            <Crown className="h-3.5 w-3.5 text-[#e8b94f]" aria-label="Encerrado" />
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-[var(--muted-foreground)]/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      {/* Painel expandido — ações + WO */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--muted)]/15 px-3 py-2.5 space-y-2">
          {/* Categoria + setor (info adicional em mobile/menores) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
            {jogo.categoria && <span><strong className="text-[var(--foreground)]">Categoria:</strong> {jogo.categoria}</span>}
            {jogo.setor && (
              <span>
                <strong className="text-[var(--foreground)]">Setor:</strong>{' '}
                {jogo.setor_id ? (
                  <Link
                    href={`/esportivo/escala?dia=${jogo.dia_id ?? ''}#setor-${jogo.setor_id}`}
                    className="underline decoration-dotted hover:text-[var(--green-bright)]"
                  >
                    {jogo.setor.nome}
                  </Link>
                ) : jogo.setor.nome}
              </span>
            )}
            {divisaoLabel && (
              <span className="lg:hidden">
                <strong className="text-[var(--foreground)]">Divisão:</strong>{' '}
                <span style={{ color: divisaoColor ?? 'inherit' }}>{divisaoLabel}</span>
              </span>
            )}
            {confMeta && (
              <span className="lg:hidden">
                <strong className="text-[var(--foreground)]">Conferência:</strong>{' '}
                <span style={{ color: confMeta.cor }}>{confMeta.icone} {confMeta.nome}</span>
              </span>
            )}
            {faseLabel && (
              <span className="lg:hidden"><strong className="text-[var(--foreground)]">Fase:</strong> {faseLabel}</span>
            )}
          </div>

          {/* W.O. mode panel */}
          {woMode && !hasWO && !isCancelado ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-500">
                <AlertCircle className="h-3 w-3" /> Qual equipe não compareceu?
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleDeclararWO('a')}
                  disabled={isPending}
                  className="rounded border border-red-500/30 px-2 py-1.5 text-[10px] font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                >
                  {jogo.equipe_a_nome ?? 'A'}
                </button>
                <button
                  onClick={() => handleDeclararWO('b')}
                  disabled={isPending}
                  className="rounded border border-red-500/30 px-2 py-1.5 text-[10px] font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                >
                  {jogo.equipe_b_nome ?? 'B'}
                </button>
                <button
                  onClick={() => handleDeclararWO('duplo')}
                  disabled={isPending}
                  className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[10px] font-bold uppercase text-red-500 hover:bg-red-500/15 disabled:opacity-40"
                >
                  Duplo
                </button>
              </div>
              <button onClick={() => setWoMode(false)} className="w-full text-[9px] text-[var(--muted-foreground)]/60 hover:text-[var(--foreground)]">
                Cancelar
              </button>
            </div>
          ) : (
            /* Action buttons */
            <div className="flex flex-wrap items-center gap-1.5">
              {canEdit && isAgendado && (
                <button
                  onClick={handleAoVivo}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--green-dim)]/40 px-3 py-1.5 text-[11px] font-bold text-[var(--green-bright)] transition-colors hover:bg-[var(--green-dim)]/60 disabled:opacity-40"
                >
                  <Radio className="h-3 w-3" />
                  Iniciar
                </button>
              )}

              {canEdit && (isAgendado || isAoVivo) && !hasWO && !isCancelado && (
                <button
                  onClick={() => setWoMode(true)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-[10px] font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-30"
                >
                  <UserX className="h-3 w-3" /> W.O.
                </button>
              )}

              {canEdit && isAgendado && (
                <button
                  onClick={handleCancelar}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[10px] text-[var(--muted-foreground)] transition-colors hover:border-red-600/40 hover:text-red-500 disabled:opacity-30"
                  title="Cancelar jogo"
                >
                  <XCircle className="h-3 w-3" /> Cancelar
                </button>
              )}

              {hasWO && canEdit && (
                <button
                  onClick={handleRemoverWO}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted-foreground)] transition-all hover:border-amber-500/40 hover:text-amber-500 disabled:opacity-40"
                >
                  <Undo2 className="h-3 w-3" /> Reverter W.O.
                </button>
              )}

              {canEdit && (isCancelado || isEncerrado || isAoVivo) && (
                <button
                  onClick={handleReativar}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-600/30 bg-amber-500/8 px-2.5 py-1.5 text-[10px] font-semibold text-amber-600 transition-all hover:border-amber-500/50 hover:bg-amber-500/15 disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  {isCancelado ? 'Reativar' : 'Resetar'}
                </button>
              )}

              {isEncerrado && (
                <a
                  href={`/api/og/resultado/${jogo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)]"
                  title="Imagem do resultado pra compartilhar"
                >
                  <Share2 className="h-3 w-3" /> Compartilhar
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Agrupa jogos por hora pra timeline ──────────────────────────────────────

function groupByHour(jogos: Jogo[]): Array<{ hour: string; games: Jogo[] }> {
  const map = new Map<string, Jogo[]>()
  for (const j of jogos) {
    if (!j.inicio) {
      const k = '—'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(j)
      continue
    }
    const k = fmtTime(j.inicio)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(j)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, games]) => ({ hour, games }))
}

// ─── Timeline section — group of JogoListItem agrupado por hora ──────────────

function TimelineSection({ jogos, onLocalUpdate, recentIds, highlightedJogoId, canEdit }: {
  jogos: Jogo[]
  onLocalUpdate: (id: string, patch: Partial<Jogo>) => void
  recentIds: Set<string>
  highlightedJogoId: string | null
  canEdit?: boolean
}) {
  const groups = groupByHour(jogos)
  return (
    <div className="space-y-4">
      {groups.map(({ hour, games }) => (
        <div key={hour}>
          {/* Hour separator */}
          <div className="mb-2 flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center rounded-md bg-[var(--muted)]/40 px-2 py-1 text-xs font-bold tabular-nums text-[var(--foreground)]"
              style={{ minWidth: 52 }}
            >
              {hour}
            </span>
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/45">
              {games.length} {games.length === 1 ? 'jogo' : 'jogos'}
            </span>
          </div>
          {/* Games list */}
          <div className="space-y-1.5">
            {games.map(jogo => (
              <JogoListItem
                key={jogo.id}
                jogo={jogo}
                onLocalUpdate={onLocalUpdate}
                recentlyChanged={recentIds.has(jogo.id) || highlightedJogoId === jogo.id}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  dias: { id: string; nome_dia: string; data: string }[]
  jogosPorDia: Record<string, Jogo[]>
  diaAtivo: string
  canEdit?: boolean
}

// Campos escalares que o realtime pode atualizar in-place (sem perder joins).
const REALTIME_MERGEABLE: (keyof Jogo)[] = [
  'status', 'placar_a', 'placar_b', 'wo',
  'equipe_a_nome', 'equipe_b_nome',
  'inicio', 'fase', 'categoria', 'divisao', 'teste',
]

export function PlacarBoard({ dias, jogosPorDia: initialJogosPorDia, diaAtivo, canEdit }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Honra ?dia=<uuid> da URL (deep-link de outras seções) — fallback para diaAtivo do servidor
  const diaFromUrl = searchParams.get('dia')
  const initialDia = diaFromUrl && dias.some(d => d.id === diaFromUrl) ? diaFromUrl : diaAtivo
  // Jogo destacado via hash #jogo-<uuid>
  const [highlightedJogoId, setHighlightedJogoId] = useState<string | null>(null)

  const [jogosPorDia, setJogosPorDia] = useState(initialJogosPorDia)
  const [diaId, setDiaId] = useState(initialDia)
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set())
  const [conectado, setConectado] = useState(false)
  const [filterDiv, setFilterDiv] = useState('')
  const [filterMod, setFilterMod] = useState('')
  const [filterConf, setFilterConf] = useState('')
  const [isPendingTeste, startTransitionTeste] = useTransition()

  const lastLocalChangeRef = useRef<Map<string, number>>(new Map())

  // ── Deep-link: ao montar, se houver #jogo-<id> no hash, faz scroll e highlight
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    const match = /^#jogo-([0-9a-f-]+)$/i.exec(hash)
    if (!match) return
    const jogoId = match[1]
    setHighlightedJogoId(jogoId)
    // Espera o DOM renderizar antes de scrollar
    const timer = setTimeout(() => {
      const el = document.getElementById(`jogo-${jogoId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Remove o highlight após 3s
      setTimeout(() => setHighlightedJogoId(null), 3000)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'eventos_jogo',
      }, () => { scheduleRefresh() })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'eventos_jogo',
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

  // Options for sub-filters (built from the current day's games)
  const divOptions = Array.from(new Set(
    jogos.map(j => j.divisao ?? j.equipe_a?.divisao ?? j.equipe_b?.divisao).filter(Boolean) as string[]
  )).sort()

  const modOptions = Array.from(
    new Map(jogos.filter(j => j.modalidade).map(j => [j.modalidade!.nome, j.modalidade!])).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome))

  const confOptions = Array.from(new Set(
    jogos.flatMap(j => [j.equipe_a?.conferencia, j.equipe_b?.conferencia]).filter(Boolean) as string[]
  )).sort()

  const hasFilters = filterDiv || filterMod || filterConf
  const hasAnyFilterOptions = divOptions.length > 1 || modOptions.length > 1 || confOptions.length > 1

  // Apply sub-filters
  const jogosFiltrados = jogos.filter(j => {
    if (filterDiv) {
      const div = j.divisao ?? j.equipe_a?.divisao ?? j.equipe_b?.divisao
      if (div !== filterDiv) return false
    }
    if (filterMod && j.modalidade?.nome !== filterMod) return false
    if (filterConf) {
      const hasConf = j.equipe_a?.conferencia === filterConf || j.equipe_b?.conferencia === filterConf
      if (!hasConf) return false
    }
    return true
  })

  const aoVivo = jogos.filter((j) => j.status === 'ao_vivo').length
  const agendados = jogos.filter((j) => j.status === 'agendado').length
  const encerrados = jogos.filter((j) => j.status === 'encerrado').length

  // Buckets pra renderização por estado (após filtros)
  const liveGames     = jogosFiltrados.filter(j => j.status === 'ao_vivo')
  const scheduledGames = jogosFiltrados.filter(j => j.status === 'agendado')
  const endedGames    = jogosFiltrados.filter(j => j.status === 'encerrado' || j.status === 'cancelado')

  // Próximo jogo agendado (pra countdown no header)
  const proximoJogo = scheduledGames
    .filter(j => j.inicio)
    .sort((a, b) => new Date(a.inicio!).getTime() - new Date(b.inicio!).getTime())[0] ?? null

  return (
    <div className="space-y-6">

      {/* ─── HERO STATS — números editoriais grandes ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)]/90 to-[var(--green-dim)]/15 p-4 md:p-5">
        {/* Glow live (quando há ao vivo) */}
        {aoVivo > 0 && (
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-50 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(46,107,66,0.35), transparent 70%)' }}
          />
        )}

        <div className="relative flex flex-wrap items-end gap-x-8 gap-y-4">
          {/* AO VIVO — número gigante editorial */}
          <div className="flex items-baseline gap-3">
            <div className="leading-none">
              <p
                className="font-extrabold tabular-nums tracking-tight"
                style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 'clamp(48px, 7vw, 86px)',
                  lineHeight: 0.85,
                  letterSpacing: '-0.04em',
                  color: aoVivo > 0 ? 'var(--green-bright)' : 'var(--muted-foreground)',
                }}
              >
                {aoVivo}
              </p>
              <p
                className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: aoVivo > 0 ? 'var(--green-bright)' : 'var(--muted-foreground)' }}
              >
                {aoVivo > 0 && (
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green-bright)] opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--green-bright)]" />
                  </span>
                )}
                {aoVivo === 1 ? 'jogo ao vivo agora' : 'jogos ao vivo agora'}
              </p>
            </div>
          </div>

          <span className="hidden md:inline-block h-12 w-px bg-[var(--border)]" />

          {/* Stats secundárias */}
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <div className="leading-tight">
              <p
                className="font-extrabold tabular-nums tracking-tight text-[var(--foreground)]"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 'clamp(22px, 2.6vw, 32px)' }}
              >
                {agendados}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/60">
                Agendados
              </p>
            </div>
            <div className="leading-tight">
              <p
                className="font-extrabold tabular-nums tracking-tight text-[var(--foreground)]"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 'clamp(22px, 2.6vw, 32px)' }}
              >
                {encerrados}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/60">
                Encerrados
              </p>
            </div>
          </div>

          {/* Próximo jogo / Realtime indicator — alinhado à direita */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {proximoJogo && proximoJogo.inicio && aoVivo === 0 && (
              <NextGameTicker target={new Date(proximoJogo.inicio)} />
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                conectado
                  ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/20 text-[var(--green-bright)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]'
              }`}
              title={conectado ? 'Sincronizado em tempo real' : 'Conectando...'}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  conectado ? 'bg-[var(--green-bright)] animate-pulse' : 'bg-[var(--muted-foreground)]/50'
                }`}
                style={conectado ? { boxShadow: '0 0 6px var(--green-bright)' } : {}}
              />
              {conectado ? 'Tempo real' : 'Conectando'}
            </span>
            {canEdit && (
              <button
                onClick={() => startTransitionTeste(async () => { await criarJogoTeste(diaId) })}
                disabled={isPendingTeste}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 transition-all hover:border-amber-500/50 hover:bg-amber-500/15 disabled:opacity-40"
                title="Cria um jogo fictício pra testar o placar e o Modo TV"
              >
                <FlaskConical className="h-3 w-3" />
                {isPendingTeste ? 'Criando…' : 'Jogo teste'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── TABS DE DIA editoriais ─── */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {dias.map((dia) => {
          const jogsDia = jogosPorDia[dia.id] ?? []
          const liveCount = jogsDia.filter(j => j.status === 'ao_vivo').length
          const isActive = diaId === dia.id
          // Format date (Quinta · 04 jun)
          const dateLabel = (() => {
            try {
              const d = new Date(dia.data + 'T12:00:00')
              return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
            } catch { return dia.data }
          })()
          return (
            <button
              key={dia.id}
              onClick={() => { setDiaId(dia.id); setFilterDiv(''); setFilterMod(''); setFilterConf('') }}
              className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
                isActive
                  ? 'border-[var(--green-bright)]/55 bg-gradient-to-br from-[var(--green-dim)]/30 via-[var(--card)] to-[var(--card)] shadow-[0_4px_20px_rgba(46,107,66,0.10)]'
                  : 'border-[var(--border)] bg-[var(--card)]/40 hover:-translate-y-0.5 hover:border-[var(--green-dim)] hover:shadow-sm'
              }`}
            >
              {isActive && (
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl"
                  style={{ background: 'radial-gradient(circle, var(--green-bright), transparent 70%)' }}
                />
              )}
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p
                    className={`font-extrabold leading-none tracking-tight ${
                      isActive ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]'
                    }`}
                    style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 18 }}
                  >
                    {dia.nome_dia}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
                    {dateLabel} · <span className="tabular-nums">{jogsDia.length} jogos</span>
                  </p>
                </div>
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
                    <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                    {liveCount}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* ─── FILTROS — colapsáveis ─── */}
      {hasAnyFilterOptions && (
        <details className="group rounded-xl border border-[var(--border)] bg-[var(--card)]/30 transition-all open:bg-[var(--card)]/50">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 list-none">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              <Filter className="h-3 w-3" />
              Filtros
              {hasFilters && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-dim)]/30 px-2 py-0.5 text-[9px] font-bold text-[var(--green-bright)]">
                  {[filterDiv, filterMod, filterConf].filter(Boolean).length} ativos
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]/65">
                {hasFilters ? `${jogosFiltrados.length} de ${jogos.length}` : `${jogos.length} jogos`}
              </span>
              <span className="text-[var(--muted-foreground)]/50 transition-transform group-open:rotate-180">▾</span>
            </div>
          </summary>
          <div className="space-y-2.5 border-t border-[var(--border)] px-4 py-3">
            {/* Divisão */}
            {divOptions.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-20 shrink-0 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/55">
                  Divisão
                </span>
                {divOptions.map(div => {
                  const cor = DIV_COLORS[div]
                  const active = filterDiv === div
                  return (
                    <button
                      key={div}
                      onClick={() => setFilterDiv(prev => prev === div ? '' : div)}
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold transition-all"
                      style={active && cor ? { borderColor: `${cor}60`, background: `${cor}20`, color: cor }
                        : active ? { borderColor: 'var(--green-bright)', background: 'var(--green-dim)', color: 'var(--green-bright)' }
                        : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    >
                      {div}
                    </button>
                  )
                })}
              </div>
            )}
            {/* Modalidade */}
            {modOptions.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-20 shrink-0 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/55">
                  Modalidade
                </span>
                {modOptions.map(m => {
                  const active = filterMod === m.nome
                  return (
                    <button
                      key={m.nome}
                      onClick={() => setFilterMod(prev => prev === m.nome ? '' : m.nome)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                        active
                          ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/20 text-[var(--green-bright)]'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]'
                      }`}
                    >
                      {m.icone} {m.nome}
                    </button>
                  )
                })}
              </div>
            )}
            {/* Conferência */}
            {confOptions.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-20 shrink-0 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/55">
                  Conferência
                </span>
                {confOptions.map(nome => {
                  const meta = getConferencia(nome)
                  const active = filterConf === nome
                  return (
                    <button
                      key={nome}
                      onClick={() => setFilterConf(prev => prev === nome ? '' : nome)}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all"
                      style={active && meta
                        ? { borderColor: `${meta.cor}50`, background: `${meta.cor}18`, color: meta.cor }
                        : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    >
                      {meta?.icone} {nome}
                    </button>
                  )
                })}
              </div>
            )}
            {hasFilters && (
              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={() => { setFilterDiv(''); setFilterMod(''); setFilterConf('') }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/65 hover:text-[var(--green-bright)] transition-colors"
                >
                  Limpar tudo
                </button>
              </div>
            )}
          </div>
        </details>
      )}

      {/* ─── ESTADO VAZIO ─── */}
      {jogos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center">
          <Radio className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
          <p className="text-sm font-semibold text-[var(--foreground)]">Nenhum jogo neste dia</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
            Selecione outro dia ou aguarde a importação da tabela.
          </p>
        </div>
      )}

      {jogos.length > 0 && jogosFiltrados.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum jogo com esse filtro.</p>
          <button
            onClick={() => { setFilterDiv(''); setFilterMod(''); setFilterConf('') }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15 px-4 py-1.5 text-xs font-bold text-[var(--green-bright)]"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* ─── SEÇÃO 1 — AO VIVO ─── */}
      {liveGames.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            label="Ao Vivo Agora"
            count={liveGames.length}
            accent="var(--green-bright)"
            icon={<Radio className="h-4 w-4 animate-pulse" />}
            highlight
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {liveGames.map(jogo => (
              <PlacarCard
                key={jogo.id}
                jogo={jogo}
                onLocalUpdate={handleLocalUpdate}
                recentlyChanged={recentIds.has(jogo.id) || highlightedJogoId === jogo.id}
                canEdit={canEdit}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── SEÇÃO 2 — AGENDADOS (timeline) ─── */}
      {scheduledGames.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            label="Agendados"
            count={scheduledGames.length}
            accent="var(--gold-bright)"
            sublabel={proximoJogo?.inicio ? `próximo: ${fmtTime(proximoJogo.inicio)}` : undefined}
          />
          <TimelineSection
            jogos={scheduledGames}
            onLocalUpdate={handleLocalUpdate}
            recentIds={recentIds}
            highlightedJogoId={highlightedJogoId}
            canEdit={canEdit}
          />
          <p className="px-1 text-[10px] text-[var(--muted-foreground)]/45">
            Clique numa linha pra ver detalhes e ações.
          </p>
        </section>
      )}

      {/* ─── SEÇÃO 3 — ENCERRADOS (timeline colapsável) ─── */}
      {endedGames.length > 0 && (
        <details className="group space-y-3 mt-2" open={liveGames.length === 0 && scheduledGames.length === 0}>
          <summary className="cursor-pointer list-none">
            <SectionHeader
              label="Encerrados"
              count={endedGames.length}
              accent="var(--muted-foreground)"
              expandable
            />
          </summary>
          <div className="mt-3">
            <TimelineSection
              jogos={endedGames}
              onLocalUpdate={handleLocalUpdate}
              recentIds={recentIds}
              highlightedJogoId={highlightedJogoId}
              canEdit={canEdit}
            />
          </div>
        </details>
      )}
    </div>
  )
}

// ─── SectionHeader ──────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent, icon, sublabel, highlight, expandable }: {
  label:      string
  count:      number
  accent:     string
  icon?:      React.ReactNode
  sublabel?:  string
  highlight?: boolean
  expandable?: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-2"
         style={{ borderColor: highlight ? `${accent}40` : 'var(--border)' }}>
      <div className="flex items-center gap-3">
        {icon && <span style={{ color: accent }}>{icon}</span>}
        <h2
          className="font-extrabold tracking-tight"
          style={{
            color: accent,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: highlight ? 'clamp(20px, 2.4vw, 28px)' : 'clamp(16px, 2vw, 22px)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {label}
        </h2>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums uppercase tracking-wider"
          style={{
            background: `${accent}18`,
            color: accent,
          }}
        >
          {count}
        </span>
        {sublabel && (
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65">
            {sublabel}
          </span>
        )}
      </div>
      {expandable && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/45 group-open:hidden">
          mostrar ▾
        </span>
      )}
      {expandable && (
        <span className="hidden text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/45 group-open:inline">
          ocultar ▴
        </span>
      )}
    </div>
  )
}

// ─── NextGameTicker — countdown pro próximo jogo ─────────────────────────────

function NextGameTicker({ target }: { target: Date }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0 || diffMs > 86_400_000) return null  // só mostra se faltam <24h

  const h   = Math.floor(diffMs / 3_600_000)
  const min = Math.floor((diffMs % 3_600_000) / 60_000)
  const sec = Math.floor((diffMs % 60_000) / 1000)

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold-bright)]/40 bg-[var(--gold-bright)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-bright)]">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--gold-bright)] animate-pulse"
        style={{ boxShadow: '0 0 6px var(--gold-bright)' }}
      />
      Próximo em
      <span className="tabular-nums normal-case font-extrabold">
        {h > 0 && `${h}h `}
        {String(min).padStart(2, '0')}min{' '}
        <span className="opacity-70">{String(sec).padStart(2, '0')}s</span>
      </span>
    </span>
  )
}
