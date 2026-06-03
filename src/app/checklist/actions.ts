'use server'

import { createClient } from '@/lib/supabase/server'
import { safe, requireCoordOrAdmin } from '@/lib/admin/actions-helper'
import { revalidatePath } from 'next/cache'

export async function marcarItem(
  itemId: string,
  status: 'pendente' | 'feito' | 'nao_aplica',
  linkPost?: string,
  observacao?: string,
) {
  return safe(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { error } = await supabase
      .from('checklist_itens')
      .update({
        status,
        operador_id: user.id,
        feito_em: status === 'feito' ? new Date().toISOString() : null,
        link_post: linkPost ?? null,
        observacao: observacao ?? null,
      })
      .eq('id', itemId)

    if (error) throw error
    revalidatePath('/checklist')
  })
}

export async function criarInstancia(payload: {
  template_id: string
  edicao_id: string
  dia_id?: string | null
  jogo_id?: string | null
  show_id?: string | null
  festa_id?: string | null
  patrocinador_id?: string | null
  nome_override?: string | null
  responsavel_id?: string | null
}) {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()

    const { data: instancia, error: errInst } = await supabase
      .from('checklist_instancias')
      .insert(payload)
      .select('id')
      .single()

    if (errInst) throw errInst

    const { error: errFn } = await supabase.rpc('instanciar_checklist', {
      p_instancia_id: instancia.id,
    })
    if (errFn) throw errFn

    revalidatePath('/checklist')
    return instancia
  })
}

export async function deletarInstancia(id: string) {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('checklist_instancias')
      .delete()
      .eq('id', id)
    if (error) throw error
    revalidatePath('/checklist')
  })
}

export async function renomearInstancia(id: string, nome: string | null) {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('checklist_instancias')
      .update({ nome_override: nome || null })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/checklist')
    revalidatePath(`/checklist/${id}`)
  })
}

// ── Criar template novo (coord/admin) ────────────────────────────────────────
// Cria o template + seus itens. tipo='geral' = sem vínculo obrigatório.
export async function criarTemplate(payload: {
  edicao_id: string
  nome: string
  tipo: 'geral' | 'jogo' | 'show' | 'festa' | 'ativacao_patrocinador'
  itens: { label: string; obrigatorio: boolean; funcao_requerida?: string | null }[]
}) {
  return safe(async () => {
    await requireCoordOrAdmin()
    const nome = payload.nome.trim()
    if (!nome) throw new Error('Dê um nome ao template.')
    const itens = payload.itens.map(i => ({ ...i, label: i.label.trim() })).filter(i => i.label)
    if (itens.length === 0) throw new Error('Adicione ao menos um item.')

    const supabase = await createClient()

    const { data: tpl, error: errTpl } = await supabase
      .from('checklist_templates')
      .insert({ edicao_id: payload.edicao_id, nome, tipo: payload.tipo, ativo: true })
      .select('id')
      .single()
    if (errTpl) throw errTpl

    const rows = itens.map((i, ordem) => ({
      template_id:      tpl.id,
      label:            i.label,
      obrigatorio:      i.obrigatorio,
      funcao_requerida: i.funcao_requerida || null,
      ordem,
    }))
    const { error: errItens } = await supabase.from('checklist_template_itens').insert(rows)
    if (errItens) throw errItens

    revalidatePath('/checklist')
    return { id: tpl.id, itens: itens.length }
  })
}
