'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Crown, Trophy, Flame, TrendingUp, Calendar,
  Radio, ArrowRight, Clock, Share2,
} from 'lucide-react'
import type {
  Atletica, InscricaoDetalhe, JogoDetalhe, AtleticaStats,
  PrevisaoAtletica,
} from '@/lib/competicao/queries'
import type { ConferenciaMeta, DivisaoMeta } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/client'
import { AtleticaLogo } from '@/components/atletica-logo'

interface Props {
  atletica:   Atletica
  inscricoes: InscricaoDetalhe[]
  jogos:      JogoDetalhe[]
  stats:      AtleticaStats
  forma:      ('V'|'E'|'D')[]
  previsao:   PrevisaoAtletica
  confMeta:   ConferenciaMeta | null
  divMeta:    DivisaoMeta | null
  accent:     string
}

const CAT_LABEL: Record<string, string> = { M: 'Masculino', F: 'Feminino', COED: 'Misto' }

function fmtHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtDataHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip badge
// ─────────────────────────────────────────────────────────────────────────────
function Badge({ label, icon, cor }: { label: string; icon?: React.ReactNode; cor: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: `${cor}18`, color: cor,
      fontSize: 10, fontWeight: 800, letterSpacing: '0.10em',
      textTransform: 'uppercase', border: `1px solid ${cor}30`,
    }}>
      {icon}
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FormaRow
// ─────────────────────────────────────────────────────────────────────────────
function FormaRow({ forma }: { forma: ('V'|'E'|'D')[] }) {
  if (forma.length === 0) return (
    <span style={{ fontSize: 12, color: 'rgba(10,15,11,0.35)', fontStyle: 'italic' }}>
      Sem jogos ainda
    </span>
  )
  const colorMap = { V: '#22C55E', E: '#94A3B8', D: '#EF4444' }
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {forma.map((r, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, borderRadius: 7,
          background: `${colorMap[r]}18`, color: colorMap[r],
          fontSize: 11, fontWeight: 800,
          border: `1.5px solid ${colorMap[r]}30`,
        }}>
          {r}
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// JogoRow — compacto, responsivo
// ─────────────────────────────────────────────────────────────────────────────
function JogoRow({ j, myId, accent }: { j: JogoDetalhe; myId: string; accent: string }) {
  const isA   = j.equipe_a_id === myId
  const eu    = isA ? j.equipe_a_nome : j.equipe_b_nome
  const ele   = isA ? j.equipe_b_nome : j.equipe_a_nome
  const meu   = isA ? j.placar_a : j.placar_b
  const dele  = isA ? j.placar_b : j.placar_a
  const enc   = j.status === 'encerrado' && meu != null && dele != null
  const win   = enc && meu! > dele!
  const draw  = enc && meu === dele
  const loss  = enc && meu! < dele!
  const resultColor = win ? '#22C55E' : loss ? '#EF4444' : draw ? '#94A3B8' : accent
  const resultLabel = win ? 'V' : loss ? 'D' : draw ? 'E' : null
  const aoVivo = j.status === 'ao_vivo'

  return (
    <Link
      href="/placar"
      title="Ver no Placar Ao Vivo"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#FFFFFF',
        border: `1px solid ${aoVivo ? 'rgba(220,38,38,0.35)' : 'rgba(10,15,11,0.08)'}`,
        borderRadius: 12, padding: '10px 14px',
        textDecoration: 'none',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}55`
        e.currentTarget.style.boxShadow = `0 2px 10px ${accent}14`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = aoVivo ? 'rgba(220,38,38,0.35)' : 'rgba(10,15,11,0.08)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Resultado pill (apenas encerrado/ao vivo) */}
      {enc && resultLabel ? (
        <span style={{
          flexShrink: 0,
          width: 26, height: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 7, fontSize: 11, fontWeight: 800,
          background: `${resultColor}18`, color: resultColor,
          border: `1.5px solid ${resultColor}30`,
        }}>
          {resultLabel}
        </span>
      ) : aoVivo ? (
        <span style={{
          flexShrink: 0, width: 26, height: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 7, fontSize: 8, fontWeight: 800,
          background: 'rgba(220,38,38,0.10)', color: '#DC2626',
          letterSpacing: '0.06em',
        }}>
          AO<br/>VIVO
        </span>
      ) : (
        <span style={{
          flexShrink: 0, width: 26, height: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 7, fontSize: 10,
          background: 'rgba(10,15,11,0.04)',
          color: 'rgba(10,15,11,0.35)',
          border: '1px solid rgba(10,15,11,0.06)',
        }}>
          —
        </span>
      )}

      {/* Placar ou hora */}
      <div style={{ flexShrink: 0, minWidth: 58, textAlign: 'center' }}>
        {enc ? (
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 17, fontWeight: 800,
            color: resultColor,
            letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {meu} <span style={{ opacity: 0.45, fontSize: 14 }}>×</span> {dele}
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 800, color: accent,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtHora(j.inicio)}
          </span>
        )}
      </div>

      {/* Adversário + modal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#0A0F0B',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.015em',
        }}>
          <span style={{ color: 'rgba(10,15,11,0.40)', fontWeight: 500, marginRight: 5 }}>vs</span>
          {ele}
        </div>
        <div style={{
          fontSize: 10, color: 'rgba(10,15,11,0.45)',
          fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
          marginTop: 2,
        }}>
          {j.modalidade_icone && <span style={{ marginRight: 3 }}>{j.modalidade_icone}</span>}
          {j.modalidade_nome ?? '—'}
          {j.fase && <span style={{ opacity: 0.65 }}> · {j.fase}</span>}
        </div>
      </div>

      {/* Data (se não encerrado e não ao vivo) */}
      {!enc && !aoVivo && j.inicio && (
        <span style={{
          flexShrink: 0, fontSize: 10, color: 'rgba(10,15,11,0.40)',
          fontVariantNumeric: 'tabular-nums', textAlign: 'right',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {new Date(j.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}
        </span>
      )}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveStatusWidget
// ─────────────────────────────────────────────────────────────────────────────
function LiveStatusWidget({
  atleticaId, jogoAoVivo, jogosHoje, proximo, accent,
}: {
  atleticaId: string
  jogoAoVivo: JogoDetalhe | null
  jogosHoje:  JogoDetalhe[]
  proximo:    JogoDetalhe | null
  accent:     string
}) {
  if (!jogoAoVivo && jogosHoje.length === 0 && !proximo) return null

  if (jogoAoVivo) {
    const isA  = jogoAoVivo.equipe_a_id === atleticaId
    const eu   = isA ? jogoAoVivo.equipe_a_nome : jogoAoVivo.equipe_b_nome
    const ele  = isA ? jogoAoVivo.equipe_b_nome : jogoAoVivo.equipe_a_nome
    const meu  = isA ? jogoAoVivo.placar_a : jogoAoVivo.placar_b
    const dele = isA ? jogoAoVivo.placar_b : jogoAoVivo.placar_a
    return (
      <Link href="/placar" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
        <section style={{
          background: 'linear-gradient(135deg, rgba(220,38,38,0.07) 0%, rgba(220,38,38,0.02) 100%)',
          border: '1.5px solid rgba(220,38,38,0.30)',
          borderRadius: 16, padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <style>{`@keyframes livePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45); } 60% { box-shadow: 0 0 0 9px rgba(220,38,38,0); } }`}</style>
          <span aria-hidden style={{
            position: 'absolute', top: 18, left: 20,
            width: 8, height: 8, borderRadius: '50%', background: '#DC2626',
            animation: 'livePulse 1.4s ease-out infinite',
          }} />
          <div style={{ flex: 1, paddingLeft: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#DC2626', marginBottom: 8, textTransform: 'uppercase' }}>
              <Radio style={{ width: 12, height: 12, display: 'inline', marginRight: 5, verticalAlign: '-1.5px' }} />
              Ao vivo agora
            </p>
            <p style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 22, fontWeight: 800, color: '#0A0F0B',
              letterSpacing: '-0.025em', lineHeight: 1.1,
            }}>
              {eu}
              <span style={{ color: accent, margin: '0 12px', fontVariantNumeric: 'tabular-nums' }}>
                {meu ?? 0} × {dele ?? 0}
              </span>
              <span style={{ color: 'rgba(10,15,11,0.55)' }}>{ele}</span>
            </p>
            <p style={{ fontSize: 11, color: 'rgba(10,15,11,0.50)', marginTop: 5, letterSpacing: '0.04em' }}>
              {jogoAoVivo.modalidade_nome ?? 'Jogo'}
              {jogoAoVivo.fase && <> · {jogoAoVivo.fase}</>}
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            fontSize: 12, fontWeight: 700, color: '#DC2626',
            padding: '8px 14px', borderRadius: 999,
            background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.22)',
          }}>
            Ver placar <ArrowRight style={{ width: 13, height: 13 }} />
          </div>
        </section>
      </Link>
    )
  }

  if (jogosHoje.length > 0) {
    return (
      <Link href="/placar" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
        <section style={{
          background: `linear-gradient(135deg, ${accent}10 0%, ${accent}04 100%)`,
          border: `1.5px solid ${accent}33`, borderRadius: 16, padding: '18px 22px',
        }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: accent, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar style={{ width: 12, height: 12 }} />
              Hoje · {jogosHoje.length} {jogosHoje.length === 1 ? 'jogo' : 'jogos'}
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, color: accent, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Ver placar <ArrowRight style={{ width: 12, height: 12 }} />
            </span>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {jogosHoje.slice(0, 4).map(j => {
              const isA  = j.equipe_a_id === atleticaId
              const ele  = isA ? j.equipe_b_nome : j.equipe_a_nome
              const hora = fmtHora(j.inicio)
              return (
                <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: accent, minWidth: 38 }}>{hora}</span>
                  <span style={{ color: 'rgba(10,15,11,0.40)', fontSize: 11 }}>vs</span>
                  <span style={{ fontWeight: 700, flex: 1, letterSpacing: '-0.015em', color: '#0A0F0B' }}>{ele}</span>
                  {j.modalidade_icone && <span style={{ fontSize: 14 }}>{j.modalidade_icone}</span>}
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(10,15,11,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {j.modalidade_nome ?? '—'}
                  </span>
                </div>
              )
            })}
            {jogosHoje.length > 4 && (
              <p style={{ fontSize: 10, color: 'rgba(10,15,11,0.40)', marginTop: 2 }}>
                +{jogosHoje.length - 4} outros
              </p>
            )}
          </div>
        </section>
      </Link>
    )
  }

  if (proximo) {
    const isA  = proximo.equipe_a_id === atleticaId
    const ele  = isA ? proximo.equipe_b_nome : proximo.equipe_a_nome
    return (
      <section style={{
        background: '#FFFFFF', border: '1px solid rgba(10,15,11,0.08)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${accent}12`, border: `1px solid ${accent}24`,
        }}>
          <Clock style={{ width: 15, height: 15, color: accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.45)', marginBottom: 3 }}>
            Próximo jogo
          </p>
          <p style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 15, fontWeight: 700, color: '#0A0F0B',
            letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            vs <span style={{ color: accent }}>{ele}</span>
          </p>
          <p style={{ fontSize: 11, color: 'rgba(10,15,11,0.50)', marginTop: 2 }}>
            {fmtDataHora(proximo.inicio)} · {proximo.modalidade_nome ?? '—'}
          </p>
        </div>
      </section>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// PrevisaoCard
// ─────────────────────────────────────────────────────────────────────────────
function PrevisaoCard({ previsao, accent }: { previsao: PrevisaoAtletica; accent: string }) {
  const decidida    = previsao.minimo === previsao.maximo
  const tetoTeorico = Math.max(previsao.maximo, 13)
  const pctAtual    = (previsao.minimo / tetoTeorico) * 100
  const pctMax      = (previsao.maximo / tetoTeorico) * 100

  const ESTADO_LABEL: Record<string, { label: string; cor: string; bg: string }> = {
    campeao:   { label: '🥇 Campeã',    cor: '#A67D14', bg: 'rgba(166,125,20,0.10)' },
    vice:      { label: '🥈 Vice',       cor: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
    eliminada: { label: 'Eliminada',    cor: '#6b7280', bg: 'rgba(107,114,128,0.06)' },
    wo:        { label: 'W.O.',         cor: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
    viva:      { label: 'Em disputa',   cor: accent,    bg: `${accent}14` },
    sem_jogos: { label: 'Aguardando',   cor: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
    prova:     { label: 'Prova',        cor: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  }

  return (
    <section style={{
      background: '#FFFFFF', border: '1px solid rgba(10,15,11,0.08)',
      borderRadius: 16, padding: '20px 22px', marginBottom: 24, overflow: 'hidden',
    }}>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, margin: 0 }}>
        Pontuação CIA
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{
            fontSize: 'clamp(36px, 5vw, 54px)', fontWeight: 800,
            color: accent, lineHeight: 0.95, letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {previsao.atual}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,15,11,0.50)' }}>pts atuais</span>
        </div>
        {!decidida && (
          <>
            <span style={{ fontSize: 18, color: 'rgba(10,15,11,0.25)' }}>→</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{
                fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 700,
                color: 'rgba(10,15,11,0.55)', lineHeight: 0.95,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {previsao.maximo}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(10,15,11,0.40)' }}>pts máximo</span>
            </div>
          </>
        )}
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accent }}>{previsao.vivas} modalidade{previsao.vivas !== 1 ? 's' : ''} viva{previsao.vivas !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: 10, color: 'rgba(10,15,11,0.45)' }}>{previsao.decididas} decidida{previsao.decididas !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Barra */}
      <div style={{ position: 'relative', height: 8, marginTop: 14, background: 'rgba(10,15,11,0.05)', borderRadius: 99, overflow: 'hidden' }}>
        {!decidida && (
          <div style={{ position: 'absolute', inset: 0, width: `${pctMax}%`, background: `${accent}22`, borderRadius: 99 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, width: `${pctAtual}%`, background: accent, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>

      {/* Breakdown */}
      {previsao.por_modalidade.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{
            cursor: 'pointer', userSelect: 'none',
            fontSize: 11, fontWeight: 700, color: 'rgba(10,15,11,0.50)',
            letterSpacing: '0.04em',
          }}>
            Detalhamento por modalidade ({previsao.por_modalidade.length})
          </summary>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 7 }}>
            {previsao.por_modalidade.map((m, idx) => {
              const meta = ESTADO_LABEL[m.estado] ?? ESTADO_LABEL.sem_jogos
              return (
                <div key={`${m.modalidade_id}-${m.categoria}-${idx}`} style={{
                  background: '#FAFAFA', border: '1px solid rgba(10,15,11,0.06)',
                  borderRadius: 10, padding: '8px 10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    {m.modalidade_icone && <span style={{ fontSize: 12 }}>{m.modalidade_icone}</span>}
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0F0B' }}>{m.modalidade_nome ?? '?'}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(10,15,11,0.45)' }}>{m.categoria ?? ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: meta.cor, background: meta.bg, padding: '2px 6px', borderRadius: 4,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#0A0F0B', fontVariantNumeric: 'tabular-nums' }}>
                      {m.decidida || m.pontos_min === m.pontos_max ? `${m.pontos_min} pts` : `${m.pontos_min} → ${m.pontos_max} pts`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AtleticaWikiClient — exported root
// ─────────────────────────────────────────────────────────────────────────────
export function AtleticaWikiClient({
  atletica, inscricoes, jogos, stats, forma, previsao, confMeta, divMeta, accent,
}: Props) {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => { router.refresh() }, 1000)
    }
    const channel = supabase
      .channel(`wiki-atletica:${atletica.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos', filter: `equipe_a_id=eq.${atletica.id}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos', filter: `equipe_b_id=eq.${atletica.id}` }, scheduleRefresh)
      .subscribe()
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [atletica.id, router])

  // Agrupa inscrições por modalidade
  const modGroups = new Map<string, InscricaoDetalhe[]>()
  for (const i of inscricoes) {
    const arr = modGroups.get(i.modalidade_nome) ?? []
    arr.push(i)
    modGroups.set(i.modalidade_nome, arr)
  }
  const modalidades = Array.from(modGroups.entries())
    .map(([nome, items]) => ({ nome, items, icone: items[0]?.modalidade_icone }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const proximos = jogos
    .filter(j => j.status !== 'encerrado' && j.inicio && new Date(j.inicio) > new Date())
    .slice(0, 5)
  const disputados = jogos
    .filter(j => j.status === 'encerrado' && j.placar_a != null && j.placar_b != null)
    .slice(-10).reverse()

  const semJogos = jogos.length === 0
  const agora    = new Date()
  const hojeStr  = agora.toISOString().slice(0, 10)

  const jogoAoVivo   = jogos.find(j => j.status === 'ao_vivo') ?? null
  const jogosHoje    = jogos.filter(j => j.inicio && j.inicio.slice(0, 10) === hojeStr && j.status !== 'encerrado' && j.status !== 'cancelado')
  const proximoFuturo = jogos
    .filter(j => j.inicio && new Date(j.inicio) > agora && j.inicio.slice(0, 10) !== hojeStr && j.status !== 'encerrado' && j.status !== 'cancelado')
    .sort((a, b) => new Date(a.inicio!).getTime() - new Date(b.inicio!).getTime())[0] ?? null

  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: atletica.nome, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  return (
    <div style={{ minHeight: '100%', padding: '24px 24px 80px', background: 'transparent' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Pré-competição banner ── */}
        {semJogos && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', marginBottom: 16,
            background: 'rgba(240,208,74,0.08)', border: '1px solid rgba(240,208,74,0.22)',
            borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: 'rgba(10,15,11,0.60)',
          }}>
            <span style={{ fontSize: 16 }}>⏳</span>
            Competição ainda não iniciou — os dados serão atualizados em tempo real quando os jogos começarem
          </div>
        )}

        {/* ── Nav row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Link
            href="/atleticas"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'rgba(10,15,11,0.50)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} />
            Atléticas
          </Link>
          <button
            onClick={handleShare}
            title="Compartilhar"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'rgba(10,15,11,0.50)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
            }}
          >
            <Share2 style={{ width: 13, height: 13 }} />
            Compartilhar
          </button>
        </div>

        {/* ── HERO ── */}
        <section style={{
          background: `linear-gradient(135deg, #FFFFFF 0%, ${accent}08 100%)`,
          border: `1.5px solid ${accent}24`,
          borderRadius: 20, padding: '28px 32px',
          marginBottom: 24, position: 'relative', overflow: 'hidden',
        }}>
          {/* Atmospheric orb */}
          <div aria-hidden style={{
            position: 'absolute', top: -100, right: -100,
            width: 340, height: 340, borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}18 0%, transparent 68%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 22 }}>
            {/* ── LOGO / ESCUDO ── */}
            <AtleticaLogo
              slug={atletica.slug}
              nome={atletica.nome}
              logoUrl={atletica.logo_url}
              seed={atletica.seed}
              accent={accent}
              size={88}
              radius={18}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
                {divMeta && <Badge label={divMeta.nome} icon={<Trophy style={{ width: 11, height: 11 }} />} cor={divMeta.cor} />}
                {confMeta && <Badge label={confMeta.nome} icon={<span style={{ fontSize: 12 }}>{confMeta.icone}</span>} cor={confMeta.cor} />}
              </div>

              <h1 style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 'clamp(28px, 4vw, 50px)',
                fontWeight: 800, color: '#0A0F0B',
                letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 6,
                overflowWrap: 'break-word',
              }}>
                {atletica.nome}
              </h1>

              {atletica.universidade && (
                <p style={{ fontSize: 14, color: 'rgba(10,15,11,0.55)', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16 }}>
                  {atletica.universidade}
                </p>
              )}

              {/* Mini-stats inline */}
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {[
                  { label: 'modalidades', value: modalidades.length, color: 'rgba(10,15,11,0.65)' },
                  { label: 'jogados',     value: stats.jogados,      color: '#0A0F0B' },
                  { label: 'vitórias',    value: stats.vitorias,     color: '#22C55E' },
                  { label: 'pts CIA',     value: previsao.atual,     color: accent },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.40)', marginBottom: 2 }}>
                      {s.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── LIVE WIDGET ── */}
        <LiveStatusWidget
          atleticaId={atletica.id}
          jogoAoVivo={jogoAoVivo}
          jogosHoje={jogosHoje}
          proximo={proximoFuturo}
          accent={accent}
        />

        {/* ── STATS DE JOGOS ── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8, marginBottom: 24,
        }}>
          {[
            { label: 'Jogados',  value: stats.jogados,   color: '#0A0F0B' },
            { label: 'Vitórias', value: stats.vitorias,  color: '#22C55E' },
            { label: 'Derrotas', value: stats.derrotas,  color: '#EF4444' },
            {
              label: 'Saldo',
              value: stats.saldo >= 0 ? `+${stats.saldo}` : stats.saldo,
              color: stats.saldo >= 0 ? '#22C55E' : '#EF4444',
            },
          ].map(s => (
            <div key={s.label} style={{
              background: '#FFFFFF', border: '1px solid rgba(10,15,11,0.08)',
              borderRadius: 14, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.40)', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* ── FORMA RECENTE ── */}
        <section style={{
          background: '#FFFFFF', border: '1px solid rgba(10,15,11,0.08)',
          borderRadius: 14, padding: '12px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame style={{ width: 14, height: 14, color: accent }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.50)' }}>
              Forma recente · últimos 5
            </span>
          </div>
          <FormaRow forma={forma} />
        </section>

        {/* ── PREVISÃO CIA ── */}
        <PrevisaoCard previsao={previsao} accent={accent} />

        {/* ── MODALIDADES ── */}
        <section style={{ marginBottom: 32 }}>
          <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Trophy style={{ width: 16, height: 16, color: accent }} />
              <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 20, fontWeight: 800, color: '#0A0F0B', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Modalidades inscritas
              </h2>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(10,15,11,0.40)', fontVariantNumeric: 'tabular-nums' }}>
              {modalidades.length} <span style={{ opacity: 0.7 }}>· {inscricoes.length} inscrições</span>
            </span>
          </header>

          {modalidades.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(10,15,11,0.40)', padding: '24px 0', textAlign: 'center', fontStyle: 'italic' }}>
              Nenhuma modalidade inscrita ainda
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {modalidades.map(m => (
                <div key={m.nome} style={{
                  background: '#FFFFFF', border: '1px solid rgba(10,15,11,0.08)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{m.icone ?? '🏅'}</span>
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 700, color: '#0A0F0B', letterSpacing: '-0.015em' }}>
                      {m.nome}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {m.items.map(i => (
                      <span key={i.inscricao_id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px',
                        background: i.cabeca_chave ? `${accent}14` : 'rgba(10,15,11,0.05)',
                        color: i.cabeca_chave ? accent : 'rgba(10,15,11,0.60)',
                        border: i.cabeca_chave ? `1px solid ${accent}28` : '1px solid rgba(10,15,11,0.06)',
                        borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                      }}>
                        {i.cabeca_chave && <Crown style={{ width: 9, height: 9, color: accent }} />}
                        {CAT_LABEL[i.categoria] ?? i.categoria}
                        {i.cabeca_chave && <span>· {i.cabeca_chave}º</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── PRÓXIMOS JOGOS ── */}
        {proximos.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Calendar style={{ width: 15, height: 15, color: accent }} />
              <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 18, fontWeight: 800, color: '#0A0F0B', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Próximos jogos
              </h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {proximos.map(j => <JogoRow key={j.id} j={j} myId={atletica.id} accent={accent} />)}
            </div>
          </section>
        )}

        {/* ── HISTÓRICO ── */}
        {disputados.length > 0 && (
          <section>
            <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <TrendingUp style={{ width: 15, height: 15, color: accent }} />
              <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 18, fontWeight: 800, color: '#0A0F0B', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Histórico recente
              </h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {disputados.map(j => <JogoRow key={j.id} j={j} myId={atletica.id} accent={accent} />)}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
