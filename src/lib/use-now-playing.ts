'use client'

import { useEffect, useState } from 'react'
import {
  LINEUP, EVENT_DATE_MAP, toMin, nowAbsMinBR, todayIsoBR,
  type DayId, type Perf, type StageId, type DayConfig,
} from './lineup-data'

// ── Tipos do retorno ─────────────────────────────────────────────────────────

export interface StagePlayingState {
  /** Atração tocando agora (ou null se nada/intervalo). */
  current: Perf | null
  /** Próxima atração agendada (ou null se já acabou tudo). */
  next: Perf | null
  /** Minutos restantes da atual (0 se não há atual). */
  minutesLeft: number
  /** Minutos até a próxima começar (0 se está tocando agora). */
  minutesToNext: number
}

export interface NowPlayingState {
  /** Date.now() em ms — útil pra debug. */
  ts: number
  /** Dia do evento que está acontecendo (ou null se fora do evento). */
  todayDayId: DayId | null
  /** Configuração do dia atual (ou do próximo dia se fora do evento). */
  activeDay: DayConfig | null
  /** True quando hoje É um dia do evento E há programação ativa/futura. */
  isLive: boolean
  /** Estado por palco (só preenchido se isLive). */
  stages: Record<StageId, StagePlayingState>
}

const EMPTY_STAGE: StagePlayingState = {
  current: null, next: null, minutesLeft: 0, minutesToNext: 0,
}

const EMPTY_STAGES: Record<StageId, StagePlayingState> = {
  arena: EMPTY_STAGE,
  principal: EMPTY_STAGE,
  eletronico: EMPTY_STAGE,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findStageState(perfs: Perf[], nowMin: number): StagePlayingState {
  let current: Perf | null = null
  let next: Perf | null = null

  for (const p of perfs) {
    const s = toMin(p.start)
    const e = toMin(p.end)
    if (nowMin >= s && nowMin < e) {
      current = p
      break
    }
    if (s > nowMin && (!next || toMin(next.start) > s)) {
      next = p
    }
  }

  // Se há current, próxima é a primeira que começa após current.end
  if (current) {
    const currentEnd = toMin(current.end)
    next = perfs.find(p => toMin(p.start) >= currentEnd) ?? null
  }

  return {
    current,
    next,
    minutesLeft:   current ? Math.max(0, toMin(current.end) - nowMin) : 0,
    minutesToNext: next    ? Math.max(0, toMin(next.start)  - nowMin) : 0,
  }
}

/**
 * Determina qual DayConfig vale para "agora":
 * - Se hoje é dia do evento (04-07/jun/2026) E ainda há programação futura → retorna esse dia
 * - Se hoje é dia do evento mas tudo já acabou → retorna esse dia mesmo (com isLive=false)
 * - Se hoje é antes do evento → retorna o primeiro dia (qui)
 * - Se hoje é depois do evento → retorna o último dia (dom)
 *
 * IMPORTANTE: a programação se estende até a madrugada seguinte (ex: shows de quinta
 * vão até 05:50 de sexta). Se for de manhã cedo (00:00-12:00) num dia seguinte ao
 * de um evento, ainda consideramos como sendo o "dia anterior" do lineup.
 */
function resolveActiveDay(now: Date): { dayId: DayId | null; config: DayConfig | null; nowMin: number } {
  const todayIso = todayIsoBR(now)
  const nowMin = nowAbsMinBR(now)

  // Caso direto: hoje É um dia do lineup
  if (todayIso in EVENT_DATE_MAP) {
    const id = EVENT_DATE_MAP[todayIso]
    return { dayId: id, config: LINEUP[id], nowMin }
  }

  // Pode ser madrugada DEPOIS de um dia de evento — checa data anterior
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayIso = todayIsoBR(yesterday)
  if (yesterdayIso in EVENT_DATE_MAP) {
    const id = EVENT_DATE_MAP[yesterdayIso]
    const cfg = LINEUP[id]
    // Só considera "dia anterior" se a programação dele se estende e ainda não acabou
    if (nowMin <= toMin(cfg.rangeEnd)) {
      return { dayId: id, config: cfg, nowMin }
    }
  }

  return { dayId: null, config: null, nowMin }
}

// ── Hook principal ───────────────────────────────────────────────────────────

interface UseNowPlayingOptions {
  /** Intervalo de polling em ms. Default 30s. */
  intervalMs?: number
  /**
   * Override de data — útil pra demonstração/preview.
   * Quando definido, ignora `new Date()` e usa esta data fixa.
   */
  simulatedNow?: Date
}

export function useNowPlaying(opts: UseNowPlayingOptions = {}): NowPlayingState {
  const { intervalMs = 30_000, simulatedNow } = opts

  const [now, setNow] = useState<Date>(() => simulatedNow ?? new Date())

  useEffect(() => {
    if (simulatedNow) {
      setNow(simulatedNow)
      return
    }
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, simulatedNow])

  const { dayId, config, nowMin } = resolveActiveDay(now)

  if (!config || !dayId) {
    return {
      ts: now.getTime(),
      todayDayId: null,
      activeDay: null,
      isLive: false,
      stages: EMPTY_STAGES,
    }
  }

  const inRange =
    nowMin >= toMin(config.rangeStart) - 30 &&  // 30min de antecedência
    nowMin <= toMin(config.rangeEnd)

  if (!inRange) {
    return {
      ts: now.getTime(),
      todayDayId: dayId,
      activeDay: config,
      isLive: false,
      stages: EMPTY_STAGES,
    }
  }

  const stages: Record<StageId, StagePlayingState> = {
    arena:      findStageState(config.stages.arena,      nowMin),
    principal:  findStageState(config.stages.principal,  nowMin),
    eletronico: findStageState(config.stages.eletronico, nowMin),
  }

  const hasAnyCurrent = Object.values(stages).some(s => s.current !== null)
  const hasAnyNext    = Object.values(stages).some(s => s.next    !== null)

  return {
    ts: now.getTime(),
    todayDayId: dayId,
    activeDay: config,
    isLive: hasAnyCurrent || hasAnyNext,
    stages,
  }
}
