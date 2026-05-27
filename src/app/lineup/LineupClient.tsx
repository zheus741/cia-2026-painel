'use client'

import { useState, useMemo } from 'react'

// ── Time helpers ──────────────────────────────────────────────────────────────

/** Converte "HH:MM" em minutos absolutos. Horas < 12 são pós-meia-noite. */
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h < 12 ? (h + 24) * 60 + m : h * 60 + m
}

function hourLabel(absMin: number): string {
  const h = Math.floor(absMin / 60) % 24
  return `${String(h).padStart(2, '0')}h`
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Perf {
  artist: string
  start: string
  end: string
  duration: number
  note?: string
  special?: boolean
}

interface StageData {
  arena:      Perf[]
  principal:  Perf[]
  eletronico: Perf[]
}

interface DayConfig {
  label: string
  date:  string
  wd:    string
  rangeStart: string
  rangeEnd:   string
  stages: StageData
}

// ── Programação ───────────────────────────────────────────────────────────────

const LINEUP: Record<string, DayConfig> = {
  qui: {
    label: 'QUINTA', date: '04/06', wd: 'QUI',
    rangeStart: '15:10', rangeEnd: '05:50',
    stages: {
      arena: [
        { artist: 'DJ Lipe Open Format', start: '15:10', end: '16:10', duration: 60 },
        { artist: 'Pente Redondo',        start: '16:20', end: '17:40', duration: 80, note: 'Banda' },
        { artist: 'DJ Milken',            start: '17:50', end: '18:50', duration: 60 },
        { artist: 'Turin DJ',             start: '19:00', end: '20:50', duration: 110 },
      ],
      principal: [
        { artist: 'Kenan e Kel',        start: '20:50', end: '21:50', duration: 60 },
        { artist: 'Teto',               start: '22:00', end: '23:00', duration: 60 },
        { artist: 'Turma do Pagode',    start: '23:10', end: '00:10', duration: 60 },
        { artist: 'Matheus e Kauan',    start: '00:20', end: '01:20', duration: 60 },
        { artist: 'Leo Foguete',        start: '01:30', end: '02:30', duration: 60 },
        { artist: 'Japa NK',            start: '02:40', end: '03:20', duration: 40 },
        { artist: 'Ariel B',            start: '03:30', end: '04:10', duration: 40 },
      ],
      eletronico: [
        { artist: 'Contest',            start: '20:50', end: '22:20', duration: 90 },
        { artist: 'Francisco DJ',       start: '22:20', end: '23:50', duration: 90 },
        { artist: 'Cat Dealers',        start: '23:50', end: '01:20', duration: 90 },
        { artist: 'Paranormal Attack',  start: '01:20', end: '02:50', duration: 90 },
        { artist: 'Vegas',              start: '02:50', end: '04:20', duration: 90 },
        { artist: 'Claudinho Brasil',   start: '04:20', end: '05:50', duration: 90 },
      ],
    },
  },
  sex: {
    label: 'SEXTA', date: '05/06', wd: 'SEX',
    rangeStart: '14:10', rangeEnd: '07:10',
    stages: {
      arena: [
        { artist: 'DJ ou Banda Contest', start: '14:10', end: '15:00', duration: 50 },
        { artist: 'MCINTRA',             start: '15:10', end: '16:00', duration: 50 },
        { artist: 'Meu Nome é Vaca',     start: '16:10', end: '17:00', duration: 50 },
        { artist: 'Tilia',               start: '17:10', end: '18:10', duration: 60 },
        { artist: 'DJ Topo',             start: '18:20', end: '19:20', duration: 60 },
      ],
      principal: [
        { artist: 'Mr Monkey',    start: '23:10', end: '00:50', duration: 100 },
        { artist: 'Pablo Vittar', start: '01:00', end: '02:10', duration: 70 },
        { artist: 'Matue',        start: '02:20', end: '03:20', duration: 60 },
        { artist: 'Nattan',       start: '03:30', end: '05:10', duration: 100 },
        { artist: 'Petroski',     start: '05:20', end: '06:20', duration: 60 },
      ],
      eletronico: [
        { artist: 'Buja',                      start: '23:10', end: '00:10', duration: 60 },
        { artist: 'Gesus',                     start: '00:10', end: '01:10', duration: 60 },
        { artist: 'Eli Iwasa',                 start: '01:10', end: '02:10', duration: 60 },
        { artist: 'Breaking Beatz × Almanac', start: '02:10', end: '03:40', duration: 90 },
        { artist: 'Victor Lou',               start: '03:40', end: '05:10', duration: 90 },
        { artist: 'DJ GBR',                   start: '05:10', end: '06:10', duration: 60 },
        { artist: 'Victor Lou × DJ GBR',      start: '06:10', end: '07:10', duration: 60 },
      ],
    },
  },
  sab: {
    label: 'SÁBADO', date: '06/06', wd: 'SÁB',
    rangeStart: '14:10', rangeEnd: '08:10',
    stages: {
      arena: [
        { artist: 'DJ Isadora',  start: '14:10', end: '15:10', duration: 60, note: 'Stage' },
        { artist: 'Federah',     start: '15:20', end: '16:30', duration: 70, note: 'Banda' },
        { artist: 'Patrick DJ',  start: '16:40', end: '18:00', duration: 80 },
        { artist: 'Melody',      start: '18:10', end: '19:10', duration: 60 },
      ],
      principal: [
        { artist: 'DJ WJ',           start: '23:10', end: '00:20', duration: 70 },
        { artist: '8K',              start: '00:30', end: '02:00', duration: 90 },
        { artist: 'Meu Nome É Vaca', start: '02:10', end: '02:50', duration: 40, note: 'Transição' },
        { artist: 'Pedro Sampaio',   start: '02:50', end: '04:50', duration: 120 },
        { artist: 'Felipe Amorim',   start: '05:00', end: '06:20', duration: 80 },
        { artist: 'GP da ZL',        start: '06:30', end: '07:30', duration: 60 },
      ],
      eletronico: [
        { artist: 'A Definir',  start: '23:10', end: '00:40', duration: 90 },
        { artist: 'A Definir',  start: '00:40', end: '02:10', duration: 90 },
        { artist: 'Zaark',      start: '02:10', end: '03:40', duration: 90 },
        { artist: 'Ilusionize', start: '03:40', end: '05:10', duration: 90 },
        { artist: 'Visage',     start: '05:10', end: '06:40', duration: 90 },
        { artist: 'Aura Vortex',start: '06:40', end: '08:10', duration: 90 },
      ],
    },
  },
  dom: {
    label: 'DOMINGO', date: '07/06', wd: 'DOM',
    rangeStart: '14:00', rangeEnd: '21:00',
    stages: {
      arena: [
        { artist: 'DJ Hidalgo',       start: '14:00', end: '15:00', duration: 60 },
        { artist: 'Sambarylove',      start: '15:10', end: '16:30', duration: 80, note: 'Banda' },
        { artist: 'DJ Lary Marques',  start: '16:40', end: '17:30', duration: 50 },
      ],
      principal: [
        { artist: 'GBR',        start: '17:40', end: '19:40', duration: 120 },
        { artist: 'Premiação',  start: '19:40', end: '20:10', duration: 30, special: true },
        { artist: 'GBR',        start: '20:10', end: '21:00', duration: 50, note: 'Retorno' },
      ],
      eletronico: [],
    },
  },
}

const DAY_IDS = ['qui', 'sex', 'sab', 'dom'] as const
type DayId = typeof DAY_IDS[number]

// ── Palcos com tones consagrados do design system ─────────────────────────────

const STAGES = [
  {
    id:        'arena' as const,
    name:      'Arena 360',
    eyebrow:   'PALCO',
    tone:      'terracotta',
    blockBg:   'linear-gradient(155deg, #C46B4A 0%, #D8845F 100%)',
    blockText: '#FFFFFF',
    blockTextMuted: 'rgba(255,255,255,0.78)',
    accentInk:  '#8b3a2a',
    accentSoft: 'rgba(196,107,74,0.10)',
    accentRing: 'rgba(196,107,74,0.22)',
    chipBg:     'rgba(0,0,0,0.18)',
  },
  {
    id:        'principal' as const,
    name:      'Principal',
    eyebrow:   'PALCO',
    tone:      'gold',
    blockBg:   'linear-gradient(155deg, #F0D04A 0%, #F5DC6A 100%)',
    blockText: '#0A0F0B',
    blockTextMuted: 'rgba(10,15,11,0.62)',
    accentInk:  '#8a5f06',
    accentSoft: 'rgba(232,184,47,0.14)',
    accentRing: 'rgba(232,184,47,0.30)',
    chipBg:     'rgba(10,15,11,0.10)',
  },
  {
    id:        'eletronico' as const,
    name:      'Eletrônico',
    eyebrow:   'PALCO',
    tone:      'electric',
    blockBg:   'linear-gradient(155deg, #3D49E0 0%, #5C68E8 100%)',
    blockText: '#FFFFFF',
    blockTextMuted: 'rgba(255,255,255,0.78)',
    accentInk:  '#2D1B5C',
    accentSoft: 'rgba(92,104,232,0.10)',
    accentRing: 'rgba(92,104,232,0.24)',
    chipBg:     'rgba(0,0,0,0.20)',
  },
]

const PX = 1.6              // pixels por minuto — mais arejado
const HEADER_H = 64
const TIME_COL_W = 64
const SANS = 'var(--font-dm-sans), system-ui, sans-serif'

// ── Componente principal ──────────────────────────────────────────────────────

export function LineupClient() {
  const [activeDay, setActiveDay] = useState<DayId>('qui')

  const day = LINEUP[activeDay]
  const startMin = toMin(day.rangeStart)
  const endMin   = toMin(day.rangeEnd)
  const totalMin = endMin - startMin
  const gridH    = totalMin * PX

  const firstHour = Math.floor(startMin / 60)
  const lastHour  = Math.ceil(endMin / 60)
  const hourTicks = useMemo(() =>
    Array.from(
      { length: lastHour - firstHour + 1 },
      (_, i) => (firstHour + i) * 60,
    ).filter(m => m >= startMin && m <= endMin),
    [firstHour, lastHour, startMin, endMin],
  )

  const totalArtists =
    day.stages.arena.length + day.stages.principal.length + day.stages.eletronico.length
  const totalHours = Math.round(totalMin / 60)

  return (
    <div className="cia-fade-in" style={{ fontFamily: SANS, color: '#0A0F0B' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER EDITORIAL — eyebrow + título grande + meta
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
            }}>
              programação musical · 04 a 07 jun
            </span>
            <h1 style={{
              marginTop: 4, marginBottom: 0,
              fontFamily: SANS,
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 0.95,
              color: '#0A0F0B',
            }}>
              Line Up
            </h1>
            <p style={{
              marginTop: 8, marginBottom: 0,
              fontSize: 14, fontWeight: 500,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
              maxWidth: 520,
            }}>
              Três palcos · {totalArtists * 4} atrações no total · Uberaba MG
            </p>
          </div>

          {/* Stats do dia ativo — número editorial */}
          <div style={{ textAlign: 'right', minWidth: 140 }}>
            <div style={{
              fontFamily: SANS,
              fontSize: 56, fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 0.9,
              color: '#0A0F0B',
            }}>
              {totalArtists}
            </div>
            <div style={{
              marginTop: 6,
              fontSize: 10, fontWeight: 700,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}>
              atrações · {totalHours}h de show
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DAY TABS — pílulas editoriais com aria-selected
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        role="tablist"
        aria-label="Selecionar dia"
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {DAY_IDS.map(id => {
          const d = LINEUP[id]
          const active = activeDay === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              aria-controls={`lineup-grid-${id}`}
              onClick={() => setActiveDay(id)}
              style={{
                position: 'relative',
                minHeight: 56,
                padding: '10px 18px',
                borderRadius: 14,
                border: active ? '1px solid #0A0F0B' : '1px solid var(--border)',
                background: active ? '#0A0F0B' : 'var(--card)',
                color: active ? '#FAF7F0' : '#0A0F0B',
                cursor: 'pointer',
                transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s',
                textAlign: 'left',
                fontFamily: SANS,
                boxShadow: active
                  ? '0 2px 0 rgba(10,15,11,0.04), 0 8px 24px rgba(10,15,11,0.18)'
                  : '0 1px 0 rgba(10,15,11,0.04)',
                minWidth: 100,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: active ? 'rgba(250,247,240,0.6)' : 'rgba(10,15,11,0.55)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {d.wd}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}>
                {d.date}
              </div>
            </button>
          )
        })}

        {/* Spacer + day label à direita */}
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          paddingRight: 4,
        }}>
          <div style={{
            width: 36, height: 1,
            background: 'rgba(10,15,11,0.18)',
          }} />
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              dia ativo
            </div>
            <div style={{
              marginTop: 2,
              fontFamily: SANS,
              fontSize: 18, fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#0A0F0B',
              lineHeight: 1,
            }}>
              {day.label.toLowerCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LEGENDA DOS PALCOS (mobile-friendly)
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        marginBottom: 14,
        paddingLeft: 2,
      }}>
        {STAGES.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                width: 14, height: 14,
                borderRadius: 4,
                background: s.blockBg,
                boxShadow: `inset 0 0 0 1px ${s.accentRing}`,
                flexShrink: 0,
              }}
            />
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'rgba(10,15,11,0.7)',
              letterSpacing: '-0.01em',
            }}>
              {s.name}
            </span>
          </div>
        ))}
        <div style={{
          marginLeft: 'auto',
          fontSize: 11, fontWeight: 600,
          color: 'rgba(10,15,11,0.4)',
          letterSpacing: '-0.01em',
          fontFamily: SANS,
        }}>
          {day.rangeStart} → {day.rangeEnd}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          GRADE — card cream com inset escuro nos cabeçalhos
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        id={`lineup-grid-${activeDay}`}
        role="tabpanel"
        aria-label={`Programação de ${day.label}`}
        style={{
          position: 'relative',
          overflowX: 'auto',
          overflowY: 'visible',
          borderRadius: 20,
          border: '1px solid rgba(10,15,11,0.10)',
          background: 'var(--card)',
          boxShadow: '0 1px 0 rgba(10,15,11,0.04), 0 8px 32px rgba(10,15,11,0.06)',
        }}
      >
        <div style={{ display: 'flex', minWidth: 720, position: 'relative' }}>

          {/* ─── Coluna de horas ────────────────────────────────────────── */}
          <div style={{
            width: TIME_COL_W,
            flexShrink: 0,
            position: 'relative',
            height: gridH + HEADER_H + 24,
            borderRight: '1px solid rgba(10,15,11,0.08)',
            background: 'rgba(10,15,11,0.015)',
          }}>
            <div style={{
              height: HEADER_H,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 14,
              borderBottom: '1px solid rgba(10,15,11,0.08)',
            }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                color: 'rgba(10,15,11,0.42)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}>
                hora
              </span>
            </div>

            {hourTicks.map(absMin => {
              const y = HEADER_H + (absMin - startMin) * PX
              return (
                <div
                  key={absMin}
                  style={{
                    position: 'absolute',
                    top: y,
                    left: 0, right: 0,
                    transform: 'translateY(-50%)',
                    textAlign: 'center',
                    fontFamily: SANS,
                    fontSize: 13, fontWeight: 700,
                    color: 'rgba(10,15,11,0.42)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {hourLabel(absMin)}
                </div>
              )
            })}
          </div>

          {/* ─── Colunas de palcos ─────────────────────────────────────── */}
          {STAGES.map(stage => {
            const perfs = day.stages[stage.id] ?? []
            const isEmpty = perfs.length === 0

            return (
              <div
                key={stage.id}
                style={{
                  flex: 1,
                  minWidth: 220,
                  position: 'relative',
                  height: gridH + HEADER_H + 24,
                  borderRight: '1px solid rgba(10,15,11,0.08)',
                }}
              >
                {/* Cabeçalho do palco — eyebrow + nome */}
                <div style={{
                  height: HEADER_H,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background: stage.accentSoft,
                  borderBottom: `2px solid ${stage.accentRing}`,
                }}>
                  <div style={{
                    fontSize: 9.5, fontWeight: 700,
                    color: 'rgba(10,15,11,0.5)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}>
                    {stage.eyebrow}
                  </div>
                  <div style={{
                    marginTop: 4,
                    fontFamily: SANS,
                    fontSize: 17, fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: stage.accentInk,
                    lineHeight: 1,
                  }}>
                    {stage.name}
                  </div>
                </div>

                {/* Linhas-guia */}
                {hourTicks.map(absMin => {
                  const y = HEADER_H + (absMin - startMin) * PX
                  return (
                    <div
                      key={absMin}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: y,
                        left: 0, right: 0,
                        height: 1,
                        background: 'rgba(10,15,11,0.06)',
                        pointerEvents: 'none',
                      }}
                    />
                  )
                })}

                {/* Empty state */}
                {isEmpty && (
                  <div style={{
                    position: 'absolute',
                    top: HEADER_H + 32,
                    left: 16, right: 16,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px dashed rgba(10,15,11,0.18)',
                    background: 'rgba(10,15,11,0.02)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700,
                      color: 'rgba(10,15,11,0.42)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}>
                      sem programação
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 500,
                      color: 'rgba(10,15,11,0.55)',
                      letterSpacing: '-0.01em',
                    }}>
                      Palco encerra mais cedo neste dia
                    </div>
                  </div>
                )}

                {/* Blocos de atração */}
                {perfs.map((p, i) => {
                  const top    = HEADER_H + (toMin(p.start) - startMin) * PX
                  const height = p.duration * PX
                  const tiny   = height < 64
                  const small  = height < 100
                  const isSpecial = p.special

                  return (
                    <div
                      key={i}
                      role="article"
                      aria-label={`${p.artist}${p.note ? ` (${p.note})` : ''} no palco ${stage.name} das ${p.start} às ${p.end}`}
                      title={`${p.artist} · ${p.start}–${p.end}`}
                      tabIndex={0}
                      style={{
                        position: 'absolute',
                        top: top + 4,
                        left: 8, right: 8,
                        height: height - 8,
                        background: isSpecial
                          ? 'linear-gradient(155deg, #0A0F0B 0%, #1a1f1c 100%)'
                          : stage.blockBg,
                        borderRadius: 14,
                        padding: tiny ? '6px 12px' : small ? '10px 14px' : '14px 16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: tiny ? 'center' : 'space-between',
                        boxShadow: isSpecial
                          ? '0 1px 0 rgba(10,15,11,0.06), 0 8px 24px rgba(10,15,11,0.25)'
                          : `0 1px 0 ${stage.accentRing}, 0 4px 12px rgba(10,15,11,0.08)`,
                        cursor: 'default',
                        transition:
                          'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: isSpecial ? '1px solid rgba(232,184,47,0.45)' : 'none',
                        outline: 'none',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.transform = 'translateY(-2px)'
                        el.style.boxShadow = isSpecial
                          ? '0 2px 0 rgba(10,15,11,0.08), 0 14px 32px rgba(10,15,11,0.30)'
                          : `0 2px 0 ${stage.accentRing}, 0 12px 28px rgba(10,15,11,0.16)`
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.transform = 'translateY(0)'
                        el.style.boxShadow = isSpecial
                          ? '0 1px 0 rgba(10,15,11,0.06), 0 8px 24px rgba(10,15,11,0.25)'
                          : `0 1px 0 ${stage.accentRing}, 0 4px 12px rgba(10,15,11,0.08)`
                      }}
                      onFocus={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.boxShadow = `0 0 0 3px rgba(10,15,11,0.85), 0 0 0 5px rgba(232,184,47,0.6)`
                      }}
                      onBlur={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.boxShadow = isSpecial
                          ? '0 1px 0 rgba(10,15,11,0.06), 0 8px 24px rgba(10,15,11,0.25)'
                          : `0 1px 0 ${stage.accentRing}, 0 4px 12px rgba(10,15,11,0.08)`
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        {/* Hora no topo (apenas em cards médios/grandes) */}
                        {!tiny && (
                          <div style={{
                            fontFamily: SANS,
                            fontSize: 10, fontWeight: 700,
                            color: isSpecial ? 'rgba(232,184,47,0.85)' : stage.blockTextMuted,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            marginBottom: 4,
                          }}>
                            {p.start} → {p.end}
                          </div>
                        )}

                        <div style={{
                          fontFamily: SANS,
                          fontSize: tiny ? 13 : small ? 15 : height > 160 ? 22 : 18,
                          fontWeight: 800,
                          letterSpacing: '-0.03em',
                          color: isSpecial ? '#FAF7F0' : stage.blockText,
                          lineHeight: 1.05,
                          wordBreak: 'break-word',
                        }}>
                          {p.artist}
                        </div>

                        {p.note && !tiny && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            marginTop: 8,
                            padding: '3px 9px',
                            borderRadius: 999,
                            background: isSpecial ? 'rgba(232,184,47,0.18)' : stage.chipBg,
                            fontFamily: SANS,
                            fontSize: 9.5, fontWeight: 700,
                            letterSpacing: '0.10em',
                            color: isSpecial ? 'rgba(232,184,47,0.95)' : (stage.tone === 'gold' ? '#0A0F0B' : '#FFFFFF'),
                            textTransform: 'uppercase',
                          }}>
                            {p.note}
                          </div>
                        )}
                      </div>

                      {/* Footer: duração */}
                      {!tiny && (
                        <div style={{
                          fontFamily: SANS,
                          fontSize: 11, fontWeight: 600,
                          color: isSpecial ? 'rgba(250,247,240,0.55)' : stage.blockTextMuted,
                          letterSpacing: '-0.01em',
                          marginTop: 6,
                        }}>
                          {p.duration} min
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RODAPÉ — disclaimer editorial
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(10,15,11,0.42)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          Programação sujeita a alterações
        </div>
        <div style={{
          flex: 1,
          height: 1,
          background: 'rgba(10,15,11,0.10)',
          minWidth: 40,
        }} />
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(10,15,11,0.42)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          CIA 2026 · Uberaba MG
        </div>
      </div>
    </div>
  )
}
