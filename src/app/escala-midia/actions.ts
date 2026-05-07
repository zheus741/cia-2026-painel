'use server'

import { createClient } from '@/lib/supabase/server'
import {
  requireLiderOrAbove,
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

/** Lider de área ou admin atribui um usuário a um slot de mídia */
export async function assignTurnoUser(
  turnoId: string,
  userId: string | null,
): Promise<ActionResult> {
  return safe(async () => {
    await requireLiderOrAbove()
    const supabase = await createClient()
    const { error } = await supabase
      .from('turnos')
      .update({ user_id: userId || null })
      .eq('id', turnoId)
    if (error) throw error
  })
}

/** Admin/coord cria um slot vazio de foto ou vídeo */
export async function createSlotMidia(payload: {
  dia_id: string
  funcao: 'foto' | 'video'
  setor_id?: string | null
  inicio: string
  fim: string
  observacoes?: string | null
}): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const { error } = await supabase.from('turnos').insert({
      ...payload,
      edicao_id,
      setor_id: payload.setor_id ?? null,
      user_id: null,
      nome_pessoa: null,
      is_roaming: false,
    })
    if (error) throw error
  })
}

/** Remove um slot de mídia */
export async function deleteSlotMidia(turnoId: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('turnos').delete().eq('id', turnoId)
    if (error) throw error
  })
}
