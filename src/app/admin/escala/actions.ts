'use server'

import { createClient } from '@/lib/supabase/server'
import {
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

export interface TurnoPayload {
  dia_id: string
  funcao: string
  setor_id?: string | null
  inicio: string          // ISO timestamp
  fim: string             // ISO timestamp
  nome_pessoa?: string | null
  user_id?: string | null
  is_roaming?: boolean
  observacoes?: string | null
}

export async function createTurno(payload: TurnoPayload): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const { error } = await supabase.from('turnos').insert({
      ...payload,
      edicao_id,
      setor_id: payload.setor_id ?? null,
      nome_pessoa: payload.nome_pessoa ?? null,
      user_id: payload.user_id ?? null,
      is_roaming: payload.is_roaming ?? false,
    })
    if (error) throw error
  })
}

/**
 * Cria o mesmo turno em VÁRIOS dias de uma vez.
 *
 * Função/setor/pessoa/roaming/obs são idênticos; só o dia e os timestamps
 * de início/fim mudam (recalculados pra cada data).
 *
 * Recebe os horários como HH:MM + flag nextDay pra reconstruir o timestamp
 * correto em cada data — não dá pra reusar o ISO do dia 1 nos outros dias.
 */
export interface TurnoMultiDiasPayload {
  dias: Array<{ id: string; data: string }>   // [{ id, "2026-06-04" }, ...]
  funcao: string
  setor_id?: string | null
  inicioHHMM: string        // "08:00"
  fimHHMM: string           // "20:00"
  nextDay: boolean          // fim vira o dia seguinte?
  nome_pessoa?: string | null
  user_id?: string | null
  is_roaming?: boolean
  observacoes?: string | null
}

function buildTs(data: string, hhmm: string, nextDay = false): string {
  const base = new Date(`${data}T${hhmm}:00-03:00`)
  if (nextDay) base.setDate(base.getDate() + 1)
  return base.toISOString()
}

export async function createTurnoMultiDias(
  payload: TurnoMultiDiasPayload,
): Promise<ActionResult & { data?: { criados: number } }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()

    const rows = payload.dias.map(d => ({
      edicao_id,
      dia_id:      d.id,
      funcao:      payload.funcao,
      setor_id:    payload.setor_id ?? null,
      inicio:      buildTs(d.data, payload.inicioHHMM),
      fim:         buildTs(d.data, payload.fimHHMM, payload.nextDay),
      nome_pessoa: payload.nome_pessoa ?? null,
      user_id:     payload.user_id ?? null,
      is_roaming:  payload.is_roaming ?? false,
      observacoes: payload.observacoes ?? null,
    }))

    const { error } = await supabase.from('turnos').insert(rows)
    if (error) throw error
    return { criados: rows.length }
  })
}

export async function updateTurno(id: string, payload: Partial<TurnoPayload>): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('turnos').update(payload).eq('id', id)
    if (error) throw error
  })
}

export async function deleteTurno(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (error) throw error
  })
}
