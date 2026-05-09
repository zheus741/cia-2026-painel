'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RankingItem {
  id: string; nome: string; funcao: string | null; total: number; publicados: number
}

export interface LacunaItem {
  id: string; label: string; hora: string; modalidade: string
}

export interface VolumePorHora {
  hora: number; count: number
}

export interface AtleticaItem {
  nome: string; jogos: number; coberta: boolean
}

interface Props {
  ranking:       RankingItem[]
  lacunas:       LacunaItem[]
  volumePorHora: VolumePorHora[]
  atleticas:     AtleticaItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FUNCAO_LABEL: Record<string, string> = {
  foto: 'Foto', video: 'Vídeo', social: 'Social', design: 'Design',
  texto: 'Texto', coordenacao: 'Coord',
}

const MEDAL = ['🥇', '🥈', '🥉']

// ─────────────────────────────────────────────────────────────────────────────
// Eyebrow + Heading helpers
// ─────────────────────────────────────────────────────────────────────────────

function CardHeader({
  eyebrow,
  heading,
  subheading,
  badgeText,
  badgeColor,
  badgeBg,
}: {
  eyebrow:    string
  heading:    string
  subheading?: string
  badgeText?: string
  badgeColor?: string
  badgeBg?:    string
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          {eyebrow}
        </span>
        {badgeText && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: badgeColor ?? '#0A0F0B',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: 999,
            background: badgeBg ?? 'rgba(10,15,11,0.06)',
          }}>
            {badgeText}
          </span>
        )}
      </div>
      <h3 style={{
        marginTop: 4,
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: 26, fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#0A0F0B',
        lineHeight: 1.05,
      }}>
        {heading}
      </h3>
      {subheading && (
        <p style={{
          marginTop: 2,
          fontSize: 13, fontWeight: 500,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          {subheading}
        </p>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ranking de Produtividade — cream
// ─────────────────────────────────────────────────────────────────────────────

function RankingCard({ ranking }: { ranking: RankingItem[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200)
    return () => clearTimeout(t)
  }, [])

  const maxPub = Math.max(...ranking.map(r => r.publicados), 1)

  return (
    <div className="cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 320 }}>
      <CardHeader
        eyebrow="ranking de produtividade"
        heading="Quem mais publicou"
        subheading={ranking.length === 0 ? 'Sem responsáveis ainda' : `${ranking.length} pessoas com publicações`}
      />

      <div className="flex-1 mt-4 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
        {ranking.length === 0 ? (
          <p style={{
            fontSize: 14, color: 'rgba(10,15,11,0.40)',
            textAlign: 'center', padding: '24px 0',
          }}>
            Sem responsáveis atribuídos ainda.
          </p>
        ) : (
          ranking.map((r, i) => {
            const pct    = r.total > 0 ? Math.round((r.publicados / r.total) * 100) : 0
            const barW   = mounted ? Math.max((r.publicados / maxPub) * 100, r.publicados > 0 ? 3 : 0) : 0
            const isTop3 = i < 3
            const medal  = MEDAL[i] ?? null

            return (
              <div key={r.id}>
                <div className="flex items-center gap-2 mb-1">
                  <div style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>
                    {medal
                      ? <span style={{ fontSize: 16 }}>{medal}</span>
                      : <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: 'rgba(10,15,11,0.35)',
                        }}>{i + 1}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0 flex items-baseline gap-2">
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: isTop3 ? '#0A0F0B' : 'rgba(10,15,11,0.65)',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {r.nome}
                    </span>
                    {r.funcao && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700,
                        color: 'rgba(46,107,66,0.55)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}>
                        {FUNCAO_LABEL[r.funcao] ?? r.funcao}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span style={{
                      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                      fontSize: 18, fontWeight: 800,
                      color: isTop3 ? '#2e6b42' : 'rgba(10,15,11,0.55)',
                      letterSpacing: '-0.02em',
                    }}>
                      {r.publicados}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(10,15,11,0.35)' }}>
                      /{r.total}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: pct >= 70 ? '#2e6b42' : pct >= 40 ? '#B58812' : 'rgba(10,15,11,0.40)',
                      marginLeft: 4,
                    }}>
                      {pct}%
                    </span>
                  </div>
                </div>

                <div style={{
                  marginLeft: 30,
                  height: 4,
                  borderRadius: 999,
                  background: 'rgba(10,15,11,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${barW}%`,
                    background: isTop3
                      ? 'linear-gradient(90deg, #2e6b42, #4aa066)'
                      : 'rgba(46,107,66,0.35)',
                    transition: `width 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
                    borderRadius: 999,
                  }} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Lacunas de Cobertura — terracota (alert)
// ─────────────────────────────────────────────────────────────────────────────

function LacunasCard({ lacunas }: { lacunas: LacunaItem[] }) {
  const count = lacunas.length

  if (count === 0) {
    return (
      <div className="cia-edit-card cia-edit-card--green cia-metrics-cell" style={{ minHeight: 320 }}>
        <div className="flex items-center justify-between">
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '-0.01em',
          }}>
            lacunas de cobertura
          </span>
          <ShieldCheck style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.85)' }} />
        </div>
        <h3 style={{
          marginTop: 4,
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 26, fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#FFFFFF',
          lineHeight: 1.05,
        }}>
          Cobertura completa
        </h3>

        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <ShieldCheck style={{ width: 44, height: 44, color: 'rgba(255,255,255,0.85)' }} />
          <p style={{
            fontSize: 14, fontWeight: 600,
            color: '#FFFFFF',
            textAlign: 'center',
          }}>
            Todos os jogos de hoje têm checklist criado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cia-edit-card cia-edit-card--terracotta cia-metrics-cell" style={{ minHeight: 320 }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '-0.01em',
        }}>
          lacunas de cobertura
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '4px 11px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.20)',
          border: '1px solid rgba(255,255,255,0.30)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 6px rgba(255,255,255,0.7)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          {count} sem equipe
        </span>
      </div>

      <h3 style={{
        marginTop: 4,
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: 26, fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#FFFFFF',
        lineHeight: 1.05,
      }}>
        Jogos sem checklist
      </h3>

      <div className="flex-1 mt-4 space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
        {lacunas.map(l => (
          <div key={l.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}>
            <span style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 12, fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
              minWidth: 38,
              letterSpacing: '-0.02em',
            }}>
              {l.hora}
            </span>
            <span style={{
              flex: 1,
              fontSize: 12.5, fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {l.label}
            </span>
            {l.modalidade && (
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {l.modalidade}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Volume de Jogos por Hora — lavender (data viz)
// ─────────────────────────────────────────────────────────────────────────────

function VolumeHoraCard({ volumePorHora }: { volumePorHora: VolumePorHora[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300)
    return () => clearTimeout(t)
  }, [])

  const maxCount = Math.max(...volumePorHora.map(v => v.count), 1)
  const totalJogos = volumePorHora.reduce((s, v) => s + v.count, 0)
  const pico = volumePorHora.reduce((a, b) => (b.count > a.count ? b : a), { hora: 0, count: 0 })

  if (volumePorHora.length === 0) {
    return (
      <div className="cia-edit-card cia-edit-card--lavender cia-metrics-cell" style={{ minHeight: 320 }}>
        <CardHeader eyebrow="volume por hora" heading="Jogos simultâneos" />
        <div className="flex-1 flex items-center justify-center">
          <p style={{
            fontSize: 14, color: 'rgba(45,27,92,0.40)',
            textAlign: 'center',
          }}>
            Sem jogos programados para hoje.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cia-edit-card cia-edit-card--lavender cia-metrics-cell" style={{ minHeight: 320 }}>
      <CardHeader
        eyebrow="volume por hora"
        heading="Jogos simultâneos"
        subheading="Distribuição cronológica · hoje"
      />

      {/* Stat tiles */}
      <div className="mt-4 flex gap-2">
        <div style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.40)',
          border: '1px solid rgba(45,27,92,0.10)',
        }}>
          <div style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 26, fontWeight: 800,
            color: '#0A0F0B',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}>
            {totalJogos}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(45,27,92,0.55)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            jogos hoje
          </div>
        </div>
        <div style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: 14,
          background: pico.count >= 5 ? 'rgba(196,107,74,0.18)' : 'rgba(255,255,255,0.40)',
          border: pico.count >= 5 ? '1px solid rgba(196,107,74,0.30)' : '1px solid rgba(45,27,92,0.10)',
        }}>
          <div style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 26, fontWeight: 800,
            color: pico.count >= 5 ? '#A04A2E' : '#0A0F0B',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}>
            {String(pico.hora).padStart(2, '0')}<span style={{ fontSize: 16 }}>h</span>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: pico.count >= 5 ? '#A04A2E' : 'rgba(45,27,92,0.55)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            pico ({pico.count})
          </div>
        </div>
      </div>

      {/* Histogram */}
      <div className="flex-1 flex flex-col justify-end mt-4">
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {volumePorHora.map((v, i) => {
            const barH = mounted ? Math.max((v.count / maxCount) * 100, 6) : 0
            const isPeak = v.count === maxCount && maxCount > 1
            return (
              <div key={v.hora} className="flex flex-col items-center flex-1" style={{ gap: 2 }}>
                <div
                  title={`${String(v.hora).padStart(2, '0')}h: ${v.count} jogo${v.count !== 1 ? 's' : ''}`}
                  style={{
                    width: '80%',
                    height: `${barH}%`,
                    minHeight: v.count > 0 ? 4 : 0,
                    borderRadius: '6px 6px 0 0',
                    background: isPeak
                      ? 'linear-gradient(180deg, #A04A2E 0%, #C46B4A 100%)'
                      : 'linear-gradient(180deg, #5C68E8 0%, #3D49E0 100%)',
                    transition: `height 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 30}ms`,
                  }}
                />
                {v.count > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: isPeak ? '#A04A2E' : 'rgba(45,27,92,0.65)',
                    letterSpacing: '-0.02em',
                  }}>
                    {v.count}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-1 mt-1.5">
          {volumePorHora.map(v => (
            <div key={v.hora} style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 9, fontWeight: 600,
              color: 'rgba(45,27,92,0.45)',
              letterSpacing: '0.04em',
            }}>
              {String(v.hora).padStart(2, '0')}
            </div>
          ))}
        </div>

        {pico.count >= 5 && (
          <div className="mt-3 flex items-center gap-1.5" style={{
            fontSize: 11, fontWeight: 600,
            color: '#A04A2E',
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(196,107,74,0.10)',
            border: '1px solid rgba(196,107,74,0.20)',
          }}>
            <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
            <span>{pico.count} jogos às {String(pico.hora).padStart(2, '0')}h — reforçar escala</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cobertura por Atlética — gold
// ─────────────────────────────────────────────────────────────────────────────

function AtleticasCard({ atleticas }: { atleticas: AtleticaItem[] }) {
  const cobertasCount = atleticas.filter(a => a.coberta).length
  const totalCount = atleticas.length
  const pct = totalCount > 0 ? Math.round((cobertasCount / totalCount) * 100) : 0
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="cia-edit-card cia-edit-card--gold cia-metrics-cell" style={{ minHeight: 320 }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(70,50,5,0.65)',
          letterSpacing: '-0.01em',
        }}>
          cobertura por atlética
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: pct >= 70 ? '#2e6b42' : '#A04A2E',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '3px 10px',
          borderRadius: 999,
          background: pct >= 70 ? 'rgba(46,107,66,0.14)' : 'rgba(196,107,74,0.18)',
        }}>
          {pct}% cobertas
        </span>
      </div>
      <h3 style={{
        marginTop: 4,
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: 26, fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#0A0F0B',
        lineHeight: 1.05,
      }}>
        Equipes com conteúdo
      </h3>
      <p style={{
        marginTop: 2,
        fontSize: 13, fontWeight: 500,
        color: 'rgba(70,50,5,0.65)',
        letterSpacing: '-0.01em',
      }}>
        {cobertasCount} de {totalCount} atléticas
      </p>

      {/* Big bar */}
      <div style={{
        marginTop: 12,
        height: 10,
        borderRadius: 999,
        background: 'rgba(70,50,5,0.10)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: mounted ? `${pct}%` : '0%',
          background: pct >= 70
            ? 'linear-gradient(90deg, #2e6b42 0%, #4aa066 100%)'
            : 'linear-gradient(90deg, #B58812 0%, #E8B82F 100%)',
          transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: 999,
        }} />
      </div>

      {/* Tags */}
      {atleticas.length === 0 ? (
        <p style={{
          fontSize: 13, color: 'rgba(70,50,5,0.45)',
          textAlign: 'center', padding: '24px 0',
        }}>
          Nenhuma atlética encontrada.
        </p>
      ) : (
        <div className="flex-1 mt-3 flex flex-wrap gap-1.5 overflow-y-auto" style={{ maxHeight: 160 }}>
          {atleticas.map(a => (
            <div
              key={a.nome}
              title={`${a.nome} · ${a.jogos} jogo${a.jogos !== 1 ? 's' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 9px',
                borderRadius: 999,
                background: a.coberta ? 'rgba(46,107,66,0.16)' : 'rgba(196,107,74,0.16)',
                border: `1px solid ${a.coberta ? 'rgba(46,107,66,0.32)' : 'rgba(196,107,74,0.32)'}`,
                fontSize: 11, fontWeight: 600,
                color: a.coberta ? '#1a4a2e' : '#7a2e1c',
                letterSpacing: '-0.01em',
              }}
            >
              {a.coberta
                ? <ShieldCheck style={{ width: 11, height: 11, flexShrink: 0 }} />
                : <ShieldAlert  style={{ width: 11, height: 11, flexShrink: 0 }} />
              }
              <span style={{
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 110,
              }}>
                {a.nome}
              </span>
              <span style={{ fontSize: 9, opacity: 0.65, marginLeft: 1 }}>{a.jogos}j</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function AnalyticsCards({ ranking, lacunas, volumePorHora, atleticas }: Props) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 14,
      }}
    >
      <div className="cia-metrics-col-6"><RankingCard      ranking={ranking} /></div>
      <div className="cia-metrics-col-6"><LacunasCard      lacunas={lacunas} /></div>
      <div className="cia-metrics-col-6"><VolumeHoraCard   volumePorHora={volumePorHora} /></div>
      <div className="cia-metrics-col-6"><AtleticasCard    atleticas={atleticas} /></div>
    </div>
  )
}
