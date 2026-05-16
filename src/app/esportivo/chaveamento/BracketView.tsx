'use client'

/**
 * <BracketView /> — Bracket COMPLETO no formato oficial CIA (Anexo III).
 *
 * Recebe:
 *   - jogos: lista de jogos do banco (oitavas + quartas/semi/final se houver)
 *   - config: configuração da chave (numTeams + seeds com P1..PN)
 *
 * Renderiza:
 *   - Estrutura completa do bracket (todos os JOGOs do regulamento)
 *   - Cards com equipes reais quando match com DB existe
 *   - Cards "A definir" quando o jogo ainda não tem confronto definido
 *   - Posições P1..PN nos slots de oitavas/quartas (seeds do sorteio)
 *   - Quadrantes labels acima dos quadrantes
 *   - Layout 7 colunas: Oit L → Qua L → Semi L → Final → Semi R → Qua R → Oit R
 */

import Link from 'next/link'
import { Trophy, Crown, Radio, UserX } from 'lucide-react'
import type { JogoChave, ChaveConfig } from './ChaveamentoClient'
import { buildGames, canonTeamName, type BracketGame, type BracketSlot } from '@/lib/chaveamento/bracket-builder'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHora(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}
function fmtData(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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
// Resolver: dado um slot do bracket e os seeds + jogos, retorna o nome a exibir
// e se há um DB jogo associado.
// ─────────────────────────────────────────────────────────────────────────────

interface ResolvedSlot {
  /** Nome de display: "EDUCA UNIUBE" | "Vencedor JOGO 1" | "A definir" */
  display: string
  /** Posição P1..PN, se direct slot */
  pos?: number
  /** Nome canonical (pra matching de jogos) */
  canonName?: string
  /** É um placeholder feeder (esperando vencedor)? */
  isFeeder: boolean
}

function resolveSlot(slot: BracketSlot, seeds: string[]): ResolvedSlot {
  if (slot.type === 'direct') {
    const pos = slot.pos
    if (!pos) return { display: '?', isFeeder: false }
    const name = seeds[pos - 1] || ''
    return {
      display: name || `P${pos}`,
      pos,
      canonName: canonTeamName(name),
      isFeeder: false,
    }
  }
  // Feeder
  return { display: 'A definir', isFeeder: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve um BracketGame: anexa nomes nos slots + procura DB jogo correspondente
// ─────────────────────────────────────────────────────────────────────────────

interface EnrichedGame {
  bracket: BracketGame
  slotA: ResolvedSlot
  slotB: ResolvedSlot
  jogo: JogoChave | null  // DB row matchada (se existir)
}

function enrichGames(games: BracketGame[], seeds: string[], jogos: JogoChave[]): EnrichedGame[] {
  return games.map(g => {
    const slotA = resolveSlot(g.slots[0], seeds)
    const slotB = resolveSlot(g.slots[1], seeds)

    // Tenta achar DB jogo: match canonical name (qualquer ordem)
    let dbGame: JogoChave | null = null
    if (slotA.canonName && slotB.canonName) {
      dbGame = jogos.find(j => {
        const ja = canonTeamName(j.equipe_a_nome)
        const jb = canonTeamName(j.equipe_b_nome)
        return (ja === slotA.canonName && jb === slotB.canonName) ||
               (ja === slotB.canonName && jb === slotA.canonName)
      }) ?? null
    } else if (slotA.canonName) {
      // Apenas slot A é direct (caso de chaves com bye)
      dbGame = jogos.find(j => {
        const ja = canonTeamName(j.equipe_a_nome)
        const jb = canonTeamName(j.equipe_b_nome)
        return ja === slotA.canonName || jb === slotA.canonName
      }) ?? null
    }
    return { bracket: g, slotA, slotB, jogo: dbGame }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCard — renderiza um jogo do bracket (real ou placeholder)
// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({ ent, isFinal, isSemi }: {
  ent: EnrichedGame
  isFinal?: boolean
  isSemi?: boolean
}) {
  const { bracket: bg, slotA, slotB, jogo } = ent

  // Estado: se tem jogo real, usa dados; senão é placeholder estrutural
  const isReal = jogo !== null
  const vencedor = jogo ? determinarVencedor(jogo) : { lado: null, porWO: false }
  const isEncerrado = jogo?.status === 'encerrado'
  const isAoVivo    = jogo?.status === 'ao_vivo'

  // Cores das equipes (vindas do DB jogo)
  const corA = jogo?.equipe_a?.cor_primaria ?? 'var(--muted-foreground)'
  const corB = jogo?.equipe_b?.cor_primaria ?? 'var(--muted-foreground)'

  const content = (
    <>
      {/* Header: JOGO N */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)]/60 bg-[var(--muted)]/40 px-2 py-0.5">
        <span className={`text-[9px] font-bold tabular-nums tracking-wider ${
          isFinal ? 'text-amber-500' : isSemi ? 'text-[var(--green-bright)]' : 'text-[var(--muted-foreground)]/70'
        }`}>
          JOGO {bg.num}
        </span>
        {jogo?.inicio && (
          <span className="ml-auto text-[8px] tabular-nums text-[var(--muted-foreground)]/60">
            {fmtData(jogo.inicio)} · {fmtHora(jogo.inicio)}
          </span>
        )}
        {isAoVivo && <Radio className="ml-1 h-2 w-2 text-red-400 animate-pulse" />}
        {vencedor.porWO && !isAoVivo && <UserX className="ml-1 h-2 w-2 text-red-400" />}
      </div>

      {/* Slot A */}
      <SlotRow
        slot={slotA}
        nomeReal={jogo?.equipe_a_nome ?? null}
        cor={corA}
        placar={jogo?.placar_a ?? null}
        isVencedor={vencedor.lado === 'a'}
        isPerdedorWO={jogo?.wo === 'a' || jogo?.wo === 'duplo'}
        showPlacar={isAoVivo || isEncerrado}
      />
      <div className="h-px bg-[var(--border)]/40" />
      {/* Slot B */}
      <SlotRow
        slot={slotB}
        nomeReal={jogo?.equipe_b_nome ?? null}
        cor={corB}
        placar={jogo?.placar_b ?? null}
        isVencedor={vencedor.lado === 'b'}
        isPerdedorWO={jogo?.wo === 'b' || jogo?.wo === 'duplo'}
        showPlacar={isAoVivo || isEncerrado}
      />
    </>
  )

  // Card wrapper styling
  const cardClass = `block w-full overflow-hidden rounded-lg border text-[10px] transition-all ${
    isFinal
      ? 'border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-transparent'
      : isAoVivo
      ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.10)]'
      : isReal
      ? 'border-[var(--border)] bg-[var(--card)]'
      : 'border-dashed border-[var(--border)]/50 bg-[var(--muted)]/20'
  } ${isReal ? 'hover:scale-[1.02] hover:shadow-lg' : ''}`

  // Se tem jogo real, link pro /placar
  if (jogo) {
    return (
      <Link
        href={`/placar?dia=${jogo.dia_id}#jogo-${jogo.id}`}
        className={cardClass}
        style={{ textDecoration: 'none' }}
      >
        {content}
      </Link>
    )
  }

  return <div className={cardClass}>{content}</div>
}

function SlotRow({
  slot, nomeReal, cor, placar, isVencedor, isPerdedorWO, showPlacar,
}: {
  slot: ResolvedSlot
  nomeReal: string | null
  cor: string
  placar: number | null
  isVencedor: boolean
  isPerdedorWO: boolean
  showPlacar: boolean
}) {
  // Display name: usa o nome do DB se disponível, senão o seed name
  const displayName = nomeReal ?? slot.display
  const hasTeam = !slot.isFeeder && !!slot.canonName

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 ${isVencedor ? 'bg-[var(--green-dim)]/15' : ''}`}>
      {/* Color stripe */}
      <span
        className="h-3.5 w-0.5 shrink-0 rounded-full"
        style={{ background: hasTeam ? cor : 'var(--border)' }}
      />
      {/* Pos label (P1, P9, etc) */}
      {slot.pos && (
        <span className="shrink-0 inline-flex h-3.5 items-center justify-center rounded bg-[var(--muted)] px-1 text-[8px] font-bold tabular-nums text-[var(--muted-foreground)]">
          P{slot.pos}
        </span>
      )}
      {/* Nome */}
      <span className={`flex-1 truncate text-[10px] font-semibold ${
        slot.isFeeder
          ? 'text-[var(--muted-foreground)]/40 italic'
          : isPerdedorWO
          ? 'text-[var(--muted-foreground)]/50 line-through'
          : isVencedor
          ? 'text-[var(--green-bright)]'
          : !hasTeam
          ? 'text-[var(--muted-foreground)]/40 italic'
          : 'text-[var(--foreground)]'
      }`}>
        {displayName}
      </span>
      {/* Crown */}
      {isVencedor && <Crown className="h-2.5 w-2.5 shrink-0 text-[var(--green-bright)]" />}
      {/* Placar */}
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
// Distribui jogos por quadrante (Q1, Q4, Q2, Q3)
// ─────────────────────────────────────────────────────────────────────────────

interface BracketLayout {
  q1Oit: EnrichedGame[]
  q4Oit: EnrichedGame[]
  q2Oit: EnrichedGame[]
  q3Oit: EnrichedGame[]
  q1Qua: EnrichedGame | null
  q4Qua: EnrichedGame | null
  q2Qua: EnrichedGame | null
  q3Qua: EnrichedGame | null
  semiL: EnrichedGame | null
  semiR: EnrichedGame | null
  final: EnrichedGame | null
}

function layoutGames(games: EnrichedGame[]): BracketLayout {
  const oit = games.filter(g => g.bracket.round === 'oitava')
  const qua = games.filter(g => g.bracket.round === 'quarta')
  const sem = games.filter(g => g.bracket.round === 'semi')
  const fin = games.find(g => g.bracket.round === 'final') ?? null

  const byQuad = (arr: EnrichedGame[], q: 'Q1'|'Q2'|'Q3'|'Q4') =>
    arr.filter(g => g.bracket.quad === q)

  return {
    q1Oit: byQuad(oit, 'Q1'),
    q4Oit: byQuad(oit, 'Q4'),
    q2Oit: byQuad(oit, 'Q2'),
    q3Oit: byQuad(oit, 'Q3'),
    q1Qua: byQuad(qua, 'Q1')[0] ?? null,
    q4Qua: byQuad(qua, 'Q4')[0] ?? null,
    q2Qua: byQuad(qua, 'Q2')[0] ?? null,
    q3Qua: byQuad(qua, 'Q3')[0] ?? null,
    semiL: sem.find(g => g.bracket.side === 'L') ?? null,
    semiR: sem.find(g => g.bracket.side === 'R') ?? null,
    final: fin,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Coluna do bracket
// ─────────────────────────────────────────────────────────────────────────────

function Col({ label, jogos, accent, slotCount }: {
  label: string
  jogos: (EnrichedGame | null)[]
  accent?: 'gold' | 'green'
  slotCount?: number
}) {
  const accentColor =
    accent === 'gold' ? 'text-amber-500' :
    accent === 'green' ? 'text-[var(--green-bright)]' :
    'text-[var(--muted-foreground)]/60'
  const slots = slotCount ? [...jogos, ...Array(Math.max(0, slotCount - jogos.length)).fill(null)] : jogos

  return (
    <div className="flex flex-col min-w-[180px]">
      <div className={`mb-2 text-center text-[9px] font-bold uppercase tracking-widest ${accentColor}`}>
        {label}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-2">
        {slots.map((g, i) => (
          <div key={g?.bracket.id ?? `empty-${i}`} className="min-h-[46px]">
            {g ? (
              <MatchCard
                ent={g}
                isFinal={g.bracket.round === 'final'}
                isSemi={g.bracket.round === 'semi'}
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
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  jogos: JogoChave[]
  config: ChaveConfig | null
}

export function BracketView({ jogos, config }: Props) {
  // Sem config: chave não cadastrada no bracket-site. Renderiza fallback simples.
  if (!config) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Chave sem configuração cadastrada (importe do bracket-site primeiro).
        </p>
      </div>
    )
  }

  const bracketGames = buildGames(config.num_teams)
  const enriched = enrichGames(bracketGames, config.seeds, jogos)
  const L = layoutGames(enriched)

  // Padding visual pra alinhar quadrantes (cada lado tem max 4 slots de oitavas)
  // Q1 e Q4 ficam na esquerda (top, bottom). Q2 e Q3 ficam na direita.

  return (
    <div className="space-y-4">
      {/* Header com info da chave */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-[var(--foreground)]">Chave A</span>
          <span className="inline-flex items-center rounded-full bg-[var(--green-dim)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--green-bright)]">
            {config.num_teams} equipes
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/60">
          {enriched.filter(g => g.bracket.round === 'oitava').length > 0 && (
            <span>{enriched.filter(g => g.bracket.round === 'oitava').length} oitavas</span>
          )}
          {enriched.filter(g => g.bracket.round === 'quarta').length > 0 && (
            <span>{enriched.filter(g => g.bracket.round === 'quarta').length} quartas</span>
          )}
          {enriched.filter(g => g.bracket.round === 'semi').length > 0 && (
            <span>{enriched.filter(g => g.bracket.round === 'semi').length} semi</span>
          )}
          {L.final && <span className="text-amber-500">final</span>}
        </div>
      </div>

      {/* Bracket grid */}
      <div className="overflow-x-auto pb-4">
        {/* Labels Quadrantes */}
        <div className="flex gap-3 min-w-max px-2 mb-2">
          <div className="flex flex-col gap-2 min-w-[372px]">
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-blue-400">
              QUADRANTE 1
            </div>
          </div>
          <div className="min-w-[180px]" />  {/* semi L spacer */}
          <div className="min-w-[180px]" />  {/* final spacer */}
          <div className="min-w-[180px]" />  {/* semi R spacer */}
          <div className="flex flex-col gap-2 min-w-[372px]">
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-blue-400">
              QUADRANTE 2
            </div>
          </div>
        </div>

        {/* Top half */}
        <div className="flex gap-3 min-w-max px-2" style={{ minHeight: 240 }}>
          <Col label="OITAVAS" jogos={L.q1Oit} slotCount={2} />
          <Col label="QUARTAS" jogos={[L.q1Qua]} slotCount={1} />
          <Col label="SEMIFINAL" jogos={[L.semiL]} slotCount={1} accent="green" />
          <Col label="FINAL" jogos={[L.final]} slotCount={1} accent="gold" />
          <Col label="SEMIFINAL" jogos={[L.semiR]} slotCount={1} accent="green" />
          <Col label="QUARTAS" jogos={[L.q2Qua]} slotCount={1} />
          <Col label="OITAVAS" jogos={L.q2Oit} slotCount={2} />
        </div>

        {/* Quadrantes labels middle */}
        <div className="flex gap-3 min-w-max px-2 my-2">
          <div className="flex flex-col gap-2 min-w-[372px]">
            <div className="rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-purple-400">
              QUADRANTE 4
            </div>
          </div>
          <div className="min-w-[180px]" />
          <div className="min-w-[180px]" />
          <div className="min-w-[180px]" />
          <div className="flex flex-col gap-2 min-w-[372px]">
            <div className="rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-purple-400">
              QUADRANTE 3
            </div>
          </div>
        </div>

        {/* Bottom half */}
        <div className="flex gap-3 min-w-max px-2" style={{ minHeight: 240 }}>
          <Col label="OITAVAS" jogos={L.q4Oit} slotCount={2} />
          <Col label="QUARTAS" jogos={[L.q4Qua]} slotCount={1} />
          <div className="min-w-[180px]" />  {/* semi L spacer (semi tá no top half) */}
          <div className="min-w-[180px]" />  {/* final spacer */}
          <div className="min-w-[180px]" />  {/* semi R spacer */}
          <Col label="QUARTAS" jogos={[L.q3Qua]} slotCount={1} />
          <Col label="OITAVAS" jogos={L.q3Oit} slotCount={2} />
        </div>
      </div>

      {/* Hint mobile */}
      <p className="text-center text-[10px] text-[var(--muted-foreground)]/40 md:hidden">
        ← deslize horizontalmente pra ver toda a chave →
      </p>

      {/* Campeão */}
      {L.final && L.final.jogo?.status === 'encerrado' && (() => {
        const j = L.final.jogo
        const v = determinarVencedor(j)
        const champNome = v.lado === 'a' ? j.equipe_a_nome : v.lado === 'b' ? j.equipe_b_nome : null
        const champCor  = v.lado === 'a' ? j.equipe_a?.cor_primaria : v.lado === 'b' ? j.equipe_b?.cor_primaria : null
        if (!champNome) return null
        return (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 via-amber-300/5 to-transparent p-6">
            <Crown className="h-8 w-8 text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">CAMPEÃO</p>
            <p className="text-2xl font-extrabold tracking-tight" style={{ color: champCor ?? 'var(--foreground)' }}>
              {champNome}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
