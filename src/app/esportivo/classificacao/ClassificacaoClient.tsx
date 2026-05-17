'use client'

/**
 * ClassificacaoClient — Página dedicada da classificação CIA 2026
 *
 * Mostra as 3 divisões (1ª, 2ª, Super 08 Conferências) em tabs com
 * tabelas detalhadas: pontos atuais (Art. 44/46), previsão Mín/Máx,
 * modalidades vivas, J/V/D/SG.
 */

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Trophy, TrendingUp, Zap, Crown, ArrowLeft, Info, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CONFERENCIAS } from '@/lib/conferencias'

// ── Types ────────────────────────────────────────────────────────────────────

interface AtleticaRow {
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

interface ConferenciaGroup {
  conferencia: string
  equipes: AtleticaRow[]
}

interface Props {
  div1: AtleticaRow[]
  div2: AtleticaRow[]
  super08: ConferenciaGroup[]
}

type TabKey = 'div1' | 'div2' | 'super08'

// ── Avatar com inicial + cor primária ────────────────────────────────────────

function AtleticaAvatar({ nome, cor, size = 28 }: { nome: string; cor: string | null; size?: number }) {
  const initial = (nome ?? '?').trim().charAt(0).toUpperCase()
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, flexShrink: 0,
        background: cor ?? 'var(--muted)',
        color: cor ? 'white' : 'var(--muted-foreground)',
        borderRadius: 7,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.46, fontWeight: 800,
        letterSpacing: '-0.02em',
        boxShadow: cor ? `0 1px 3px ${cor}33` : 'none',
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
      }}
    >
      {initial}
    </span>
  )
}

// ── PrevisaoBar — Atual → Máximo ────────────────────────────────────────────

function PrevisaoBar({ atual, max, globalMax, accent }: {
  atual: number; max: number; globalMax: number; accent: string
}) {
  const safeMax  = Math.max(globalMax, 1)
  const pctAtual = Math.max(0, Math.min(100, (atual / safeMax) * 100))
  const pctMax   = Math.max(0, Math.min(100, (max   / safeMax) * 100))
  const decidido = atual === max

  return (
    <div
      className="relative h-2 w-full overflow-hidden rounded-full"
      style={{ background: 'var(--muted)', minWidth: 100, maxWidth: 180 }}
    >
      {!decidido && (
        <div
          style={{
            position: 'absolute', inset: 0, width: `${pctMax}%`,
            background: `${accent}22`,
            borderRadius: 99,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute', inset: 0, width: `${pctAtual}%`,
          background: accent,
          borderRadius: 99,
          transition: 'width 0.4s ease',
          boxShadow: `0 0 8px ${accent}55`,
        }}
      />
    </div>
  )
}

// ── StandingsTable ──────────────────────────────────────────────────────────

function StandingsTable({ equipes, accent, promoteSpots, relegateSpots, compact }: {
  equipes: AtleticaRow[]
  accent: string
  promoteSpots?: number
  relegateSpots?: number
  compact?: boolean
}) {
  const globalMax = Math.max(13, ...equipes.map(e => e.pontos_cia_max))
  const cellPad = compact ? 'py-2 px-2' : 'py-3 px-3'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: `2px solid ${accent}33` }}>
            <Th width={compact ? 36 : 48} center>#</Th>
            <Th left>Atlética</Th>
            <Th center accent={accent} tip="Pontos garantidos (Art. 44/46)">Atual</Th>
            <Th center tip="Máximo possível se vencer tudo daqui">Máx</Th>
            <Th left tip="Espaço de manobra restante (atual → máx)">Faixa</Th>
            <Th center tip="Modalidades vivas / total inscritas">Mod</Th>
            {!compact && (
              <>
                <Th center tip="Jogos disputados">J</Th>
                <Th center tip="Vitórias">V</Th>
                <Th center tip="Derrotas">D</Th>
                <Th center tip="Saldo">SG</Th>
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
                    ? `linear-gradient(90deg, ${accent}10, transparent 55%)`
                    : idx % 2 === 0 ? 'var(--card)' : 'transparent',
                  borderLeft: isPromote
                    ? `3px solid ${accent}`
                    : isRelegate
                    ? '3px solid var(--destructive)'
                    : '3px solid transparent',
                }}
              >
                <td className={cellPad} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  {medal ? (
                    <span style={{ fontSize: compact ? 14 : 18 }}>{medal}</span>
                  ) : (
                    <span
                      className="font-bold tabular-nums"
                      style={{ fontSize: compact ? 11 : 13, color: 'var(--muted-foreground)' }}
                    >
                      {pos}
                    </span>
                  )}
                </td>
                <td className={cellPad}>
                  <Link
                    href={`/atleticas/${eq.slug}`}
                    className="flex items-center gap-2.5"
                    style={{ textDecoration: 'none' }}
                  >
                    <AtleticaAvatar nome={eq.nome} cor={eq.cor_primaria} size={compact ? 22 : 28} />
                    <div className="min-w-0">
                      <p
                        className="truncate text-[var(--foreground)] font-bold leading-tight"
                        style={{
                          fontSize: compact ? 12 : 14,
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {eq.nome}
                      </p>
                      {!compact && eq.universidade && (
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/55">
                          {eq.universidade}
                        </p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className={cellPad} style={{ textAlign: 'center' }}>
                  <span
                    className="tabular-nums font-extrabold"
                    style={{
                      fontSize: compact ? 14 : 19,
                      color: accent,
                      letterSpacing: '-0.02em',
                      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                    }}
                  >
                    {eq.pontos_cia}
                  </span>
                </td>
                <td className={cellPad} style={{ textAlign: 'center' }}>
                  <span
                    className="tabular-nums font-semibold"
                    style={{
                      fontSize: compact ? 11 : 13,
                      color: decisivo ? 'var(--muted-foreground)' : 'var(--foreground)',
                      opacity: decisivo ? 0.4 : 0.85,
                    }}
                  >
                    {decisivo ? '✓' : eq.pontos_cia_max}
                  </span>
                </td>
                <td className={cellPad}>
                  <PrevisaoBar atual={eq.pontos_cia} max={eq.pontos_cia_max} globalMax={globalMax} accent={accent} />
                </td>
                <td className={cellPad} style={{ textAlign: 'center' }}>
                  <span className="inline-flex items-baseline gap-px text-[11px] tabular-nums">
                    <span
                      className="font-extrabold"
                      style={{ fontSize: compact ? 12 : 14, color: eq.vivas > 0 ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                    >
                      {eq.vivas}
                    </span>
                    <span className="text-[var(--muted-foreground)]/35 font-semibold">/{eq.total_inscricoes}</span>
                  </span>
                </td>
                {!compact && (
                  <>
                    <td className="py-3 px-3 text-center text-[12px] tabular-nums text-[var(--muted-foreground)]">{eq.jogados}</td>
                    <td className="py-3 px-3 text-center text-[12px] tabular-nums text-[var(--muted-foreground)]">{eq.vitorias}</td>
                    <td className="py-3 px-3 text-center text-[12px] tabular-nums text-[var(--muted-foreground)]">{eq.derrotas}</td>
                    <td className="py-3 px-3 text-center text-[12px] font-bold tabular-nums">
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
  if (saldo > 0) return <span className="text-[var(--green-bright)]">+{saldo}</span>
  if (saldo < 0) return <span className="text-[var(--destructive)]">{saldo}</span>
  return <span className="text-[var(--muted-foreground)]/45">0</span>
}

// ── DivisionPanel ───────────────────────────────────────────────────────────

function DivisionPanel({
  equipes, accent, title, subtitle, promoteSpots, relegateSpots, allZeroMsg,
}: {
  equipes: AtleticaRow[]
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
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: `${accent}18`,
              border: `1px solid ${accent}33`,
              boxShadow: `0 0 18px ${accent}18`,
            }}
          >
            <Trophy style={{ width: 19, height: 19, color: accent }} />
          </div>
          <div>
            <h2
              className="font-extrabold tracking-tight md:text-2xl"
              style={{
                fontSize: 22,
                color: accent,
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              {title}
            </h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
              {equipes.length} equipes · {subtitle}
            </p>
          </div>
        </div>

        {!allZero && leader && (
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
            <Crown style={{ width: 14, height: 14, color: accent }} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/65">Líder</span>
            <span className="text-sm font-extrabold text-[var(--foreground)]">{leader.nome}</span>
            <span className="text-[11px] font-extrabold tabular-nums" style={{ color: accent }}>
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
          ⏳ {allZeroMsg}
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

      {(promoteSpots || relegateSpots) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] font-semibold text-[var(--muted-foreground)]/70">
          {promoteSpots && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: accent }} />
              Posições 1–{promoteSpots} {relegateSpots ? 'sobem' : 'classificam para fase final'}
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

// ── Super08Panel ────────────────────────────────────────────────────────────

function Super08Panel({ groups }: { groups: ConferenciaGroup[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(232,184,47,0.14)',
              border: '1px solid rgba(232,184,47,0.35)',
              boxShadow: '0 0 18px rgba(232,184,47,0.18)',
            }}
          >
            <Zap style={{ width: 19, height: 19, color: 'var(--gold-vivid)' }} />
          </div>
          <div>
            <h2
              className="font-extrabold tracking-tight md:text-2xl"
              style={{
                fontSize: 22,
                color: 'var(--gold-vivid)',
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              Super 08 · Conferências
            </h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
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
                    <p className="truncate text-[10px] italic text-[var(--muted-foreground)]/65">{vibe}</p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{ background: `${cor}18`, color: cor }}
                >
                  {group.equipes.length}/8
                </span>
              </div>

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

              {group.equipes.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs italic text-[var(--muted-foreground)]/60">Aguardando confirmações</p>
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

// ── Main ────────────────────────────────────────────────────────────────────

export function ClassificacaoClient({ div1, div2, super08 }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('div1')
  const [liveSync, setLiveSync] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('classificacao-realtime')
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
    key: TabKey
    title: string
    sub: string
    accent: string
    count: number
    icon: React.ReactNode
  }> = [
    { key: 'div1',    title: '1ª Divisão',     sub: 'Elite',    accent: 'var(--gold-bright)',  count: div1.length, icon: <Trophy className="h-3.5 w-3.5" /> },
    { key: 'div2',    title: '2ª Divisão',     sub: 'Acesso',   accent: 'var(--green-bright)', count: div2.length, icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { key: 'super08', title: 'Conferências',   sub: 'Super 08', accent: 'var(--gold-vivid)',   count: super08.reduce((acc, g) => acc + g.equipes.length, 0), icon: <Zap className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <Link
              href="/esportivo"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65 hover:text-[var(--green-bright)] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Núcleo Esportivo
            </Link>
          </div>
          <p className="cia-page-header__eyebrow">Esportivo</p>
          <h1 className="cia-page-header__title">Classificação Geral</h1>
          <p className="cia-page-header__subtitle">
            Pontuação atual (Art. 44/46) e previsão Mín/Máx das atléticas. Atualiza em tempo real.
          </p>
        </div>

        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            background:  liveSync ? 'rgba(46,107,66,0.10)' : 'var(--muted)',
            color:       liveSync ? 'var(--green-bright)'  : 'var(--muted-foreground)',
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
      </header>

      {/* Tabs como cards visuais */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {tabsConfig.map(t => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                isActive ? 'shadow-[0_4px_20px_rgba(0,0,0,0.06)]' : 'hover:-translate-y-0.5 hover:shadow-sm'
              }`}
              style={{
                background: 'var(--card)',
                borderColor: isActive ? t.accent : 'var(--border)',
                borderWidth: isActive ? 2 : 1,
                padding: isActive ? '13px' : '14px',
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
                      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
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

      {/* Tab content */}
      <div>
        {tab === 'div1' && (
          <DivisionPanel
            equipes={div1}
            accent="var(--gold-bright)"
            title="1ª Divisão"
            subtitle="Elite"
            promoteSpots={3}
            relegateSpots={2}
            allZeroMsg="Competição ainda não iniciou — a classificação atualiza em tempo real quando os jogos começarem."
          />
        )}
        {tab === 'div2' && (
          <DivisionPanel
            equipes={div2}
            accent="var(--green-bright)"
            title="2ª Divisão"
            subtitle="Acesso"
            promoteSpots={4}
            allZeroMsg="Competição ainda não iniciou — a classificação atualiza em tempo real quando os jogos começarem."
          />
        )}
        {tab === 'super08' && <Super08Panel groups={super08} />}
      </div>

      {/* Legenda */}
      <details className="group rounded-xl border border-[var(--border)] bg-[var(--card)]/40">
        <summary className="flex cursor-pointer items-center gap-2 list-none px-4 py-2.5">
          <Info className="h-3.5 w-3.5 text-[var(--green-bright)]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Como ler a classificação
          </span>
          <span className="ml-auto text-[var(--muted-foreground)]/50 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-2 text-[12px] text-[var(--muted-foreground)]">
          <p><strong className="text-[var(--foreground)]">Atual</strong> — pontos já garantidos pela atlética (Art. 44/46 do regulamento). Inclui os pisos mínimos das modalidades em que ela está classificada.</p>
          <p><strong className="text-[var(--foreground)]">Máx</strong> — máximo teórico se vencer tudo daqui em diante. Aparece "✓" quando o atual já é igual ao máx (todas modalidades decididas).</p>
          <p><strong className="text-[var(--foreground)]">Faixa</strong> — barra verde do atual + faixa clara mostrando o máximo possível. Quanto mais clara a faixa, mais espaço de manobra a atlética ainda tem.</p>
          <p><strong className="text-[var(--foreground)]">Mod</strong> — modalidades vivas (com final ainda pra disputar) / total de modalidades em que a atlética se inscreveu.</p>
          <p><strong className="text-[var(--foreground)]">SG</strong> — saldo de gols/pontos das partidas encerradas.</p>
        </div>
      </details>
    </div>
  )
}
