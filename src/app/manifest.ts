import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CIA 2026 · Painel de Cobertura',
    short_name: 'CIA 2026',
    description: 'Central de comando da cobertura ao vivo da Copa Inter Atléticas 2026 · Uberaba',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0f0a',
    theme_color: '#1a3a24',
    categories: ['productivity', 'sports'],
    lang: 'pt-BR',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
  }
}
