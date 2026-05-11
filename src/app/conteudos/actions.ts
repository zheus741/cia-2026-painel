'use server'

import { createClient } from '@/lib/supabase/server'
import { safe, requireLiderOrAbove } from '@/lib/admin/actions-helper'
import { enviarNotifParaVarios, enviarNotif } from '@/lib/notif'

const VALID_STATUSES = [
  'rascunho', 'em_producao', 'pendente', 'em_andamento', 'pausado',
  'bloqueado', 'pronto', 'publicado', 'arquivado', 'descartado', 'cancelado',
] as const

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

export async function createConteudo(payload: ConteudoPayload) {
  return safe(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data: conteudo, error } = await supabase
      .from('conteudos')
      .insert({
        ...payload,
        status:     payload.status    ?? 'rascunho',
        prioridade: payload.prioridade ?? 3,
        criado_por: user.id,
      })
      .select('id')
      .single()

    if (error) throw error

    // Notifica os responsáveis designados (exceto quem criou)
    const responsaveis = [
      payload.responsavel_captacao_id,
      payload.responsavel_design_id,
      payload.responsavel_edicao_id,
    ]
    await enviarNotifParaVarios(responsaveis, {
      titulo: `📋 Você foi designado: «${payload.titulo}»`,
      corpo:  'Você foi adicionado como responsável em um conteúdo do Kanban.',
      tipo:   'kanban',
      link:   '/conteudos',
    }, user.id)

    return conteudo?.id
  })
}

export async function updateConteudo(id: string, payload: Partial<ConteudoPayload>) {
  return safe(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // Busca dados antes de atualizar para detectar mudanças de responsável
    const { data: antes } = await supabase
      .from('conteudos')
      .select('titulo, responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id')
      .eq('id', id)
      .maybeSingle()

    const { error } = await supabase
      .from('conteudos')
      .update(payload)
      .eq('id', id)
    if (error) throw error

    // Notifica apenas responsáveis NOVOS (que não estavam antes)
    if (antes) {
      const titulo = antes.titulo as string
      const novosCaptacao = payload.responsavel_captacao_id && payload.responsavel_captacao_id !== antes.responsavel_captacao_id
        ? [payload.responsavel_captacao_id] : []
      const novosDesign   = payload.responsavel_design_id && payload.responsavel_design_id !== antes.responsavel_design_id
        ? [payload.responsavel_design_id] : []
      const novosEdicao   = payload.responsavel_edicao_id && payload.responsavel_edicao_id !== antes.responsavel_edicao_id
        ? [payload.responsavel_edicao_id] : []

      const novos = [...novosCaptacao, ...novosDesign, ...novosEdicao]
      await enviarNotifParaVarios(novos, {
        titulo: `📋 Você foi designado: «${titulo}»`,
        corpo:  'Você foi adicionado como responsável em um conteúdo do Kanban.',
        tipo:   'kanban',
        link:   '/conteudos',
      }, user.id)
    }
  })
}

export async function deleteConteudo(id: string) {
  return safe(async () => {
    await requireLiderOrAbove()
    const supabase = await createClient()
    const { error } = await supabase.from('conteudos').delete().eq('id', id)
    if (error) throw error
  })
}

const STATUS_LABEL: Record<string, string> = {
  rascunho:    'Rascunho',
  em_producao: 'Em produção',
  publicado:   'Publicado',
  arquivado:   'Arquivado',
}

export async function setStatus(id: string, status: string) {
  return safe(async () => {
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      throw new Error('Status inválido.')
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // Busca título e responsáveis para notificar
    const { data: conteudo } = await supabase
      .from('conteudos')
      .select('titulo, responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id')
      .eq('id', id)
      .maybeSingle()

    const extra: Record<string, unknown> = {}
    if (status === 'publicado') extra.publicado_em = new Date().toISOString()
    const { error } = await supabase
      .from('conteudos')
      .update({ status, ...extra })
      .eq('id', id)
    if (error) throw error

    // Notifica responsáveis quando o conteúdo avança de status
    if (conteudo && (status === 'em_producao' || status === 'publicado')) {
      const statusLabel = STATUS_LABEL[status] ?? status
      const emoji = status === 'publicado' ? '🚀' : '🎬'
      const responsaveis = [
        conteudo.responsavel_captacao_id as string | null,
        conteudo.responsavel_design_id   as string | null,
        conteudo.responsavel_edicao_id   as string | null,
      ]
      await enviarNotifParaVarios(responsaveis, {
        titulo: `${emoji} «${conteudo.titulo as string}» → ${statusLabel}`,
        corpo:  `Status atualizado por um membro da equipe.`,
        tipo:   'kanban',
        link:   '/conteudos',
      }, user.id)
    }

    // Notifica o autor quando publicado
    if (conteudo && status === 'publicado') {
      await enviarNotif({
        userId: user.id,
        titulo: `✅ «${conteudo.titulo as string}» publicado!`,
        corpo:  'Parabéns! O conteúdo foi marcado como publicado.',
        tipo:   'kanban',
        link:   '/conteudos',
      })
    }
  })
}
