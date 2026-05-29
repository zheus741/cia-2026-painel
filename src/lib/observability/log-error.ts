import 'server-only'

/**
 * Logger estruturado pra erros server-side.
 *
 * Saída no formato JSON pra Vercel logs / Datadog / Logflare conseguirem
 * agregar com facilidade. Tradeoff vs `console.error` solto: padroniza
 * fields (context, action, user, error) que ficam consultáveis depois.
 *
 * Futuro: pluggar Sentry/PostHog/etc trocando só este arquivo — todos os
 * call sites usam `logError({...})` sem mudar.
 *
 * Uso típico:
 *   try { ... }
 *   catch (e) {
 *     logError(e, {
 *       action: 'encerrarJogo',
 *       userId: profile.id,
 *       extra: { jogoId: id },
 *     })
 *   }
 */

interface LogContext {
  /** Nome curto da action ou rota ("encerrarJogo", "/api/search"). */
  action?:  string
  /** ID do usuário fazendo a ação (não inclui email/PII). */
  userId?:  string
  /** Role do usuário — útil pra debug de permissão. */
  role?:    string
  /** Quaisquer metadados extras serializáveis. NÃO COLOQUE PII. */
  extra?:   Record<string, unknown>
}

interface StructuredLog {
  level:     'error' | 'warn'
  ts:        string
  action?:   string
  user_id?:  string
  role?:     string
  error: {
    name:    string
    message: string
    stack?:  string
    code?:   string
  }
  extra?:    Record<string, unknown>
}

function normalize(err: unknown): StructuredLog['error'] {
  if (err instanceof Error) {
    const e = err as Error & { code?: string }
    return {
      name:    e.name,
      message: e.message,
      stack:   e.stack?.split('\n').slice(0, 5).join('\n'),
      code:    e.code,
    }
  }
  if (err && typeof err === 'object') {
    const eo = err as Record<string, unknown>
    return {
      name:    String(eo.name ?? 'UnknownError'),
      message: String(eo.message ?? eo.details ?? eo.hint ?? 'erro desconhecido'),
      code:    eo.code ? String(eo.code) : undefined,
    }
  }
  return {
    name:    'UnknownError',
    message: String(err ?? 'erro desconhecido'),
  }
}

export function logError(err: unknown, ctx: LogContext = {}): void {
  const entry: StructuredLog = {
    level:    'error',
    ts:       new Date().toISOString(),
    action:   ctx.action,
    user_id:  ctx.userId,
    role:     ctx.role,
    error:    normalize(err),
    extra:    ctx.extra,
  }
  // JSON single-line — Vercel/Datadog parseiam linha por linha
  console.error(JSON.stringify(entry))
}

export function logWarn(message: string, ctx: LogContext = {}): void {
  const entry: StructuredLog = {
    level:    'warn',
    ts:       new Date().toISOString(),
    action:   ctx.action,
    user_id:  ctx.userId,
    role:     ctx.role,
    error: { name: 'Warning', message },
    extra:    ctx.extra,
  }
  console.warn(JSON.stringify(entry))
}
