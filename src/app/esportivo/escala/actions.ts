'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { sendPushToUser } from '@/app/actions/push'

type ActionResult = { ok: true } | { ok: false; error: string }

async function requireCoordEsportivo() {
  const profile = await requireProfile()
  if (!['admin', 'coordenador_esportivo'].includes(profile.role)) {
    throw new Error('Sem permissão')
  }
  return profile
}

export async function atribuirDelegado(
  setorId: string,
  diaId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    const coord = await requireCoordEsportivo()
    const supabase = await createClient()

    const { error } = await supabase
      .from('escalas_esportivo')
      .insert({ setor_id: setorId, dia_id: diaId, user_id: userId })
    if (error) throw error

    // Busca nome do setor e dia para a notificação
    const [setorRes, diaRes] = await Promise.all([
      supabase.from('setores').select('nome').eq('id', setorId).single(),
      supabase.from('dias_evento').select('nome_dia').eq('id', diaId).single(),
    ])

    await sendPushToUser(userId, {
      title: '📋 Você foi escalado!',
      body: `${diaRes.data?.nome_dia ?? 'Evento'} · ${setorRes.data?.nome ?? 'Praça'} — confirme sua chegada no app.`,
      url: '/esportivo/escala',
      tag: `escala-${userId}`,
    }).catch(() => { /* notificação é best-effort */ })

    revalidatePath('/esportivo/escala')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao atribuir' }
  }
}

export async function removerDelegado(escalaId: string): Promise<ActionResult> {
  try {
    await requireCoordEsportivo()
    const supabase = await createClient()
    const { error } = await supabase
      .from('escalas_esportivo')
      .delete()
      .eq('id', escalaId)
    if (error) throw error
    revalidatePath('/esportivo/escala')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao remover' }
  }
}

export async function confirmarChegada(escalaId: string): Promise<ActionResult> {
  try {
    const profile = await requireProfile()
    const supabase = await createClient()

    // Garante que o usuário só confirma a própria escala (admin pode confirmar qualquer uma)
    const query = supabase
      .from('escalas_esportivo')
      .update({ confirmado_em: new Date().toISOString() })
      .eq('id', escalaId)

    if (profile.role !== 'admin') {
      query.eq('user_id', profile.id)
    }

    const { error } = await query
    if (error) throw error

    revalidatePath('/esportivo/escala')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao confirmar' }
  }
}
