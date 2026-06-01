'use server'
import { createClient } from '@/lib/supabase/server'
import { safe, type ActionResult } from '@/lib/admin/actions-helper'
import { requireProfile } from '@/lib/auth/current-user'

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
