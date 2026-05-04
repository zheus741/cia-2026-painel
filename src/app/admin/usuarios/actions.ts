'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseFormData,
  requireCoordOrAdmin,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

const SCHEMA = [
  { name: 'nome', type: 'text' as const },
  { name: 'telefone', type: 'nullable_text' as const },
  { name: 'role', type: 'text' as const },
  { name: 'funcao_principal', type: 'nullable_text' as const },
  { name: 'funcoes_adicionais', type: 'array' as const },
  { name: 'bio', type: 'nullable_text' as const },
  { name: 'ativo', type: 'boolean' as const },
]

/**
 * Não criamos usuários direto — login via magic-link cria o profile
 * automaticamente (trigger handle_new_user). Edição é apenas update.
 */
export async function createUsuario(_fd: FormData): Promise<ActionResult> {
  return {
    ok: false,
    error:
      'Usuários são criados automaticamente no primeiro login. Convide-os pelo link da plataforma.',
  }
}

export async function updateUsuario(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('profiles').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteUsuario(_id: string): Promise<ActionResult> {
  return {
    ok: false,
    error:
      'Pra remover acesso, marque o usuário como inativo (campo "ativo"). Exclusão da conta auth precisa ser feita no painel Supabase.',
  }
}
