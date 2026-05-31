import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - common image/font extensions
     * - /api/cron/*       (autenticados via CRON_SECRET, não por sessão)
     * - /api/sheet-sync   (autenticado via SHEET_SYNC_SECRET, webhook da planilha)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/cron/|api/sheet-sync|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
