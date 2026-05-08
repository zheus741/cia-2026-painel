// CIA 2026 — Service Worker
// Handles push notifications and basic offline caching

const CACHE_NAME = 'cia-2026-v1'

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
        // Foca janela existente se já aberta
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        // Senão abre nova aba
        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
  )
})

// ── Offline Cache (app shell) ────────────────────────────────────────────────

// Estratégia: network-first para navegação, cache-first para assets estáticos
self.addEventListener('fetch', function (event) {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requests non-GET e de outras origens (Supabase, etc.)
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Assets estáticos: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/)
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

// Limpa caches velhos no activate
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
