/**
 * Gera nome único para Supabase Realtime channel.
 *
 * Necessário porque nomes estáticos quebram em situações como:
 * - Strict Mode dev: useEffect dispara cleanup→effect duas vezes
 *   e o canal antigo ainda está em flight quando o novo tenta
 *   adicionar `postgres_changes` callbacks
 * - Multi-aba do mesmo usuário
 * - HMR (hot module replacement)
 * - Re-mount após navegação rápida
 *
 * Sintoma do bug: "cannot add postgres_changes callbacks for
 * realtime:<name> after subscribe()".
 *
 * Uso:
 *   const channel = supabase
 *     .channel(uniqueChannel('placar-realtime'))
 *     .on('postgres_changes', ...)
 *     .subscribe()
 */
export function uniqueChannel(base: string): string {
  const rnd = Math.random().toString(36).slice(2, 10)
  return `${base}-${rnd}`
}
