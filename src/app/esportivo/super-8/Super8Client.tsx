'use client'

/**
 * Visão pública da Liga Super 8 — playoff dos 8 campeões de conferência.
 *
 * Layout:
 *  1. Hero com nome da liga + status (em montagem / em curso / finalizada)
 *  2. Classificação (8 atléticas, ordenadas por pontos + tiebreakers)
 *     • Top 4 destacados em verde — sobem para a 2ª Divisão de 2027
 *     • Bottom 4 em cinza — permanecem na Divisão de Acesso
 *  3. Grid das 7 rodadas × 4 jogos = 28 partidas
 *     • Cada card mostra: A1 vs A2, modalidade, placar (se encerrado), W.O.
 *  4. Realtime: jogos.placar_a/b e jogos.wo mudam → standings recalculam
 */

import * as React from 'react'
import Link from 'next/link'
import { Trophy, Radio, Crown, TrendingUp, Calendar, UserX, ArrowUpRight, Sparkles, Flag } from 'lucide-react'
import { getConferencia } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/client'
import type { Super8Row, Super8Standing, Super8Participante, Super8Resumo } from '@/lib/competicao/super8'

interface Props {
  edicaoNome:    string
  rows:          Super8Row[]
  standings:     Super8Standing[]
  participantes: Super8Participante[]
  resumo:        Super8Resumo
}

export function Super8Client({ edicaoNome, rows: initialRows, standings: initialStandings, participantes, resumo }: Props) {
  const [rows, setRows] = React.useState(initialRows)
  const [standings, setStandings] = React.useState(initialStandings)

  // ── Realtime: recalcula standings quando algum jogo muda ───────────────────
  React.useEffect(() => {
    const supabase = createClient()
    const jogoIds = new Set(initialRows.map(r => r.jogo_id).filter(Boolean) as string[])
    if (jogoIds.size === 0) return

    const channel = supabase
      .channel('super8-jogos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jogos' }, async (payload) => {
        const updatedId = (payload.new as { id: string }).id
        if (!jogoIds.has(updatedId)) return
        // Refetch a row específica
        const { data } = await supabase
          .from('jogos')
          .select('id, status, placar_a, placar_b, wo, inicio')
          .eq('id', updatedId)
          .maybeSingle()
        if (!data) return
        setRows(prev => prev.map(r => r.jogo_id === updatedId ? { ...r, jogo: { ...data } } : r))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialRows])

  // Recalcula standings sempre que rows mudar (importado da lib seria server-only;
  // duplico a lógica mínima aqui pra evitar import bundle desnecessário).
  React.useEffect(() => {
    setStandings(recomputeClient(rows, participantes))
  }, [rows, participantes])

  // ── States derivados ───────────────────────────────────────────────────────
  const isEmpty       = resumo.total_jogos === 0
  const isInProgress  = resumo.jogos_encerrados > 0 && !resumo.liga_finalizada
  const isFinished    = resumo.liga_finalizada
  const top4Cutoff    = 4  // 4 primeiras sobem (Art. 58)

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">

      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#1a3a24] via-[#0C1410] to-[#0C1410] p-6 md:p-8">
        {/* glow decorativo */}
        <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />
        <div aria-hidden className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400/80">
              <Sparkles className="h-3 w-3" />
              {edicaoNome} · Divisão de Acesso
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              Liga <span className="text-amber-400">Super 8</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-white/60 md:text-base">
              Playoff em pontos corridos entre os 8 campeões de conferência.
              7 rodadas, 28 partidas, sem repetir adversário nem modalidade.
            </p>
          </div>

          {/* Badge de status */}
          <StatusBadge resumo={resumo} isEmpty={isEmpty} isInProgress={isInProgress} isFinished={isFinished} />
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Participantes"     value={resumo.participantes}     suffix="/ 8" icon={Crown} accent="amber" />
          <StatCard label="Rodadas montadas"  value={resumo.rodadas_montadas}  suffix="/ 7" icon={Calendar} accent="emerald" />
          <StatCard label="Jogos disputados"  value={resumo.jogos_encerrados}  suffix={`/ ${resumo.total_jogos || 28}`} icon={Flag} accent="blue" />
          <StatCard label="W.O."              value={resumo.jogos_com_wo}      icon={UserX}    accent="red" />
        </div>
      </header>

      {/* Empty state */}
      {isEmpty && <EmptyState />}

      {!isEmpty && (
        <>
          {/* Classificação */}
          <section>
            <SectionHeader
              icon={<Trophy className="h-4 w-4" />}
              title="Classificação"
              subtitle={`Top ${top4Cutoff} sobem para a 2ª Divisão de 2027 (Art. 58)`}
            />
            <Standings standings={standings} cutoff={top4Cutoff} />
          </section>

          {/* Tabela de jogos por rodada */}
          <section>
            <SectionHeader
              icon={<Calendar className="h-4 w-4" />}
              title="Tabela de jogos"
              subtitle={`${resumo.total_jogos} partida${resumo.total_jogos !== 1 ? 's' : ''} · 7 rodadas`}
            />
            <RoundsGrid rows={rows} />
          </section>
        </>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ resumo, isEmpty, isInProgress, isFinished }: {
  resumo: Super8Resumo; isEmpty: boolean; isInProgress: boolean; isFinished: boolean
}) {
  if (isEmpty) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        Aguardando montagem
      </span>
    )
  }
  if (isFinished) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
        <Crown className="h-3 w-3" />
        Finalizada
      </span>
    )
  }
  if (isInProgress) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
        <Radio className="h-3 w-3 animate-pulse" />
        Em curso
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300">
      <Calendar className="h-3 w-3" />
      Montada · {resumo.rodadas_montadas} de 7 rodadas
    </span>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, suffix, icon: Icon, accent }: {
  label: string; value: number; suffix?: string;
  icon: React.ComponentType<{ className?: string }>
  accent: 'amber' | 'emerald' | 'blue' | 'red'
}) {
  const colors = {
    amber:   { ring: 'border-amber-400/30',   text: 'text-amber-300',   bg: 'bg-amber-400/10' },
    emerald: { ring: 'border-emerald-400/30', text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
    blue:    { ring: 'border-blue-400/30',    text: 'text-blue-300',    bg: 'bg-blue-400/10' },
    red:     { ring: 'border-red-400/30',     text: 'text-red-300',     bg: 'bg-red-400/10' },
  }[accent]
  return (
    <div className={`relative overflow-hidden rounded-xl border ${colors.ring} ${colors.bg} px-4 py-3 backdrop-blur-sm`}>
      <Icon className={`mb-2 h-4 w-4 ${colors.text}`} />
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1 text-2xl font-extrabold tabular-nums text-white">
        {value}
        {suffix && <span className="text-xs font-medium text-white/50">{suffix}</span>}
      </p>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] py-16 text-center">
      <Trophy className="h-10 w-10 text-[var(--muted-foreground)]/30" />
      <p className="mt-4 text-sm font-semibold text-[var(--muted-foreground)]">
        A Liga Super 8 ainda não foi montada
      </p>
      <p className="mt-1 max-w-sm text-xs text-[var(--muted-foreground)]/70">
        A Comissão Organizadora irá definir os 8 participantes e a tabela das 7 rodadas
        durante o Congresso Técnico.
      </p>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Standings — tabela de classificação
// ─────────────────────────────────────────────────────────────────────────────

function Standings({ standings, cutoff }: { standings: Super8Standing[]; cutoff: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            <th className="py-2.5 pl-4 text-left font-bold">#</th>
            <th className="py-2.5 text-left font-bold">Atlética</th>
            <th className="py-2.5 text-center font-bold" title="Pontos">PTS</th>
            <th className="hidden py-2.5 text-center font-bold sm:table-cell" title="Jogos">J</th>
            <th className="hidden py-2.5 text-center font-bold sm:table-cell" title="Vitórias">V</th>
            <th className="hidden py-2.5 text-center font-bold md:table-cell" title="Derrotas">D</th>
            <th className="hidden py-2.5 text-center font-bold md:table-cell" title="Saldo">SG</th>
            <th className="hidden py-2.5 text-center font-bold md:table-cell" title="W.O.">W.O.</th>
            <th className="py-2.5 pr-4 text-right font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => {
            const pos = idx + 1
            const sobeAcesso = pos <= cutoff
            const confMeta = s.conferencia ? getConferencia(s.conferencia) : null
            const corBorda = confMeta?.cor ?? s.cor_primaria ?? '#94a3b8'
            return (
              <tr
                key={s.atletica_id}
                className={`group relative border-b border-[var(--border)]/40 transition-colors hover:bg-[var(--green-dim)]/5 ${
                  sobeAcesso ? 'bg-emerald-500/[0.03]' : ''
                }`}
              >
                {/* Posição com indicador de zona de acesso */}
                <td className="py-3 pl-4 align-middle">
                  <div className="flex items-center gap-2">
                    {sobeAcesso && (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    )}
                    <span className={`text-base font-extrabold tabular-nums ${sobeAcesso ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>
                      {pos}
                    </span>
                  </div>
                </td>

                {/* Atlética */}
                <td className="py-3 align-middle">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="h-6 w-1 rounded-full" style={{ background: corBorda }} />
                    {s.slug ? (
                      <Link
                        href={`/atleticas/${s.slug}`}
                        className="group/team inline-flex items-center gap-1 font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--green-bright)]"
                      >
                        {s.nome}
                        <ArrowUpRight
                          className="h-3 w-3 opacity-0 transition-opacity group-hover/team:opacity-60"
                          style={{ color: corBorda }}
                        />
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--foreground)]">{s.nome}</span>
                    )}
                    {confMeta && (
                      <span
                        className="hidden rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider md:inline-flex"
                        style={{
                          background: `${confMeta.cor}18`,
                          color: confMeta.cor,
                          border: `1px solid ${confMeta.cor}40`,
                        }}
                      >
                        {confMeta.icone} {confMeta.nome}
                      </span>
                    )}
                  </div>
                </td>

                {/* Pontos — destaque */}
                <td className="py-3 text-center align-middle">
                  <span className={`text-lg font-extrabold tabular-nums ${sobeAcesso ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>
                    {s.pontos}
                  </span>
                </td>

                <td className="hidden py-3 text-center align-middle text-sm tabular-nums text-[var(--muted-foreground)] sm:table-cell">
                  {s.jogados}
                </td>
                <td className="hidden py-3 text-center align-middle text-sm tabular-nums text-[var(--muted-foreground)] sm:table-cell">
                  {s.vitorias}
                </td>
                <td className="hidden py-3 text-center align-middle text-sm tabular-nums text-[var(--muted-foreground)] md:table-cell">
                  {s.derrotas}
                </td>
                <td className={`hidden py-3 text-center align-middle text-sm tabular-nums md:table-cell ${
                  s.saldo > 0 ? 'text-emerald-400' : s.saldo < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'
                }`}>
                  {s.saldo > 0 ? '+' : ''}{s.saldo}
                </td>
                <td className="hidden py-3 text-center align-middle md:table-cell">
                  {s.wos > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                      <UserX className="h-2.5 w-2.5" />
                      {s.wos}
                    </span>
                  ) : (
                    <span className="text-[var(--muted-foreground)]/40">—</span>
                  )}
                </td>

                {/* Posição no sorteio A1-A8 */}
                <td className="py-3 pr-4 text-right align-middle">
                  {s.posicao_sorteio && (
                    <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--muted-foreground)]">
                      A{s.posicao_sorteio}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legenda */}
      <div className="border-t border-[var(--border)] bg-[var(--muted)]/20 px-4 py-2 text-[10px] text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-emerald-400" />
          <span className="font-semibold text-emerald-400">Top 4</span>
          sobem para a 2ª Divisão · Critérios de desempate: pontos → vitórias → saldo
        </span>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// RoundsGrid — 7 rodadas × 4 jogos
// ─────────────────────────────────────────────────────────────────────────────

function RoundsGrid({ rows }: { rows: Super8Row[] }) {
  const porRodada = new Map<number, Super8Row[]>()
  for (const r of rows) {
    if (!porRodada.has(r.rodada)) porRodada.set(r.rodada, [])
    porRodada.get(r.rodada)!.push(r)
  }
  const rodadas = Array.from(porRodada.keys()).sort()

  if (rodadas.length === 0) return null

  return (
    <div className="space-y-4">
      {rodadas.map(numRodada => {
        const jogos = porRodada.get(numRodada)!
        return (
          <div key={numRodada} className="rounded-xl border border-[var(--border)] bg-[var(--card)]/30 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <span className="rounded-md bg-[var(--green-dim)]/30 px-2 py-0.5 font-mono text-[var(--green-bright)]">
                R{numRodada}
              </span>
              Rodada {numRodada}
              <span className="text-[var(--muted-foreground)]/50">· {jogos.length} jogo{jogos.length !== 1 ? 's' : ''}</span>
            </h3>
            <div className="grid gap-2 md:grid-cols-2">
              {jogos.map(j => <JogoCard key={j.id} row={j} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function JogoCard({ row }: { row: Super8Row }) {
  const j = row.jogo
  const isEncerrado = j?.status === 'encerrado'
  const isAoVivo    = j?.status === 'ao_vivo'
  const hasWO       = !!j?.wo

  const placarA = j?.placar_a ?? null
  const placarB = j?.placar_b ?? null
  const venceuA = isEncerrado && placarA != null && placarB != null && placarA > placarB && !hasWO
  const venceuB = isEncerrado && placarA != null && placarB != null && placarB > placarA && !hasWO

  const woA = j?.wo === 'a' || j?.wo === 'duplo'
  const woB = j?.wo === 'b' || j?.wo === 'duplo'

  const corA = row.atletica_a?.cor_primaria ?? getConferencia(row.atletica_a?.conferencia)?.cor ?? '#94a3b8'
  const corB = row.atletica_b?.cor_primaria ?? getConferencia(row.atletica_b?.conferencia)?.cor ?? '#94a3b8'

  return (
    <div className={`relative rounded-lg border p-3 transition-all ${
      hasWO        ? 'border-red-500/30 bg-red-500/[0.04]' :
      isAoVivo     ? 'border-emerald-400/40 bg-emerald-400/[0.06]' :
      isEncerrado  ? 'border-[var(--border)]/50 bg-[var(--card)]/20' :
                     'border-[var(--border)] bg-[var(--card)]/40'
    }`}>
      {/* Meta */}
      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
        {row.modalidade && (
          <span className="font-semibold">
            {row.modalidade.icone} {row.modalidade.nome}
          </span>
        )}
        {row.categoria && (
          <>
            <span>·</span>
            <span>{row.categoria}</span>
          </>
        )}
        {isAoVivo && (
          <span className="ml-auto inline-flex items-center gap-1 text-emerald-400">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            <span className="font-bold uppercase">Ao vivo</span>
          </span>
        )}
        {hasWO && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
            <UserX className="h-2.5 w-2.5" />
            W.O.
          </span>
        )}
      </div>

      {/* Confronto */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Equipe A */}
        <div className="flex items-center gap-2 min-w-0">
          {row.posicao_a && (
            <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[var(--muted-foreground)]/70">
              A{row.posicao_a}
            </span>
          )}
          <span aria-hidden className="h-5 w-0.5 rounded-full" style={{ background: corA }} />
          <span className={`truncate text-xs font-semibold ${
            venceuA ? 'text-emerald-400' : woA ? 'text-red-400 line-through opacity-60' : 'text-[var(--foreground)]'
          }`}>
            {row.atletica_a?.nome ?? '?'}
          </span>
        </div>

        {/* Placar central */}
        <div className="shrink-0 px-2">
          {hasWO ? (
            <span className="text-[10px] font-bold uppercase text-red-400">W.O.</span>
          ) : isEncerrado && placarA != null && placarB != null ? (
            <span className="tabular-nums text-base font-extrabold text-[var(--foreground)]">
              {placarA} <span className="text-[var(--muted-foreground)]/50">×</span> {placarB}
            </span>
          ) : isAoVivo && placarA != null && placarB != null ? (
            <span className="tabular-nums text-base font-extrabold text-emerald-400">
              {placarA} <span className="text-emerald-400/50">×</span> {placarB}
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)]/40">×</span>
          )}
        </div>

        {/* Equipe B */}
        <div className="flex items-center justify-end gap-2 min-w-0">
          <span className={`truncate text-right text-xs font-semibold ${
            venceuB ? 'text-emerald-400' : woB ? 'text-red-400 line-through opacity-60' : 'text-[var(--foreground)]'
          }`}>
            {row.atletica_b?.nome ?? '?'}
          </span>
          <span aria-hidden className="h-5 w-0.5 rounded-full" style={{ background: corB }} />
          {row.posicao_b && (
            <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[var(--muted-foreground)]/70">
              A{row.posicao_b}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--foreground)]">
          <span className="text-[var(--green-bright)]">{icon}</span>
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{subtitle}</p>}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Client-side recompute — duplica a lógica de super8.ts pra evitar import
// server-only em código client. Mantém em sync com PONTOS_VITORIA_SUPER8 = 13.
// ─────────────────────────────────────────────────────────────────────────────

const PTS_VIT = 13

function recomputeClient(rows: Super8Row[], participantes: Super8Participante[]): Super8Standing[] {
  if (participantes.length === 0) return []

  const stats = new Map<string, Super8Standing>(
    participantes.map(p => [p.atletica_id, {
      atletica_id: p.atletica_id, nome: p.nome, slug: p.slug,
      conferencia: p.conferencia, cor_primaria: p.cor_primaria,
      posicao_sorteio: p.posicao === 99 ? null : p.posicao,
      pontos: 0, jogados: 0, vitorias: 0, derrotas: 0, empates: 0,
      saldo: 0, pontos_pro: 0, pontos_contra: 0, wos: 0,
    }]),
  )

  for (const r of rows) {
    const j = r.jogo; if (!j) continue
    const a = stats.get(r.atletica_a_id); const b = stats.get(r.atletica_b_id)
    if (!a || !b) continue

    if (j.wo) {
      a.jogados += 1; b.jogados += 1
      if (j.wo === 'duplo') { a.derrotas += 1; b.derrotas += 1; a.wos += 1; b.wos += 1 }
      else if (j.wo === 'a') { b.vitorias += 1; b.pontos += PTS_VIT; a.derrotas += 1; a.wos += 1 }
      else if (j.wo === 'b') { a.vitorias += 1; a.pontos += PTS_VIT; b.derrotas += 1; b.wos += 1 }
      continue
    }
    if (j.status !== 'encerrado' || j.placar_a == null || j.placar_b == null) continue
    a.jogados += 1; b.jogados += 1
    a.pontos_pro += j.placar_a; a.pontos_contra += j.placar_b
    b.pontos_pro += j.placar_b; b.pontos_contra += j.placar_a
    a.saldo = a.pontos_pro - a.pontos_contra
    b.saldo = b.pontos_pro - b.pontos_contra
    if (j.placar_a > j.placar_b)      { a.vitorias += 1; a.pontos += PTS_VIT; b.derrotas += 1 }
    else if (j.placar_b > j.placar_a) { b.vitorias += 1; b.pontos += PTS_VIT; a.derrotas += 1 }
    else                              { a.empates += 1; b.empates += 1 }
  }

  return Array.from(stats.values()).sort((a, b) =>
    b.pontos - a.pontos || b.vitorias - a.vitorias || b.saldo - a.saldo || a.nome.localeCompare(b.nome),
  )
}
