'use client'

/**
 * <BracketView /> — Renderiza single-elimination bracket horizontal.
 *
 * Lê os jogos da chave (modalidade+categoria+divisão) e agrupa por fase:
 *   grupos → oitavas → quartas → semifinal → final
 *
 * Cada coluna é uma fase; cada cartão é um jogo individual.
 * Vencedor é destacado em verde quando o jogo é encerrado.
 * Click no jogo abre o /placar com deep-link.
 *
 * Performance: tudo é client-side derivado dos jogos passados como prop.
 */

import Link from 'next/link'
import { Trophy, Crown, Radio, Clock, UserX, ChevronRight } from 'lucide-react'
import type { JogoChave } from './ChaveamentoClient'

// ── Fases canônicas em ordem ──────────────────────────────────────────────────
const FASES_ORDEM = ['grupos', 'oitavas', 'quartas', 'semifinal', 'final'] as const
type Fase = typeof FASES_ORDEM[number]

const FASE_LABEL: Record<string, string> = {
  grupos:    'Grupos',
  oitavas:   'Oitavas de Final',
  quartas:   'Quartas de Final',
  semifinal: 'Semifinal',
  final:     'Final',
}

const FASE_LABEL_SHORT: Record<string, string> = {
  grupos:    'GRUPOS',
  oitavas:   'OITAVAS',
  quartas:   'QUARTAS',
  semifinal: 'SEMI',
  final:     'FINAL',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Card de jogo no bracket ───────────────────────────────────────────────────

function MatchCard({ jogo, isFinal }: { jogo: JogoChave; isFinal: boolean }) {
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
      className={`group/match block w-full overflow-hidden rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg ${
        isFinal
          ? 'border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-transparent'
          : isAoVivo
          ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.10)]'
          : isEncerrado
          ? 'border-[var(--border)] bg-[var(--card)]/60'
          : 'border-[var(--border)] bg-[var(--card)]'
      }`}
      style={{ textDecoration: 'none' }}
    >
      {/* Header: hora + fase + status */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]/60 bg-[var(--muted)]/30 px-2.5 py-1">
        {jogo.inicio && (
          <span className="text-[9px] font-bold tabular-nums text-[var(--muted-foreground)]/70">
            {fmtData(jogo.inicio)} · {fmtHora(jogo.inicio)}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {isAoVivo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-400">
              <Radio className="h-2 w-2 animate-pulse" />
              ao vivo
            </span>
          )}
          {isEncerrado && !vencedor.porWO && (
            <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/60">
              encerrado
            </span>
          )}
          {vencedor.porWO && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-400">
              <UserX className="h-2 w-2" />
              WO
            </span>
          )}
          {!isAoVivo && !isEncerrado && (
            <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider text-[var(--muted-foreground)]/40">
              <Clock className="h-2 w-2" />
              agendado
            </span>
          )}
        </span>
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

      {/* Divider */}
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
    <div className={`flex items-center gap-2 px-2.5 py-1.5 transition-colors ${
      isVencedor ? 'bg-[var(--green-dim)]/15' : ''
    }`}>
      {/* Color stripe */}
      <span
        className="h-5 w-0.5 shrink-0 rounded-full"
        style={{ background: hasEquipe ? cor : 'var(--border)' }}
      />

      {/* Nome */}
      <span className={`flex-1 truncate text-[11px] font-semibold ${
        !hasEquipe
          ? 'text-[var(--muted-foreground)]/40 italic'
          : isPerdedorWO
          ? 'text-[var(--muted-foreground)]/50 line-through'
          : isVencedor
          ? 'text-[var(--green-bright)]'
          : 'text-[var(--foreground)]'
      }`}>
        {nome ?? 'A definir'}
      </span>

      {/* Crown pro vencedor */}
      {isVencedor && (
        <Crown className="h-3 w-3 shrink-0 text-[var(--green-bright)]" />
      )}

      {/* Placar */}
      {showPlacar && (
        <span className={`shrink-0 tabular-nums text-sm font-bold ${
          isVencedor
            ? 'text-[var(--green-bright)]'
            : isPerdedorWO
            ? 'text-[var(--muted-foreground)]/40'
            : 'text-[var(--muted-foreground)]'
        }`}>
          {isPerdedorWO ? '—' : (placar ?? 0)}
        </span>
      )}

      {/* Visual de slot vazio */}
      {!showPlacar && !slug && (
        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]/20" />
      )}
    </div>
  )
}

// ── BracketView principal ─────────────────────────────────────────────────────

interface Props {
  jogos: JogoChave[]
}

export function BracketView({ jogos }: Props) {
  // Agrupa por fase
  const fases: Record<Fase, JogoChave[]> = {
    grupos:    [],
    oitavas:   [],
    quartas:   [],
    semifinal: [],
    final:     [],
  }
  for (const j of jogos) {
    const f = (j.fase ?? '').toLowerCase() as Fase
    if (FASES_ORDEM.includes(f)) {
      fases[f].push(j)
    }
  }
  // Ordena cada fase por inicio
  for (const f of FASES_ORDEM) {
    fases[f].sort((a, b) => {
      if (!a.inicio) return 1
      if (!b.inicio) return -1
      return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    })
  }

  const fasesAtivas = FASES_ORDEM.filter(f => fases[f].length > 0)

  // Se não tem nenhuma fase reconhecida, mostra jogos como lista
  if (fasesAtivas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
        <p className="text-sm text-[var(--muted-foreground)]">
          {jogos.length === 0
            ? 'Nenhum jogo importado pra esta chave ainda.'
            : 'Jogos sem fase definida — verifique a importação.'}
        </p>
      </div>
    )
  }

  // ── Render bracket horizontal ───────────────────────────────────────────────
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {fasesAtivas.map((fase) => (
          <div key={fase} className="flex flex-col min-w-[240px]">
            {/* Header da fase */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  fase === 'final' ? 'text-amber-500' : 'text-[var(--muted-foreground)]/60'
                }`}
              >
                {fase === 'final' && '👑 '}
                {FASE_LABEL[fase] ?? fase}
              </span>
              <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]/40">
                {fases[fase].length} {fases[fase].length === 1 ? 'jogo' : 'jogos'}
              </span>
            </div>

            {/* Lista de jogos da fase */}
            <div className="flex flex-1 flex-col justify-around gap-2.5">
              {fases[fase].map(j => (
                <MatchCard
                  key={j.id}
                  jogo={j}
                  isFinal={fase === 'final'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hint mobile */}
      <p className="mt-4 text-center text-[10px] text-[var(--muted-foreground)]/40 md:hidden">
        ← deslize horizontalmente pra ver toda a chave →
      </p>

      {/* Resumo final */}
      {fases.final.length > 0 && fases.final.some(j => j.status === 'encerrado') && (() => {
        const finalJogo = fases.final.find(j => j.status === 'encerrado')!
        const v = determinarVencedor(finalJogo)
        const champNome = v.lado === 'a' ? finalJogo.equipe_a_nome : v.lado === 'b' ? finalJogo.equipe_b_nome : null
        const champCor  = v.lado === 'a' ? finalJogo.equipe_a?.cor_primaria : v.lado === 'b' ? finalJogo.equipe_b?.cor_primaria : null
        if (!champNome) return null
        return (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 via-amber-300/5 to-transparent p-6">
            <Crown className="h-8 w-8 text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">CAMPEÃO</p>
            <p className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight" style={{ color: champCor ?? undefined }}>
              {champNome}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
