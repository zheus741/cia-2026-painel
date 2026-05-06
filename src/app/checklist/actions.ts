'use server'

import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/admin/actions-helper'
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

    const { error } = await supabase
      .from('checklist_itens')
      .update({
        status,
        operador_id: user?.id ?? null,
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
    const supabase = await createClient()

    const { data: instancia, error: errInst } = await supabase
      .from('checklist_instancias')
      .insert(payload)
      .select('id')
      .single()

    if (errInst) throw errInst

    // instancia os itens via função SQL
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
    const supabase = await createClient()
    const { error } = await supabase
      .from('checklist_instancias')
      .delete()
      .eq('id', id)
    if (error) throw error
    revalidatePath('/checklist')
  })
}
