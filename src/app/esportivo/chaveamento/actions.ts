'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

/**
 * Cria ou atualiza a configuração de seeds de uma chave (modalidade+categoria+divisão).
 * Necessário para que a propagação automática de vencedores funcione.
 *
 * Conflito resolvido por (modalidade_id, categoria, divisao) — idempotente.
 */
export async function upsertChaveConfig(
  modalidadeId: string,
  categoria: string,
  divisao: string,
  numTeams: number,
  seeds: string[],
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()

    if (!modalidadeId || !categoria || !divisao)
      throw new Error('modalidade_id, categoria e divisao são obrigatórios')
    if (numTeams < 2 || numTeams > 64)
      throw new Error('num_teams deve estar entre 2 e 64')
    if (seeds.length < 2)
      throw new Error('Precisa de pelo menos 2 seeds')

    const supabase = await createClient()

    // Verifica se já existe um registro pra fazer update em vez de insert
    const { data: existing } = await supabase
      .from('chave_config')
      .select('id')
      .eq('modalidade_id', modalidadeId)
      .eq('categoria', categoria)
      .eq('divisao', divisao)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await supabase
        .from('chave_config')
        .update({ num_teams: numTeams, seeds })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('chave_config')
        .insert({ modalidade_id: modalidadeId, categoria, divisao, num_teams: numTeams, seeds })
      if (error) throw error
    }

    revalidatePath('/esportivo/chaveamento')
    revalidatePath('/placar')
  })
}

/**
 * Remove a configuração de seeds de uma chave.
 * Use com cuidado — desabilita a propagação automática de vencedores.
 */
export async function deleteChaveConfig(
  modalidadeId: string,
  categoria: string,
  divisao: string,
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('chave_config')
      .delete()
      .eq('modalidade_id', modalidadeId)
      .eq('categoria', categoria)
      .eq('divisao', divisao)
    if (error) throw error
    revalidatePath('/esportivo/chaveamento')
  })
}
