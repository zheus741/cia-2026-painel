'use client'

/**
 * EsportivoClient — Hub do Núcleo Esportivo
 *
 * Estilo: editorial maximalista (mesmo idioma da home) — hero bold,
 * cards .cia-edit-card coloridos com personalidade, sem tabelas.
 * Função: hub de navegação para todas as ferramentas esportivas.
 */

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight, Trophy, Crown, Radio, TrendingUp, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uniqueChannel } from '@/lib/supabase/channel-name'
import type { PracaStats } from '@/lib/competicao/pracas'
import { groupPracasByLocal, type LocalAgrupado } from '@/lib/competicao/pracas-grupos'
export type { PracaStats } from '@/lib/competicao/pracas'

// ── Types (mantém shape esperado pela page.tsx) ──────────────────────────────

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

interface ConferenciaGroup { conferencia: string; equipes: AtleticaWithStats[] }

interface Props {
  div1: AtleticaWithStats[]
  div2: AtleticaWithStats[]
  super08: ConferenciaGroup[]
  upcoming: UpcomingJogo[]
  totalJogos: number
  totalAtleticas: number
  aoVivoCount: number
  pracas: PracaStats[]
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }) }
  catch { return '—' }
}
function fmtTime(iso: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) }
  catch { return '' }
}

// ── CountUp (animação) ──────────────────────────────────────────────────────

function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (to === 0) { setVal(0); return }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(ease * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <>{val}</>
}

// ── CircleArrow (signature) ──────────────────────────────────────────────────

function CircleArrow({ size = 40, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <span
      className="cia-circle-arrow"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: dark ? '#0A0F0B' : '#FFFFFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(10,15,11,0.18)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <ArrowUpRight
        style={{
          width: size * 0.42, height: size * 0.42,
          color: dark ? '#FFFFFF' : '#0A0F0B',
          strokeWidth: 2,
        }}
      />
    </span>
  )
}

function Pill({ children, bg = 'rgba(10,15,11,0.08)', color = '#0A0F0B' }: {
  children: React.ReactNode; bg?: string; color?: string
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 11px', borderRadius: 999,
      background: bg, color,
      fontSize: 11.5, fontWeight: 600,
      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ─── EstadoCompeticaoCard (gold — como o pipeline da home) ───────────────────

function EstadoCompeticaoCard({
  totalJogos, totalAtleticas, aoVivoCount, totalAgendados,
}: {
  totalJogos: number; totalAtleticas: number; aoVivoCount: number; totalAgendados: number
}) {
  const totalGeral = totalJogos + totalAgendados + aoVivoCount
  const pct = totalGeral > 0 ? Math.round((totalJogos / totalGeral) * 100) : 0
  const status =
    totalGeral === 0 ? 'aguardando' :
    pct >= 60         ? 'em ritmo'   :
    pct >= 25         ? 'em curso'   :
                        'inicial'
  const statusEmoji =
    totalGeral === 0 ? '○' :
    pct >= 60         ? '●' :
    pct >= 25         ? '◑' :
                        '◐'

  return (
    <Link href="/esportivo/chaveamento" className="cia-edit-card cia-edit-card--gold group">
      {/* eyebrow + status */}
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(70, 50, 5, 0.65)',
          letterSpacing: '-0.01em',
        }}>
          estado da competição
        </span>
        <Pill bg="rgba(70,50,5,0.12)" color="#46320C">
          {statusEmoji} {status}
        </Pill>
      </div>

      {/* big % */}
      <div className="flex-1 flex flex-col justify-center" style={{ marginTop: 18 }}>
        <div className="flex items-baseline gap-2">
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(72px, 8.5vw, 124px)',
            fontWeight: 800,
            lineHeight: 0.85,
            letterSpacing: '-0.05em',
            color: '#0A0F0B',
          }}>
            <CountUp to={pct} />
          </span>
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 28, fontWeight: 700,
            color: 'rgba(10,15,11,0.40)',
            letterSpacing: '-0.02em',
          }}>
            %
          </span>
        </div>
        <span style={{
          fontSize: 14, fontWeight: 500,
          color: 'rgba(10,15,11,0.62)',
          letterSpacing: '-0.01em',
          marginTop: 6,
        }}>
          {totalJogos} de {totalGeral} jogos encerrados
        </span>

        {/* Progress bar (segmented like home pipeline) */}
        <div style={{
          marginTop: 18, display: 'flex', alignItems: 'center', gap: 0,
          height: 24, borderRadius: 6, overflow: 'hidden',
          background: 'rgba(70,50,5,0.10)',
        }}>
          {pct > 0 && (
            <div style={{
              height: '100%', width: `${pct}%`,
              background: '#0A0F0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#F5DC6A',
              letterSpacing: '0.04em',
            }}>
              {pct}%
            </div>
          )}
          {aoVivoCount > 0 && (
            <div
              title={`${aoVivoCount} ao vivo`}
              style={{
                height: '100%',
                width: `${Math.max(8, (aoVivoCount / Math.max(totalGeral, 1)) * 100)}%`,
                background: 'repeating-linear-gradient(45deg, #C0392B, #C0392B 4px, #A02E20 4px, #A02E20 8px)',
              }}
            />
          )}
          {totalAgendados > 0 && (
            <div style={{
              flex: 1, height: '100%',
              background: 'rgba(70,50,5,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#46320C',
              letterSpacing: '0.04em',
            }}>
              {Math.round((totalAgendados / Math.max(totalGeral, 1)) * 100)}%
            </div>
          )}
        </div>

        {/* Mini-legenda da barra */}
        <div className="flex items-center gap-4" style={{
          marginTop: 8, fontSize: 10, fontWeight: 700,
          color: 'rgba(70,50,5,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>Encerrados · {totalJogos}</span>
          {aoVivoCount > 0 && <span style={{ color: '#A02E20' }}>● Ao vivo · {aoVivoCount}</span>}
          <span>Agendados · {totalAgendados}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
        <span style={{ fontSize: 13, color: 'rgba(70,50,5,0.62)', fontWeight: 600 }}>
          Abrir chaveamento
        </span>
        <CircleArrow size={40} />
      </div>
    </Link>
  )
}

// ─── LideresCard (lavender — destaca os 3 líderes) ───────────────────────────

interface Lider {
  nome: string; pontos: number; pontos_max: number
  cor_primaria: string | null; slug: string
}

function LideresCard({
  liderDiv1, liderDiv2, liderSuper08,
}: {
  liderDiv1: Lider | null
  liderDiv2: Lider | null
  liderSuper08: { lider: Lider; conferencia: string } | null
}) {
  const hasAny = !!(liderDiv1 || liderDiv2 || liderSuper08)

  return (
    <div className="cia-edit-card cia-edit-card--lavender" style={{ textDecoration: 'none' }}>
      {/* eyebrow + count pill */}
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(45,27,92,0.65)',
          letterSpacing: '-0.01em',
        }}>
          líderes atuais
        </span>
        <Pill bg="rgba(45,27,92,0.12)" color="#2D1B5C">
          <Crown size={11} /> AO VIVO
        </Pill>
      </div>

      {/* Big editorial label */}
      <div style={{ marginTop: 14, marginBottom: 4 }}>
        <h2 style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 'clamp(34px, 4.5vw, 52px)',
          fontWeight: 800,
          lineHeight: 0.92,
          letterSpacing: '-0.045em',
          color: '#0A0F0B',
        }}>
          Quem<br />lidera
        </h2>
      </div>

      {/* 3 leaders compact list */}
      <div className="flex-1 flex flex-col gap-2" style={{ marginTop: 12, minHeight: 0 }}>
        <LiderRow medal="🥇" label="1ª DIVISÃO"      lider={liderDiv1}                        accent="#8a5f06" />
        <LiderRow medal="🥈" label="2ª DIVISÃO"      lider={liderDiv2}                        accent="#2e6b42" />
        <LiderRow medal="🥉" label={liderSuper08 ? `SUPER 08 · ${liderSuper08.conferencia.toUpperCase()}` : 'SUPER 08'} lider={liderSuper08?.lider ?? null} accent="#B07A0A" />
      </div>

      {/* Empty state if nothing yet */}
      {!hasAny && (
        <p style={{
          fontSize: 13, color: 'rgba(45,27,92,0.55)',
          fontWeight: 500, fontStyle: 'italic',
          marginTop: 6,
        }}>
          A liderança aparece quando os jogos começarem.
        </p>
      )}

      <Link
        href="/esportivo/classificacao"
        className="flex items-center justify-between"
        style={{ marginTop: 14, textDecoration: 'none' }}
      >
        <span style={{ fontSize: 13, color: 'rgba(45,27,92,0.62)', fontWeight: 600 }}>
          Ver classificação completa
        </span>
        <CircleArrow size={40} />
      </Link>
    </div>
  )
}

function LiderRow({ medal, label, lider, accent }: {
  medal: string
  label: string
  lider: Lider | null
  accent: string
}) {
  return (
    <Link
      href={lider ? `/atleticas/${lider.slug}` : '/esportivo/chaveamento'}
      className="group/lider"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.45)',
        border: '1px solid rgba(45,27,92,0.10)',
        textDecoration: 'none',
        transition: 'background 0.18s ease, border-color 0.18s ease',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }} aria-hidden>{medal}</span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          fontSize: 9.5, fontWeight: 800,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(45,27,92,0.55)',
          lineHeight: 1, marginBottom: 3,
        }}>
          {label}
        </p>
        <p style={{
          fontSize: 14.5, fontWeight: 800,
          letterSpacing: '-0.015em',
          color: '#0A0F0B',
          lineHeight: 1.1,
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          {lider ? lider.nome : 'A definir'}
        </p>
      </div>

      {lider && (
        <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 44 }}>
          <p style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 22, fontWeight: 800,
            color: accent,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {lider.pontos}
          </p>
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            color: 'rgba(45,27,92,0.45)',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>
            pts
          </p>
        </div>
      )}

      {!lider && (
        <span style={{
          fontSize: 11, color: 'rgba(45,27,92,0.40)',
          fontStyle: 'italic',
        }}>
          —
        </span>
      )}
    </Link>
  )
}

// ─── ProximosJogos — strip horizontal ────────────────────────────────────────

function ProximosJogos({ upcoming }: { upcoming: UpcomingJogo[] }) {
  if (upcoming.length === 0) return null

  return (
    <section>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
        <h3 style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 'clamp(22px, 2.6vw, 32px)',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.025em',
          color: '#0A0F0B',
        }}>
          Próximos jogos
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'rgba(10,15,11,0.40)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {upcoming.length} agendados
        </span>
      </div>

      <div
        className="flex gap-3 overflow-x-auto"
        style={{ paddingBottom: 6, scrollSnapType: 'x mandatory' }}
      >
        {upcoming.map(jogo => (
          <div
            key={jogo.id}
            style={{
              flexShrink: 0,
              width: 264,
              padding: 16,
              background: '#FAF7F0',
              borderRadius: 18,
              border: '1px solid rgba(10,15,11,0.08)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
              scrollSnapAlign: 'start',
            }}
            className="hover:-translate-y-0.5 hover:shadow-md hover:border-[rgba(10,15,11,0.18)]"
          >
            {/* Modalidade + fase */}
            <div className="flex items-center gap-1.5" style={{ marginBottom: 12 }}>
              {jogo.modalidade_icone && (
                <span style={{ fontSize: 15, lineHeight: 1 }} aria-hidden>{jogo.modalidade_icone}</span>
              )}
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {jogo.modalidade_nome ?? '—'}
              </span>
              {jogo.fase && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 9.5, fontWeight: 800,
                  color: '#2e6b42',
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  background: 'rgba(46,107,66,0.10)',
                  padding: '2px 6px', borderRadius: 4,
                }}>
                  {jogo.fase}
                </span>
              )}
            </div>

            {/* Equipes */}
            <p style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 15, fontWeight: 800,
              lineHeight: 1.18,
              letterSpacing: '-0.02em',
              color: '#0A0F0B',
              marginBottom: 10,
            }}>
              {jogo.equipe_a_nome ?? '?'}
              <span style={{
                margin: '0 7px', fontSize: 10,
                color: 'rgba(10,15,11,0.35)',
                fontWeight: 600, letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}>vs</span>
              {jogo.equipe_b_nome ?? '?'}
            </p>

            {/* Data */}
            <div className="flex items-center justify-between">
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: '#0A0F0B',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtDateShort(jogo.inicio)} · {fmtTime(jogo.inicio)}
              </span>
              {jogo.divisao && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700,
                  color: 'rgba(10,15,11,0.45)',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {jogo.divisao}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── MovimentoPracas — volume por LOCAL FÍSICO esportivo ─────────────────────

function MovimentoPracas({ pracas }: { pracas: PracaStats[] }) {
  // Agrupa CEMEA 01-04 → "CEMEA" (1 card por local)
  const locais = groupPracasByLocal(pracas)
  const totalJogos     = locais.reduce((s, l) => s + l.totalJogos, 0)
  const totalEncerrados = locais.reduce((s, l) => s + l.encerrados, 0)
  const totalAoVivo    = locais.reduce((s, l) => s + l.aoVivo, 0)
  const totalQuadras   = locais.reduce((s, l) => s + l.numQuadras, 0)
  const pctEncerrados  = totalJogos > 0 ? Math.round((totalEncerrados / totalJogos) * 100) : 0

  return (
    <section>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(22px, 2.6vw, 32px)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.025em',
            color: '#0A0F0B',
          }}>
            Movimento das praças
          </h3>
          <p style={{
            marginTop: 4,
            fontSize: 12.5, fontWeight: 500,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
          }}>
            {locais.length} {locais.length === 1 ? 'local' : 'locais'} · {totalQuadras} quadras · {totalJogos} jogos · {pctEncerrados}% encerrados
            {totalAoVivo > 0 && <span style={{ marginLeft: 8, color: '#C0392B', fontWeight: 700 }}>● {totalAoVivo} ao vivo</span>}
          </p>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
      >
        {locais.map(l => <LocalCard key={l.slug} local={l} />)}
      </div>
    </section>
  )
}

function LocalCard({ local: l }: { local: LocalAgrupado }) {
  const topModalidades = l.modalidades.slice(0, 3)
  const topAtleticas   = l.atleticas.slice(0, 6)
  const remainingAtleticas = Math.max(0, l.atleticas.length - topAtleticas.length)
  const pctEncerrados = l.totalJogos > 0 ? Math.round((l.encerrados / l.totalJogos) * 100) : 0
  const corBarra = l.cor ?? '#2e6b42'

  return (
    <Link
      href={`/esportivo/pracas/${l.slug}`}
      style={{
        position: 'relative',
        padding: 18,
        background: '#FAF7F0',
        borderRadius: 18,
        border: '1px solid rgba(10,15,11,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
        textDecoration: 'none',
        color: 'inherit',
      }}
      className="group hover:-translate-y-0.5 hover:shadow-md hover:border-[rgba(10,15,11,0.18)]"
    >
      {/* Header: nome + número grande de jogos */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            {l.numQuadras > 1
              ? `Local · ${l.numQuadras} quadras`
              : 'Praça'}
          </p>
          <h4 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(20px, 2vw, 26px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: '#0A0F0B',
          }}>
            {l.nome}
          </h4>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 38, fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 0.9,
            color: '#0A0F0B',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {l.totalJogos}
          </p>
          <p style={{
            marginTop: 2,
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            jogos
          </p>
        </div>
      </div>

      {/* Quadras (chips numerados) */}
      {l.numQuadras > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {l.quadras.map(q => {
            const isLive = q.aoVivo > 0
            return (
              <span
                key={q.id}
                title={`${q.nome} · ${q.totalJogos} jogos${isLive ? ' · ao vivo' : ''}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 7px',
                  borderRadius: 6,
                  background: isLive ? 'rgba(192,57,43,0.10)' : 'rgba(10,15,11,0.05)',
                  border: isLive ? '1px solid rgba(192,57,43,0.30)' : '1px solid rgba(10,15,11,0.08)',
                  fontSize: 10.5, fontWeight: 700,
                  color: isLive ? '#C0392B' : '#0A0F0B',
                  letterSpacing: '-0.01em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {isLive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0392B' }} />}
                {q.numero ?? q.nome.split(' ').pop()}
                <span style={{ opacity: 0.55, fontWeight: 600 }}>· {q.totalJogos}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Barra de progresso */}
      <div>
        <div style={{
          height: 8, borderRadius: 4, overflow: 'hidden',
          background: 'rgba(10,15,11,0.08)',
          display: 'flex',
        }}>
          {l.encerrados > 0 && (
            <div title={`${l.encerrados} encerrados`} style={{
              width:  `${(l.encerrados / l.totalJogos) * 100}%`,
              background: corBarra,
            }} />
          )}
          {l.aoVivo > 0 && (
            <div title={`${l.aoVivo} ao vivo`} style={{
              width:  `${(l.aoVivo / l.totalJogos) * 100}%`,
              background: 'repeating-linear-gradient(45deg, #C0392B, #C0392B 3px, #A02E20 3px, #A02E20 6px)',
            }} />
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-3" style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>{l.encerrados} encerrados</span>
          {l.aoVivo > 0 && <span style={{ color: '#C0392B' }}>● {l.aoVivo} ao vivo</span>}
          <span>{l.agendados} agendados</span>
          <span style={{ marginLeft: 'auto', color: '#0A0F0B' }}>{pctEncerrados}%</span>
        </div>
      </div>

      {/* Modalidades (top 3) */}
      {topModalidades.length > 0 && (
        <div>
          <p style={{
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Modalidades
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {topModalidades.map(m => (
              <span
                key={m.nome}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'rgba(10,15,11,0.05)',
                  border: '1px solid rgba(10,15,11,0.08)',
                  fontSize: 11, fontWeight: 600,
                  color: '#0A0F0B',
                  letterSpacing: '-0.01em',
                }}
              >
                {m.icone && <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>{m.icone}</span>}
                <span>{m.nome}</span>
                <span style={{ color: 'rgba(10,15,11,0.45)', fontWeight: 700 }}>· {m.count}</span>
              </span>
            ))}
            {l.modalidades.length > 3 && (
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.45)',
              }}>
                +{l.modalidades.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Atléticas (top 6) */}
      {topAtleticas.length > 0 && (
        <div>
          <p style={{
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Atléticas · {l.atleticas.length}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {topAtleticas.map(a => (
              <span
                key={a.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: a.cor ? `${a.cor}15` : 'rgba(10,15,11,0.05)',
                  border: `1px solid ${a.cor ? `${a.cor}40` : 'rgba(10,15,11,0.08)'}`,
                  fontSize: 11, fontWeight: 700,
                  color: a.cor ?? '#0A0F0B',
                  letterSpacing: '-0.01em',
                }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: a.cor ?? '#0A0F0B',
                }} />
                {a.nome}
                {a.jogos > 1 && (
                  <span style={{ opacity: 0.65, fontWeight: 600 }}>· {a.jogos}</span>
                )}
              </span>
            ))}
            {remainingAtleticas > 0 && (
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.45)',
              }}>
                +{remainingAtleticas}
              </span>
            )}
          </div>
        </div>
      )}

      {/* CTA hint */}
      <div className="mt-auto flex items-center justify-between pt-2" style={{
        borderTop: '1px solid rgba(10,15,11,0.06)',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          Ver perfil completo
        </span>
        <CircleArrow size={28} />
      </div>
    </Link>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _PracaCard({ praca: p }: { praca: PracaStats }) {
  const topModalidades = p.modalidades.slice(0, 3)
  const topAtleticas   = p.atleticas.slice(0, 6)
  const remainingAtleticas = Math.max(0, p.atleticas.length - topAtleticas.length)
  const pctEncerrados = p.totalJogos > 0 ? Math.round((p.encerrados / p.totalJogos) * 100) : 0
  const corBarra = p.cor ?? '#2e6b42'

  return (
    <div
      style={{
        position: 'relative',
        padding: 18,
        background: '#FAF7F0',
        borderRadius: 18,
        border: '1px solid rgba(10,15,11,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
      }}
      className="hover:-translate-y-0.5 hover:shadow-md hover:border-[rgba(10,15,11,0.18)]"
    >
      {/* Header: nome + número grande de jogos */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Praça
          </p>
          <h4 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(20px, 2vw, 26px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: '#0A0F0B',
          }}>
            {p.nome}
          </h4>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 38, fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 0.9,
            color: '#0A0F0B',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {p.totalJogos}
          </p>
          <p style={{
            marginTop: 2,
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            jogos
          </p>
        </div>
      </div>

      {/* Barra de progresso encerrados / ao_vivo / agendados */}
      <div>
        <div style={{
          height: 8, borderRadius: 4, overflow: 'hidden',
          background: 'rgba(10,15,11,0.08)',
          display: 'flex',
        }}>
          {p.encerrados > 0 && (
            <div title={`${p.encerrados} encerrados`} style={{
              width:  `${(p.encerrados / p.totalJogos) * 100}%`,
              background: corBarra,
            }} />
          )}
          {p.aoVivo > 0 && (
            <div title={`${p.aoVivo} ao vivo`} style={{
              width:  `${(p.aoVivo / p.totalJogos) * 100}%`,
              background: 'repeating-linear-gradient(45deg, #C0392B, #C0392B 3px, #A02E20 3px, #A02E20 6px)',
            }} />
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-3" style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>{p.encerrados} encerrados</span>
          {p.aoVivo > 0 && <span style={{ color: '#C0392B' }}>● {p.aoVivo} ao vivo</span>}
          <span>{p.agendados} agendados</span>
          <span style={{ marginLeft: 'auto', color: '#0A0F0B' }}>{pctEncerrados}%</span>
        </div>
      </div>

      {/* Modalidades (top 3) */}
      {topModalidades.length > 0 && (
        <div>
          <p style={{
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Modalidades
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {topModalidades.map(m => (
              <span
                key={m.nome}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'rgba(10,15,11,0.05)',
                  border: '1px solid rgba(10,15,11,0.08)',
                  fontSize: 11, fontWeight: 600,
                  color: '#0A0F0B',
                  letterSpacing: '-0.01em',
                }}
              >
                {m.icone && <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>{m.icone}</span>}
                <span>{m.nome}</span>
                <span style={{ color: 'rgba(10,15,11,0.45)', fontWeight: 700 }}>· {m.count}</span>
              </span>
            ))}
            {p.modalidades.length > 3 && (
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.45)',
              }}>
                +{p.modalidades.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Atléticas (top 6) */}
      {topAtleticas.length > 0 && (
        <div>
          <p style={{
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Atléticas · {p.atleticas.length}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {topAtleticas.map(a => (
              <Link
                key={a.id}
                href={`/atleticas/${a.slug}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: a.cor ? `${a.cor}15` : 'rgba(10,15,11,0.05)',
                  border: `1px solid ${a.cor ? `${a.cor}40` : 'rgba(10,15,11,0.08)'}`,
                  fontSize: 11, fontWeight: 700,
                  color: a.cor ?? '#0A0F0B',
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: a.cor ?? '#0A0F0B',
                }} />
                {a.nome}
                {a.jogos > 1 && (
                  <span style={{ opacity: 0.65, fontWeight: 600 }}>· {a.jogos}</span>
                )}
              </Link>
            ))}
            {remainingAtleticas > 0 && (
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.45)',
              }}>
                +{remainingAtleticas}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function EsportivoClient({
  div1, div2, super08, upcoming,
  totalJogos, totalAtleticas, aoVivoCount,
  pracas,
}: Props) {
  const router = useRouter()
  const [liveSync, setLiveSync] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(uniqueChannel('esportivo-realtime'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => { router.refresh() }, 3000)
      })
      .subscribe(status => { setLiveSync(status === 'SUBSCRIBED') })
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  // ── Líderes computados ──
  const liderDiv1: Lider | null = div1[0]
    ? { nome: div1[0].nome, pontos: div1[0].pontos_cia, pontos_max: div1[0].pontos_cia_max, cor_primaria: div1[0].cor_primaria, slug: div1[0].slug }
    : null
  const liderDiv2: Lider | null = div2[0]
    ? { nome: div2[0].nome, pontos: div2[0].pontos_cia, pontos_max: div2[0].pontos_cia_max, cor_primaria: div2[0].cor_primaria, slug: div2[0].slug }
    : null

  // Super 08 — pegamos o líder geral (maior pontuação atual entre os campeões de conferência)
  let liderSuper08: { lider: Lider; conferencia: string } | null = null
  let maiorPontos = -1
  for (const grupo of super08) {
    const top = grupo.equipes[0]
    if (top && top.pontos_cia > maiorPontos) {
      maiorPontos = top.pontos_cia
      liderSuper08 = {
        lider: { nome: top.nome, pontos: top.pontos_cia, pontos_max: top.pontos_cia_max, cor_primaria: top.cor_primaria, slug: top.slug },
        conferencia: grupo.conferencia,
      }
    }
  }

  // Total chaves (sub-stat pro card de estado)
  const totalAgendados = upcoming.length

  // ── Módulos do hub ────────────────────────────────────────────────────────
  const modulos = [
    {
      href: '/esportivo/classificacao',
      label: 'Classificação',
      meta: 'Pontos CIA · Mín/Máx · ranking',
      tone: 'gold' as const,
      icon: TrendingUp,
      span: 'md' as const,
    },
    {
      href: '/esportivo/chaveamento',
      label: 'Chaveamento',
      meta: 'Brackets das modalidades',
      tone: 'cream' as const,
      icon: Trophy,
      span: 'md' as const,
    },
    {
      href: '/placar',
      label: 'Placar',
      meta: 'Modo TV · placar ao vivo',
      tone: 'green' as const,
      icon: Radio,
      span: 'sm' as const,
    },
    {
      href: '/esportivo/super-8',
      label: 'Super 8',
      meta: 'Playoff dos campeões',
      tone: 'electric' as const,
      icon: Crown,
      span: 'sm' as const,
    },
    {
      href: '/atleticas',
      label: 'Atléticas',
      meta: `${totalAtleticas} inscritas`,
      tone: 'lavender' as const,
      span: 'sm' as const,
    },
    {
      href: '/esportivo/resultados-externos',
      label: 'Resultados Externos',
      meta: 'Judô · Jiu · Atl · Nat · Xadrez',
      tone: 'terracotta' as const,
      icon: ClipboardList,
      span: 'md' as const,
    },
    {
      href: '/esportivo/importar',
      label: 'Importar tabela',
      meta: 'XLSX da CIA',
      tone: 'cream' as const,
      span: 'sm' as const,
    },
    {
      href: '/esportivo/escala',
      label: 'Escala esportiva',
      meta: 'Setoristas · coordenadores',
      tone: 'cream' as const,
      span: 'sm' as const,
    },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>

      {/* ─── Editorial header ─── */}
      <header className="cia-page-header flex flex-wrap items-start justify-between gap-4" style={{ marginBottom: 28 }}>
        <div className="min-w-0 flex-1">
          <p className="cia-page-header__eyebrow">Esportivo</p>
          <h1 className="cia-page-header__title">Núcleo Esportivo</h1>
          <p className="cia-page-header__subtitle">
            Centro de comando das competições — chaveamento, placar, super 8 e escala da equipe.
          </p>
        </div>

        {/* Realtime indicator */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            background:  liveSync ? 'rgba(46,107,66,0.10)' : 'rgba(10,15,11,0.04)',
            color:       liveSync ? '#2e6b42'              : 'rgba(10,15,11,0.45)',
            borderColor: liveSync ? 'rgba(46,107,66,0.35)' : 'rgba(10,15,11,0.10)',
          }}
        >
          <span
            className={liveSync ? 'animate-pulse' : ''}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: liveSync ? '#2e6b42' : 'rgba(10,15,11,0.30)',
              display: 'inline-block',
              boxShadow: liveSync ? '0 0 8px rgba(46,107,66,0.6)' : 'none',
            }}
          />
          {liveSync ? 'Tempo real' : 'Conectando'}
        </span>
      </header>

      {/* ─── Hero row: Estado da competição + Líderes ─── */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          marginBottom: 32,
        }}
      >
        <div style={{ gridColumn: 'span 5' }} className="col-span-12 md:col-span-5">
          <EstadoCompeticaoCard
            totalJogos={totalJogos}
            totalAtleticas={totalAtleticas}
            aoVivoCount={aoVivoCount}
            totalAgendados={totalAgendados}
          />
        </div>
        <div style={{ gridColumn: 'span 7' }} className="col-span-12 md:col-span-7">
          <LideresCard
            liderDiv1={liderDiv1}
            liderDiv2={liderDiv2}
            liderSuper08={liderSuper08}
          />
        </div>
      </div>

      {/* ─── Próximos jogos ─── */}
      <div style={{ marginBottom: 36 }}>
        <ProximosJogos upcoming={upcoming} />
      </div>

      {/* ─── Movimento das praças ─── */}
      {pracas.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <MovimentoPracas pracas={pracas} />
        </div>
      )}

      {/* ─── Acesso rápido (HUB) ─── */}
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <h2 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(28px, 3vw, 40px)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: '#0A0F0B',
          }}>
            Acesso rápido
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            {modulos.length} módulos
          </span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 14 }}>
          {modulos.map((m, idx) => {
            const Icon = m.icon
            const isElectric = m.tone === 'electric'
            const isTerracotta = m.tone === 'terracotta'
            const isGreen = m.tone === 'green'
            const isLight = !(isElectric || isTerracotta || isGreen)
            const text = isLight ? '#0A0F0B' : '#FFFFFF'
            const textMuted =
              m.tone === 'gold'       ? 'rgba(70,50,5,0.65)' :
              m.tone === 'lavender'   ? 'rgba(45,27,92,0.55)' :
              m.tone === 'cream'      ? 'rgba(10,15,11,0.55)' :
              isElectric              ? 'rgba(255,255,255,0.70)' :
              isTerracotta            ? 'rgba(255,255,255,0.75)' :
              isGreen                 ? 'rgba(255,255,255,0.75)' :
                                        'rgba(10,15,11,0.55)'
            const arrowDark = isLight

            const spanClass: string =
              m.span === 'md'
                ? 'col-span-12 sm:col-span-6 lg:col-span-4'
                : 'col-span-12 sm:col-span-6 lg:col-span-2'

            return (
              <Link
                key={m.href}
                href={m.href}
                className={`cia-edit-card cia-edit-card--${m.tone} cia-quick-card ${spanClass}`}
                style={{ animationDelay: `${idx * 35}ms` }}
              >
                <div className="flex items-start justify-between">
                  {Icon && (
                    <Icon
                      size={20}
                      strokeWidth={1.8}
                      style={{ color: text, opacity: 0.85 }}
                    />
                  )}
                  {!Icon && <span style={{ width: 20, height: 20 }} aria-hidden />}
                  <span
                    className="cia-quick-arrow"
                    style={{
                      width: 32, height: 32,
                      borderRadius: '50%',
                      background: arrowDark ? '#0A0F0B' : '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      flexShrink: 0,
                    }}
                  >
                    <ArrowUpRight style={{
                      width: 14, height: 14,
                      color: arrowDark ? '#FFFFFF' : '#0A0F0B',
                      strokeWidth: 2.2,
                    }} />
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-end">
                  <span style={{
                    fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                    fontSize: 'clamp(22px, 2.4vw, 30px)',
                    fontWeight: 800,
                    lineHeight: 0.95,
                    letterSpacing: '-0.03em',
                    color: text,
                  }}>
                    {m.label}
                  </span>
                  {m.meta && (
                    <span style={{
                      fontSize: 13, fontWeight: 500,
                      color: textMuted,
                      letterSpacing: '-0.01em',
                      marginTop: 6,
                    }}>
                      {m.meta}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
