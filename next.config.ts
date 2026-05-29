import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove header "X-Powered-By: Next.js" — obscurity contra fingerprinting
  poweredByHeader: false,

  // Tree-shake mais agressivo em libs comuns. lucide-react importa por nome
  // mas o bundler ainda pegava muitos chunks; com isso vira import direto.
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },

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
          // HSTS — força HTTPS por 2 anos. includeSubDomains seguro pois usamos
          // apenas o domínio principal.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // Permissions-Policy — bloqueia features que o app NÃO usa
          // (reduz superfície de ataque a partir de iframes/extensions).
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
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

      // Assets públicos imutáveis (logo, ícones, fontes locais). Cache 1 ano +
      // immutable — browser nunca revalida. Para invalidar: renomeie arquivo.
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icon-:size.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
};

export default nextConfig;
