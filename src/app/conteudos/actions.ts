'use server'

import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/admin/actions-helper'

export interface ConteudoPayload {
  edicao_id:            string
  titulo:               string
  tipo:                 string
  status?:              string
  prioridade?:          number
  dia_id?:              string | null
  setor_id?:            string | null
  patrocinador_id?:     string | null
  jogo_id?:             string | null
  show_id?:             string | null
  canal_publicacao?:    string | null
  briefing?:            string | null
  pipeline_template_id?: string | null
}

export async function createConteudo(payload: ConteudoPayload) {
  return safe(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: conteudo, error } = await supabase
      .from('conteudos')
      .insert({
        ...payload,
        status:    payload.status    ?? 'rascunho',
        prioridade: payload.prioridade ?? 3,
        criado_por: user?.id ?? null,
      })
      .select('id')
      .single()

    if (error) throw error

    // Seed pipeline stages from template
    if (payload.pipeline_template_id && conteudo) {
      const { data: tpl } = await supabase
        .from('pipeline_templates')
        .select('estagios, sla_por_estagio')
        .eq('id', payload.pipeline_template_id)
        .single()

      if (tpl?.estagios?.length) {
        const estagios = tpl.estagios.map((e: string, i: number) => ({
          conteudo_id: conteudo.id,
          estagio:     e,
          ordem:       i,
          status:      i === 0 ? 'pendente' : 'aguardando',
          sla_minutos: (tpl.sla_por_estagio as Record<string, number>)[e] ?? null,
        }))
        await supabase.from('estagios_conteudo').insert(estagios)
      }
    }

    return conteudo?.id
  })
}

export async function updateConteudo(id: string, payload: Partial<ConteudoPayload>) {
  return safe(async () => {
    const supabase = await createClient()
    const { error } = await supabase
      .from('conteudos')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  })
}

export async function deleteConteudo(id: string) {
  return safe(async () => {
    const supabase = await createClient()
    const { error } = await supabase.from('conteudos').delete().eq('id', id)
    if (error) throw error
  })
}

export async function setStatus(id: string, status: string) {
  return safe(async () => {
    const supabase = await createClient()
    const extra: Record<string, unknown> = {}
    if (status === 'publicado') extra.publicado_em = new Date().toISOString()
    const { error } = await supabase
      .from('conteudos')
      .update({ status, ...extra })
      .eq('id', id)
    if (error) throw error
  })
}

export async function advanceEstagio(conteudoId: string, estagioId: string) {
  return safe(async () => {
    const supabase = await createClient()
    const { error } = await supabase
      .from('estagios_conteudo')
      .update({ status: 'pronto', concluido_em: new Date().toISOString() })
      .eq('id', estagioId)
    if (error) throw error

    // Unlock next stage
    const { data: next } = await supabase
      .from('estagios_conteudo')
      .select('id, ordem')
      .eq('conteudo_id', conteudoId)
      .eq('status', 'aguardando')
      .order('ordem')
      .limit(1)
      .maybeSingle()

    if (next) {
      await supabase
        .from('estagios_conteudo')
        .update({ status: 'pendente' })
        .eq('id', next.id)
    }
  })
}
