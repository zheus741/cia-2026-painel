'use server'

import { createClient } from '@/lib/supabase/server'

export async function addComentarioTurno(
  turnoId: string,
  texto: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = texto.trim()
  if (!trimmed || trimmed.length > 500) {
    return { ok: false, error: 'Comentário inválido' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const { error } = await supabase.from('comentarios_turno').insert({
    turno_id: turnoId,
    user_id:  user.id,
    texto:    trimmed,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteComentarioTurno(
  comentarioId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('comentarios_turno')
    .delete()
    .eq('id', comentarioId)

  return { ok: !error }
}
