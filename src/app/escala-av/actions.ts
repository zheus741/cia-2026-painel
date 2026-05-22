'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCoordAdminOrLiderFV } from '@/lib/auth/current-user'
import { safe, type ActionResult } from '@/lib/admin/actions-helper'
import { enviarNotif } from '@/lib/notif'

export async function assignOperadorFV(turnoId: string, userId: string | null): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordAdminOrLiderFV()
    const supabase = createAdminClient()

    // Estado anterior — detecta nova atribuição pra notificar
    const { data: antes } = await supabase
      .from('turnos')
      .select('user_id, funcao, inicio, fim')
      .eq('id', turnoId)
      .maybeSingle()

    const { error } = await supabase
      .from('turnos')
      .update({ user_id: userId })
      .eq('id', turnoId)
    if (error) throw error

    // Notifica o operador recém-designado (se mudou)
    if (userId && userId !== (antes?.user_id as string | null)) {
      const funcao = String(antes?.funcao ?? '').replace(/^./, c => c.toUpperCase())
      const fmt = (ts: unknown) =>
        ts ? new Date(ts as string).toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        }) : ''
      const inicio = fmt(antes?.inicio)
      const fim    = fmt(antes?.fim)
      await enviarNotif({
        userId,
        titulo: `📅 Você foi escalado — ${funcao || 'Foto/Vídeo'}`,
        corpo:  `${inicio}${inicio && fim ? '–' : ''}${fim} · Confira sua escala.`,
        tipo:   'escala',
        link:   '/minha-escala',
      })
    }

    revalidatePath('/escala-av')
    revalidatePath('/admin/escala-av')
  })
}
