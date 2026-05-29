import 'server-only'

/**
 * Rate-limit em memória — light, sem Redis.
 *
 * Adequado pra:
 * - Vercel deployments com runtime Node compartilhado (memória persiste por
 *   warm function ~15min)
 * - Anti-flood de endpoints como /api/search (operador segurando enter)
 *
 * NÃO adequado pra:
 * - Auth/rate-limiting de produção sério (escapa entre regions/cold starts)
 * - Garantir limite EXATO (warm functions independentes têm contadores
 *   próprios)
 *
 * Uso:
 *   const { allowed, retryAfter } = checkRate('search:' + userId, 30, 60_000)
 *   if (!allowed) return new Response('Too many', { status: 429, headers: {...} })
 */

interface RateBucket {
  count:     number
  resetAt:   number
}

const buckets = new Map<string, RateBucket>()
let lastCleanup = 0

function cleanup(now: number) {
  // Limpa keys expiradas a cada 60s pra não vazar memória em long-running
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k)
  }
}

export function checkRate(
  key:     string,
  limit:   number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now()
  cleanup(now)

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count++
  const allowed = bucket.count <= limit
  const remaining = Math.max(0, limit - bucket.count)
  const retryAfter = allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000)

  return { allowed, remaining, retryAfter }
}
