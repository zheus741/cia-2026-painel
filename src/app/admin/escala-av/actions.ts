'use server'

import { createClient } from '@/lib/supabase/server'
import {
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'
import { enviarNotif } from '@/lib/notif'

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

    // Notifica o usuário se já foi atribuído na criação
    if (payload.user_id) {
      const funcao = payload.funcao.charAt(0).toUpperCase() + payload.funcao.slice(1)
      const inicio = new Date(payload.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      const fim    = new Date(payload.fim).toLocaleTimeString('pt-BR',    { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      await enviarNotif({
        userId: payload.user_id,
        titulo: `📅 Turno agendado — ${funcao}`,
        corpo:  `${inicio}–${fim} · Confira sua escala para detalhes.`,
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

    // Busca user_id anterior para detectar nova atribuição
    const { data: antes } = await supabase
      .from('turnos')
      .select('user_id, funcao, inicio, fim')
      .eq('id', id)
      .maybeSingle()

    const { error } = await supabase.from('turnos').update(payload).eq('id', id)
    if (error) throw error

    // Notifica se um novo usuário foi atribuído
    const novoUserId = payload.user_id
    if (novoUserId && novoUserId !== (antes?.user_id as string | null)) {
      const funcao   = ((payload.funcao ?? antes?.funcao) as string ?? '').replace(/^./, c => c.toUpperCase())
      const inicioTs = (payload.inicio ?? antes?.inicio) as string | undefined
      const fimTs    = (payload.fim    ?? antes?.fim)    as string | undefined
      const inicio   = inicioTs ? new Date(inicioTs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''
      const fim      = fimTs    ? new Date(fimTs).toLocaleTimeString('pt-BR',    { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''
      await enviarNotif({
        userId: novoUserId,
        titulo: `📅 Você foi escalado — ${funcao}`,
        corpo:  `${inicio}–${fim} · Confira sua escala para detalhes.`,
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

/**
 * Replica todos os turnos de UM dia para OUTRO dia.
 * Preserva: setor, função, parceiro, user, horários (mesmo HH:MM), prioridade, briefing.
 * Não duplica turnos que já existem no dia destino (mesmo setor + função + horário).
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

    // Busca turnos do dia origem
    const { data: turnosOrigem, error: errOrigem } = await supabase
      .from('turnos')
      .select('setor_id, funcao, parceiro_id, user_id, inicio, fim, prioridade, briefing_editorial, conteudos_esperados')
      .eq('dia_id', diaOrigemId)
      .in('funcao', ['foto', 'video'])
    if (errOrigem) throw errOrigem
    if (!turnosOrigem || turnosOrigem.length === 0) {
      return { criados: 0, pulados: 0 }
    }

    // Busca data do dia destino pra recalcular timestamps
    const { data: diaDestino, error: errDia } = await supabase
      .from('dias_evento')
      .select('id, data')
      .eq('id', diaDestinoId)
      .single()
    if (errDia || !diaDestino) throw new Error('Dia destino não encontrado.')

    // Busca turnos existentes no destino pra evitar duplicação
    const { data: turnosDestino } = await supabase
      .from('turnos')
      .select('setor_id, funcao, inicio')
      .eq('dia_id', diaDestinoId)
      .in('funcao', ['foto', 'video'])

    const existentes = new Set(
      (turnosDestino ?? []).map(t => `${t.setor_id}::${t.funcao}::${t.inicio?.slice(11, 16)}`),
    )

    // Helper pra ajustar timestamp pro novo dia
    function rebuildTs(originalIso: string, novaData: string): string {
      const original = new Date(originalIso)
      const hh = original.getUTCHours().toString().padStart(2, '0')
      const mm = original.getUTCMinutes().toString().padStart(2, '0')
      const d = new Date(`${novaData}T00:00:00`)
      d.setUTCHours(parseInt(hh), parseInt(mm), 0, 0)
      return d.toISOString()
    }

    const inserts: Array<Record<string, unknown>> = []
    let pulados = 0

    for (const t of turnosOrigem) {
      const hhmmInicio = t.inicio?.slice(11, 16) ?? '08:00'
      const key = `${t.setor_id}::${t.funcao}::${hhmmInicio}`
      if (existentes.has(key)) {
        pulados++
        continue
      }
      inserts.push({
        edicao_id,
        dia_id:              diaDestinoId,
        setor_id:            t.setor_id,
        funcao:              t.funcao,
        parceiro_id:         t.parceiro_id,
        user_id:             t.user_id,
        inicio:              t.inicio  ? rebuildTs(t.inicio, diaDestino.data) : null,
        fim:                 t.fim     ? rebuildTs(t.fim,    diaDestino.data) : null,
        prioridade:          t.prioridade ?? 'media',
        briefing_editorial:  t.briefing_editorial,
        conteudos_esperados: t.conteudos_esperados,
        status_escala:       'rascunho',
        is_roaming:          false,
      })
    }

    if (inserts.length > 0) {
      const { error: errIns } = await supabase.from('turnos').insert(inserts)
      if (errIns) throw errIns
    }

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
  })
}
