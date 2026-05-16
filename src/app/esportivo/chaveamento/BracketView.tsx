'use client'

/**
 * <BracketView /> — Bracket no formato OFICIAL do CIA (Anexo III).
 *
 * Renderiza chave single-elimination com:
 *   - 4 quadrantes (Q1 superior-esquerdo, Q2 superior-direito,
 *                   Q3 inferior-direito, Q4 inferior-esquerdo)
 *   - 7 colunas (Oitavas L → Quartas L → Semi L → Final → Semi R → Quartas R → Oitavas R)
 *   - Numeração JOGO N por ordem cronológica dentro de cada fase
 *   - Distribuição automática de slots/BYE conforme regulamento (Art. 5)
 *   - Vencedor destacado verde quando o jogo é encerrado
 *
 * Click no jogo abre /placar com deep-link.
 */

import Link from 'next/link'
import { Trophy, Crown, Radio, Clock, UserX } from 'lucide-react'
import type { JogoChave } from './ChaveamentoClient'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtHora(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtData(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  })
}

interface VencedorInfo {
  lado: 'a' | 'b' | 'empate' | null
  porWO: boolean
}

function determinarVencedor(jogo: JogoChave): VencedorInfo {
  if (jogo.status !== 'encerrado') return { lado: null, porWO: false }
  if (jogo.wo === 'a') return { lado: 'b', porWO: true }
  if (jogo.wo === 'b') return { lado: 'a', porWO: true }
  if (jogo.wo === 'duplo') return { lado: null, porWO: true }
  if (jogo.placar_a == null || jogo.placar_b == null) return { lado: null, porWO: false }
  if (jogo.placar_a > jogo.placar_b) return { lado: 'a', porWO: false }
  if (jogo.placar_b > jogo.placar_a) return { lado: 'b', porWO: false }
  return { lado: 'empate', porWO: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// Distribuição de slots por quadrante (Regulamento CIA Art. 5)
// Ordem: [Q1, Q4, Q2, Q3]  ← ordem visual: TL, BL, TR, BR
// ─────────────────────────────────────────────────────────────────────────────

type QuadDist = readonly [number, number, number, number]

const OITAVAS_DIST: Record<number, QuadDist> = {
  8: [2, 2, 2, 2], 7: [1, 2, 2, 2], 6: [1, 2, 1, 2], 5: [1, 2, 1, 1],
  4: [1, 1, 1, 1], 3: [1, 0, 1, 1], 2: [1, 0, 1, 0], 1: [1, 0, 0, 0], 0: [0, 0, 0, 0],
}
const QUARTAS_DIST: Record<number, QuadDist> = {
  4: [1, 1, 1, 1], 3: [0, 1, 1, 1], 2: [0, 1, 0, 1], 1: [0, 1, 0, 0], 0: [0, 0, 0, 0],
}
const SEMIS_DIST: Record<number, readonly [number, number]> = {
  2: [1, 1], 1: [0, 1], 0: [0, 0],
}

// Tipos do bracket processado
interface BracketLayout {
  q1Oit:   JogoChave[]
  q4Oit:   JogoChave[]
  q2Oit:   JogoChave[]
  q3Oit:   JogoChave[]
  q1Qua:   JogoChave | null
  q4Qua:   JogoChave | null
  q2Qua:   JogoChave | null
  q3Qua:   JogoChave | null
  semiL:   JogoChave | null
  semiR:   JogoChave | null
  final:   JogoChave | null
  jogoNums: Map<string, number>  // id → JOGO N
  totalJogos: number
}

function computeBracket(jogos: JogoChave[]): BracketLayout {
  const byInicio = (a: JogoChave, b: JogoChave) => {
    if (!a.inicio) return 1
    if (!b.inicio) return -1
    return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  }

  const oitavas = jogos.filter(j => j.fase === 'oitavas').sort(byInicio)
  const quartas = jogos.filter(j => j.fase === 'quartas').sort(byInicio)
  const semis   = jogos.filter(j => j.fase === 'semifinal').sort(byInicio)
  const final   = jogos.find(j => j.fase === 'final') ?? null

  // Numeração JOGO N (1-based, sequencial por fase: oitavas → quartas → semis → final)
  const jogoNums = new Map<string, number>()
  let n = 1
  for (const j of oitavas) jogoNums.set(j.id, n++)
  for (const j of quartas) jogoNums.set(j.id, n++)
  for (const j of semis)   jogoNums.set(j.id, n++)
  if (final) jogoNums.set(final.id, n++)

  // Distribui por quadrante (Q1, Q4, Q2, Q3)
  const oitDist = OITAVAS_DIST[oitavas.length] ?? [0, 0, 0, 0]
  const quaDist = QUARTAS_DIST[quartas.length] ?? [0, 0, 0, 0]
  const semDist = SEMIS_DIST[semis.length] ?? [0, 0]

  function takeFromOitavas(count: number, start: number) {
    return oitavas.slice(start, start + count)
  }

  let oi = 0
  const q1Oit = takeFromOitavas(oitDist[0], oi); oi += oitDist[0]
  const q4Oit = takeFromOitavas(oitDist[1], oi); oi += oitDist[1]
  const q2Oit = takeFromOitavas(oitDist[2], oi); oi += oitDist[2]
  const q3Oit = takeFromOitavas(oitDist[3], oi)

  let qi = 0
  const q1Qua = quaDist[0] > 0 ? (quartas[qi++] ?? null) : null
  const q4Qua = quaDist[1] > 0 ? (quartas[qi++] ?? null) : null
  const q2Qua = quaDist[2] > 0 ? (quartas[qi++] ?? null) : null
  const q3Qua = quaDist[3] > 0 ? (quartas[qi++] ?? null) : null

  let si = 0
  const semiL = semDist[0] > 0 ? (semis[si++] ?? null) : null
  const semiR = semDist[1] > 0 ? (semis[si++] ?? null) : null

  return {
    q1Oit, q4Oit, q2Oit, q3Oit,
    q1Qua, q4Qua, q2Qua, q3Qua,
    semiL, semiR, final,
    jogoNums,
    totalJogos: jogos.length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCard — card de um jogo no bracket
// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({ jogo, jogoNum, isFinal, isSemi, compact }: {
  jogo: JogoChave
  jogoNum: number
  isFinal?: boolean
  isSemi?: boolean
  compact?: boolean
}) {
  const vencedor = determinarVencedor(jogo)
  const isEncerrado = jogo.status === 'encerrado'
  const isAoVivo    = jogo.status === 'ao_vivo'
  const hasEquipeA  = !!(jogo.equipe_a_nome ?? jogo.equipe_a?.slug)
  const hasEquipeB  = !!(jogo.equipe_b_nome ?? jogo.equipe_b?.slug)

  const corA = jogo.equipe_a?.cor_primaria ?? 'var(--muted-foreground)'
  const corB = jogo.equipe_b?.cor_primaria ?? 'var(--muted-foreground)'

  return (
    <Link
      href={`/placar?dia=${jogo.dia_id}#jogo-${jogo.id}`}
      className={`group/match block w-full overflow-hidden rounded-lg border text-[10px] transition-all hover:scale-[1.02] hover:shadow-lg ${
        isFinal
          ? 'border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-transparent'
          : isAoVivo
          ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.10)]'
          : isEncerrado
          ? 'border-[var(--border)] bg-[var(--card)]/50'
          : 'border-[var(--border)] bg-[var(--card)]'
      }`}
      style={{ textDecoration: 'none' }}
    >
      {/* Header: JOGO N + hora + status */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)]/60 bg-[var(--muted)]/40 px-2 py-0.5">
        <span className={`text-[9px] font-bold tabular-nums tracking-wider ${
          isFinal ? 'text-amber-500' : isSemi ? 'text-[var(--green-bright)]' : 'text-[var(--muted-foreground)]/70'
        }`}>
          JOGO {jogoNum}
        </span>
        {jogo.inicio && !compact && (
          <span className="ml-auto text-[8px] tabular-nums text-[var(--muted-foreground)]/60">
            {fmtData(jogo.inicio)} · {fmtHora(jogo.inicio)}
          </span>
        )}
        {compact && jogo.inicio && (
          <span className="ml-auto text-[8px] tabular-nums text-[var(--muted-foreground)]/60">
            {fmtHora(jogo.inicio)}
          </span>
        )}
        {isAoVivo && (
          <Radio className="ml-1 h-2 w-2 text-red-400 animate-pulse" />
        )}
        {vencedor.porWO && !isAoVivo && (
          <UserX className="ml-1 h-2 w-2 text-red-400" />
        )}
      </div>

      {/* Equipe A */}
      <TeamRow
        nome={jogo.equipe_a_nome}
        slug={jogo.equipe_a?.slug ?? null}
        cor={corA}
        placar={jogo.placar_a}
        isVencedor={vencedor.lado === 'a'}
        isPerdedorWO={jogo.wo === 'a' || jogo.wo === 'duplo'}
        showPlacar={isAoVivo || isEncerrado}
        hasEquipe={hasEquipeA}
      />

      <div className="h-px bg-[var(--border)]/40" />

      {/* Equipe B */}
      <TeamRow
        nome={jogo.equipe_b_nome}
        slug={jogo.equipe_b?.slug ?? null}
        cor={corB}
        placar={jogo.placar_b}
        isVencedor={vencedor.lado === 'b'}
        isPerdedorWO={jogo.wo === 'b' || jogo.wo === 'duplo'}
        showPlacar={isAoVivo || isEncerrado}
        hasEquipe={hasEquipeB}
      />
    </Link>
  )
}

function TeamRow({
  nome, slug, cor, placar, isVencedor, isPerdedorWO, showPlacar, hasEquipe,
}: {
  nome: string | null
  slug: string | null
  cor: string
  placar: number | null
  isVencedor: boolean
  isPerdedorWO: boolean
  showPlacar: boolean
  hasEquipe: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 ${isVencedor ? 'bg-[var(--green-dim)]/15' : ''}`}>
      <span
        className="h-3.5 w-0.5 shrink-0 rounded-full"
        style={{ background: hasEquipe ? cor : 'var(--border)' }}
      />
      <span className={`flex-1 truncate text-[10px] font-semibold ${
        !hasEquipe
          ? 'text-[var(--muted-foreground)]/40 italic'
          : isPerdedorWO
          ? 'text-[var(--muted-foreground)]/50 line-through'
          : isVencedor
          ? 'text-[var(--green-bright)]'
          : 'text-[var(--foreground)]'
      }`}>
        {nome ?? '—'}
      </span>
      {isVencedor && <Crown className="h-2.5 w-2.5 shrink-0 text-[var(--green-bright)]" />}
      {showPlacar && (
        <span className={`shrink-0 tabular-nums text-xs font-bold ${
          isVencedor ? 'text-[var(--green-bright)]' : isPerdedorWO ? 'text-[var(--muted-foreground)]/40' : 'text-[var(--muted-foreground)]'
        }`}>
          {isPerdedorWO ? '—' : (placar ?? 0)}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coluna do bracket — usa space-around pra alinhar cards visualmente
// ─────────────────────────────────────────────────────────────────────────────

function BracketColumn({
  label, jogos, jogoNums, isFinal, isSemi, slotCount, compact, accent,
}: {
  label?: string
  jogos: (JogoChave | null)[]
  jogoNums: Map<string, number>
  isFinal?: boolean
  isSemi?: boolean
  slotCount?: number  // pra fazer space-around mesmo com slots vazios
  compact?: boolean
  accent?: 'gold' | 'green' | 'normal'
}) {
  // Pad com nulls pra manter espaçamento mesmo com BYE
  const slots = slotCount ? [...jogos, ...Array(Math.max(0, slotCount - jogos.length)).fill(null)] : jogos
  const accentColor =
    accent === 'gold'  ? 'text-amber-500' :
    accent === 'green' ? 'text-[var(--green-bright)]' :
    'text-[var(--muted-foreground)]/50'

  return (
    <div className="flex flex-col min-w-[160px]">
      {label && (
        <div className={`mb-2 text-center text-[9px] font-bold uppercase tracking-widest ${accentColor}`}>
          {label}
        </div>
      )}
      <div className="flex flex-1 flex-col justify-around gap-2">
        {slots.map((j, i) => (
          <div key={j?.id ?? `empty-${i}`} className="min-h-[44px]">
            {j ? (
              <MatchCard
                jogo={j}
                jogoNum={jogoNums.get(j.id) ?? 0}
                isFinal={isFinal}
                isSemi={isSemi}
                compact={compact}
              />
            ) : (
              <div className="h-full opacity-0" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BracketView principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  jogos: JogoChave[]
}

export function BracketView({ jogos }: Props) {
  if (jogos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Nenhum jogo cadastrado pra esta chave.
        </p>
      </div>
    )
  }

  const b = computeBracket(jogos)

  // Quantos slots manter em cada coluna pra alinhamento simétrico
  // Oitavas: max 4 por coluna (2 do Q1+2 do Q4 ou 2 do Q2+2 do Q3)
  // Quartas: max 2 por coluna (Q1+Q4 ou Q2+Q3)
  // Semi: 1 por coluna
  // Final: 1
  const oitLeftSlots  = 4
  const oitRightSlots = 4
  const quaLeftSlots  = 2
  const quaRightSlots = 2

  return (
    <div className="space-y-4">

      {/* Header com info da chave */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-[var(--foreground)]">Chave A</span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {b.totalJogos} {b.totalJogos === 1 ? 'jogo' : 'jogos'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/60">
          {b.q1Oit.length + b.q4Oit.length + b.q2Oit.length + b.q3Oit.length > 0 && (
            <span>{b.q1Oit.length + b.q4Oit.length + b.q2Oit.length + b.q3Oit.length} oitavas</span>
          )}
          {(b.q1Qua || b.q4Qua || b.q2Qua || b.q3Qua) && (
            <span>
              {[b.q1Qua, b.q4Qua, b.q2Qua, b.q3Qua].filter(Boolean).length} quartas
            </span>
          )}
          {(b.semiL || b.semiR) && (
            <span>{[b.semiL, b.semiR].filter(Boolean).length} semi</span>
          )}
          {b.final && <span className="text-amber-500">final</span>}
        </div>
      </div>

      {/* Bracket grid: 7 colunas */}
      <div className="overflow-x-auto pb-4">
        <div
          className="flex gap-3 min-w-max items-stretch px-2"
          style={{ minHeight: 480 }}
        >
          {/* COLUNA 1 — Oitavas esquerda (Q1 superior + Q4 inferior) */}
          <BracketColumn
            label="OITAVAS"
            jogos={[
              ...b.q1Oit,
              ...Array(2 - b.q1Oit.length).fill(null), // pad Q1 até 2 slots
              ...b.q4Oit,
              ...Array(2 - b.q4Oit.length).fill(null), // pad Q4 até 2 slots
            ]}
            jogoNums={b.jogoNums}
            slotCount={oitLeftSlots}
            compact
          />

          {/* COLUNA 2 — Quartas esquerda (Q1 + Q4) */}
          <BracketColumn
            label="QUARTAS"
            jogos={[b.q1Qua, b.q4Qua]}
            jogoNums={b.jogoNums}
            slotCount={quaLeftSlots}
          />

          {/* COLUNA 3 — Semi esquerda (entre Q1 e Q4) */}
          <BracketColumn
            label="SEMIFINAL"
            jogos={[b.semiL]}
            jogoNums={b.jogoNums}
            slotCount={1}
            isSemi
            accent="green"
          />

          {/* COLUNA 4 — FINAL (centro) */}
          <BracketColumn
            label="FINAL"
            jogos={[b.final]}
            jogoNums={b.jogoNums}
            slotCount={1}
            isFinal
            accent="gold"
          />

          {/* COLUNA 5 — Semi direita (entre Q2 e Q3) */}
          <BracketColumn
            label="SEMIFINAL"
            jogos={[b.semiR]}
            jogoNums={b.jogoNums}
            slotCount={1}
            isSemi
            accent="green"
          />

          {/* COLUNA 6 — Quartas direita (Q2 + Q3) */}
          <BracketColumn
            label="QUARTAS"
            jogos={[b.q2Qua, b.q3Qua]}
            jogoNums={b.jogoNums}
            slotCount={quaRightSlots}
          />

          {/* COLUNA 7 — Oitavas direita (Q2 superior + Q3 inferior) */}
          <BracketColumn
            label="OITAVAS"
            jogos={[
              ...b.q2Oit,
              ...Array(2 - b.q2Oit.length).fill(null),
              ...b.q3Oit,
              ...Array(2 - b.q3Oit.length).fill(null),
            ]}
            jogoNums={b.jogoNums}
            slotCount={oitRightSlots}
            compact
          />
        </div>
      </div>

      {/* Quadrante labels */}
      <div className="grid grid-cols-2 gap-3 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/40">
        <div className="flex flex-col gap-3">
          <p className="text-left">▦ QUADRANTE 1 (superior esquerdo)</p>
          <p className="text-left">▦ QUADRANTE 4 (inferior esquerdo)</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-right">QUADRANTE 2 (superior direito) ▦</p>
          <p className="text-right">QUADRANTE 3 (inferior direito) ▦</p>
        </div>
      </div>

      {/* Hint mobile */}
      <p className="text-center text-[10px] text-[var(--muted-foreground)]/40 md:hidden">
        ← deslize horizontalmente pra ver toda a chave →
      </p>

      {/* Campeão */}
      {b.final && b.final.status === 'encerrado' && (() => {
        const v = determinarVencedor(b.final)
        const champNome = v.lado === 'a' ? b.final.equipe_a_nome : v.lado === 'b' ? b.final.equipe_b_nome : null
        const champCor  = v.lado === 'a' ? b.final.equipe_a?.cor_primaria : v.lado === 'b' ? b.final.equipe_b?.cor_primaria : null
        if (!champNome) return null
        return (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 via-amber-300/5 to-transparent p-6">
            <Crown className="h-8 w-8 text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">CAMPEÃO</p>
            <p
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: champCor ?? 'var(--foreground)' }}
            >
              {champNome}
            </p>
          </div>
        )
      })()}

      {/* Indicador de Clock pra agendados — só pra evitar warning de import não usado */}
      <span className="hidden"><Clock /></span>
    </div>
  )
}
