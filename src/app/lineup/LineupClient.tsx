'use client'

import { useState } from 'react'

// ── Time helpers ──────────────────────────────────────────────────────────────

/** Converte "HH:MM" em minutos absolutos — horas < 12 são "next day" (pós-meia-noite) */
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
  duration: number    // minutos
  note?: string       // "(Banda)", "(Transição)" etc
  special?: boolean   // destaque (ex: Premiação)
}

interface StageData {
  arena:      Perf[]
  principal:  Perf[]
  eletronico: Perf[]
}

interface DayConfig {
  label:   string
  date:    string
  wd:      string
  rangeStart: string
  rangeEnd:   string
  stages:  StageData
}

// ── Programação ───────────────────────────────────────────────────────────────

const LINEUP: Record<string, DayConfig> = {
  qui: {
    label: 'QUINTA-FEIRA', date: '04/06', wd: 'QUI',
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
    label: 'SEXTA-FEIRA', date: '05/06', wd: 'SEX',
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
        { artist: 'Mr Monkey',   start: '23:10', end: '00:50', duration: 100 },
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
    label: 'DOMINGO — ENCERRAMENTO', date: '07/06', wd: 'DOM',
    rangeStart: '14:00', rangeEnd: '21:00',
    stages: {
      arena: [
        { artist: 'DJ Hidalgo',       start: '14:00', end: '15:00', duration: 60 },
        { artist: 'Sambarylove',       start: '15:10', end: '16:30', duration: 80, note: 'Banda' },
        { artist: 'DJ Lary Marques',   start: '16:40', end: '17:30', duration: 50 },
      ],
      principal: [
        { artist: 'GBR',           start: '17:40', end: '19:40', duration: 120 },
        { artist: 'Premiação',     start: '19:40', end: '20:10', duration: 30, special: true },
        { artist: 'GBR',           start: '20:10', end: '21:00', duration: 50, note: 'Retorno' },
      ],
      eletronico: [],
    },
  },
}

const DAY_IDS = ['qui', 'sex', 'sab', 'dom'] as const
type DayId = typeof DAY_IDS[number]

// ── Stages com tones do design system CIA ─────────────────────────────────────

const STAGES = [
  {
    id:    'arena' as const,
    name:  'ARENA 360',
    tone:  'terracotta',
    accent:    'rgba(196, 107, 74, 1)',
    accentDim: 'rgba(196, 107, 74, 0.18)',
    blockBg:   'linear-gradient(155deg, #C46B4A 0%, #D8845F 100%)',
    blockText: '#FFFFFF',
    blockNoteBg: 'rgba(0,0,0,0.22)',
  },
  {
    id:    'principal' as const,
    name:  'PALCO PRINCIPAL',
    tone:  'gold',
    accent:    'rgba(232, 185, 79, 1)',
    accentDim: 'rgba(232, 185, 79, 0.18)',
    blockBg:   'linear-gradient(155deg, #c8973a 0%, #e8b94f 100%)',
    blockText: '#1A1106',
    blockNoteBg: 'rgba(0,0,0,0.18)',
  },
  {
    id:    'eletronico' as const,
    name:  'PALCO ELETRÔNICO',
    tone:  'electric',
    accent:    'rgba(92, 104, 232, 1)',
    accentDim: 'rgba(92, 104, 232, 0.18)',
    blockBg:   'linear-gradient(155deg, #3D49E0 0%, #5C68E8 100%)',
    blockText: '#FFFFFF',
    blockNoteBg: 'rgba(0,0,0,0.25)',
  },
]

const PX = 1.5            // pixels por minuto
const HEADER_H = 56       // altura do cabeçalho de palco
const TIME_COL_W = 60     // largura da coluna de horas

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
  const hourTicks = Array.from(
    { length: lastHour - firstHour + 1 },
    (_, i) => (firstHour + i) * 60,
  ).filter(m => m >= startMin && m <= endMin)

  const totalArtists =
    day.stages.arena.length + day.stages.principal.length + day.stages.eletronico.length

  return (
    <div className="cia-fade-in" style={{ fontFamily: "'Rajdhani', sans-serif" }}>

      {/* ── Cabeçalho com hierarquia editorial ───────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1
            className="cia-shimmer"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 6,
              lineHeight: 1,
              margin: 0,
            }}
          >
            LINE UP
          </h1>
          <span
            style={{
              fontFamily: "'ShareTechMono', monospace",
              fontSize: 11,
              color: 'var(--muted-foreground)',
              letterSpacing: 2,
            }}
          >
            CIA 2026 · 04—07 JUN · UBERABA MG
          </span>
        </div>
        <div className="cia-gold-rule" style={{ marginTop: 14, marginBottom: 0 }} />
      </div>

      {/* ── Tabs de dia + meta ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {DAY_IDS.map(id => {
            const d = LINEUP[id]
            const active = activeDay === id
            return (
              <button
                key={id}
                onClick={() => setActiveDay(id)}
                style={{
                  position: 'relative',
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: active
                    ? '1px solid rgba(232, 185, 79, 0.45)'
                    : '1px solid var(--border)',
                  background: active
                    ? 'linear-gradient(180deg, rgba(232,185,79,0.10) 0%, rgba(232,185,79,0.04) 100%)'
                    : 'var(--card)',
                  color: active ? 'var(--gold-bright)' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  textAlign: 'left',
                  lineHeight: 1.2,
                  fontFamily: "'Rajdhani', sans-serif",
                  boxShadow: active
                    ? '0 0 0 1px rgba(232,185,79,0.18), 0 2px 8px rgba(138,95,6,0.10)'
                    : 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 2.5,
                  }}
                >
                  {d.wd}
                </div>
                <div
                  style={{
                    fontFamily: "'ShareTechMono', monospace",
                    fontSize: 10,
                    opacity: 0.75,
                    marginTop: 2,
                    letterSpacing: 0.5,
                  }}
                >
                  {d.date}
                </div>
              </button>
            )
          })}
        </div>

        {/* Meta info dia ativo */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 3,
              color: 'var(--green-bright)',
            }}
          >
            {day.label}
          </div>
          <div
            style={{
              fontFamily: "'ShareTechMono', monospace",
              fontSize: 10,
              color: 'var(--muted-foreground)',
              letterSpacing: 1.5,
              marginTop: 2,
            }}
          >
            {totalArtists} ATRAÇÕES · {day.rangeStart}—{day.rangeEnd}
          </div>
        </div>
      </div>

      {/* ── Grade ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          borderRadius: 16,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          boxShadow: '0 0 0 1px rgba(46, 107, 66, 0.06), 0 4px 24px rgba(0,0,0,0.32)',
          position: 'relative',
        }}
      >
        {/* Vinheta sutil no fundo da grade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(46,107,66,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            borderRadius: 16,
          }}
        />

        <div style={{ display: 'flex', minWidth: 720, position: 'relative' }}>
          {/* Coluna de horas */}
          <div
            style={{
              width: TIME_COL_W,
              flexShrink: 0,
              position: 'relative',
              height: gridH + HEADER_H + 16,
              borderRight: '1px solid var(--border)',
              background: 'rgba(6, 12, 7, 0.4)',
            }}
          >
            {/* Header label */}
            <div
              style={{
                height: HEADER_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontFamily: "'ShareTechMono', monospace",
                  fontSize: 10,
                  color: 'var(--muted-foreground)',
                  letterSpacing: 1.5,
                  opacity: 0.7,
                }}
              >
                HORA
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
                    left: 0,
                    right: 0,
                    transform: 'translateY(-50%)',
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--muted-foreground)',
                    letterSpacing: 1,
                    fontFamily: "'ShareTechMono', monospace",
                    lineHeight: 1,
                  }}
                >
                  {hourLabel(absMin)}
                </div>
              )
            })}
          </div>

          {/* Colunas de palcos */}
          {STAGES.map(stage => {
            const perfs = day.stages[stage.id] ?? []
            const isEmpty = perfs.length === 0

            return (
              <div
                key={stage.id}
                style={{
                  flex: 1,
                  minWidth: 200,
                  position: 'relative',
                  height: gridH + HEADER_H + 16,
                  borderRight: '1px solid var(--border)',
                }}
              >
                {/* Cabeçalho do palco — sutil com accent dim */}
                <div
                  style={{
                    height: HEADER_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(180deg, ${stage.accentDim} 0%, transparent 100%)`,
                    borderBottom: `1px solid ${stage.accent}`,
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 3.5,
                      color: stage.accent,
                      textAlign: 'center',
                      padding: '0 8px',
                      textShadow: `0 0 12px ${stage.accentDim}`,
                    }}
                  >
                    {stage.name}
                  </span>
                </div>

                {/* Linhas de hora */}
                {hourTicks.map(absMin => {
                  const y = HEADER_H + (absMin - startMin) * PX
                  return (
                    <div
                      key={absMin}
                      style={{
                        position: 'absolute',
                        top: y,
                        left: 0,
                        right: 0,
                        height: 1,
                        background: 'var(--border)',
                        opacity: 0.55,
                        pointerEvents: 'none',
                      }}
                    />
                  )
                })}

                {/* Sem programação */}
                {isEmpty && (
                  <div
                    style={{
                      position: 'absolute',
                      top: HEADER_H + 24,
                      left: 12,
                      right: 12,
                      textAlign: 'center',
                      fontFamily: "'ShareTechMono', monospace",
                      fontSize: 10,
                      color: 'var(--muted-foreground)',
                      letterSpacing: 2,
                      opacity: 0.5,
                    }}
                  >
                    — SEM PROGRAMAÇÃO —
                  </div>
                )}

                {/* Blocos de atração */}
                {perfs.map((p, i) => {
                  const top    = HEADER_H + (toMin(p.start) - startMin) * PX
                  const height = p.duration * PX
                  const tinyBlock  = height < 60
                  const smallBlock = height < 92
                  const isSpecial  = p.special

                  return (
                    <div
                      key={i}
                      title={`${p.artist} — ${p.start} às ${p.end}`}
                      style={{
                        position: 'absolute',
                        top: top + 3,
                        left: 6,
                        right: 6,
                        height: height - 6,
                        background: isSpecial
                          ? 'linear-gradient(155deg, #e8b94f 0%, #c8973a 100%)'
                          : stage.blockBg,
                        borderRadius: 12,
                        padding: tinyBlock ? '4px 10px' : smallBlock ? '8px 12px' : '10px 14px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: tinyBlock ? 'center' : 'space-between',
                        boxShadow: isSpecial
                          ? '0 0 0 1px rgba(232,185,79,0.45), 0 4px 16px rgba(232,185,79,0.30)'
                          : '0 1px 0 rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.25)',
                        cursor: 'default',
                        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s',
                        border: isSpecial ? '1px solid rgba(232,185,79,0.55)' : 'none',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                        ;(e.currentTarget as HTMLElement).style.boxShadow = isSpecial
                          ? '0 0 0 1px rgba(232,185,79,0.65), 0 8px 28px rgba(232,185,79,0.40)'
                          : '0 2px 0 rgba(0,0,0,0.18), 0 12px 28px rgba(0,0,0,0.40)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                        ;(e.currentTarget as HTMLElement).style.boxShadow = isSpecial
                          ? '0 0 0 1px rgba(232,185,79,0.45), 0 4px 16px rgba(232,185,79,0.30)'
                          : '0 1px 0 rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.25)'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: tinyBlock ? 11 : smallBlock ? 13 : height > 140 ? 17 : 15,
                            fontWeight: 700,
                            color: isSpecial ? '#1A1106' : stage.blockText,
                            lineHeight: 1.15,
                            letterSpacing: 0.5,
                            wordBreak: 'break-word',
                            textTransform: 'uppercase',
                          }}
                        >
                          {p.artist}
                        </div>

                        {p.note && !tinyBlock && (
                          <div
                            style={{
                              display: 'inline-block',
                              marginTop: 5,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: stage.blockNoteBg,
                              fontFamily: "'ShareTechMono', monospace",
                              fontSize: 8.5,
                              fontWeight: 700,
                              letterSpacing: 1.5,
                              color: isSpecial ? '#1A1106' : stage.blockText,
                              opacity: 0.85,
                              textTransform: 'uppercase',
                            }}
                          >
                            {p.note}
                          </div>
                        )}
                      </div>

                      {!tinyBlock && (
                        <div
                          style={{
                            fontFamily: "'ShareTechMono', monospace",
                            fontSize: 9.5,
                            color: isSpecial ? '#1A1106' : stage.blockText,
                            opacity: 0.7,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            marginTop: 6,
                          }}
                        >
                          {p.start}—{p.end} · {p.duration}min
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

      {/* ── Rodapé místico ───────────────────────────────────────────────── */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="cia-gold-rule" style={{ flex: 1 }} />
        <p
          style={{
            fontFamily: "'ShareTechMono', monospace",
            fontSize: 9.5,
            color: 'var(--muted-foreground)',
            opacity: 0.6,
            letterSpacing: 2,
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          PROGRAMAÇÃO SUJEITA A ALTERAÇÕES
        </p>
        <div className="cia-gold-rule" style={{ flex: 1 }} />
      </div>
    </div>
  )
}
