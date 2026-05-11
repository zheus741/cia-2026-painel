'use server'

import { createClient } from '@/lib/supabase/server'
import {
  requireLiderOrAbove,
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'
import { enviarNotif } from '@/lib/notif'

/** Lider de área ou admin atribui um usuário a um slot de mídia */
export async function assignTurnoUser(
  turnoId: string,
  userId: string | null,
): Promise<ActionResult> {
  return safe(async () => {
    await requireLiderOrAbove()
    const supabase = await createClient()

    // Busca detalhes do turno para a notificação
    const { data: turno } = await supabase
      .from('turnos')
      .select('funcao, inicio, fim, setor:setores(nome), dia:dias_evento(nome_dia)')
      .eq('id', turnoId)
      .maybeSingle()

    const { error } = await supabase
      .from('turnos')
      .update({ user_id: userId || null })
      .eq('id', turnoId)
    if (error) throw error

    // Notifica o usuário recém-atribuído
    if (userId && turno) {
      const funcao  = (turno.funcao as string).charAt(0).toUpperCase() + (turno.funcao as string).slice(1)
      const setorRaw = turno.setor as unknown
      const setor   = (Array.isArray(setorRaw) ? (setorRaw[0] as { nome: string } | undefined) : (setorRaw as { nome: string } | null))?.nome
      const diaRaw  = turno.dia as unknown
      const dia     = (Array.isArray(diaRaw) ? (diaRaw[0] as { nome_dia: string } | undefined) : (diaRaw as { nome_dia: string } | null))?.nome_dia
      const inicio  = turno.inicio ? new Date(turno.inicio as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''
      const fim     = turno.fim    ? new Date(turno.fim    as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''
      await enviarNotif({
        userId,
        titulo: `📅 Você foi escalado${dia ? ` — ${dia}` : ''}`,
        corpo:  `${funcao}${setor ? ` · ${setor}` : ''} · ${inicio}–${fim}`,
        tipo:   'escala',
        link:   '/minha-escala',
      })
    }
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
