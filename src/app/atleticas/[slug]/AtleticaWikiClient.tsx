'use client'

import Link from 'next/link'
import { ArrowLeft, Crown, Trophy, Flame, TrendingUp, Calendar } from 'lucide-react'
import type {
  Atletica, InscricaoDetalhe, JogoDetalhe, AtleticaStats,
} from '@/lib/competicao/queries'
import type { ConferenciaMeta, DivisaoMeta } from '@/lib/conferencias'

interface Props {
  atletica:   Atletica
  inscricoes: InscricaoDetalhe[]
  jogos:      JogoDetalhe[]
  stats:      AtleticaStats
  forma:      ('V'|'E'|'D')[]
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
  atletica, inscricoes, jogos, stats, forma, confMeta, divMeta, accent,
}: Props) {

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

  return (
    <div style={{
      minHeight: '100%',
      padding: '24px 24px 80px',
      background: 'transparent',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

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
                <InlineMiniStat label="pontos"      value={stats.pontos}      accent={accent} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── STATS GRID ─── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10, marginBottom: 28,
        }}>
          <StatBlock big label="Pontos"  value={stats.pontos}     accent={accent} sub="3·V + 1·E" />
          <StatBlock     label="Jogados" value={stats.jogados} />
          <StatBlock     label="Vitórias" value={stats.vitorias} accent="#22C55E" />
          <StatBlock     label="Empates"  value={stats.empates}  accent="#94A3B8" />
          <StatBlock     label="Derrotas" value={stats.derrotas} accent="#EF4444" />
          <StatBlock     label="Gols pró"    value={stats.gols_pro} />
          <StatBlock     label="Gols contra" value={stats.gols_contra} />
          <StatBlock     label="Saldo" value={stats.saldo >= 0 ? `+${stats.saldo}` : stats.saldo}
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr auto auto 1fr 80px',
      alignItems: 'center', gap: 12,
      background: '#FFFFFF',
      border: '1px solid rgba(10,15,11,0.08)',
      borderRadius: 12, padding: '10px 14px',
    }}>
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
    </div>
  )
}
