'use server'

import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/admin/actions-helper'

export interface ConteudoPayload {
  edicao_id:               string
  titulo:                  string
  tipo:                    string
  status?:                 string
  prioridade?:             number
  dia_id?:                 string | null
  setor_id?:               string | null
  patrocinador_id?:        string | null
  jogo_id?:                string | null
  show_id?:                string | null
  festa_id?:               string | null
  modalidade_id?:          string | null
  canal_publicacao?:       string | null
  briefing?:               string | null
  horario_previsto?:       string | null
  responsavel_captacao_id?: string | null
  responsavel_design_id?:  string | null
  responsavel_edicao_id?:  string | null
}

// Colunas adicionadas por migração — removidas do payload até existirem no banco
function stripNewCols<T extends Partial<ConteudoPayload>>(p: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { horario_previsto, responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id, ...rest } = p as ConteudoPayload
  return rest
}

export async function createConteudo(payload: ConteudoPayload) {
  return safe(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: conteudo, error } = await supabase
      .from('conteudos')
      .insert({
        ...stripNewCols(payload),
        status:     payload.status    ?? 'rascunho',
        prioridade: payload.prioridade ?? 3,
        criado_por: user?.id ?? null,
      })
      .select('id')
      .single()

    if (error) throw error
    return conteudo?.id
  })
}

export async function updateConteudo(id: string, payload: Partial<ConteudoPayload>) {
  return safe(async () => {
    const supabase = await createClient()
    const { error } = await supabase
      .from('conteudos')
      .update(stripNewCols(payload))
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
