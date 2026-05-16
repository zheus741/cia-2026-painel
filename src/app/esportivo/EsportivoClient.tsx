'use client'

/**
 * EsportivoClient — Hub da seção esportiva (classificação + previsão)
 *
 * Aesthetic: editorial esportivo CIA — paleta creme/verde/ouro do design system,
 * tipografia display em Orbitron, hierarquia clara hero → stats → tabs → tabela.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Trophy, Calendar, Radio, Zap, Crown, TrendingUp, Users, Swords,
  Sparkles, ChevronRight, Clock,
} from 'lucide-react'
import { CONFERENCIAS } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────

interface AtleticaWithStats {
  id: string; nome: string; slug: string
  divisao: string | null; conferencia: string | null
  seed: number | null; universidade: string | null; cor_primaria: string | null
  jogados: number; vitorias: number; empates: number; derrotas: number
  gols_pro: number; gols_contra: number; saldo: number
  pontos: number
  pontos_cia: number; pontos_cia_max: number
  vivas: number; decididas: number
  total_inscricoes: number
}

interface UpcomingJogo {
  id: string
  equipe_a_id: string | null; equipe_b_id: string | null
  equipe_a_nome: string | null; equipe_b_nome: string | null
  inicio: string | null; fase: string | null; divisao: string | null
  modalidade_nome: string | null; modalidade_icone: string | null
}

interface ConferenciaGroup {
  conferencia: string
  equipes: AtleticaWithStats[]
}

interface Props {
  div1: AtleticaWithStats[]
  div2: AtleticaWithStats[]
  super08: ConferenciaGroup[]
  upcoming: UpcomingJogo[]
  totalJogos: number
  totalAtleticas: number
  aoVivoCount: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
  } catch { return '—' }
}
function fmtTime(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  } catch { return '' }
}

// Countdown pro CIA 2026 — 04 a 07 de junho de 2026
function useCountdown(): { days: number; phase: 'pre' | 'during' | 'after' } {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const start = new Date(2026, 5, 4, 0, 0, 0).getTime()  // jun = 5
  const end   = new Date(2026, 5, 7, 23, 59, 59).getTime()
  if (now < start) return { days: Math.ceil((start - now) / 86_400_000), phase: 'pre' }
  if (now <= end)  return { days: Math.ceil((end - now) / 86_400_000), phase: 'during' }
  return { days: 0, phase: 'after' }
}

// ─── Avatar da atlética (mini quadrado com inicial + cor primária) ──────────
function AtleticaAvatar({ nome, cor, size = 24 }: { nome: string; cor: string | null; size?: number }) {
  const initial = (nome ?? '?').trim().charAt(0).toUpperCase()
  return (
    <span
      style={{
        width: size, height: size, flexShrink: 0,
        background: cor ?? 'var(--muted)',
        color: cor ? 'white' : 'var(--muted-foreground)',
        borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, fontWeight: 800,
        letterSpacing: '-0.02em',
        boxShadow: cor ? `0 1px 3px ${cor}33` : 'none',
        fontFamily: 'var(--font-display, system-ui)',
      }}
      aria-hidden
    >
      {initial}
    </span>
  )
}

// ─── PrevisaoBar — Atual → Máximo ─────────────────────────────────────────────
function PrevisaoBar({ atual, max, globalMax, accent }: {
  atual: number; max: number; globalMax: number; accent: string
}) {
  const safeMax  = Math.max(globalMax, 1)
  const pctAtual = Math.max(0, Math.min(100, (atual / safeMax) * 100))
  const pctMax   = Math.max(0, Math.min(100, (max   / safeMax) * 100))
  const decidido = atual === max

  return (
    <div style={{
      position: 'relative', width: '100%', minWidth: 90, maxWidth: 180,
      height: 8, background: 'var(--muted)', borderRadius: 99, overflow: 'hidden',
    }}>
      {!decidido && (
        <div style={{
          position: 'absolute', inset: 0, width: `${pctMax}%`,
          background: `${accent}22`, borderRadius: 99,
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0, width: `${pctAtual}%`,
        background: accent, borderRadius: 99,
        transition: 'width 0.4s ease',
        boxShadow: `0 0 8px ${accent}55`,
      }} />
    </div>
  )
}

// ─── StandingsTable — tabela de classificação ────────────────────────────────

interface StandingsTableProps {
  equipes: AtleticaWithStats[]
  accent: string
  promoteSpots?: number
  relegateSpots?: number
  compact?: boolean
}

function StandingsTable({ equipes, accent, promoteSpots, relegateSpots, compact }: StandingsTableProps) {
  const globalMax = Math.max(13, ...equipes.map(e => e.pontos_cia_max))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: `2px solid ${accent}33` }}>
            <Th width={compact ? 36 : 44} center>#</Th>
            <Th left>Atlética</Th>
            <Th center accent={accent} tip="Pontos garantidos (Art. 44/46)">Atual</Th>
            <Th center tip="Máximo possível se vencer tudo daqui">Máx</Th>
            <Th left tip="Espaço de manobra restante (atual → máx)">Faixa</Th>
            <Th center tip="Modalidades vivas / total inscritas">Mod</Th>
            {!compact && (
              <>
                <Th center>J</Th>
                <Th center>V</Th>
                <Th center>D</Th>
                <Th center>SG</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {equipes.map((eq, idx) => {
            const pos = idx + 1
            const isPromote  = promoteSpots != null && pos <= promoteSpots
            const isRelegate = relegateSpots != null && pos > equipes.length - relegateSpots
            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null
            const decisivo = eq.pontos_cia === eq.pontos_cia_max
            const isLeader = pos === 1

            return (
              <tr
                key={eq.id}
                className="group transition-colors hover:bg-[var(--green-dim)]/30"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: isLeader
                    ? `linear-gradient(90deg, ${accent}10, transparent 50%)`
                    : idx % 2 === 0 ? 'var(--card)' : 'var(--muted)/30',
                  borderLeft: isPromote
                    ? `3px solid ${accent}`
                    : isRelegate
                    ? '3px solid var(--destructive)'
                    : '3px solid transparent',
                }}
              >
                {/* Position */}
                <td className={compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  {medal ? (
                    <span style={{ fontSize: compact ? 14 : 17 }}>{medal}</span>
                  ) : (
                    <span style={{
                      fontSize: compact ? 11 : 13, fontWeight: 700,
                      color: 'var(--muted-foreground)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {pos}
                    </span>
                  )}
                </td>

                {/* Atlética name + avatar */}
                <td className={compact ? 'py-1.5 px-2' : 'py-2.5 px-3'}>
                  <Link
                    href={`/atleticas/${eq.slug}`}
                    className="flex items-center gap-2 group/link transition-colors"
                    style={{ textDecoration: 'none' }}
                  >
                    <AtleticaAvatar nome={eq.nome} cor={eq.cor_primaria} size={compact ? 20 : 26} />
                    <span
                      className="truncate"
                      style={{
                        fontSize: compact ? 12 : 14,
                        fontWeight: 700,
                        color: 'var(--foreground)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {eq.nome}
                    </span>
                  </Link>
                </td>

                {/* Atual */}
                <td className={compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: compact ? 14 : 18,
                    fontWeight: 800,
                    color: accent,
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: 'var(--font-display, system-ui)',
                    letterSpacing: '-0.02em',
                  }}>
                    {eq.pontos_cia}
                  </span>
                </td>

                {/* Max */}
                <td className={compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: compact ? 11 : 13,
                    fontWeight: 600,
                    color: decisivo ? 'var(--muted-foreground)' : 'var(--foreground)',
                    fontVariantNumeric: 'tabular-nums',
                    opacity: decisivo ? 0.4 : 0.85,
                  }}>
                    {decisivo ? '✓' : eq.pontos_cia_max}
                  </span>
                </td>

                {/* Faixa bar */}
                <td className={compact ? 'py-1.5 px-2' : 'py-2.5 px-3'}>
                  <PrevisaoBar
                    atual={eq.pontos_cia}
                    max={eq.pontos_cia_max}
                    globalMax={globalMax}
                    accent={accent}
                  />
                </td>

                {/* Modalidades vivas */}
                <td className={compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'baseline', gap: 1,
                    fontSize: 11, fontVariantNumeric: 'tabular-nums',
                  }}>
                    <span style={{
                      fontWeight: 800,
                      color: eq.vivas > 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
                      fontSize: 13,
                    }}>
                      {eq.vivas}
                    </span>
                    <span style={{ opacity: 0.35, fontWeight: 600 }}>/{eq.total_inscricoes}</span>
                  </span>
                </td>

                {!compact && (
                  <>
                    <td className="py-2.5 px-3" style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                      {eq.jogados}
                    </td>
                    <td className="py-2.5 px-3" style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                      {eq.vitorias}
                    </td>
                    <td className="py-2.5 px-3" style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                      {eq.derrotas}
                    </td>
                    <td className="py-2.5 px-3" style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      <SaldoCell saldo={eq.saldo} />
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, center, left, accent, tip, width }: {
  children: React.ReactNode
  center?: boolean; left?: boolean
  accent?: string; tip?: string
  width?: number
}) {
  return (
    <th
      title={tip}
      style={{
        padding: '10px 12px',
        textAlign: center ? 'center' : left ? 'left' : 'center',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: accent ?? 'var(--muted-foreground)',
        whiteSpace: 'nowrap',
        width: width ?? 'auto',
      }}
    >
      {children}
    </th>
  )
}

function SaldoCell({ saldo }: { saldo: number }) {
  if (saldo > 0) return <span style={{ color: 'var(--green-bright)' }}>+{saldo}</span>
  if (saldo < 0) return <span style={{ color: 'var(--destructive)' }}>{saldo}</span>
  return <span style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>0</span>
}

// ─── Division panels ──────────────────────────────────────────────────────────

function DivisionPanel({
  equipes, accent, title, subtitle, promoteSpots, relegateSpots, allZeroMsg,
}: {
  equipes: AtleticaWithStats[]
  accent: string
  title: string; subtitle: string
  promoteSpots?: number
  relegateSpots?: number
  allZeroMsg?: string
}) {
  const allZero = equipes.every(e => e.pontos_cia === 0 && e.pontos_cia_max === 0)
  const leader  = equipes[0]

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: `${accent}15`,
              border: `1px solid ${accent}33`,
              boxShadow: `0 0 16px ${accent}15`,
            }}
          >
            <Trophy style={{ width: 18, height: 18, color: accent }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl"
                style={{ color: accent, fontFamily: 'var(--font-display, system-ui)' }}>
              {title}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
              {equipes.length} equipes · {subtitle}
            </p>
          </div>
        </div>

        {!allZero && leader && (
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
            <Crown style={{ width: 14, height: 14, color: accent }} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/65">Líder atual</span>
            <span className="text-sm font-extrabold text-[var(--foreground)]">{leader.nome}</span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: accent }}>
              {leader.pontos_cia} pts
            </span>
          </div>
        )}
      </div>

      {allZero && allZeroMsg && (
        <div
          className="rounded-xl px-4 py-3 text-xs font-semibold"
          style={{
            background: `${accent}10`,
            border: `1px solid ${accent}30`,
            color: accent,
          }}
        >
          <Clock className="inline h-3 w-3 mr-1.5 -mt-0.5" />
          {allZeroMsg}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
        <StandingsTable
          equipes={equipes}
          accent={accent}
          promoteSpots={promoteSpots}
          relegateSpots={relegateSpots}
        />
      </div>

      {/* Footer hint */}
      {(promoteSpots || relegateSpots) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] font-semibold text-[var(--muted-foreground)]/70">
          {promoteSpots && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: accent }} />
              Posições 1–{promoteSpots} {relegateSpots ? 'sobem' : 'classificam para a fase final'}
            </span>
          )}
          {relegateSpots && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[var(--destructive)]" />
              Últimas {relegateSpots} posições descem
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Conferências ────────────────────────────────────────────────────────────

function Super08Panel({ groups }: { groups: ConferenciaGroup[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
               style={{
                 background: 'rgba(232,184,47,0.12)',
                 border: '1px solid rgba(232,184,47,0.35)',
                 boxShadow: '0 0 16px rgba(232,184,47,0.18)',
               }}>
            <Zap style={{ width: 18, height: 18, color: 'var(--gold-vivid)' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl"
                style={{ color: 'var(--gold-vivid)', fontFamily: 'var(--font-display, system-ui)' }}>
              Super 08 · Conferências
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
              8 grupos · disputa eliminatória entre campeões
            </p>
          </div>
        </div>

        <Link
          href="/esportivo/super-8"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold-vivid)]/40 bg-[var(--gold-vivid)]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--gold-vivid)] transition-all hover:bg-[var(--gold-vivid)]/20"
        >
          <Trophy className="h-3 w-3" />
          Liga Super 8 (playoff)
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {groups.map(group => {
          const meta = CONFERENCIAS.find(c => c.nome === group.conferencia)
          const cor   = meta?.cor   ?? 'var(--gold-vivid)'
          const icone = meta?.icone ?? '◆'
          const vibe  = meta?.vibe  ?? ''
          const leader = group.equipes[0]

          return (
            <div
              key={group.conferencia}
              className="overflow-hidden rounded-2xl bg-[var(--card)] shadow-sm transition-shadow hover:shadow-md"
              style={{ border: `1px solid ${cor}33` }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-3.5 pt-3 pb-2"
                style={{ borderBottom: `1px solid ${cor}25` }}
              >
                <span className="text-lg leading-none" aria-hidden>{icone}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-extrabold tracking-tight" style={{ color: cor }}>
                    {group.conferencia}
                  </p>
                  {vibe && (
                    <p className="truncate text-[10px] italic text-[var(--muted-foreground)]/65">
                      {vibe}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{ background: `${cor}18`, color: cor }}
                >
                  {group.equipes.length}/8
                </span>
              </div>

              {/* Leader badge if has games */}
              {leader && leader.pontos_cia > 0 && (
                <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--muted)]/20 px-3.5 py-1.5">
                  <Crown style={{ width: 10, height: 10, color: cor }} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/65">
                    Líder
                  </span>
                  <span className="flex-1 truncate text-[11px] font-bold text-[var(--foreground)]">
                    {leader.nome}
                  </span>
                  <span className="text-[11px] font-extrabold tabular-nums" style={{ color: cor }}>
                    {leader.pontos_cia}
                  </span>
                </div>
              )}

              {/* Content */}
              {group.equipes.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs italic text-[var(--muted-foreground)]/60">
                    Aguardando confirmações
                  </p>
                </div>
              ) : (
                <div className="pb-1">
                  <StandingsTable equipes={group.equipes} accent={cor} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Upcoming games rail ─────────────────────────────────────────────────────

function UpcomingRail({ upcoming }: { upcoming: UpcomingJogo[] }) {
  if (upcoming.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[var(--green-bright)]" />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Próximos Jogos
        </h3>
        <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]/50">
          ({upcoming.length} agendados)
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2">
        {upcoming.map(jogo => (
          <div
            key={jogo.id}
            className="group flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all hover:border-[var(--green-bright)]/40 hover:-translate-y-0.5 hover:shadow-md"
            style={{ width: 240 }}
          >
            <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5">
              {jogo.modalidade_icone && (
                <span className="text-sm leading-none" aria-hidden>{jogo.modalidade_icone}</span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {jogo.modalidade_nome ?? '—'}
              </span>
              {jogo.fase && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-[var(--green-bright)]/70">
                  {jogo.fase}
                </span>
              )}
            </div>
            <div className="px-3 pt-2.5 pb-3 space-y-1.5">
              <div className="text-[12px] font-bold leading-tight text-[var(--foreground)]">
                <span className="truncate inline-block max-w-full">{jogo.equipe_a_nome ?? '?'}</span>
                <span className="mx-1.5 text-[var(--muted-foreground)] font-normal text-[10px] uppercase tracking-widest">vs</span>
                <span className="truncate inline-block max-w-full">{jogo.equipe_b_nome ?? '?'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--muted-foreground)]">
                <Clock className="h-2.5 w-2.5 text-amber-500" />
                <span className="tabular-nums text-[var(--foreground)]">
                  {fmtDateShort(jogo.inicio)} · {fmtTime(jogo.inicio)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function EsportivoClient({
  div1, div2, super08, upcoming,
  totalJogos, totalAtleticas, aoVivoCount,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'div1' | 'div2' | 'super08'>('div1')
  const [liveSync, setLiveSync] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const countdown = useCountdown()

  // Realtime: quando jogos mudam, recomputa classificação no servidor
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('esportivo-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => { router.refresh() }, 1200)
      })
      .subscribe(status => { setLiveSync(status === 'SUBSCRIBED') })
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  const tabsConfig: Array<{
    key: 'div1' | 'div2' | 'super08'
    title: string
    sub: string
    accent: string
    count: number
    icon: React.ReactNode
  }> = [
    { key: 'div1',    title: '1ª Divisão',  sub: 'Elite',    accent: 'var(--gold-bright)',  count: div1.length,                                    icon: <Trophy className="h-3.5 w-3.5" /> },
    { key: 'div2',    title: '2ª Divisão',  sub: 'Acesso',   accent: 'var(--green-bright)', count: div2.length,                                    icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { key: 'super08', title: 'Conferências', sub: 'Super 08', accent: 'var(--gold-vivid)',   count: super08.reduce((acc, g) => acc + g.equipes.length, 0), icon: <Zap className="h-3.5 w-3.5" /> },
  ]

  const countdownLabel = useMemo(() => {
    if (countdown.phase === 'pre') return countdown.days === 1 ? '1 DIA' : `${countdown.days} DIAS`
    if (countdown.phase === 'during') return 'AO VIVO'
    return 'ENCERRADO'
  }, [countdown])

  const countdownSub = useMemo(() => {
    if (countdown.phase === 'pre') return 'até o evento começar'
    if (countdown.phase === 'during') return 'evento em andamento'
    return 'até a próxima edição'
  }, [countdown])

  return (
    <div className="space-y-6">

      {/* ─── Page header + overview stats ─── */}
      <div className="space-y-4">
        {/* Eyebrow + title */}
        <header className="cia-page-header flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="cia-page-header__eyebrow">Esportivo</p>
            <h1 className="cia-page-header__title">Núcleo Esportivo</h1>
            <p className="cia-page-header__subtitle">
              Classificação ao vivo, previsão Mín/Máx (Art. 44/46) e próximos jogos da Copa Inter Atléticas 2026.
            </p>
          </div>

          {/* Realtime + countdown stack */}
          <div className="flex flex-col items-end gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: liveSync ? 'rgba(46,107,66,0.10)' : 'var(--muted)',
                color:      liveSync ? 'var(--green-bright)'  : 'var(--muted-foreground)',
                borderColor: liveSync ? 'rgba(46,107,66,0.35)' : 'var(--border)',
              }}
            >
              <span
                className={liveSync ? 'animate-pulse' : ''}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: liveSync ? 'var(--green-bright)' : 'var(--muted-foreground)',
                  display: 'inline-block',
                  boxShadow: liveSync ? '0 0 8px var(--green-bright)' : 'none',
                }}
              />
              {liveSync ? 'Tempo real' : 'Conectando'}
            </span>
          </div>
        </header>

        {/* Stats overview strip */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--card)] via-[var(--card)]/85 to-[var(--card)]/40">
          {/* Glow decor */}
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-50 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(46,107,66,0.20), transparent 70%)' }}
          />
          <div className="relative grid grid-cols-2 gap-y-4 px-5 py-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
            <StatColumn
              icon={<Users className="h-4 w-4 text-[var(--green-bright)]" />}
              value={totalAtleticas}
              label="Atléticas"
            />
            <Divider />
            <StatColumn
              icon={<Swords className="h-4 w-4 text-[var(--muted-foreground)]" />}
              value={totalJogos}
              label="Jogos encerrados"
            />
            <Divider />
            <StatColumn
              icon={<Sparkles className="h-4 w-4 text-[var(--gold-bright)]" />}
              value={countdownLabel}
              label={countdownSub}
              valueSize="md"
            />

            <div className="col-span-2 ml-auto flex flex-wrap items-center gap-2 sm:col-span-1">
              {aoVivoCount > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-500/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-500">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  <span className="tabular-nums">{aoVivoCount}</span> ao vivo
                </span>
              )}
              <Link
                href="/esportivo/chaveamento"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green-bright)]/40 bg-[var(--green-dim)]/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--green-bright)] transition-all hover:bg-[var(--green-dim)]/60"
              >
                <Trophy className="h-3 w-3" />
                Ver chaveamento
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Upcoming games rail ─── */}
      <UpcomingRail upcoming={upcoming} />

      {/* ─── Tabs (cards) ─── */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {tabsConfig.map(t => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
                isActive
                  ? 'shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
                  : 'hover:-translate-y-0.5 hover:shadow-sm'
              }`}
              style={{
                background: isActive ? 'var(--card)' : 'var(--card)',
                borderColor: isActive ? t.accent : 'var(--border)',
                borderWidth: isActive ? 2 : 1,
                padding: isActive ? '13px' : '14px',  // compensar border width
              }}
            >
              {isActive && (
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl"
                  style={{ background: `radial-gradient(circle, ${t.accent}40, transparent 70%)` }}
                />
              )}

              <div className="relative flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    background: isActive ? `${t.accent}18` : 'var(--muted)',
                    color: isActive ? t.accent : 'var(--muted-foreground)',
                  }}
                >
                  {t.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-base font-extrabold tracking-tight leading-tight"
                    style={{
                      color: isActive ? t.accent : 'var(--foreground)',
                      fontFamily: 'var(--font-display, system-ui)',
                    }}
                  >
                    {t.title}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65">
                    {t.count} {t.count === 1 ? 'equipe' : 'equipes'} · {t.sub}
                  </p>
                </div>
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${isActive ? 'rotate-90' : 'group-hover:translate-x-0.5'}`}
                  style={{ color: isActive ? t.accent : 'var(--muted-foreground)' }}
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* ─── Tab content ─── */}
      <div>
        {tab === 'div1' && (
          <DivisionPanel
            equipes={div1}
            accent="var(--gold-bright)"
            title="1ª Divisão"
            subtitle="Elite"
            promoteSpots={3}
            relegateSpots={2}
            allZeroMsg="Competição ainda não iniciou — classificação atualiza em tempo real."
          />
        )}
        {tab === 'div2' && (
          <DivisionPanel
            equipes={div2}
            accent="var(--green-bright)"
            title="2ª Divisão"
            subtitle="Acesso"
            promoteSpots={4}
            allZeroMsg="Competição ainda não iniciou — classificação atualiza em tempo real."
          />
        )}
        {tab === 'super08' && (
          <Super08Panel groups={super08} />
        )}
      </div>
    </div>
  )
}

function StatColumn({
  icon, value, label, valueSize = 'lg',
}: {
  icon: React.ReactNode; value: number | string; label: string
  valueSize?: 'md' | 'lg'
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="opacity-90 flex-shrink-0">{icon}</span>
      <div className="leading-tight min-w-0">
        <p
          className={`font-extrabold tabular-nums tracking-tight text-[var(--foreground)] truncate ${
            valueSize === 'md' ? 'text-base' : 'text-xl'
          }`}
          style={{ fontFamily: 'var(--font-display, system-ui)' }}
        >
          {value}
        </p>
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65">
          {label}
        </p>
      </div>
    </div>
  )
}

function Divider() {
  return <span className="hidden sm:inline-block h-8 w-px bg-[var(--border)]" aria-hidden />
}
