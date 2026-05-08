'use server'

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

webpush.setVapidDetails(
  'mailto:matheuschristovam65@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// ── Tipos ────────────────────────────────────────────────────────────────────

interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// ── Subscribe ────────────────────────────────────────────────────────────────

export async function subscribePush(
  sub: PushSubscriptionJSON,
  userAgent?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Não autenticado' }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id:   user.id,
          endpoint:  sub.endpoint,
          p256dh:    sub.keys.p256dh,
          auth:      sub.keys.auth,
          user_agent: userAgent ?? null,
        },
        { onConflict: 'user_id,endpoint' },
      )

    if (error) {
      console.error('[push] subscribe error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[push] subscribe exception:', err)
    return { success: false, error: 'Erro interno' }
  }
}

// ── Unsubscribe ───────────────────────────────────────────────────────────────

export async function unsubscribePush(
  endpoint: string,
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return { success: true }
  } catch {
    return { success: false }
  }
}

// ── Send push para um usuário ─────────────────────────────────────────────────
// Usado internamente: o trigger do banco cria a notificacao, e a Edge Function
// (ou este server action) envia para todos os dispositivos do usuário.

export async function sendPushToUser(
  userId: string,
  payload: {
    title: string
    body: string
    icon?: string
    url?: string
    tag?: string
    payload?: unknown
  },
): Promise<{ sent: number; failed: number }> {
  const supabase = await createClient()

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subs?.length) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify({
            title: payload.title,
            body:  payload.body,
            icon:  payload.icon ?? '/icon-192x192.png',
            url:   payload.url  ?? '/',
            tag:   payload.tag  ?? 'cia-notif',
          }),
        )
        sent++
      } catch (err) {
        console.error('[push] sendPushToUser failed for endpoint:', s.endpoint, err)
        failed++

        // Se o endpoint for inválido (gone / expired), remove da base
        if (
          err instanceof webpush.WebPushError &&
          (err.statusCode === 404 || err.statusCode === 410)
        ) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', s.endpoint)
            .eq('user_id', userId)
        }
      }
    }),
  )

  return { sent, failed }
}
