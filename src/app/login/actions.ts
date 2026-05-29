'use server'

import { createServiceClient } from '@/lib/supabase/service'

export interface SignupResult {
  ok: boolean
  error?: string
}

/**
 * Cria conta via service role com email pré-confirmado.
 *
 * Bypassa:
 *   • Rate limit de email do Supabase (3-4/hora no SMTP padrão)
 *   • Tela de "verifique seu email" (que trava staff durante o evento)
 *
 * O fluxo: cria o usuário no auth.users com email_confirm=true, depois o
 * client faz signInWithPassword normalmente.
 */
export async function signupSemEmail(
  email: string,
  password: string,
  nome: string,
): Promise<SignupResult> {
  if (!email || !password || !nome) {
    return { ok: false, error: 'Preencha todos os campos.' }
  }
  if (password.length < 6) {
    return { ok: false, error: 'Senha deve ter no mínimo 6 caracteres.' }
  }

  const supabase = createServiceClient()

  // Checa se já existe (pra dar mensagem mais clara)
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  // ^ não dá pra filtrar por email direto via listUsers, então tenta criar e trata erro.

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,         // pré-confirma — sem precisar de email
    user_metadata: { nome },
  })

  if (error) {
    const msg = error.message ?? ''
    // Erros revelados ao usuário só para casos NÃO-PII (senha fraca, email malformado).
    // Caso "email já existe" devolve mensagem GENÉRICA pra não permitir
    // enumeração de contas via /login (security hardening).
    if (msg.toLowerCase().includes('weak') || msg.toLowerCase().includes('password')) {
      return { ok: false, error: 'Senha muito fraca. Use pelo menos 6 caracteres.' }
    }
    if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('email')) {
      return { ok: false, error: 'E-mail inválido.' }
    }
    // Mensagem padrão para outros casos — não vaza "já existe" / "registered"
    return { ok: false, error: 'Não foi possível criar a conta. Se você já tem cadastro, faça login. Senão tente novamente.' }
  }

  // Silencia o lint sobre o listUsers acima
  void existing

  return { ok: true }
}
