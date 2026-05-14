import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Ferramenta interna — admin/coord adicionam URLs de logos/avatares/fotos
    // de domínios variados (sites de patrocinadores, universidades, Google
    // OAuth avatars, etc). Permitimos qualquer host https; o trade-off é não
    // otimizar pra externos, o que é aceitável pra este uso interno.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

  async headers() {
    return [
      // Headers de segurança globais
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Service worker precisa ser servido sem cache e com Content-Type correto
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',  value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
