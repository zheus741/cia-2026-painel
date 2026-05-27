/**
 * Programação musical CIA 2026 — fonte única de verdade.
 * Importável por /lineup, /agenda, /tv/placar e qualquer outro consumidor.
 */

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Perf {
  artist: string
  start: string         // "HH:MM"
  end: string           // "HH:MM"
  duration: number      // minutos
  note?: string         // "Banda", "Transição", "Retorno"...
  special?: boolean     // destaque editorial (ex: Premiação)
}

export type StageId = 'arena' | 'principal' | 'eletronico'

export interface StageData {
  arena:      Perf[]
  principal:  Perf[]
  eletronico: Perf[]
}

export type DayId = 'qui' | 'sex' | 'sab' | 'dom'

export interface DayConfig {
  id:     DayId
  label:  string          // "QUINTA"
  date:   string          // "04/06"
  isoDate: string         // "2026-06-04" — mapeia pra new Date()
  wd:     string          // "QUI"
  rangeStart: string      // primeira hora de programação
  rangeEnd:   string      // última hora (pode passar de meia-noite)
  stages: StageData
}

// ── Mapa para descobrir o "dia do evento" a partir de uma Date ───────────────

export const EVENT_DATE_MAP: Record<string, DayId> = {
  '2026-06-04': 'qui',
  '2026-06-05': 'sex',
  '2026-06-06': 'sab',
  '2026-06-07': 'dom',
}

// ── Configuração de palcos com cores do design system editorial ──────────────

export interface StageConfig {
  id:        StageId
  name:      string
  eyebrow:   string
  tone:      'terracotta' | 'gold' | 'electric'
  blockBg:   string
  blockText: string
  blockTextMuted: string
  accentInk:  string
  accentSoft: string
  accentRing: string
  chipBg:     string
  /** Cor de pulse pro indicador "NO AR" — coral para o evento todo */
  liveColor:  string
}

export const STAGES: StageConfig[] = [
  {
    id:        'arena',
    name:      'Arena 360',
    eyebrow:   'PALCO',
    tone:      'terracotta',
    blockBg:   'linear-gradient(155deg, #C46B4A 0%, #D8845F 100%)',
    blockText: '#FFFFFF',
    blockTextMuted: 'rgba(255,255,255,0.78)',
    accentInk:  '#8b3a2a',
    accentSoft: 'rgba(196,107,74,0.10)',
    accentRing: 'rgba(196,107,74,0.28)',
    chipBg:     'rgba(0,0,0,0.18)',
    liveColor:  '#FF4444',
  },
  {
    id:        'principal',
    name:      'Principal',
    eyebrow:   'PALCO',
    tone:      'gold',
    blockBg:   'linear-gradient(155deg, #F0D04A 0%, #F5DC6A 100%)',
    blockText: '#0A0F0B',
    blockTextMuted: 'rgba(10,15,11,0.62)',
    accentInk:  '#8a5f06',
    accentSoft: 'rgba(232,184,47,0.14)',
    accentRing: 'rgba(232,184,47,0.36)',
    chipBg:     'rgba(10,15,11,0.10)',
    liveColor:  '#FF4444',
  },
  {
    id:        'eletronico',
    name:      'Eletrônico',
    eyebrow:   'PALCO',
    tone:      'electric',
    blockBg:   'linear-gradient(155deg, #3D49E0 0%, #5C68E8 100%)',
    blockText: '#FFFFFF',
    blockTextMuted: 'rgba(255,255,255,0.78)',
    accentInk:  '#2D1B5C',
    accentSoft: 'rgba(92,104,232,0.10)',
    accentRing: 'rgba(92,104,232,0.30)',
    chipBg:     'rgba(0,0,0,0.20)',
    liveColor:  '#FF4444',
  },
]

export const DAY_IDS: DayId[] = ['qui', 'sex', 'sab', 'dom']

// ── Programação ──────────────────────────────────────────────────────────────

export const LINEUP: Record<DayId, DayConfig> = {
  qui: {
    id: 'qui',
    label: 'QUINTA', date: '04/06', isoDate: '2026-06-04', wd: 'QUI',
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
    id: 'sex',
    label: 'SEXTA', date: '05/06', isoDate: '2026-06-05', wd: 'SEX',
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
    id: 'sab',
    label: 'SÁBADO', date: '06/06', isoDate: '2026-06-06', wd: 'SÁB',
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
    id: 'dom',
    label: 'DOMINGO', date: '07/06', isoDate: '2026-06-07', wd: 'DOM',
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Converte "HH:MM" em minutos absolutos. Horas < 12 são pós-meia-noite. */
export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h < 12 ? (h + 24) * 60 + m : h * 60 + m
}

export function hourLabel(absMin: number): string {
  const h = Math.floor(absMin / 60) % 24
  return `${String(h).padStart(2, '0')}h`
}

/** Retorna a data ISO (YYYY-MM-DD) atual no fuso de Brasília. */
export function todayIsoBR(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/** Retorna minutos absolutos atuais (com lógica de pós-meia-noite). */
export function nowAbsMinBR(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const hh = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  const mm = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  return hh < 12 ? (hh + 24) * 60 + mm : hh * 60 + mm
}
