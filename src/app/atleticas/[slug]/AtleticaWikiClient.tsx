'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Crown, Trophy, Flame, TrendingUp, Calendar, Radio, ArrowRight, Clock } from 'lucide-react'
import type {
  Atletica, InscricaoDetalhe, JogoDetalhe, AtleticaStats,
  PrevisaoAtletica,
} from '@/lib/competicao/queries'
import type { ConferenciaMeta, DivisaoMeta } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/client'

interface Props {
  atletica:   Atletica
  inscricoes: InscricaoDetalhe[]
  jogos:      JogoDetalhe[]
  stats:      AtleticaStats
  forma:      ('V'|'E'|'D')[]
  /** Previsão Mín/Máx CIA — calculada server-side a partir das inscrições. */
  previsao:   PrevisaoAtletica
  confMeta:   ConferenciaMeta | null
  divMeta:    DivisaoMeta | null
  accent:     string
}

const CAT_LABEL: Record<string, string> = { M: 'Masculino', F: 'Feminino', COED: 'Misto' }

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// StatBlock — bloco editorial gigante
// ─────────────────────────────────────────────────────────────────────────────

function StatBlock({ label, value, sub, accent, big = false }: {
  label: string; value: number | string; sub?: string; accent?: string; big?: boolean
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(10,15,11,0.08)',
      borderRadius: 14,
      padding: big ? '20px 22px' : '14px 16px',
      display: 'flex', flexDirection: 'column',
      gap: big ? 6 : 3,
    }}>
      <div style={{
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: big ? 10 : 9, fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(10,15,11,0.45)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: big ? 'clamp(40px, 4.5vw, 64px)' : 26,
        fontWeight: 800,
        color: accent ?? '#0A0F0B',
        letterSpacing: '-0.045em', lineHeight: 0.95,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: big ? 11 : 10, color: 'rgba(10,15,11,0.50)',
          letterSpacing: '0.04em', fontWeight: 500,
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Forma — sequência V/E/D
// ─────────────────────────────────────────────────────────────────────────────

function FormaRow({ forma }: { forma: ('V'|'E'|'D')[] }) {
  if (forma.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'rgba(10,15,11,0.35)', fontStyle: 'italic' }}>
        Sem jogos disputados ainda
      </div>
    )
  }
  const colorMap = { V: '#22C55E', E: '#94A3B8', D: '#EF4444' }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {forma.map((r, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, borderRadius: 8,
          background: `${colorMap[r]}18`,
          color: colorMap[r],
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 12, fontWeight: 800,
          border: `1px solid ${colorMap[r]}30`,
          letterSpacing: '-0.02em',
        }}>
          {r}
        </span>
      ))}
    </div>
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

  // Realtime: quando jogo desta atlética muda, recalcula stats e forma
  useEffect(() => {
    const supabase = createClient()
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => { router.refresh() }, 1000)
    }
    const channel = supabase
      .channel(`wiki-atletica:${atletica.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'jogos',
        filter: `equipe_a_id=eq.${atletica.id}`,
      }, scheduleRefresh)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'jogos',
        filter: `equipe_b_id=eq.${atletica.id}`,
      }, scheduleRefresh)
      .subscribe()
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [atletica.id, router])

  // Agrupa inscrições por modalidade
  const modGroups = new Map<string, InscricaoDetalhe[]>()
  for (const i of inscricoes) {
    const key = i.modalidade_nome
    const arr = modGroups.get(key) ?? []
    arr.push(i)
    modGroups.set(key, arr)
  }
  const modalidades = Array.from(modGroups.entries())
    .map(([nome, items]) => ({ nome, items, icone: items[0]?.modalidade_icone }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  // Próximos jogos (não-encerrados)
  const proximos = jogos
    .filter(j => j.status !== 'encerrado' && j.inicio && new Date(j.inicio) > new Date())
    .slice(0, 5)

  // Jogos disputados (encerrados)
  const disputados = jogos
    .filter(j => j.status === 'encerrado' && j.placar_a != null && j.placar_b != null)
    .slice(-10)
    .reverse()

  // Competição ainda não iniciou
  const semJogos = jogos.length === 0

  // ── Status ao vivo / hoje / próximo (cross-link com Placar) ──────────────
  const agora     = new Date()
  const hojeStr   = agora.toISOString().slice(0, 10)
  const jogoAoVivo = jogos.find(j => j.status === 'ao_vivo') ?? null
  const jogosHoje = jogos.filter(j =>
    j.inicio && j.inicio.slice(0, 10) === hojeStr && j.status !== 'encerrado' && j.status !== 'cancelado'
  )
  const proximoFuturo = jogos
    .filter(j => j.inicio && new Date(j.inicio) > agora && j.inicio.slice(0, 10) !== hojeStr && j.status !== 'encerrado' && j.status !== 'cancelado')
    .sort((a, b) => new Date(a.inicio!).getTime() - new Date(b.inicio!).getTime())[0] ?? null

  return (
    <div style={{
      minHeight: '100%',
      padding: '24px 24px 80px',
      background: 'transparent',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Banner pré-competição */}
        {semJogos && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            background: 'rgba(240,208,74,0.08)',
            border: '1px solid rgba(240,208,74,0.22)',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 12.5, fontWeight: 600,
            color: 'rgba(10,15,11,0.60)',
            letterSpacing: '0.01em',
          }}>
            <span style={{ fontSize: 16 }}>⏳</span>
            Competição ainda não iniciou — dados atualizados em tempo real quando os jogos começarem
          </div>
        )}

        {/* Voltar */}
        <Link
          href="/atleticas"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
            color: 'rgba(10,15,11,0.55)',
            textDecoration: 'none',
            marginBottom: 20,
            transition: 'color 0.2s',
          }}
        >
          <ArrowLeft style={{ width: 12, height: 12 }} />
          Atléticas
        </Link>

        {/* ─── HERO ─── */}
        <section style={{
          background: `linear-gradient(135deg, #FFFFFF 0%, ${accent}08 100%)`,
          border: `1px solid ${accent}24`,
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Atmospheric orb */}
          <div aria-hidden style={{
            position: 'absolute',
            top: -80, right: -80,
            width: 320, height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {/* Seed badge */}
            {atletica.seed != null && (
              <div style={{
                flexShrink: 0,
                width: 84, height: 84,
                borderRadius: 18,
                background: accent,
                color: '#FFFFFF',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 24px ${accent}40`,
              }}>
                <span style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 11, fontWeight: 800,
                  letterSpacing: '0.14em', opacity: 0.85,
                  textTransform: 'uppercase',
                }}>
                  Seed
                </span>
                <span style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 40, fontWeight: 800,
                  letterSpacing: '-0.05em', lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: 2,
                }}>
                  {atletica.seed}
                </span>
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Breadcrumb visual */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 8, flexWrap: 'wrap',
              }}>
                {divMeta && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: `${divMeta.cor}18`,
                    color: divMeta.cor,
                    fontSize: 10, fontWeight: 800,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    border: `1px solid ${divMeta.cor}30`,
                  }}>
                    <Trophy style={{ width: 11, height: 11 }} />
                    {divMeta.nome}
                  </span>
                )}
                {confMeta && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: `${confMeta.cor}18`,
                    color: confMeta.cor,
                    fontSize: 10, fontWeight: 800,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    border: `1px solid ${confMeta.cor}30`,
                  }}>
                    <span>{confMeta.icone}</span>
                    {confMeta.nome}
                  </span>
                )}
              </div>

              <h1 style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 800,
                color: '#0A0F0B',
                letterSpacing: '-0.045em',
                lineHeight: 0.95,
                marginBottom: 6,
                overflowWrap: 'break-word',
              }}>
                {atletica.nome}
              </h1>

              {atletica.universidade && (
                <p style={{
                  fontSize: 14, color: 'rgba(10,15,11,0.55)',
                  fontWeight: 600, letterSpacing: '-0.01em',
                }}>
                  {atletica.universidade}
                </p>
              )}

              {/* Inline mini-stats */}
              <div style={{
                display: 'flex', gap: 22,
                marginTop: 18, flexWrap: 'wrap',
              }}>
                <InlineMiniStat label="modalidades" value={modalidades.length} />
                <InlineMiniStat label="jogados"     value={stats.jogados}     accent="#0A0F0B" />
                <InlineMiniStat label="vitórias"    value={stats.vitorias}    accent="#22C55E" />
                <InlineMiniStat label="pontos CIA"  value={previsao.atual}    accent={accent} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── LIVE WIDGET — ao vivo / hoje / próximo (cross-link Placar) ─── */}
        <LiveStatusWidget
          atleticaId={atletica.id}
          jogoAoVivo={jogoAoVivo}
          jogosHoje={jogosHoje}
          proximo={proximoFuturo}
          accent={accent}
        />

        {/* ─── PREVISÃO MÍN/MÁX — destaque editorial ─── */}
        <PrevisaoCard previsao={previsao} accent={accent} />

        {/* ─── STATS DE JOGOS (V/D/SG — não-CIA) ─── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10, marginBottom: 28,
        }}>
          <StatBlock     label="Jogados"  value={stats.jogados} />
          <StatBlock     label="Vitórias" value={stats.vitorias} accent="#22C55E" />
          <StatBlock     label="Derrotas" value={stats.derrotas} accent="#EF4444" />
          <StatBlock     label="Saldo"    value={stats.saldo >= 0 ? `+${stats.saldo}` : stats.saldo}
                         accent={stats.saldo >= 0 ? '#22C55E' : '#EF4444'} />
        </section>

        {/* ─── FORMA RECENTE ─── */}
        <section style={{
          background: '#FFFFFF',
          border: '1px solid rgba(10,15,11,0.08)',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame style={{ width: 14, height: 14, color: accent }} />
            <span style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 10.5, fontWeight: 800,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(10,15,11,0.55)',
            }}>
              Forma recente · últimos 5
            </span>
          </div>
          <FormaRow forma={forma} />
        </section>

        {/* ─── MODALIDADES ─── */}
        <section style={{ marginBottom: 32 }}>
          <header style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Trophy style={{ width: 16, height: 16, color: accent }} />
              <h2 style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 20, fontWeight: 800,
                color: '#0A0F0B', letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                Modalidades inscritas
              </h2>
            </div>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: 'rgba(10,15,11,0.45)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {modalidades.length} <span style={{ opacity: 0.6 }}>· {inscricoes.length} inscrições</span>
            </span>
          </header>

          {modalidades.length === 0 ? (
            <p style={{
              fontSize: 13, color: 'rgba(10,15,11,0.40)',
              padding: '24px 0', textAlign: 'center', fontStyle: 'italic',
            }}>
              Nenhuma modalidade inscrita ainda
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 8,
            }}>
              {modalidades.map(m => (
                <div key={m.nome} style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(10,15,11,0.08)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{m.icone ?? '🏅'}</span>
                    <span style={{
                      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                      fontSize: 14, fontWeight: 700,
                      color: '#0A0F0B', letterSpacing: '-0.015em',
                    }}>
                      {m.nome}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {m.items.map(i => (
                      <span key={i.inscricao_id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px',
                        background: i.cabeca_chave
                          ? `${accent}14`
                          : 'rgba(10,15,11,0.05)',
                        color: i.cabeca_chave ? accent : 'rgba(10,15,11,0.62)',
                        border: i.cabeca_chave
                          ? `1px solid ${accent}28`
                          : '1px solid rgba(10,15,11,0.06)',
                        borderRadius: 99,
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}>
                        {i.cabeca_chave && (
                          <Crown style={{ width: 9, height: 9, color: accent }} />
                        )}
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

        {/* ─── PRÓXIMOS JOGOS ─── */}
        {proximos.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Calendar style={{ width: 16, height: 16, color: accent }} />
              <h2 style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 20, fontWeight: 800, color: '#0A0F0B',
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                Próximos jogos
              </h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {proximos.map(j => (
                <JogoRow key={j.id} j={j} myId={atletica.id} accent={accent} />
              ))}
            </div>
          </section>
        )}

        {/* ─── HISTÓRICO ─── */}
        {disputados.length > 0 && (
          <section>
            <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <TrendingUp style={{ width: 16, height: 16, color: accent }} />
              <h2 style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 20, fontWeight: 800, color: '#0A0F0B',
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                Histórico recente
              </h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {disputados.map(j => (
                <JogoRow key={j.id} j={j} myId={atletica.id} accent={accent} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function InlineMiniStat({ label, value, accent = 'rgba(10,15,11,0.65)' }: {
  label: string; value: number; accent?: string
}) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'rgba(10,15,11,0.45)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: 24, fontWeight: 800,
        color: accent, letterSpacing: '-0.04em',
        lineHeight: 1, marginTop: 2,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  )
}

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

  return (
    <Link
      href="/placar"
      title="Ver no Placar Ao Vivo"
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr auto auto 1fr 80px',
        alignItems: 'center', gap: 12,
        background: '#FFFFFF',
        border: '1px solid rgba(10,15,11,0.08)',
        borderRadius: 12, padding: '10px 14px',
        textDecoration: 'none',
        transition: 'border-color 150ms, transform 150ms, box-shadow 150ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}55`
        e.currentTarget.style.boxShadow = `0 2px 12px ${accent}18`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(10,15,11,0.08)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{
        fontSize: 10.5, color: 'rgba(10,15,11,0.50)',
        letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtTime(j.inicio)}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#0A0F0B',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'right',
        letterSpacing: '-0.015em',
      }}>
        {eu}
      </div>
      {enc ? (
        <div style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 18, fontWeight: 800,
          color: resultColor,
          letterSpacing: '-0.03em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {meu}
        </div>
      ) : (
        <span style={{ fontSize: 11, color: 'rgba(10,15,11,0.40)' }}>—</span>
      )}
      <span style={{
        fontSize: 13, color: 'rgba(10,15,11,0.35)',
        fontWeight: 500, padding: '0 2px',
      }}>×</span>
      {enc ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 18, fontWeight: 800,
            color: resultColor,
            letterSpacing: '-0.03em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {dele}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'rgba(10,15,11,0.65)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.015em',
          }}>
            {ele}
          </span>
        </div>
      ) : (
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'rgba(10,15,11,0.65)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.015em',
        }}>
          <span style={{ marginRight: 10, color: 'rgba(10,15,11,0.30)' }}>—</span>
          {ele}
        </div>
      )}
      <div style={{
        fontSize: 9.5, fontWeight: 800,
        color: resultColor,
        letterSpacing: '0.10em', textTransform: 'uppercase',
        textAlign: 'right',
      }}>
        {j.modalidade_nome ?? '—'}
      </div>
    </Link>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// LiveStatusWidget — exibe (ao vivo | jogos de hoje | próximo jogo) no topo
// Lógica: prioriza ao vivo > hoje > próximo. Esconde se nada relevante.
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
  // Se não tem nada, esconde o bloco inteiro
  if (!jogoAoVivo && jogosHoje.length === 0 && !proximo) return null

  // ── Caso 1: AO VIVO AGORA ────────────────────────────────────────────────
  if (jogoAoVivo) {
    const isA = jogoAoVivo.equipe_a_id === atleticaId
    const eu  = isA ? jogoAoVivo.equipe_a_nome : jogoAoVivo.equipe_b_nome
    const ele = isA ? jogoAoVivo.equipe_b_nome : jogoAoVivo.equipe_a_nome
    const meu  = isA ? jogoAoVivo.placar_a : jogoAoVivo.placar_b
    const dele = isA ? jogoAoVivo.placar_b : jogoAoVivo.placar_a
    return (
      <Link href="/placar" style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
        <section style={{
          background: 'linear-gradient(135deg, rgba(220,38,38,0.06) 0%, rgba(220,38,38,0.02) 100%)',
          border: '1px solid rgba(220,38,38,0.30)',
          borderRadius: 16, padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Pulse ring */}
          <span aria-hidden style={{
            position: 'absolute', top: 14, left: 18,
            width: 8, height: 8, borderRadius: '50%',
            background: '#DC2626',
            boxShadow: '0 0 0 0 rgba(220,38,38,0.5)',
            animation: 'liveBlink 1.4s ease-out infinite',
          }} />
          <style>{`@keyframes liveBlink { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45); } 60% { box-shadow: 0 0 0 8px rgba(220,38,38,0); } }`}</style>

          <div style={{ flex: 1, paddingLeft: 18 }}>
            <p style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#DC2626', marginBottom: 8,
            }}>
              <Radio style={{ width: 12, height: 12, display: 'inline', marginRight: 6, verticalAlign: '-1.5px' }} />
              Ao vivo agora
            </p>
            <p style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 22, fontWeight: 800, color: '#0A0F0B',
              letterSpacing: '-0.025em', lineHeight: 1.1,
            }}>
              <span>{eu}</span>
              <span style={{ color: accent, margin: '0 12px', fontVariantNumeric: 'tabular-nums' }}>
                {meu ?? 0} × {dele ?? 0}
              </span>
              <span style={{ color: 'rgba(10,15,11,0.55)' }}>{ele}</span>
            </p>
            <p style={{ fontSize: 11, color: 'rgba(10,15,11,0.50)', marginTop: 6, letterSpacing: '0.04em' }}>
              {jogoAoVivo.modalidade_nome ?? 'Jogo'}
              {jogoAoVivo.fase && <> · {jogoAoVivo.fase}</>}
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, color: '#DC2626',
            padding: '8px 14px', borderRadius: 999,
            background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.25)',
          }}>
            Ver placar <ArrowRight style={{ width: 13, height: 13 }} />
          </div>
        </section>
      </Link>
    )
  }

  // ── Caso 2: JOGOS HOJE ──────────────────────────────────────────────────
  if (jogosHoje.length > 0) {
    return (
      <Link href="/placar" style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
        <section style={{
          background: `linear-gradient(135deg, ${accent}10 0%, ${accent}04 100%)`,
          border: `1px solid ${accent}33`,
          borderRadius: 16, padding: '18px 22px',
        }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: accent,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Calendar style={{ width: 12, height: 12 }} />
              Hoje · {jogosHoje.length} {jogosHoje.length === 1 ? 'jogo' : 'jogos'}
            </p>
            <span style={{
              fontSize: 11, fontWeight: 600, color: accent,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              Ver placar <ArrowRight style={{ width: 12, height: 12 }} />
            </span>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {jogosHoje.slice(0, 4).map(j => {
              const isA  = j.equipe_a_id === atleticaId
              const ele  = isA ? j.equipe_b_nome : j.equipe_a_nome
              const hora = j.inicio ? new Date(j.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—'
              return (
                <div key={j.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  fontSize: 13, color: '#0A0F0B',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                    color: accent, minWidth: 42,
                  }}>{hora}</span>
                  <span style={{ color: 'rgba(10,15,11,0.45)', fontSize: 12 }}>vs</span>
                  <span style={{ fontWeight: 700, flex: 1, letterSpacing: '-0.015em' }}>{ele}</span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, color: 'rgba(10,15,11,0.45)',
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                  }}>{j.modalidade_nome ?? '—'}</span>
                </div>
              )
            })}
            {jogosHoje.length > 4 && (
              <p style={{ fontSize: 10, color: 'rgba(10,15,11,0.40)', marginTop: 4 }}>
                +{jogosHoje.length - 4} {jogosHoje.length - 4 === 1 ? 'outro' : 'outros'}
              </p>
            )}
          </div>
        </section>
      </Link>
    )
  }

  // ── Caso 3: PRÓXIMO JOGO ────────────────────────────────────────────────
  if (proximo) {
    const isA  = proximo.equipe_a_id === atleticaId
    const ele  = isA ? proximo.equipe_b_nome : proximo.equipe_a_nome
    const data = proximo.inicio
      ? new Date(proximo.inicio).toLocaleString('pt-BR', {
          weekday: 'short', day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        })
      : '—'
    return (
      <section style={{
        background: '#FFFFFF',
        border: '1px solid rgba(10,15,11,0.08)',
        borderRadius: 16, padding: '16px 22px',
        marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 38, height: 38, borderRadius: 12,
          background: `${accent}12`, border: `1px solid ${accent}28`,
          flexShrink: 0,
        }}>
          <Clock style={{ width: 16, height: 16, color: accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(10,15,11,0.45)', marginBottom: 3,
          }}>
            Próximo jogo
          </p>
          <p style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 16, fontWeight: 700, color: '#0A0F0B',
            letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            vs <span style={{ color: accent }}>{ele}</span>
          </p>
          <p style={{ fontSize: 11, color: 'rgba(10,15,11,0.55)', marginTop: 2, letterSpacing: '0.02em' }}>
            {data} · {proximo.modalidade_nome ?? '—'}
          </p>
        </div>
      </section>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// PrevisaoCard — Atual / Máx + barra + breakdown por modalidade
// ─────────────────────────────────────────────────────────────────────────────

function PrevisaoCard({ previsao, accent }: { previsao: PrevisaoAtletica; accent: string }) {
  const decidida = previsao.minimo === previsao.maximo
  // Escala da barra: usa o teto máximo POSSÍVEL (#inscricoes × 13)
  const tetoTeorico = Math.max(previsao.maximo, 13)
  const pctAtual    = (previsao.minimo / tetoTeorico) * 100
  const pctMax      = (previsao.maximo / tetoTeorico) * 100

  return (
    <section style={{
      background: '#FFFFFF',
      border: '1px solid rgba(10,15,11,0.08)',
      borderRadius: 16,
      padding: '20px 22px',
      marginBottom: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Eyebrow */}
      <p style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: accent, margin: 0,
      }}>
        Pontuação CIA
      </p>

      {/* Header: Atual / Máx */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800,
            color: accent, lineHeight: 0.95, letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {previsao.atual}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,15,11,0.5)' }}>
            pts atuais
          </span>
        </div>
        {!decidida && (
          <>
            <span style={{ fontSize: 18, color: 'rgba(10,15,11,0.30)' }}>→</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700,
                color: 'rgba(10,15,11,0.65)', lineHeight: 0.95,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {previsao.maximo}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,15,11,0.45)' }}>
                pts máximo
              </span>
            </div>
          </>
        )}
        <div style={{
          marginLeft: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          gap: 2,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.04em' }}>
            {previsao.vivas} modalidade{previsao.vivas !== 1 ? 's' : ''} viva{previsao.vivas !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(10,15,11,0.45)' }}>
            {previsao.decididas} já decidida{previsao.decididas !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Barra Atual → Máx */}
      <div style={{
        position: 'relative', height: 10, marginTop: 14,
        background: 'rgba(10,15,11,0.05)', borderRadius: 99, overflow: 'hidden',
      }}>
        {!decidida && (
          <div style={{
            position: 'absolute', inset: 0, width: `${pctMax}%`,
            background: `${accent}26`, borderRadius: 99,
          }} />
        )}
        <div style={{
          position: 'absolute', inset: 0, width: `${pctAtual}%`,
          background: accent, borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Breakdown por modalidade */}
      {previsao.por_modalidade.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{
            cursor: 'pointer', userSelect: 'none',
            fontSize: 11, fontWeight: 700, color: 'rgba(10,15,11,0.55)',
            letterSpacing: '0.04em',
          }}>
            Ver detalhamento por modalidade ({previsao.por_modalidade.length})
          </summary>
          <div style={{
            marginTop: 10,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8,
          }}>
            {previsao.por_modalidade.map((m, idx) => (
              <PrevisaoModalidadeRow key={`${m.modalidade_id}-${m.categoria}-${idx}`} mod={m} accent={accent} />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function PrevisaoModalidadeRow({ mod, accent }: {
  mod:    PrevisaoAtletica['por_modalidade'][number]
  accent: string
}) {
  const ESTADO_LABEL: Record<string, { label: string; cor: string; bg: string }> = {
    campeao:    { label: '🥇 Campeã',    cor: '#A67D14', bg: 'rgba(166,125,20,0.10)' },
    vice:       { label: '🥈 Vice',       cor: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
    eliminada:  { label: 'Eliminada',     cor: '#6b7280', bg: 'rgba(107,114,128,0.06)' },
    wo:         { label: 'W.O.',          cor: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
    viva:       { label: 'Em disputa',    cor: accent,    bg: `${accent}14` },
    sem_jogos:  { label: 'Aguardando',    cor: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
    prova:      { label: 'Prova',         cor: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  }
  const meta = ESTADO_LABEL[mod.estado] ?? ESTADO_LABEL.sem_jogos

  return (
    <div style={{
      background: '#FAFAFA',
      border: '1px solid rgba(10,15,11,0.06)',
      borderRadius: 10,
      padding: '8px 10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        {mod.modalidade_icone && <span style={{ fontSize: 12 }}>{mod.modalidade_icone}</span>}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0F0B' }}>
          {mod.modalidade_nome ?? '?'}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(10,15,11,0.50)' }}>
          {mod.categoria ?? ''}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: meta.cor,
          background: meta.bg, padding: '2px 6px', borderRadius: 4,
        }}>
          {meta.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#0A0F0B', fontVariantNumeric: 'tabular-nums' }}>
          {mod.decidida || mod.pontos_min === mod.pontos_max
            ? `${mod.pontos_min} pts`
            : `${mod.pontos_min} → ${mod.pontos_max} pts`
          }
        </span>
      </div>
    </div>
  )
}
