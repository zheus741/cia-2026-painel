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
  return `${String(h).padStart(2, '0')}H`
}

// ── Paletas por palco ─────────────────────────────────────────────────────────

const ARENA_BG:     string[] = ['#FF5F1F','#FF7A42','#E84E12','#FF9060','#F45A1A','#FF6B35']
const PRINC_BG:     string[] = ['#C8FF00','#AAEE00','#D6FF22','#B8F500','#99E600','#CCFF00']
const ELETR_BG:     string[] = ['#00E5FF','#00BFEA','#18FFFF','#00D4EE','#33EEFF','#00CCDD']
const SPECIAL_BG:   string[] = ['#FFD700','#FFC200','#FFE233'] // Domingo — premiação etc

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Perf {
  artist: string
  start: string
  end: string
  duration: number    // minutos
  note?: string       // "(Banda)", "(Transição)" etc
  special?: boolean   // destaque extra (ex: Premiação)
}

interface StageData {
  arena:      Perf[]
  principal:  Perf[]
  eletronico: Perf[]
}

interface DayConfig {
  label:   string
  date:    string
  wd:      string  // weekday abrev
  rangeStart: string
  rangeEnd:   string
  stages:  StageData
}

// ── Programação ───────────────────────────────────────────────────────────────

const LINEUP: Record<string, DayConfig> = {
  qui: {
    label: 'QUINTA-FEIRA',
    date: '04/06',
    wd: 'QUI',
    rangeStart: '15:10',
    rangeEnd:   '05:50',
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
    label: 'SEXTA-FEIRA',
    date: '05/06',
    wd: 'SEX',
    rangeStart: '14:10',
    rangeEnd:   '07:10',
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
    label: 'SÁBADO',
    date: '06/06',
    wd: 'SÁB',
    rangeStart: '14:10',
    rangeEnd:   '08:10',
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
    label: 'DOMINGO — ENCERRAMENTO',
    date: '07/06',
    wd: 'DOM',
    rangeStart: '14:00',
    rangeEnd:   '21:00',
    stages: {
      arena: [
        { artist: 'DJ Hidalgo',       start: '14:00', end: '15:00', duration: 60 },
        { artist: 'Sambarylove',       start: '15:10', end: '16:30', duration: 80, note: 'Banda' },
        { artist: 'DJ Lary Marques',   start: '16:40', end: '17:30', duration: 50 },
      ],
      principal: [
        { artist: 'GBR',           start: '17:40', end: '19:40', duration: 120 },
        { artist: '🏆 Premiação',   start: '19:40', end: '20:10', duration: 30, special: true },
        { artist: 'GBR',           start: '20:10', end: '21:00', duration: 50, note: 'Retorno' },
      ],
      eletronico: [],
    },
  },
}

const DAY_IDS = ['qui', 'sex', 'sab', 'dom'] as const
type DayId = typeof DAY_IDS[number]

// ── Configuração dos palcos ────────────────────────────────────────────────────

const STAGES = [
  {
    id:         'arena'      as const,
    name:       'ARENA 360',
    headerBg:   '#FF5F1F',
    headerText: '#1A0500',
    bgs:        ARENA_BG,
    textDark:   '#1A0500',
  },
  {
    id:         'principal'  as const,
    name:       'PALCO PRINCIPAL',
    headerBg:   '#C8FF00',
    headerText: '#0A1200',
    bgs:        PRINC_BG,
    textDark:   '#0A1200',
  },
  {
    id:         'eletronico' as const,
    name:       'PALCO ELETRÔNICO',
    headerBg:   '#00E5FF',
    headerText: '#001018',
    bgs:        ELETR_BG,
    textDark:   '#001018',
  },
]

const PX = 1.4          // pixels por minuto
const HEADER_H = 64     // altura do cabeçalho de palco em px
const TIME_COL_W = 52   // largura da coluna de horas

// ── Componente principal ──────────────────────────────────────────────────────

export function LineupClient() {
  const [activeDay, setActiveDay] = useState<DayId>('qui')

  const day = LINEUP[activeDay]
  const startMin = toMin(day.rangeStart)
  const endMin   = toMin(day.rangeEnd)
  const totalMin = endMin - startMin
  const gridH    = totalMin * PX

  // Horas inteiras dentro do range
  const firstHour = Math.floor(startMin / 60)
  const lastHour  = Math.ceil(endMin / 60)
  const hourTicks = Array.from(
    { length: lastHour - firstHour + 1 },
    (_, i) => (firstHour + i) * 60,
  ).filter(m => m >= startMin && m <= endMin)

  return (
    <div
      style={{
        color: '#fff',
        fontFamily: 'var(--font-lineup-mono, "Courier New", monospace)',
      }}
    >
      {/* ── Seletor de dia ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Tabs de dia */}
        <div style={{ display: 'flex', gap: 6 }}>
          {DAY_IDS.map(id => {
            const d = LINEUP[id]
            const active = activeDay === id
            return (
              <button
                key={id}
                onClick={() => setActiveDay(id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: active ? '1.5px solid #B5FF00' : '1.5px solid var(--border)',
                  background: active ? '#B5FF0015' : 'transparent',
                  color: active ? '#B5FF00' : 'var(--muted-foreground)',
                  fontFamily: 'var(--font-lineup-mono, monospace)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  lineHeight: 1.5,
                  textAlign: 'center',
                }}
              >
                <div>{d.wd}</div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>{d.date}</div>
              </button>
            )
          })}
        </div>

        {/* Label do dia atual */}
        <span
          style={{
            fontFamily: 'var(--font-lineup-display, Impact, sans-serif)',
            fontSize: 13,
            letterSpacing: 4,
            color: 'var(--muted-foreground)',
          }}
        >
          {day.date} — {day.label}
        </span>
      </div>

      {/* ── Grade ──────────────────────────────────────────────── */}
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          paddingBottom: 32,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#0A0A0A',
        }}
      >
        <div
          style={{
            display: 'flex',
            minWidth: 640,
            position: 'relative',
          }}
        >
          {/* Coluna de horas */}
          <div
            style={{
              width: TIME_COL_W,
              flexShrink: 0,
              position: 'relative',
              height: gridH + HEADER_H + 20,
              borderRight: '1px solid #141414',
            }}
          >
            {/* Espaço reservado para cabeçalho de palco */}
            <div style={{ height: HEADER_H }} />

            {hourTicks.map(absMin => {
              const y = HEADER_H + (absMin - startMin) * PX
              return (
                <div
                  key={absMin}
                  style={{
                    position: 'absolute',
                    top: y,
                    right: 8,
                    transform: 'translateY(-50%)',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#2A2A2A',
                    letterSpacing: 1,
                    fontFamily: 'var(--font-lineup-mono, monospace)',
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
                  minWidth: 180,
                  position: 'relative',
                  height: gridH + HEADER_H + 20,
                  borderRight: '1px solid #141414',
                }}
              >
                {/* Cabeçalho do palco */}
                <div
                  style={{
                    height: HEADER_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: stage.headerBg,
                    borderBottom: '2px solid #000',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-lineup-display, Impact, sans-serif)',
                      fontSize: 15,
                      letterSpacing: 3,
                      color: stage.headerText,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      padding: '0 8px',
                    }}
                  >
                    {stage.name}
                  </span>
                </div>

                {/* Linhas de hora (grid) */}
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
                        background: '#111',
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
                      top: HEADER_H + 16,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      fontSize: 9,
                      color: '#1E1E1E',
                      letterSpacing: 2,
                      fontWeight: 700,
                    }}
                  >
                    SEM PROGRAMAÇÃO
                  </div>
                )}

                {/* Blocos de apresentação */}
                {perfs.map((p, i) => {
                  const top    = HEADER_H + (toMin(p.start) - startMin) * PX
                  const height = p.duration * PX
                  const bg     = p.special
                    ? SPECIAL_BG[i % SPECIAL_BG.length]
                    : stage.bgs[i % stage.bgs.length]
                  const textColor = stage.textDark
                  const tinyBlock = height < 58
                  const smallBlock = height < 85

                  return (
                    <div
                      key={i}
                      title={`${p.artist} — ${p.start} às ${p.end}`}
                      style={{
                        position: 'absolute',
                        top: top + 2,
                        left: 4,
                        right: 4,
                        height: height - 4,
                        background: bg,
                        borderRadius: 6,
                        padding: tinyBlock ? '3px 8px' : smallBlock ? '6px 10px' : '8px 12px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: tinyBlock ? 'center' : 'space-between',
                        boxShadow: '0 1px 4px #00000055',
                        cursor: 'default',
                        transition: 'filter 0.1s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.filter = 'none'
                      }}
                    >
                      {/* Nome do artista */}
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--font-lineup-display, Impact, sans-serif)',
                            fontSize: tinyBlock ? 12 : smallBlock ? 14 : height > 130 ? 20 : 16,
                            color: textColor,
                            lineHeight: 1.1,
                            letterSpacing: 1,
                            wordBreak: 'break-word',
                          }}
                        >
                          {p.artist}
                        </div>

                        {/* Tag de nota (Banda / Transição / etc) */}
                        {p.note && !tinyBlock && (
                          <div
                            style={{
                              display: 'inline-block',
                              marginTop: 3,
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: '#0000001A',
                              fontSize: 8,
                              fontWeight: 700,
                              letterSpacing: 1.5,
                              color: textColor,
                              opacity: 0.7,
                            }}
                          >
                            {p.note.toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Horário (rodapé) */}
                      {!tinyBlock && (
                        <div
                          style={{
                            fontSize: 8,
                            color: textColor,
                            opacity: 0.5,
                            fontFamily: 'var(--font-lineup-mono, monospace)',
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            marginTop: 4,
                          }}
                        >
                          {p.start} – {p.end} · {p.duration}min
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

      {/* ── Rodapé ─────────────────────────────────────────────── */}
      <p
        style={{
          textAlign: 'center',
          marginTop: 12,
          fontSize: 9,
          color: 'var(--muted-foreground)',
          opacity: 0.4,
          letterSpacing: 2,
          fontWeight: 700,
        }}
      >
        CIA 2026 · COPA INTER ATLÉTICAS · UBERABA MG · 04–07 JUN · PROGRAMAÇÃO SUJEITA A ALTERAÇÕES
      </p>
    </div>
  )
}
