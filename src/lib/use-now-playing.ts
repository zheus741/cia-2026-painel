'use client'

import { useEffect, useState } from 'react'
import {
  EVENT_DATE_MAP, toMin, nowAbsMinBR, todayIsoBR, EMPTY_LINEUP,
  type DayId, type Perf, type StageId, type DayConfig, type Lineup,
} from './lineup-data'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface StagePlayingState {
  current: Perf | null
  next:    Perf | null
  minutesLeft:   number
  minutesToNext: number
}

export interface NowPlayingState {
  ts:           number
  todayDayId:   DayId | null
  activeDay:    DayConfig | null
  isLive:       boolean
  stages:       Record<StageId, StagePlayingState>
}

const EMPTY_STAGE: StagePlayingState = { current: null, next: null, minutesLeft: 0, minutesToNext: 0 }
const EMPTY_STAGES: Record<StageId, StagePlayingState> = {
  arena: EMPTY_STAGE, paredao: EMPTY_STAGE, principal: EMPTY_STAGE, eletronico: EMPTY_STAGE,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findStageState(perfs: Perf[], nowMin: number): StagePlayingState {
  let current: Perf | null = null
  let next: Perf | null = null

  for (const p of perfs) {
    const s = toMin(p.start)
    const e = toMin(p.end)
    if (nowMin >= s && nowMin < e) { current = p; break }
    if (s > nowMin && (!next || toMin(next.start) > s)) next = p
  }

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

function resolveActiveDay(now: Date, lineup: Lineup): { dayId: DayId | null; config: DayConfig | null; nowMin: number } {
  const todayIso = todayIsoBR(now)
  const nowMin = nowAbsMinBR(now)

  if (todayIso in EVENT_DATE_MAP) {
    const id = EVENT_DATE_MAP[todayIso]
    return { dayId: id, config: lineup[id], nowMin }
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayIso = todayIsoBR(yesterday)
  if (yesterdayIso in EVENT_DATE_MAP) {
    const id = EVENT_DATE_MAP[yesterdayIso]
    const cfg = lineup[id]
    if (cfg && nowMin <= toMin(cfg.rangeEnd)) {
      return { dayId: id, config: cfg, nowMin }
    }
  }

  return { dayId: null, config: null, nowMin }
}

// ── Hook ────────────────────────────────────────────────────────────────────

interface UseNowPlayingOptions {
  intervalMs?: number
  simulatedNow?: Date
}

export function useNowPlaying(
  lineup: Lineup = EMPTY_LINEUP,
  opts: UseNowPlayingOptions = {},
): NowPlayingState {
  const { intervalMs = 30_000, simulatedNow } = opts

  const [now, setNow] = useState<Date>(() => simulatedNow ?? new Date())

  useEffect(() => {
    if (simulatedNow) { setNow(simulatedNow); return }
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, simulatedNow])

  const { dayId, config, nowMin } = resolveActiveDay(now, lineup)

  if (!config || !dayId) {
    return { ts: now.getTime(), todayDayId: null, activeDay: null, isLive: false, stages: EMPTY_STAGES }
  }

  const inRange =
    nowMin >= toMin(config.rangeStart) - 30 &&
    nowMin <= toMin(config.rangeEnd)

  if (!inRange) {
    return { ts: now.getTime(), todayDayId: dayId, activeDay: config, isLive: false, stages: EMPTY_STAGES }
  }

  const stages: Record<StageId, StagePlayingState> = {
    arena:      findStageState(config.stages.arena,      nowMin),
    paredao:    findStageState(config.stages.paredao,    nowMin),
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
