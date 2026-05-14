'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin } from '@/lib/admin/actions-helper'

const VALID_ROLES    = ['admin', 'coordenacao', 'lider_area', 'operador', 'coordenador_esportivo', 'operador_esportivo'] as const
const VALID_FUNCOES  = ['foto', 'video', 'editor', 'design', 'coordenacao', 'storymaker', 'lider_cobertura', null] as const

type ValidRole   = typeof VALID_ROLES[number]
type ValidFuncao = typeof VALID_FUNCOES[number]

export async function updateRole(userId: string, role: string) {
  if (!VALID_ROLES.includes(role as ValidRole)) throw new Error('Role inválido.')
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
  if (funcao !== null && !VALID_FUNCOES.includes(funcao as ValidFuncao)) throw new Error('Função inválida.')
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
