'use client'

interface Props {
  error:          Error & { digest?: string }
  unstable_retry: () => void
}

export default function GlobalError({ error, unstable_retry }: Props) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: '#EDEAE3',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#0A0F0B',
        }}
      >
        <div
          role="alert"
          aria-live="assertive"
          style={{
            maxWidth: 480,
            textAlign: 'center',
            padding: '32px',
            background: '#FEFCF8',
            borderRadius: 20,
            border: '1px solid #C9C2B5',
            boxShadow: '0 4px 24px rgba(10,15,11,0.06)',
          }}
        >
          {/* Ícone SVG inline — não depende de lib porque o shell pode estar quebrado */}
          <div
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(192,57,43,0.10)',
              border: '1px solid rgba(192,57,43,0.30)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            {/* ícone de rádio / antena quebrada */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>

          <p
            style={{
              margin: 0, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c0392b',
            }}
          >
            Sinal perdido
          </p>
          <h1
            style={{ margin: '8px 0 12px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            O painel saiu do ar por um segundo
          </h1>
          <p style={{ margin: 0, color: '#4A5845', fontSize: 14, lineHeight: 1.6 }}>
            Aconteceu um erro antes mesmo do painel carregar — raro, mas
            acontece. Dá um F5 e provavelmente volta. Se não voltar, chama
            o Mateus.
          </p>

          {error.digest && (
            <p
              style={{
                marginTop: 18, marginBottom: 0,
                padding: '8px 12px',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                fontSize: 11,
                background: 'rgba(10,15,11,0.04)',
                borderRadius: 8, color: '#4A5845', wordBreak: 'break-all',
              }}
            >
              Ref: {error.digest}
            </p>
          )}

          <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => unstable_retry()}
              style={{
                padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: '#2e6b42', color: 'white', fontSize: 13, fontWeight: 600,
              }}
            >
              Tentar de novo
            </button>
            <a
              href="/"
              style={{
                padding: '10px 18px', borderRadius: 999,
                border: '1px solid #C9C2B5', background: 'transparent',
                color: '#4A5845', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}
            >
              Voltar pro início
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
