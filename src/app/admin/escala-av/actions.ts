'use server'

import { createClient } from '@/lib/supabase/server'
import {
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

export interface TurnoAVPayload {
  dia_id:               string
  setor_id?:            string | null
  funcao:               'foto' | 'video'
  parceiro_id?:         string | null
  user_id?:             string | null
  inicio:               string   // ISO timestamp
  fim:                  string   // ISO timestamp
  prioridade?:          'alta' | 'media' | 'baixa'
  briefing_editorial?:  string | null
  conteudos_esperados?: string | null
}

export async function createTurnoAV(payload: TurnoAVPayload): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()

    const { error } = await supabase.from('turnos').insert({
      edicao_id,
      dia_id:              payload.dia_id,
      setor_id:            payload.setor_id ?? null,
      funcao:              payload.funcao,
      parceiro_id:         payload.parceiro_id ?? null,
      user_id:             payload.user_id ?? null,
      inicio:              payload.inicio,
      fim:                 payload.fim,
      prioridade:          payload.prioridade ?? 'media',
      briefing_editorial:  payload.briefing_editorial ?? null,
      conteudos_esperados: payload.conteudos_esperados ?? null,
      status_escala:       'rascunho',
      is_roaming:          false,
    })
    if (error) throw error
  })
}

export async function updateTurnoAV(
  id: string,
  payload: Partial<TurnoAVPayload>,
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('turnos').update(payload).eq('id', id)
    if (error) throw error
  })
}

export async function deleteTurnoAV(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (error) throw error
  })
}

export async function updateStatusEscala(
  turnoId: string,
  status: 'rascunho' | 'confirmado' | 'em_campo' | 'finalizado' | 'faltou',
): Promise<ActionResult> {
  return safe(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado.')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isCoord =
      profile?.role === 'admin' ||
      profile?.role === 'coordenacao' ||
      profile?.role === 'lider_area'

    let error
    if (isCoord) {
      ;({ error } = await supabase
        .from('turnos')
        .update({ status_escala: status })
        .eq('id', turnoId))
    } else {
      // colaborador só edita o próprio turno
      ;({ error } = await supabase
        .from('turnos')
        .update({ status_escala: status })
        .eq('id', turnoId)
        .eq('user_id', user.id))
    }
    if (error) throw error
  })
}

export async function updateSetorVenue(
  setorId: string,
  payload: {
    tem_wifi?:        boolean
    tem_ponto_apoio?: boolean
    alimentacao?:     string | null
    maps_url?:        string | null
    notas_acesso?:    string | null
  },
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('setores').update(payload).eq('id', setorId)
    if (error) throw error
  })
}
