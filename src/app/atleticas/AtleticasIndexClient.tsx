'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight, Search, Trophy, Users, AlertCircle } from 'lucide-react'
import type { Atletica } from '@/lib/competicao/queries'
import type { ConferenciaMeta, ConferenciaNome } from '@/lib/conferencias'

interface Group { conferencia: ConferenciaNome; meta: ConferenciaMeta; equipes: Atletica[] }
interface Totals { total: number; div1: number; div2: number; super08: number; semDiv: number }

interface Props {
  div1:           Atletica[]
  div2:           Atletica[]
  super08ByConf:  Group[]
  semDiv:         Atletica[]
  totals:         Totals
}

// ─────────────────────────────────────────────────────────────────────────────
// AtleticaCard — chip que linka pra wiki da atlética
// ─────────────────────────────────────────────────────────────────────────────

function AtleticaCard({ a, accent }: { a: Atletica; accent: string }) {
  return (
    <Link
      href={`/atleticas/${a.slug}`}
      className="cia-atl-card group"
      style={{
        textDecoration: 'none',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        background: '#FFFFFF',
        border: '1px solid rgba(10,15,11,0.08)',
        borderRadius: 12,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Seed pill */}
      <div
        style={{
          width: 28, height: 28, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
          background: `${accent}14`,
          color: accent,
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 12, fontWeight: 800,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          border: `1px solid ${accent}28`,
        }}
      >
        {a.seed ?? '·'}
      </div>

      {/* Nome */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 13.5, fontWeight: 700,
          color: '#0A0F0B',
          letterSpacing: '-0.015em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {a.nome}
        </div>
        {a.universidade && (
          <div style={{
            fontSize: 10.5, color: 'rgba(10,15,11,0.45)',
            marginTop: 1, letterSpacing: '0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {a.universidade}
          </div>
        )}
      </div>

      {/* Hover arrow */}
      <ArrowUpRight
        className="cia-atl-arrow"
        style={{
          width: 14, height: 14, flexShrink: 0,
          color: 'rgba(10,15,11,0.25)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DivisaoCard — seção de uma divisão (1ª, 2ª)
// ─────────────────────────────────────────────────────────────────────────────

function DivisaoSection({
  titulo, sub, equipes, accent, icon, vagas,
}: {
  titulo: string; sub: string; equipes: Atletica[]; accent: string;
  icon: React.ReactNode; vagas: number
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <header style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 10,
        borderBottom: `1px solid ${accent}28`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-flex', width: 32, height: 32,
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 10,
            background: `${accent}14`, color: accent,
            border: `1px solid ${accent}30`,
          }}>
            {icon}
          </span>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 22, fontWeight: 800,
              color: '#0A0F0B',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              {titulo}
            </h2>
            <p style={{
              fontSize: 11, color: 'rgba(10,15,11,0.50)',
              marginTop: 4, letterSpacing: '0.08em',
              textTransform: 'uppercase', fontWeight: 700,
            }}>
              {sub}
            </p>
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 14, fontWeight: 700,
          color: 'rgba(10,15,11,0.45)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}>
          <span style={{ color: accent }}>{equipes.length}</span>
          <span style={{ opacity: 0.6 }}> / {vagas}</span>
        </div>
      </header>

      {equipes.length === 0 ? (
        <p style={{
          fontSize: 13, color: 'rgba(10,15,11,0.35)',
          textAlign: 'center', padding: '24px 0',
          fontStyle: 'italic',
        }}>
          Nenhuma atlética cadastrada ainda.
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 8,
        }}>
          {equipes.map(a => <AtleticaCard key={a.id} a={a} accent={accent} />)}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ConferenciaCard — bloco de uma conferência do Super 08
// ─────────────────────────────────────────────────────────────────────────────

function ConferenciaBlock({ group }: { group: Group }) {
  const { meta, equipes } = group
  const incompleta = equipes.length < 8

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1px solid ${meta.cor}24`,
      borderRadius: 16,
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Atmosphere — gradient orb */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -30, right: -30,
          width: 120, height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${meta.cor}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <header style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 18, color: meta.cor, lineHeight: 1,
            }}>
              {meta.icone}
            </span>
            <h3 style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 16, fontWeight: 800,
              color: '#0A0F0B', letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              {meta.nome}
            </h3>
          </div>
          <div style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 12, fontWeight: 800,
            color: incompleta ? '#C46B4A' : meta.cor,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}>
            {equipes.length}/8
            {incompleta && (
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.85 }}>
                · {8 - equipes.length} aberta{8 - equipes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <p style={{
          fontSize: 10, color: 'rgba(10,15,11,0.42)',
          marginTop: 4, letterSpacing: '0.10em',
          textTransform: 'uppercase', fontWeight: 700,
        }}>
          {meta.vibe}
        </p>
      </header>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {equipes.length === 0 ? (
          <p style={{
            fontSize: 12, color: 'rgba(10,15,11,0.30)',
            textAlign: 'center', padding: '16px 0', fontStyle: 'italic',
          }}>
            Aguardando confirmações
          </p>
        ) : (
          equipes.map(a => <AtleticaCard key={a.id} a={a} accent={meta.cor} />)
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AtleticasIndexClient — exported root
// ─────────────────────────────────────────────────────────────────────────────

export function AtleticasIndexClient({ div1, div2, super08ByConf, semDiv, totals }: Props) {
  const [query, setQuery] = useState('')

  const filter = (a: Atletica) => {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return a.nome.toLowerCase().includes(q) ||
           (a.universidade?.toLowerCase().includes(q) ?? false) ||
           (a.conferencia?.toLowerCase().includes(q) ?? false)
  }

  const fDiv1 = useMemo(() => div1.filter(filter), [div1, query]) // eslint-disable-line react-hooks/exhaustive-deps
  const fDiv2 = useMemo(() => div2.filter(filter), [div2, query]) // eslint-disable-line react-hooks/exhaustive-deps
  const fSuper = useMemo(
    () => super08ByConf.map(g => ({ ...g, equipes: g.equipes.filter(filter) })),
    [super08ByConf, query] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const fSem = useMemo(() => semDiv.filter(filter), [semDiv, query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100%',
      padding: '32px 24px 80px',
      background: 'transparent',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* ─── HEADER ─── */}
        <header style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 11.5, fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(46,107,66,0.65)',
            marginBottom: 10,
          }}>
            CIA · Núcleo Esportivo
          </p>
          <h1 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(36px, 4.6vw, 60px)',
            fontWeight: 800,
            color: '#0A0F0B',
            letterSpacing: '-0.045em',
            lineHeight: 0.95,
            marginBottom: 12,
          }}>
            Atléticas
            <span style={{
              display: 'block',
              color: 'rgba(10,15,11,0.40)',
              fontSize: '0.55em',
              fontWeight: 700,
              marginTop: 8,
              letterSpacing: '-0.02em',
            }}>
              {totals.total} confirmadas · 2 divisões · 8 conferências
            </span>
          </h1>
        </header>

        {/* ─── TOTAIS + BUSCA ─── */}
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center',
          marginBottom: 32, flexWrap: 'wrap',
        }}>
          <Stat label="1ª Divisão"     value={totals.div1}     vagas={16} color="#F0D04A" />
          <Stat label="2ª Divisão"     value={totals.div2}     vagas={16} color="#4aa06a" />
          <Stat label="Super 08"       value={totals.super08}  vagas={64} color="#D8845F" />

          <div style={{ flex: 1, minWidth: 280, marginLeft: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 14, height: 14, color: 'rgba(10,15,11,0.30)',
                }}
              />
              <input
                type="text"
                placeholder="Buscar atlética, universidade, conferência..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 36px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(10,15,11,0.10)',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: '#0A0F0B',
                  letterSpacing: '-0.01em',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(46,107,66,0.40)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(10,15,11,0.10)')}
              />
            </div>
          </div>
        </div>

        {/* ─── DIVISÕES ─── */}
        <DivisaoSection
          titulo="1ª Divisão"   sub="Nível 01 · Elite"   equipes={fDiv1}
          accent="#A67D14"      vagas={16}
          icon={<Trophy style={{ width: 16, height: 16 }} />}
        />
        <DivisaoSection
          titulo="2ª Divisão"   sub="Nível 02 · Acesso"  equipes={fDiv2}
          accent="#2e6b42"      vagas={16}
          icon={<Trophy style={{ width: 16, height: 16 }} />}
        />

        {/* ─── CONFERÊNCIAS (Super 08) ─── */}
        <section style={{ marginBottom: 36 }}>
          <header style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 16, paddingBottom: 10,
            borderBottom: '1px solid rgba(216,132,95,0.28)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                display: 'inline-flex', width: 32, height: 32,
                alignItems: 'center', justifyContent: 'center',
                borderRadius: 10,
                background: 'rgba(216,132,95,0.14)', color: '#D8845F',
                border: '1px solid rgba(216,132,95,0.30)',
              }}>
                <Users style={{ width: 16, height: 16 }} />
              </span>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 22, fontWeight: 800,
                  color: '#0A0F0B',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}>
                  Conferências
                </h2>
                <p style={{
                  fontSize: 11, color: 'rgba(10,15,11,0.50)',
                  marginTop: 4, letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontWeight: 700,
                }}>
                  Super 08 · cada conferência elege 1 campeão
                </p>
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 14, fontWeight: 700,
              color: 'rgba(10,15,11,0.45)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}>
              <span style={{ color: '#D8845F' }}>{totals.super08}</span>
              <span style={{ opacity: 0.6 }}> / 64</span>
            </div>
          </header>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {fSuper.map(g => (
              <ConferenciaBlock key={g.conferencia} group={g} />
            ))}
          </div>
        </section>

        {/* ─── SEM DIVISÃO (fallback caso schema antigo) ─── */}
        {fSem.length > 0 && (
          <DivisaoSection
            titulo="Sem divisão"     sub="precisa cadastro"   equipes={fSem}
            accent="#94A3B8"         vagas={fSem.length}
            icon={<AlertCircle style={{ width: 16, height: 16 }} />}
          />
        )}

      </div>

      {/* Card hover effect */}
      <style>{`
        .cia-atl-card:hover {
          transform: translateY(-2px);
          border-color: rgba(10,15,11,0.18);
          box-shadow: 0 6px 22px -8px rgba(10,15,11,0.12);
        }
        .cia-atl-card:hover .cia-atl-arrow {
          color: #0A0F0B;
          transform: translate(2px, -2px);
        }
      `}</style>
    </div>
  )
}

function Stat({ label, value, vagas, color }: {
  label: string; value: number; vagas: number; color: string
}) {
  const pct = Math.round((value / vagas) * 100)
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      background: '#FFFFFF',
      border: `1px solid ${color}24`,
      borderRadius: 12,
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 9.5, fontWeight: 800,
          color: 'rgba(10,15,11,0.50)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 22, fontWeight: 800,
            color, letterSpacing: '-0.04em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {value}
          </span>
          <span style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 11, fontWeight: 600,
            color: 'rgba(10,15,11,0.40)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            /{vagas}
          </span>
        </div>
      </div>
      <div style={{
        width: 36, height: 4, borderRadius: 99,
        background: `${color}1A`,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 99,
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>
    </div>
  )
}
