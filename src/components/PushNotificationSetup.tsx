'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribePush, unsubscribePush } from '@/app/actions/push'

// ── Helpers ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output.buffer as ArrayBuffer
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Invisível — registra o service worker e faz subscribe silencioso se o usuário
 * já tinha dado permissão. Mostra um toast discreto pedindo permissão se ainda
 * não foi solicitado.
 */
export function PushNotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)
  const [swSupported, setSwSupported] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setSwSupported(supported)
    if (!supported) return

    setPermission(Notification.permission)

    // Registra service worker independente de permissão
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(async (reg) => {
        registrationRef.current = reg

        // Se já tem permissão, sincroniza subscription com o servidor
        if (Notification.permission === 'granted') {
          await syncSubscription(reg)
        } else if (Notification.permission === 'default') {
          // Aguarda 3s para mostrar o prompt (não interrompe carregamento)
          setTimeout(() => setShowPrompt(true), 3000)
        }
      })
      .catch((err) => console.error('[sw] register failed:', err))
  }, [])

  async function syncSubscription(reg: ServiceWorkerRegistration) {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const subJSON = JSON.parse(JSON.stringify(sub)) as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }
      await subscribePush(subJSON, navigator.userAgent)
    } catch (err) {
      console.error('[push] syncSubscription error:', err)
    }
  }

  async function handleAllow() {
    setShowPrompt(false)
    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted' && registrationRef.current) {
      await syncSubscription(registrationRef.current)
    }
  }

  function handleDismiss() {
    setShowPrompt(false)
  }

  if (!swSupported || !showPrompt || permission !== 'default') return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80"
      role="dialog"
      aria-live="polite"
    >
      <div
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden>🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Ativar notificações
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
              Receba avisos quando sua escala mudar ou chegar nova tarefa.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAllow}
                className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Ativar
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hook utilitário: desinscreve este dispositivo ────────────────────────────

export async function unregisterThisDevice(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await unsubscribePush(endpoint)
}
