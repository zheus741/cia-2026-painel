'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCoordAdminOrLiderFV } from '@/lib/auth/current-user'
import { safe, type ActionResult } from '@/lib/admin/actions-helper'

export async function assignOperadorFV(turnoId: string, userId: string | null): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordAdminOrLiderFV()
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('turnos')
      .update({ user_id: userId })
      .eq('id', turnoId)
    if (error) throw error
    revalidatePath('/escala-av')
    revalidatePath('/admin/escala-av')
  })
}
