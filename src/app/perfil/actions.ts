'use server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { safe, type ActionResult } from '@/lib/admin/actions-helper'
import { requireProfile } from '@/lib/auth/current-user'

/**
 * Atualiza SOMENTE o status_captacao (Não iniciado / Produzindo / Concluído).
 * Restrito ao operador que é o responsável de captação, ou roles acima.
 */
export async function atualizarStatusCaptacao(
  conteudoId: string,
  status: string,
): Promise<ActionResult> {
  const VALIDOS = ['nao_iniciado', 'produzindo', 'concluido']
  return safe(async () => {
    const profile = await requireProfile()
    if (!VALIDOS.includes(status)) throw new Error('Status inválido.')
    // Usa cliente de usuário só pra leitura (verificar quem é o responsável)
    const supabase = await createClient()
    const { data: c } = await supabase
      .from('conteudos')
      .select('responsavel_captacao_id')
      .eq('id', conteudoId)
      .maybeSingle()
    const roles = ['admin', 'coordenacao', 'lider_fv', 'lider_area']
    if (c?.responsavel_captacao_id !== profile.id && !roles.includes(profile.role ?? '')) {
      throw new Error('Só o operador designado pode atualizar seu status de captação.')
    }
    // Usa service client p/ bypassar RLS — permissão já validada acima
    const sb = createServiceClient()
    const { error } = await sb
      .from('conteudos')
      .update({ status_captacao: status })
      .eq('id', conteudoId)
    if (error) throw error
  })
}

/**
 * Atualiza SOMENTE o responsável de captação de um conteúdo.
 * Restrito a lider_fv (e acima). O lider FV só pode delegar captação
 * para um operador_fv; não pode tocar nos outros campos.
 */
export async function atualizarCaptacao(
  conteudoId: string,
  operadorId: string | null,
): Promise<ActionResult> {
  return safe(async () => {
    const profile = await requireProfile()
    const allowed = ['lider_fv', 'lider_area', 'coordenacao', 'admin']
    if (!allowed.includes(profile.role ?? '')) {
      throw new Error('Sem permissão para alterar captação.')
    }
    const supabase = await createClient()
    const { error } = await supabase
      .from('conteudos')
      .update({ responsavel_captacao_id: operadorId })
      .eq('id', conteudoId)
    if (error) throw error
  })
}
