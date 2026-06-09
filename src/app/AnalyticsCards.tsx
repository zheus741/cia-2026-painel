'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ShieldCheck, ShieldAlert, ArrowUpRight } from 'lucide-react'

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
  pracas?:       import('@/lib/competicao/pracas').PracaStats[]
  funil?:        import('@/lib/conteudos/funil-producao').FunilProducao | null
  extras?:       import('@/lib/conteudos/analytics-extras').AnalyticsExtras
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

export function AnalyticsCards({ ranking, lacunas, volumePorHora, atleticas, pracas = [], funil = null, extras }: Props) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 14,
      }}
    >
      {funil && funil.totalTarefas > 0 && (
        <div style={{ gridColumn: 'span 12' }}><FunilCard funil={funil} /></div>
      )}
      <div className="cia-metrics-col-6"><RankingCard      ranking={ranking} /></div>
      <div className="cia-metrics-col-6"><LacunasCard      lacunas={lacunas} /></div>
      <div className="cia-metrics-col-6"><VolumeHoraCard   volumePorHora={volumePorHora} /></div>
      <div className="cia-metrics-col-6"><AtleticasCard    atleticas={atleticas} /></div>
      {extras && (
        <>
          <div className="cia-metrics-col-6"><MixCard        extras={extras} /></div>
          <div className="cia-metrics-col-6"><PorDiaCard     extras={extras} /></div>
          <div className="cia-metrics-col-6"><PatrocinioCard extras={extras} /></div>
          <div className="cia-metrics-col-6"><EquipeCard     extras={extras} /></div>
        </>
      )}
      {pracas.length > 0 && (
        <div style={{ gridColumn: 'span 12' }}>
          <PracasCard pracas={pracas} />
        </div>
      )}
    </div>
  )
}

// ── Cards extras: mix / por dia / patrocínio / equipe ────────────────────────

type Extras = import('@/lib/conteudos/analytics-extras').AnalyticsExtras

const CANAL_LABEL: Record<string, string> = {
  instagram_cia: 'Instagram CIA', instagram_jogo_rapido: 'IG Jogo Rápido', tiktok_cia: 'TikTok CIA',
  instagram_exp: 'Instagram EXP', instagram_nix: 'Instagram Nix', x_cia: 'X CIA', x_exp: 'X EXP',
}
const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', stories: 'Stories', feed: 'Feed', foto: 'Foto', video: 'Vídeo',
}

function ExtraBars({ items, labelMap, color = '#2e6b42' }: { items: { label: string; count: number }[]; labelMap?: Record<string, string>; color?: string }) {
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="space-y-1.5">
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
          <span style={{ width: 116, flexShrink: 0, textAlign: 'right', color: 'rgba(10,15,11,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{labelMap?.[it.label] ?? it.label}</span>
          <span style={{ flex: 1, height: 14, borderRadius: 4, background: 'rgba(10,15,11,0.06)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.max(3, it.count / max * 100)}%`, background: color, borderRadius: 4 }} />
          </span>
          <span style={{ width: 32, textAlign: 'right', fontWeight: 800, color: '#0A0F0B', fontVariantNumeric: 'tabular-nums' }}>{it.count}</span>
        </div>
      ))}
    </div>
  )
}

function MixCard({ extras }: { extras: Extras }) {
  return (
    <div className="cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 320 }}>
      <CardHeader eyebrow="mix de conteúdo" heading="Pra onde foi" subheading="Plataformas e formatos publicados" />
      <div className="mt-4 space-y-4">
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.4)', marginBottom: 6 }}>Plataformas</p>
          <ExtraBars items={extras.canais} labelMap={CANAL_LABEL} color="#2e6b42" />
        </div>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.4)', marginBottom: 6 }}>Formatos</p>
          <ExtraBars items={extras.formatos} labelMap={FMT_LABEL} color="#B58812" />
        </div>
      </div>
    </div>
  )
}

function PorDiaCard({ extras }: { extras: Extras }) {
  const max = Math.max(...extras.porDia.map(d => d.total), 1)
  return (
    <div className="cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 320 }}>
      <CardHeader eyebrow="ritmo de produção" heading="Produção por dia" subheading="Total e publicados em cada dia" />
      <div className="mt-6 flex items-end justify-around gap-3" style={{ height: 190 }}>
        {extras.porDia.map(d => {
          const hTotal = Math.max(4, d.total / max * 150)
          const hPub = d.total > 0 ? d.publicados / d.total * hTotal : 0
          return (
            <div key={d.dia} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0A0F0B' }}>{d.total}</span>
              <div style={{ width: 40, height: hTotal, borderRadius: '6px 6px 0 0', background: 'rgba(46,107,66,0.18)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: hPub, background: '#2e6b42' }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(10,15,11,0.55)' }}>{d.label}</span>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 10.5, color: 'rgba(10,15,11,0.45)', textAlign: 'center', marginTop: 10 }}>
        <span style={{ color: '#2e6b42', fontWeight: 700 }}>■</span> publicados · <span style={{ color: 'rgba(46,107,66,0.4)', fontWeight: 700 }}>■</span> total
      </p>
    </div>
  )
}

function PatrocinioCard({ extras }: { extras: Extras }) {
  return (
    <div className="cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 320 }}>
      <CardHeader eyebrow="comercial" heading="Entregas por patrocinador" subheading={`${extras.patrocinio.length} patrocinadores`} />
      <div className="flex-1 mt-4 space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
        {extras.patrocinio.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(10,15,11,0.4)', textAlign: 'center', padding: '24px 0' }}>Sem dados de patrocínio.</p>
        ) : extras.patrocinio.map(p => {
          const pct = p.contratado > 0 ? Math.round(p.entregues / p.contratado * 100) : null
          const w = p.contratado > 0 ? Math.min(100, p.entregues / p.contratado * 100) : (p.entregues > 0 ? 100 : 0)
          const ok = pct != null && pct >= 100
          return (
            <div key={p.nome}>
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0F0B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: ok ? '#2e6b42' : 'rgba(10,15,11,0.55)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {p.entregues}{p.contratado > 0 && <span style={{ color: 'rgba(10,15,11,0.35)' }}>/{p.contratado}</span>}
                  {pct != null && <span style={{ marginLeft: 4, color: ok ? '#2e6b42' : pct >= 50 ? '#B58812' : '#c0392b' }}>{pct}%</span>}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(10,15,11,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${w}%`, background: ok ? '#2e6b42' : '#B58812', borderRadius: 999 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EquipeCard({ extras }: { extras: Extras }) {
  const maxPub = Math.max(...extras.equipe.map(e => e.publicados), 1)
  return (
    <div className="cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 320 }}>
      <CardHeader eyebrow="equipe" heading="Por função" subheading="Pessoas e publicações" />
      <div className="flex-1 mt-4 space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
        {extras.equipe.map(e => {
          const w = Math.max(3, e.publicados / maxPub * 100)
          return (
            <div key={e.funcao}>
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0F0B' }}>
                  {FUNCAO_LABEL[e.funcao] ?? e.funcao}
                  <span style={{ fontSize: 11, color: 'rgba(10,15,11,0.4)', marginLeft: 6 }}>{e.pessoas} {e.pessoas === 1 ? 'pessoa' : 'pessoas'}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#2e6b42', fontVariantNumeric: 'tabular-nums' }}>{e.publicados}</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(10,15,11,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${w}%`, background: 'linear-gradient(90deg,#2e6b42,#4aa066)', borderRadius: 999 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── FunilCard — andamento da produção (captação/design/edição) ───────────────

function FunilCard({ funil }: { funil: import('@/lib/conteudos/funil-producao').FunilProducao }) {
  const SANS = 'var(--font-dm-sans), system-ui, sans-serif'
  const ICONE: Record<string, string> = { captacao: '📷', design: '🎨', edicao: '🎬' }

  return (
    <div className="cia-edit-card cia-edit-card--cream" style={{ minHeight: 'auto' }}>
      <div className="flex items-start justify-between">
        <div>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(10,15,11,0.55)', letterSpacing: '-0.01em' }}>
            funil de produção
          </span>
          <h3 className="mt-1" style={{
            fontFamily: SANS, fontSize: 28, fontWeight: 800,
            letterSpacing: '-0.04em', color: '#0A0F0B', lineHeight: 1,
          }}>
            {funil.pctGeral}% concluído
          </h3>
          <p style={{ marginTop: 6, fontSize: 12.5, fontWeight: 500, color: 'rgba(10,15,11,0.55)' }}>
            {funil.totalConcluidas}/{funil.totalTarefas} tarefas
            {funil.produzindoAgora > 0 && (
              <span style={{ marginLeft: 8, color: '#2563eb', fontWeight: 700 }}>
                ● {funil.produzindoAgora} produzindo agora
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 3 etapas, barra empilhada concluído/produzindo/a fazer */}
      <div className="mt-4 space-y-3">
        {funil.etapas.map(et => {
          const pctConc = et.total > 0 ? (et.concluido / et.total) * 100 : 0
          const pctProd = et.total > 0 ? (et.produzindo / et.total) * 100 : 0
          return (
            <div key={et.etapa}>
              <div className="mb-1 flex items-baseline justify-between">
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0A0F0B' }}>
                  <span aria-hidden style={{ marginRight: 6 }}>{ICONE[et.etapa]}</span>
                  {et.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,15,11,0.55)', fontVariantNumeric: 'tabular-nums' }}>
                  {et.concluido}/{et.total}
                  {et.total === 0 && <span style={{ opacity: 0.5 }}> · sem responsável</span>}
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', background: 'rgba(10,15,11,0.07)', display: 'flex' }}>
                {pctConc > 0 && <div style={{ width: `${pctConc}%`, background: '#2e9e6b' }} title={`${et.concluido} concluído`} />}
                {pctProd > 0 && <div style={{ width: `${pctProd}%`, background: '#3b82f6' }} title={`${et.produzindo} produzindo`} />}
              </div>
              {/* legenda inline */}
              <div className="mt-1 flex items-center gap-3" style={{ fontSize: 10, fontWeight: 600, color: 'rgba(10,15,11,0.5)' }}>
                <span style={{ color: '#1f7a52' }}>{et.concluido} concluído</span>
                {et.produzindo > 0 && <span style={{ color: '#2563eb' }}>{et.produzindo} produzindo</span>}
                {et.naoIniciado > 0 && <span>{et.naoIniciado} a fazer</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PracasCard — versão compacta do "Movimento das praças" pra home ──────────

function PracasCard({ pracas }: { pracas: import('@/lib/competicao/pracas').PracaStats[] }) {
  const totalJogos = pracas.reduce((s, p) => s + p.totalJogos, 0)
  const totalAoVivo = pracas.reduce((s, p) => s + p.aoVivo, 0)
  const totalEncerrados = pracas.reduce((s, p) => s + p.encerrados, 0)
  const pctEncerrados = totalJogos > 0 ? Math.round((totalEncerrados / totalJogos) * 100) : 0

  return (
    <div className="cia-edit-card cia-edit-card--cream" style={{ minHeight: 'auto' }}>
      <div className="flex items-start justify-between">
        <div>
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
          }}>
            movimento das praças
          </span>
          <h3 style={{
            marginTop: 4,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 28, fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#0A0F0B',
            lineHeight: 1,
          }}>
            {pracas.length} {pracas.length === 1 ? 'praça ativa' : 'praças ativas'}
          </h3>
          <p style={{
            marginTop: 6,
            fontSize: 12.5, fontWeight: 500,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
          }}>
            {totalJogos} jogos · {pctEncerrados}% encerrados
            {totalAoVivo > 0 && <span style={{ marginLeft: 8, color: '#C0392B', fontWeight: 700 }}>● {totalAoVivo} ao vivo</span>}
          </p>
        </div>
        <Link
          href="/esportivo"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 13px',
            borderRadius: 999,
            background: '#0A0F0B',
            color: '#FFFFFF',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          Ver detalhe
          <ArrowUpRight size={12} strokeWidth={2.2} />
        </Link>
      </div>

      {/* Mini-grid de praças */}
      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {pracas.slice(0, 8).map(p => {
          const pct = p.totalJogos > 0 ? Math.round((p.encerrados / p.totalJogos) * 100) : 0
          const topMod = p.modalidades.slice(0, 2)
          return (
            <div
              key={p.id}
              style={{
                padding: 12,
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(10,15,11,0.08)',
                borderRadius: 12,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p style={{
                  fontSize: 13, fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#0A0F0B',
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}>
                  {p.nome}
                </p>
                <span style={{
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 18, fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#0A0F0B',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}>
                  {p.totalJogos}
                </span>
              </div>

              {/* Mini barra */}
              <div style={{
                marginTop: 6,
                height: 4, borderRadius: 2,
                background: 'rgba(10,15,11,0.08)',
                overflow: 'hidden',
                display: 'flex',
              }}>
                {p.encerrados > 0 && (
                  <div style={{
                    width: `${(p.encerrados / p.totalJogos) * 100}%`,
                    background: p.cor ?? '#2e6b42',
                  }} />
                )}
                {p.aoVivo > 0 && (
                  <div style={{
                    width: `${(p.aoVivo / p.totalJogos) * 100}%`,
                    background: '#C0392B',
                  }} />
                )}
              </div>

              {/* Top modalidades + atléticas count */}
              <div className="mt-2 flex items-center gap-2" style={{
                fontSize: 10.5, fontWeight: 600,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '-0.01em',
              }}>
                {topMod.length > 0 && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                    {topMod.map(m => `${m.icone ?? ''} ${m.nome}`).join(' · ')}
                    {p.modalidades.length > 2 && <span style={{ opacity: 0.6 }}> +{p.modalidades.length - 2}</span>}
                  </span>
                )}
                <span style={{
                  flexShrink: 0,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: 'rgba(10,15,11,0.06)',
                  fontSize: 9.5, fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  {p.atleticas.length} atl
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {pracas.length > 8 && (
        <p className="mt-2 text-center" style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          +{pracas.length - 8} praças no detalhe completo
        </p>
      )}
    </div>
  )
}
