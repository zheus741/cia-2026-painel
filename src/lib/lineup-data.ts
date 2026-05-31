/**
 * Tipos e helpers do Line Up CIA 2026.
 * A FONTE DE VERDADE são as tabelas `shows`, `setores` e `dias_evento` no Supabase.
 *
 * Use `buildLineupFromShows()` para converter rows do banco em DayConfig estruturado.
 */

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Perf {
  /** Pode ser null para placeholders novos antes do save. */
  id:        string | null
  artist:    string
  start:     string    // "HH:MM"
  end:       string    // "HH:MM"
  duration:  number    // minutos
  tipo:      string | null
  special?:  boolean   // destaque editorial (ex: Premiação)
  setorId:   string
  diaId:     string
}

export type StageId = 'arena' | 'paredao' | 'principal' | 'eletronico'

export interface StageData {
  arena:      Perf[]
  paredao:    Perf[]
  principal:  Perf[]
  eletronico: Perf[]
}

export type DayId = 'qui' | 'sex' | 'sab' | 'dom'

export interface DayConfig {
  id:         DayId
  label:      string          // "QUINTA"
  date:       string          // "04/06"
  isoDate:    string          // "2026-06-04"
  wd:         string          // "QUI"
  rangeStart: string          // primeira hora de programação
  rangeEnd:   string          // última hora (pode passar de meia-noite)
  diaId:      string          // UUID do dia no banco
  stages:     StageData
}

export type Lineup = Record<DayId, DayConfig>

// ── Mapeamento data ↔ DayId ──────────────────────────────────────────────────

export const EVENT_DATE_MAP: Record<string, DayId> = {
  '2026-06-04': 'qui',
  '2026-06-05': 'sex',
  '2026-06-06': 'sab',
  '2026-06-07': 'dom',
}

const DAY_META: Record<DayId, { label: string; date: string; wd: string; isoDate: string }> = {
  qui: { label: 'QUINTA',  date: '04/06', wd: 'QUI', isoDate: '2026-06-04' },
  sex: { label: 'SEXTA',   date: '05/06', wd: 'SEX', isoDate: '2026-06-05' },
  sab: { label: 'SÁBADO',  date: '06/06', wd: 'SÁB', isoDate: '2026-06-06' },
  dom: { label: 'DOMINGO', date: '07/06', wd: 'DOM', isoDate: '2026-06-07' },
}

export const DAY_IDS: DayId[] = ['qui', 'sex', 'sab', 'dom']

// ── Setores → Palcos (mapeamento por nome) ───────────────────────────────────

/**
 * Mapeia o nome do setor (vindo da tabela `setores`) → StageId.
 * Aceita variações pra robustez.
 */
export function setorToStageId(setorNome: string | null | undefined): StageId | null {
  if (!setorNome) return null
  const n = setorNome.trim().toLowerCase()
  if (n.includes('arena') || n.includes('360'))     return 'arena'
  if (n.includes('paredão') || n.includes('paredao') || n.includes('red bull')) return 'paredao'
  if (n.includes('eletr'))                          return 'eletronico'
  if (n.includes('principal'))                      return 'principal'
  return null
}

// ── Configuração visual dos palcos ───────────────────────────────────────────

export interface StageConfig {
  id:         StageId
  name:       string
  eyebrow:    string
  tone:       'terracotta' | 'gold' | 'electric'
  blockBg:    string
  blockText:  string
  blockTextMuted: string
  accentInk:  string
  accentSoft: string
  accentRing: string
  liveColor:  string
}

export const STAGES: StageConfig[] = [
  {
    id:         'arena',
    name:       'Arena 360',
    eyebrow:    'PALCO',
    tone:       'terracotta',
    blockBg:    'linear-gradient(155deg, #C46B4A 0%, #D8845F 100%)',
    blockText:  '#FFFFFF',
    blockTextMuted: 'rgba(255,255,255,0.78)',
    accentInk:  '#8b3a2a',
    accentSoft: 'rgba(196,107,74,0.10)',
    accentRing: 'rgba(196,107,74,0.30)',
    liveColor:  '#FF4444',
  },
  {
    id:         'paredao',
    name:       'Paredão Red Bull',
    eyebrow:    'PALCO',
    tone:       'electric',
    blockBg:    'linear-gradient(155deg, #16245E 0%, #25387F 100%)',
    blockText:  '#FFFFFF',
    blockTextMuted: 'rgba(255,255,255,0.78)',
    accentInk:  '#0F1A45',
    accentSoft: 'rgba(29,58,138,0.12)',
    accentRing: 'rgba(29,58,138,0.34)',
    liveColor:  '#FF4444',
  },
  {
    id:         'principal',
    name:       'Principal',
    eyebrow:    'PALCO',
    tone:       'gold',
    blockBg:    'linear-gradient(155deg, #F0D04A 0%, #F5DC6A 100%)',
    blockText:  '#0A0F0B',
    blockTextMuted: 'rgba(10,15,11,0.62)',
    accentInk:  '#8a5f06',
    accentSoft: 'rgba(232,184,47,0.14)',
    accentRing: 'rgba(232,184,47,0.38)',
    liveColor:  '#FF4444',
  },
  {
    id:         'eletronico',
    name:       'Eletrônico',
    eyebrow:    'PALCO',
    tone:       'electric',
    blockBg:    'linear-gradient(155deg, #3D49E0 0%, #5C68E8 100%)',
    blockText:  '#FFFFFF',
    blockTextMuted: 'rgba(255,255,255,0.78)',
    accentInk:  '#2D1B5C',
    accentSoft: 'rgba(92,104,232,0.10)',
    accentRing: 'rgba(92,104,232,0.32)',
    liveColor:  '#FF4444',
  },
]

// ── Helpers de tempo ─────────────────────────────────────────────────────────

/** Converte "HH:MM" em minutos absolutos. Horas < 12 são pós-meia-noite. */
export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h < 12 ? (h + 24) * 60 + m : h * 60 + m
}

export function hourLabel(absMin: number): string {
  const h = Math.floor(absMin / 60) % 24
  return `${String(h).padStart(2, '0')}h`
}

/** Extrai "HH:MM" no fuso de São Paulo de uma string ISO. */
export function isoToHHMM(iso: string | null): string {
  if (!iso) return '00:00'
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

/** Retorna a data ISO (YYYY-MM-DD) no fuso de São Paulo. */
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

// ── Conversão Supabase → DayConfig ───────────────────────────────────────────

export interface ShowRow {
  id:                string
  nome:              string
  tipo:              string | null
  inicio:            string | null
  fim_previsto:      string | null
  duracao_minutos:   number | null
  dia_id:            string | null
  setor_id:          string | null
  ordem_no_palco:    number | null
  embaixador:        boolean | null
}

export interface DiaRow {
  id:        string
  data:      string  // "YYYY-MM-DD"
}

export interface SetorRow {
  id:        string
  nome:      string
}

/**
 * Constrói o objeto Lineup completo a partir das rows do Supabase.
 *
 * - Filtra shows que pertencem aos 4 dias do CIA 2026
 * - Mapeia setores → palcos (arena/principal/eletronico)
 * - Ordena por horário de início
 * - Calcula rangeStart/rangeEnd por dia
 * - "Premiação" recebe special=true automaticamente
 */
export function buildLineupFromShows(
  shows: ShowRow[],
  dias: DiaRow[],
  setores: SetorRow[],
): Lineup {
  // dia.data → DayId
  const diaIdToDay = new Map<string, DayId>()
  for (const d of dias) {
    const day = EVENT_DATE_MAP[d.data]
    if (day) diaIdToDay.set(d.id, day)
  }

  // setor.id → StageId
  const setorIdToStage = new Map<string, StageId>()
  for (const s of setores) {
    const sid = setorToStageId(s.nome)
    if (sid) setorIdToStage.set(s.id, sid)
  }

  // diaId → real (para devolver no DayConfig)
  const diaIdByDay = new Map<DayId, string>()
  for (const [diaId, day] of diaIdToDay) diaIdByDay.set(day, diaId)

  // Inicializa skeleton
  const lineup: Lineup = Object.fromEntries(
    DAY_IDS.map(d => [d, {
      id: d,
      ...DAY_META[d],
      rangeStart: '23:59',
      rangeEnd:   '00:01',
      diaId:      diaIdByDay.get(d) ?? '',
      stages: { arena: [], paredao: [], principal: [], eletronico: [] },
    }]),
  ) as unknown as Lineup

  // Distribui shows
  for (const sh of shows) {
    if (!sh.dia_id || !sh.setor_id || !sh.inicio || !sh.fim_previsto) continue
    const dayId = diaIdToDay.get(sh.dia_id)
    const stage = setorIdToStage.get(sh.setor_id)
    if (!dayId || !stage) continue

    const start = isoToHHMM(sh.inicio)
    const end   = isoToHHMM(sh.fim_previsto)
    const duration = sh.duracao_minutos ?? Math.max(1, toMin(end) - toMin(start))

    lineup[dayId].stages[stage].push({
      id:       sh.id,
      artist:   sh.nome,
      start, end,
      duration,
      tipo:     sh.tipo,
      special:  /premia[çc]/i.test(sh.nome),
      setorId:  sh.setor_id,
      diaId:    sh.dia_id,
    })
  }

  // Ordena por horário absoluto + recalcula range
  for (const d of DAY_IDS) {
    const cfg = lineup[d]
    let minStart = Infinity
    let maxEnd   = -Infinity

    for (const stage of ['arena','paredao','principal','eletronico'] as const) {
      cfg.stages[stage].sort((a, b) => toMin(a.start) - toMin(b.start))
      for (const p of cfg.stages[stage]) {
        const s = toMin(p.start)
        const e = toMin(p.end)
        if (s < minStart) minStart = s
        if (e > maxEnd)   maxEnd   = e
      }
    }

    if (minStart !== Infinity && maxEnd !== -Infinity) {
      // formata back to HH:MM
      cfg.rangeStart = `${String(Math.floor(minStart / 60) % 24).padStart(2,'0')}:${String(minStart % 60).padStart(2,'0')}`
      cfg.rangeEnd   = `${String(Math.floor(maxEnd   / 60) % 24).padStart(2,'0')}:${String(maxEnd   % 60).padStart(2,'0')}`
    }
  }

  return lineup
}

// ── Fallback vazio para SSR sem dados ────────────────────────────────────────

export const EMPTY_LINEUP: Lineup = Object.fromEntries(
  DAY_IDS.map(d => [d, {
    id: d,
    ...DAY_META[d],
    rangeStart: '14:00',
    rangeEnd:   '23:00',
    diaId:      '',
    stages: { arena: [], principal: [], eletronico: [] },
  }]),
) as unknown as Lineup
