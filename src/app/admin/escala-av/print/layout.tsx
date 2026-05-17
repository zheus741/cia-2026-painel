/**
 * Layout MINIMAL pra página de impressão.
 *
 * Sobrescreve o /admin layout (que tem AppShellLayout com sidebar) e
 * renderiza apenas o conteúdo do print. Sem auth check porque essa rota
 * é só do admin — protegida na page.tsx via requireProfile().
 */

import './print.css'

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-root" style={{ background: 'white', color: 'black' }}>
      {children}
    </div>
  )
}
