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
