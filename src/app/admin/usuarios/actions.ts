'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin } from '@/lib/admin/actions-helper'

export async function updateRole(userId: string, role: string) {
  await requireCoordOrAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
  if (error) throw error
  revalidatePath('/admin/usuarios')
}

export async function updateFuncao(userId: string, funcao: string | null) {
  await requireCoordOrAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ funcao_principal: funcao })
    .eq('id', userId)
  if (error) throw error
  revalidatePath('/admin/usuarios')
}

export async function toggleAtivo(userId: string, ativo: boolean) {
  await requireCoordOrAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ ativo })
    .eq('id', userId)
  if (error) throw error
  revalidatePath('/admin/usuarios')
}

// Mantidos por compatibilidade com eventuais referências antigas
export async function createUsuario() {
  return { ok: false as const, error: 'Use a tela de criar conta para novos membros.' }
}
export async function updateUsuario() {
  return { ok: false as const, error: 'Use os controles inline da tela de usuários.' }
}
export async function deleteUsuario() {
  return { ok: false as const, error: 'Desative o usuário em vez de excluir.' }
}
