/**
 * Service Worker servido dinamicamente para invalidar cache a cada deploy.
 *
 * Estratégia:
 * - O conteúdo é o mesmo do antigo public/sw.js
 * - CACHE_NAME usa VERCEL_GIT_COMMIT_SHA (primeiros 8 chars) — muda a cada
 *   deploy, força o `activate` listener a limpar caches anteriores
 * - Em dev usa timestamp fixo do startup pra não invalidar a cada HMR
 *
 * Fix do bug "deploy mid-event prende clientes em JS antigo" — agora cada
 * deploy automaticamente gera novo CACHE_NAME e o `activate` faz cleanup.
 */

import { NextResponse } from 'next/server'

// force-static: gerado uma vez por build com o SHA daquele build.
// Próximo deploy = novo build = novo SHA = SW novo → activate limpa cache.
export const dynamic = 'force-static'

const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  'dev'

const SW_BODY = `// CIA 2026 — Service Worker (build ${BUILD_ID})
// Servido por src/app/sw.js/route.ts — CACHE_NAME muda a cada deploy.

const CACHE_NAME = 'cia-2026-${BUILD_ID}'

// ── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'CIA 2026', body: event.data.text() }
  }

  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    tag: data.tag ?? 'cia-notif',
    renotify: true,
    data: {
      url: data.url ?? '/',
      payload: data.payload ?? null,
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CIA 2026', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
  )
})

// ── Offline Cache (app shell) ────────────────────────────────────────────────

self.addEventListener('fetch', function (event) {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Assets estáticos: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Páginas: network-first, fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        return cached ?? Response.error()
      })
  )
})

// Limpa caches velhos no activate — invalidação automática a cada deploy
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  return self.clients.claim()
})
`

export function GET() {
  return new NextResponse(SW_BODY, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      // Cache curto pra o browser checar mudança rápido após deploy
      'cache-control': 'public, max-age=0, must-revalidate',
      'service-worker-allowed': '/',
    },
  })
}
