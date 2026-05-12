'use server'

/**
 * Server actions para a Liga Super 8 (admin).
 *
 * Operações:
 *   • addSuper8Row              — adiciona um confronto na liga
 *   • updateSuper8Row           — edita um confronto existente
 *   • deleteSuper8Row           — remove um confronto
 *   • sortearPosicoes           — atribui A1-A8 aleatoriamente para 8 atléticas
 *   • gerarJogoDoSuper8         — cria uma row em `jogos` linkada ao super8_liga
 *
 * Toda escrita passa por `requireCoordOrAdmin`. As constraints de DB
 * (uq_super8_par_adversarios, uq_super8_atl_*_modalidade, uq_super8_rodada_*)
 * fazem a defesa final contra violações do regulamento.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, requireEdicaoAtivaId, safe, type ActionResult } from '@/lib/admin/actions-helper'

export interface Super8RowPatch {
  rodada?:         number
  atletica_a_id?:  string
  atletica_b_id?:  string
  modalidade_id?:  string
  categoria?:      string
  posicao_a?:      number | null
  posicao_b?:      number | null
  observacoes?:    string | null
}

/** Adiciona um confronto na liga. Constraints do DB validam unicidade. */
export async function addSuper8Row(row: Required<Omit<Super8RowPatch, 'observacoes'>> & { observacoes?: string | null }): Promise<ActionResult & { id?: string }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const edicao_id = await requireEdicaoAtivaId()
    if (row.atletica_a_id === row.atletica_b_id) {
      throw new Error('As duas atléticas devem ser diferentes.')
    }
    if (row.rodada < 1 || row.rodada > 7) {
      throw new Error('Rodada deve estar entre 1 e 7.')
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('super8_liga')
      .insert({ edicao_id, ...row })
      .select('id')
      .single()
    if (error) {
      // Erros das constraints UNIQUE — traduz pra mensagem amigável
      const msg = error.message.toLowerCase()
      if (msg.includes('uq_super8_par_adversarios'))    throw new Error('Estas duas atléticas já se enfrentaram nesta liga (Art. 53 §3).')
      if (msg.includes('uq_super8_atl_a_modalidade') ||
          msg.includes('uq_super8_atl_b_modalidade'))   throw new Error('Uma das atléticas já jogou esta modalidade/categoria na liga (Art. 53 §3).')
      if (msg.includes('uq_super8_rodada_atl_a') ||
          msg.includes('uq_super8_rodada_atl_b'))       throw new Error('Uma das atléticas já tem jogo agendado nesta rodada.')
      throw error
    }
    revalidatePath('/admin/competicao/super8')
    revalidatePath('/esportivo/super-8')
    return { id: data.id }
  })
}

/** Atualiza um confronto. Constraints checadas no DB. */
export async function updateSuper8Row(id: string, patch: Super8RowPatch): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('super8_liga').update(patch).eq('id', id)
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('uq_super8'))
        throw new Error('Conflito: viola unicidade do regulamento (par já existe / modalidade repetida / rodada cheia).')
      throw error
    }
    revalidatePath('/admin/competicao/super8')
    revalidatePath('/esportivo/super-8')
  })
}

/** Remove um confronto da liga. */
export async function deleteSuper8Row(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('super8_liga').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/competicao/super8')
    revalidatePath('/esportivo/super-8')
  })
}

/**
 * Sorteio das posições A1-A8 — Art. 55 (Congresso Técnico).
 *
 * Recebe 8 IDs de atléticas (na ordem que o sorteio deve atribuir).
 * Atualiza TODAS as rows da liga onde a atlética aparece, gravando
 * `posicao_a`/`posicao_b` conforme a posição sorteada.
 *
 * Idempotente: pode rodar várias vezes; a última escrita prevalece.
 */
export async function sortearPosicoesSuper8(
  ordemAtleticas: string[],
): Promise<ActionResult & { atribuicoes?: Array<{ atletica_id: string; posicao: number }> }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    if (ordemAtleticas.length !== 8) {
      throw new Error('São necessárias exatamente 8 atléticas para o sorteio.')
    }
    const uniq = new Set(ordemAtleticas)
    if (uniq.size !== 8) {
      throw new Error('Há atléticas duplicadas na lista.')
    }
    const edicao_id = await requireEdicaoAtivaId()
    const supabase = await createClient()

    const atribuicoes = ordemAtleticas.map((atletica_id, idx) => ({ atletica_id, posicao: idx + 1 }))

    // Para cada atlética, atualiza posicao_a/posicao_b em todas as rows onde aparece
    for (const { atletica_id, posicao } of atribuicoes) {
      const [{ error: errA }, { error: errB }] = await Promise.all([
        supabase
          .from('super8_liga')
          .update({ posicao_a: posicao })
          .eq('edicao_id', edicao_id)
          .eq('atletica_a_id', atletica_id),
        supabase
          .from('super8_liga')
          .update({ posicao_b: posicao })
          .eq('edicao_id', edicao_id)
          .eq('atletica_b_id', atletica_id),
      ])
      if (errA) throw errA
      if (errB) throw errB
    }

    revalidatePath('/admin/competicao/super8')
    revalidatePath('/esportivo/super-8')
    return { atribuicoes }
  })
}

/**
 * Gera uma row em `jogos` para uma row da liga que ainda não tem jogo vinculado.
 *
 * Útil pra criar todos os 28 jogos em massa para o /placar receber. Cria com
 * status='agendado', sem dia/setor (admin atribui depois em /admin/jogos).
 */
export async function gerarJogoDoSuper8(super8RowId: string): Promise<ActionResult & { jogo_id?: string }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const edicao_id = await requireEdicaoAtivaId()
    const supabase  = await createClient()

    // Busca a row + nomes das atléticas
    const { data: row, error: rowErr } = await supabase
      .from('super8_liga')
      .select(`
        id, jogo_id, modalidade_id, categoria,
        atletica_a_id, atletica_b_id,
        atletica_a:atletica_a_id (nome),
        atletica_b:atletica_b_id (nome)
      `)
      .eq('id', super8RowId)
      .maybeSingle()
    if (rowErr) throw rowErr
    if (!row) throw new Error('Confronto não encontrado.')
    if (row.jogo_id) throw new Error('Esta partida já tem jogo vinculado.')

    // Cria o jogo
    type AtleticaRef = { nome: string } | { nome: string }[] | null
    const aNome = Array.isArray(row.atletica_a) ? row.atletica_a[0]?.nome : (row.atletica_a as AtleticaRef as { nome: string } | null)?.nome
    const bNome = Array.isArray(row.atletica_b) ? row.atletica_b[0]?.nome : (row.atletica_b as AtleticaRef as { nome: string } | null)?.nome

    const { data: jogo, error: jogoErr } = await supabase
      .from('jogos')
      .insert({
        edicao_id,
        modalidade_id: row.modalidade_id,
        equipe_a_id:   row.atletica_a_id,
        equipe_b_id:   row.atletica_b_id,
        equipe_a_nome: aNome,
        equipe_b_nome: bNome,
        categoria:     row.categoria,
        divisao:       'Super 08',
        fase:          'super8',
        status:        'agendado',
      })
      .select('id')
      .single()
    if (jogoErr) throw jogoErr

    // Linka o jogo na liga
    const { error: linkErr } = await supabase
      .from('super8_liga')
      .update({ jogo_id: jogo.id })
      .eq('id', super8RowId)
    if (linkErr) throw linkErr

    revalidatePath('/admin/competicao/super8')
    revalidatePath('/esportivo/super-8')
    revalidatePath('/placar')
    return { jogo_id: jogo.id }
  })
}
