/**
 * Utilitário de notificações in-app.
 *
 * Usa o service client para bypassar RLS e inserir notificações para
 * qualquer usuário — usado exclusivamente em Server Actions.
 *
 * O componente NotifBell (/components/NotifBell.tsx) escuta INSERTs via
 * Supabase Realtime e atualiza a UI sem reload.
 */

import { createServiceClient } from '@/lib/supabase/service'

export type NotifTipo = 'kanban' | 'escala' | 'sistema'

export interface NotifPayload {
  userId: string
  titulo: string
  corpo?: string | null
  tipo?:  NotifTipo
  link?:  string | null
}

/**
 * Envia uma notificação in-app para um usuário específico.
 * Silencia erros para não quebrar o fluxo principal da action.
 */
export async function enviarNotif(payload: NotifPayload): Promise<void> {
  if (!payload.userId) return
  try {
    const supabase = createServiceClient()
    await supabase.from('notificacoes').insert({
      user_id: payload.userId,
      titulo:  payload.titulo,
      corpo:   payload.corpo  ?? null,
      tipo:    payload.tipo   ?? 'sistema',
      link:    payload.link   ?? null,
    })
  } catch {
    // Não quebra o fluxo — notificação é best-effort
  }
}

/**
 * Envia notificações para uma lista de userIds (deduplicados, exclui o ator).
 */
export async function enviarNotifParaVarios(
  userIds: (string | null | undefined)[],
  payload: Omit<NotifPayload, 'userId'>,
  excludeUserId?: string,
): Promise<void> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id && id !== excludeUserId))]
  if (ids.length === 0) return
  await Promise.all(ids.map(userId => enviarNotif({ ...payload, userId })))
}
