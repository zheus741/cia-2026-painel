'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin } from '@/lib/admin/actions-helper'
import { requireProfile, ROLES_APROVADORES } from '@/lib/auth/current-user'
import { enviarNotif } from '@/lib/notif'

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

// ── Aprovação de novos usuários ──────────────────────────────────────────────

interface AprovacaoPayload {
  role:    string
  funcao:  string | null
}

/**
 * Aprova um usuário pendente, atribuindo role e função.
 * Só admin, coordenação ou coord. esportivo podem aprovar.
 */
export async function aprovarUsuario(
  userId: string,
  payload: AprovacaoPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const approver = await requireProfile()
    if (!ROLES_APROVADORES.includes(approver.role as 'admin' | 'coordenacao' | 'coordenador_esportivo')) {
      return { ok: false, error: 'Sem permissão pra aprovar.' }
    }

    if (!VALID_ROLES.includes(payload.role as ValidRole)) {
      return { ok: false, error: 'Role inválido.' }
    }
    if (payload.funcao !== null && !VALID_FUNCOES.includes(payload.funcao as ValidFuncao)) {
      return { ok: false, error: 'Função inválida.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        aprovado:         true,
        aprovado_em:      new Date().toISOString(),
        aprovado_por:     approver.id,
        role:             payload.role,
        funcao_principal: payload.funcao,
      })
      .eq('id', userId)
    if (error) return { ok: false, error: error.message }

    // Notifica o usuário aprovado
    await enviarNotif({
      userId,
      titulo: '✅ Seu acesso foi liberado!',
      corpo:  `Você foi aprovado como ${payload.role}. Já pode acessar o painel.`,
      tipo:   'sistema',
      link:   '/',
    }).catch(() => { /* best-effort */ })

    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao aprovar' }
  }
}

/**
 * Recusa um usuário pendente (desativa). Mantém o registro pra histórico.
 */
export async function recusarUsuario(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const approver = await requireProfile()
    if (!ROLES_APROVADORES.includes(approver.role as 'admin' | 'coordenacao' | 'coordenador_esportivo')) {
      return { ok: false, error: 'Sem permissão pra recusar.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ ativo: false })
      .eq('id', userId)
      .eq('aprovado', false)  // só desativa quem ainda não foi aprovado
    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao recusar' }
  }
}
