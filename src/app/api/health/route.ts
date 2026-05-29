/**
 * GET /api/health
 *
 * Health check endpoint para monitoring externo (UptimeRobot, BetterUptime,
 * Vercel monitors). Checa conectividade com Supabase fazendo uma query
 * trivial. Retorna JSON com status + tempo de resposta.
 *
 * Códigos:
 *   200 — tudo OK
 *   503 — banco não respondeu ou erro inesperado
 *
 * NÃO requer autenticação (precisa ser hit-able sem cookie). Evita
 * vazamento: só retorna status, sem dados sensíveis.
 *
 * Cache: max-age=0 sempre fresco. Latência típica esperada: < 200ms.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

interface HealthResponse {
  status:    'ok' | 'degraded' | 'down'
  timestamp: string
  uptime?:   number   // ms desde startup do worker (Vercel reinicia, então não é real)
  checks: {
    db:        'ok' | 'fail'
    db_ms?:    number
    db_error?: string
  }
}

const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  'dev'

export async function GET() {
  const startedAt = Date.now()

  // Check Supabase com timeout curto — não queremos health check pendurado
  let dbStatus: 'ok' | 'fail' = 'fail'
  let dbMs: number | undefined
  let dbError: string | undefined

  try {
    const dbStart = Date.now()
    const supabase = createServiceClient()
    // Query trivial — count rápido com head:true não puxa dados
    const { error } = await Promise.race([
      supabase.from('edicoes').select('id', { head: true, count: 'exact' }).limit(1),
      new Promise<{ error: { message: string } }>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000),
      ),
    ])
    dbMs = Date.now() - dbStart
    if (error) {
      dbError = error.message
    } else {
      dbStatus = 'ok'
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'erro desconhecido'
  }

  const overall: HealthResponse['status'] =
    dbStatus === 'ok' ? 'ok' : 'down'

  const body: HealthResponse = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startedAt,
    checks: {
      db: dbStatus,
      db_ms: dbMs,
      db_error: dbError,
    },
  }

  return NextResponse.json(body, {
    status: overall === 'ok' ? 200 : 503,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'x-build-id': BUILD_ID,
    },
  })
}
