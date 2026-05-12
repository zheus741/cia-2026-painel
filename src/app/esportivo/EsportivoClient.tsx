'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Calendar, Radio } from 'lucide-react'
import { CONFERENCIAS } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────

interface AtleticaWithStats {
  id: string; nome: string; slug: string
  divisao: string | null; conferencia: string | null
  seed: number | null; universidade: string | null; cor_primaria: string | null
  jogados: number; vitorias: number; empates: number; derrotas: number
  gols_pro: number; gols_contra: number; saldo: number
  /** Legado: 3V+1E (Brasileirão) — mantido só pra compatibilidade. */
  pontos: number
  /** Pontuação CIA — soma dos pisos garantidos (Art. 44/46 do regulamento). */
  pontos_cia: number
  /** Pontuação CIA máxima possível (vence tudo a partir de agora). */
  pontos_cia_max: number
  /** Modalidades onde a previsão ainda pode variar. */
  vivas: number
  /** Modalidades já decididas (min === max). */
  decididas: number
  /** Total de inscrições da atlética. */
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

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function SaldoCell({ saldo }: { saldo: number }) {
  if (saldo > 0) return <span style={{ color: '#1a7a3a', fontWeight: 600 }}>+{saldo}</span>
  if (saldo < 0) return <span style={{ color: '#c0392b', fontWeight: 600 }}>{saldo}</span>
  return <span style={{ color: '#9ca3af' }}>0</span>
}

// ── Standing table (reusable) ────────────────────────────────────────────────

interface StandingsTableProps {
  equipes: AtleticaWithStats[]
  accentColor: string
  promoteSpots?: number
  compact?: boolean
}

function StandingsTable({ equipes, accentColor, promoteSpots, compact }: StandingsTableProps) {
  const cellPad = compact ? '6px 8px' : '10px 12px'
  const fontSize = compact ? '12px' : '13px'

  // Calcula o teto global da tabela pra dimensionar a barra
  const globalMax = Math.max(13, ...equipes.map(e => e.pontos_cia_max))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
        <thead>
          <tr style={{
            background: `rgba(${hexToRgb(accentColor)}, 0.06)`,
            borderBottom: `2px solid rgba(${hexToRgb(accentColor)}, 0.20)`,
          }}>
            {[
              { key: 'pos',   label: 'Pos', align: 'center' },
              { key: 'time',  label: 'Atlética', align: 'left' },
              { key: 'atual', label: 'Atual', align: 'center', tip: 'Pontos garantidos (Art. 44/46)' },
              { key: 'max',   label: 'Máx',   align: 'center', tip: 'Pontos máximos se vencer tudo daqui' },
              { key: 'faixa', label: 'Faixa', align: 'left',   tip: 'Espaço de manobra restante' },
              { key: 'mod',   label: 'Mod',   align: 'center', tip: 'Vivas / total de modalidades' },
              ...(compact ? [] : [
                { key: 'j', label: 'J', align: 'center' as const, tip: 'Jogos disputados' },
                { key: 'v', label: 'V', align: 'center' as const, tip: 'Vitórias' },
                { key: 'd', label: 'D', align: 'center' as const, tip: 'Derrotas' },
                { key: 'sg', label: 'SG', align: 'center' as const, tip: 'Saldo' },
              ]),
            ].map(col => (
              <th
                key={col.key}
                title={'tip' in col ? col.tip : undefined}
                style={{
                  padding: cellPad,
                  textAlign: col.align as 'left' | 'center',
                  fontSize, fontWeight: 700,
                  color: accentColor,
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {equipes.map((eq, idx) => {
            const pos = idx + 1
            const isPromote = promoteSpots != null && pos <= promoteSpots
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb'
            const medal = pos === 1 ? '🥇' : ''
            const decisivo = eq.pontos_cia === eq.pontos_cia_max

            return (
              <tr key={eq.id} style={{
                background: rowBg,
                borderLeft: isPromote ? `3px solid rgba(${hexToRgb(accentColor)}, 0.50)` : '3px solid transparent',
                transition: 'background 0.15s',
              }}>
                <td style={{ padding: cellPad, textAlign: 'center', fontSize, color: '#6b7280', fontWeight: 600 }}>
                  {medal || pos}
                </td>
                <td style={{ padding: cellPad, fontSize, fontWeight: 600, color: '#0A0F0B', whiteSpace: 'nowrap' }}>
                  <Link
                    href={`/atleticas/${eq.slug}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = accentColor)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
                  >
                    {eq.nome}
                  </Link>
                </td>
                {/* Atual — número de destaque */}
                <td style={{ padding: cellPad, textAlign: 'center', fontSize: '15px', fontWeight: 800, color: accentColor, fontVariantNumeric: 'tabular-nums' }}>
                  {eq.pontos_cia}
                </td>
                {/* Máx — secundário */}
                <td style={{ padding: cellPad, textAlign: 'center', fontSize: '13px', fontWeight: 600, color: decisivo ? '#9ca3af' : '#374151', fontVariantNumeric: 'tabular-nums' }}>
                  {decisivo ? '—' : eq.pontos_cia_max}
                </td>
                {/* Barra Atual → Máx */}
                <td style={{ padding: cellPad }}>
                  <PrevisaoBar
                    atual={eq.pontos_cia}
                    max={eq.pontos_cia_max}
                    globalMax={globalMax}
                    accentColor={accentColor}
                  />
                </td>
                {/* Modalidades vivas/total */}
                <td style={{ padding: cellPad, textAlign: 'center', fontSize: '11px', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'baseline', gap: 2,
                  }}>
                    <span style={{ fontWeight: 700, color: eq.vivas > 0 ? '#0A0F0B' : '#9ca3af' }}>
                      {eq.vivas}
                    </span>
                    <span style={{ opacity: 0.5 }}>/</span>
                    <span>{eq.total_inscricoes}</span>
                  </span>
                </td>
                {!compact && (
                  <>
                    <td style={{ padding: cellPad, textAlign: 'center', fontSize, color: '#374151' }}>{eq.jogados}</td>
                    <td style={{ padding: cellPad, textAlign: 'center', fontSize, color: '#374151' }}>{eq.vitorias}</td>
                    <td style={{ padding: cellPad, textAlign: 'center', fontSize, color: '#374151' }}>{eq.derrotas}</td>
                    <td style={{ padding: cellPad, textAlign: 'center', fontSize }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// PrevisaoBar — visualização Atual → Máximo
// ─────────────────────────────────────────────────────────────────────────────

function PrevisaoBar({ atual, max, globalMax, accentColor }: {
  atual:       number
  max:         number
  globalMax:   number
  accentColor: string
}) {
  // Normaliza ambos para a escala global
  const safeMax = Math.max(globalMax, 1)
  const pctAtual = Math.max(0, Math.min(100, (atual / safeMax) * 100))
  const pctMax   = Math.max(0, Math.min(100, (max   / safeMax) * 100))
  const decidido = atual === max

  return (
    <div style={{
      position: 'relative', width: '100%', minWidth: 80, maxWidth: 160,
      height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden',
    }}>
      {/* Faixa "Máx possível" — clarinha, indica espaço de manobra */}
      {!decidido && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, width: `${pctMax}%`,
            background: `rgba(${hexToRgb(accentColor)}, 0.16)`,
            borderRadius: 99,
          }}
        />
      )}
      {/* Faixa "Atual" — sólida, indica o garantido */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, width: `${pctAtual}%`,
          background: accentColor,
          borderRadius: 99,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

// ── hex → "r, g, b" for rgba() usage ────────────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

// ── Tab: 1ª Divisão ──────────────────────────────────────────────────────────

function Div1Tab({ equipes }: { equipes: AtleticaWithStats[] }) {
  const accent = '#A67D14'
  // Empty state check: usa pontos CIA atuais + máximo. Se TODAS as atléticas
  // tem 0 atual E 0 max, a competição realmente não começou (nem prevista).
  const allZero = equipes.every(e => e.pontos_cia === 0 && e.pontos_cia_max === 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Trophy size={20} color={accent} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: accent, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
          1ª Divisão
        </h2>
        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>{equipes.length} equipes · Elite</span>
      </div>

      {allZero && (
        <div style={{
          background: 'rgba(166,125,20,0.08)', border: '1px solid rgba(166,125,20,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#7a5e0a',
        }}>
          ⏳ Competição ainda não iniciou — classificação atualizada em tempo real quando os jogos começarem
        </div>
      )}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', marginTop: 12 }}>
        <StandingsTable equipes={equipes} accentColor={accent} promoteSpots={3} />
      </div>
    </div>
  )
}

// ── Tab: 2ª Divisão ──────────────────────────────────────────────────────────

function Div2Tab({ equipes }: { equipes: AtleticaWithStats[] }) {
  const accent = '#2e6b42'
  // Empty state check: usa pontos CIA atuais + máximo. Se TODAS as atléticas
  // tem 0 atual E 0 max, a competição realmente não começou (nem prevista).
  const allZero = equipes.every(e => e.pontos_cia === 0 && e.pontos_cia_max === 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Trophy size={20} color={accent} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: accent, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
          2ª Divisão
        </h2>
        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>{equipes.length} equipes · Acesso</span>
      </div>

      {allZero && (
        <div style={{
          background: 'rgba(46,107,66,0.08)', border: '1px solid rgba(46,107,66,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1e5533',
        }}>
          ⏳ Competição ainda não iniciou — classificação atualizada em tempo real quando os jogos começarem
        </div>
      )}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', marginTop: 12 }}>
        <StandingsTable equipes={equipes} accentColor={accent} promoteSpots={4} />
      </div>

      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
        ↑ Posições 1–4 sobem para a 1ª Divisão
      </p>
    </div>
  )
}

// ── Tab: Conferências (Super 08) ─────────────────────────────────────────────

function Super08Tab({ groups }: { groups: ConferenciaGroup[] }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#D8845F', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
          Conferências
        </h2>
        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>Super 08 · 8 conferências</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 16,
      }}>
        {groups.map(group => {
          const meta = CONFERENCIAS.find(c => c.nome === group.conferencia)
          const cor = meta?.cor ?? '#D8845F'
          const icone = meta?.icone ?? '◆'
          const vibe = meta?.vibe ?? ''

          return (
            <div key={group.conferencia} style={{
              background: '#ffffff',
              border: `1px solid rgba(${hexToRgb(cor)}, 0.20)`,
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {/* Card header */}
              <div style={{
                background: `rgba(${hexToRgb(cor)}, 0.12)`,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>{icone}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0A0F0B', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', flex: 1 }}>
                  {group.conferencia}
                </span>
                <span style={{ fontSize: 12, color: '#6b7280', background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: '2px 8px' }}>
                  {group.equipes.length}/8
                </span>
              </div>
              {vibe && (
                <div style={{ padding: '4px 16px 6px', fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                  {vibe}
                </div>
              )}

              {/* Content */}
              {group.equipes.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                  Aguardando confirmações
                </div>
              ) : (
                <div style={{ padding: '0 0 4px' }}>
                  <StandingsTable equipes={group.equipes} accentColor={cor} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Upcoming games ────────────────────────────────────────────────────────────

function UpcomingSection({ upcoming }: { upcoming: UpcomingJogo[] }) {
  if (upcoming.length === 0) return null

  return (
    <div style={{ padding: '20px 32px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Calendar size={18} color='#2e6b42' />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0A0F0B', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
          Próximos Jogos
        </h3>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 6,
      }}>
        {upcoming.map(jogo => (
          <div key={jogo.id} style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '12px 14px',
            minWidth: 200,
            flexShrink: 0,
          }}>
            {jogo.modalidade_nome && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                {jogo.modalidade_icone && <span>{jogo.modalidade_icone}</span>}
                {jogo.modalidade_nome}
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0F0B', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', marginBottom: 4 }}>
              {jogo.equipe_a_nome ?? '?'} <span style={{ color: '#9ca3af', fontWeight: 400 }}>vs</span> {jogo.equipe_b_nome ?? '?'}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{fmtDate(jogo.inicio)}</div>
            {jogo.fase && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{jogo.fase}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EsportivoClient({
  div1, div2, super08, upcoming,
  totalJogos, totalAtleticas, aoVivoCount,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'div1' | 'div2' | 'super08'>('div1')
  const [liveSync, setLiveSync] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Realtime: quando jogos mudam, recomputa classificação no servidor
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('esportivo-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => { router.refresh() }, 1200)
      })
      .subscribe((status) => { setLiveSync(status === 'SUBSCRIBED') })
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  const tabs: { key: 'div1' | 'div2' | 'super08'; label: string; accent: string }[] = [
    { key: 'div1',    label: '1ª Divisão',    accent: '#A67D14' },
    { key: 'div2',    label: '2ª Divisão',    accent: '#2e6b42' },
    { key: 'super08', label: 'Conferências',  accent: '#D8845F' },
  ]

  // Card de destaque para a Liga Super 8 (playoff)
  const super8LeagueLink = (
    <Link
      href="/esportivo/super-8"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))',
        border: '1px solid rgba(245,158,11,0.35)',
        borderRadius: 20, padding: '5px 14px 5px 10px',
        fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
        color: '#FCD34D', textDecoration: 'none',
        transition: 'all 0.18s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(245,158,11,0.14))' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))' }}
    >
      <Trophy size={13} />
      Liga Super 8 — playoff dos campeões
      <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
    </Link>
  )

  return (
    <div style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', background: '#f3f4f6', minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{ background: '#0C1410', padding: '24px 32px 0', color: '#ffffff' }}>
        {/* Row 1: title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
            background: 'rgba(255,255,255,0.08)', borderRadius: 6,
            padding: '2px 8px', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            CIA 2026
          </span>
          <h1 style={{
            margin: 0, fontSize: 42, fontWeight: 800, color: '#ffffff',
            letterSpacing: '-0.04em', lineHeight: 1,
          }}>
            Núcleo Esportivo
          </h1>
        </div>

        {/* Row 2: stat pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(255,255,255,0.10)', borderRadius: 20,
            padding: '4px 12px', fontSize: 13, color: 'rgba(255,255,255,0.80)',
          }}>
            {totalAtleticas} atléticas
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.10)', borderRadius: 20,
            padding: '4px 12px', fontSize: 13, color: 'rgba(255,255,255,0.80)',
          }}>
            {totalJogos} jogos encerrados
          </span>
          {aoVivoCount > 0 && (
            <span style={{
              background: 'rgba(220,38,38,0.20)', borderRadius: 20,
              padding: '4px 12px', fontSize: 13, color: '#f87171',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Radio size={12} style={{ animation: 'pulse 1.5s infinite' }} />
              {aoVivoCount} ao vivo
            </span>
          )}

          {/* Liga Super 8 — link de destaque */}
          {super8LeagueLink}

          {/* Realtime indicator */}
          <span style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: liveSync ? 'rgba(106,184,126,0.18)' : 'rgba(255,255,255,0.06)',
            color: liveSync ? '#9be3a8' : 'rgba(255,255,255,0.40)',
            border: liveSync ? '1px solid rgba(106,184,126,0.30)' : '1px solid rgba(255,255,255,0.10)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: liveSync ? '#6ab87e' : 'rgba(255,255,255,0.40)',
              animation: liveSync ? 'pulse 1.6s infinite' : 'none',
              boxShadow: liveSync ? '0 0 6px rgba(106,184,126,0.55)' : 'none',
            }} />
            {liveSync ? 'Tempo real' : 'Conectando'}
          </span>
        </div>

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => {
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${t.accent}` : '3px solid transparent',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.50)',
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  letterSpacing: '0.01em',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ background: '#ffffff', padding: '28px 32px' }}>
        {tab === 'div1'    && <Div1Tab equipes={div1} />}
        {tab === 'div2'    && <Div2Tab equipes={div2} />}
        {tab === 'super08' && <Super08Tab groups={super08} />}
      </div>

      {/* Upcoming games — always below tabs */}
      <UpcomingSection upcoming={upcoming} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
