'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'
import { enviarNotif } from '@/lib/notif'

export interface TurnoAVPayload {
  dia_id:       string
  setor_id?:    string | null
  funcao:       'foto' | 'video'
  parceiro_id?: string | null
  user_id?:     string | null
  prioridade?:  'alta' | 'media' | 'baixa'
  jogo_id?:     string | null
}

export async function createTurnoAV(payload: TurnoAVPayload): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()

    const { error } = await supabase.from('turnos').insert({
      edicao_id,
      dia_id:        payload.dia_id,
      setor_id:      payload.setor_id ?? null,
      funcao:        payload.funcao,
      parceiro_id:   payload.parceiro_id ?? null,
      user_id:       payload.user_id ?? null,
      prioridade:    payload.prioridade ?? 'media',
      jogo_id:       payload.jogo_id ?? null,
      status_escala: 'rascunho',
      is_roaming:    false,
    })
    if (error) throw error

    revalidatePath('/admin/escala-av')

    if (payload.user_id) {
      const funcao = payload.funcao.charAt(0).toUpperCase() + payload.funcao.slice(1)
      await enviarNotif({
        userId: payload.user_id,
        titulo: `📅 Você foi escalado — ${funcao}`,
        corpo:  'Confira sua escala para ver o setor.',
        tipo:   'escala',
        link:   '/minha-escala',
      })
    }
  })
}

export async function updateTurnoAV(
  id: string,
  payload: Partial<TurnoAVPayload>,
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()

    // Estado anterior — detecta nova atribuição de colaborador
    const { data: antes } = await supabase
      .from('turnos')
      .select('user_id, funcao')
      .eq('id', id)
      .maybeSingle()

    const { error } = await supabase.from('turnos').update(payload).eq('id', id)
    if (error) throw error

    revalidatePath('/admin/escala-av')

    const novoUserId = payload.user_id
    if (novoUserId && novoUserId !== (antes?.user_id as string | null)) {
      const funcao = String(payload.funcao ?? antes?.funcao ?? '')
        .replace(/^./, c => c.toUpperCase())
      await enviarNotif({
        userId: novoUserId,
        titulo: `📅 Você foi escalado — ${funcao || 'Foto/Vídeo'}`,
        corpo:  'Confira sua escala para ver o setor.',
        tipo:   'escala',
        link:   '/minha-escala',
      })
    }
  })
}

export async function deleteTurnoAV(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/escala-av')
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
      .maybeSingle()

    const isCoord =
      profile?.role === 'admin' ||
      profile?.role === 'coordenacao' ||
      profile?.role === 'lider_area'

    // Admin client p/ a escrita: a RLS de turnos só permite coord/admin,
    // mas o colaborador precisa marcar status do PRÓPRIO turno. O escopo
    // (.eq('user_id', user.id)) garante que ele só altera o que é dele.
    const db = createAdminClient()
    let q = db.from('turnos').update({ status_escala: status }).eq('id', turnoId)
    if (!isCoord) q = q.eq('user_id', user.id)
    const { error } = await q
    if (error) throw error

    revalidatePath('/admin/escala-av')
    revalidatePath('/minha-escala')
  })
}

/**
 * Replica todos os turnos de UM dia para OUTRO dia.
 * Preserva: setor, função, parceiro, colaborador, prioridade.
 * Não duplica turnos que já existem no destino (mesmo setor + função).
 */
export async function replicarDiaAV(
  diaOrigemId: string,
  diaDestinoId: string,
): Promise<ActionResult & { data?: { criados: number; pulados: number } }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()

    if (diaOrigemId === diaDestinoId) {
      throw new Error('Dia origem e destino são iguais.')
    }

    const { data: turnosOrigem, error: errOrigem } = await supabase
      .from('turnos')
      .select('setor_id, funcao, parceiro_id, user_id, prioridade')
      .eq('dia_id', diaOrigemId)
      .in('funcao', ['foto', 'video'])
    if (errOrigem) throw errOrigem
    if (!turnosOrigem || turnosOrigem.length === 0) {
      return { criados: 0, pulados: 0 }
    }

    const { data: turnosDestino } = await supabase
      .from('turnos')
      .select('setor_id, funcao')
      .eq('dia_id', diaDestinoId)
      .in('funcao', ['foto', 'video'])

    const existentes = new Set(
      (turnosDestino ?? []).map(t => `${t.setor_id}::${t.funcao}`),
    )

    const inserts: Array<Record<string, unknown>> = []
    let pulados = 0

    for (const t of turnosOrigem) {
      const key = `${t.setor_id}::${t.funcao}`
      if (existentes.has(key)) { pulados++; continue }
      inserts.push({
        edicao_id,
        dia_id:        diaDestinoId,
        setor_id:      t.setor_id,
        funcao:        t.funcao,
        parceiro_id:   t.parceiro_id,
        user_id:       t.user_id,
        prioridade:    t.prioridade ?? 'media',
        status_escala: 'rascunho',
        is_roaming:    false,
      })
    }

    if (inserts.length > 0) {
      const { error: errIns } = await supabase.from('turnos').insert(inserts)
      if (errIns) throw errIns
    }

    revalidatePath('/admin/escala-av')
    return { criados: inserts.length, pulados }
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
    revalidatePath('/admin/escala-av')
  })
}
