import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Detecção SOFT de edição concorrente em jogos.
 *
 * Lê `jogos.atualizado_em` (mig 0059) antes de aplicar mutação. Se foi
 * atualizado nos últimos 3 segundos, é provavelmente OUTRO coord editando
 * simultaneamente — retorna mensagem de warning pra incluir no ActionResult.
 *
 * NÃO bloqueia o save — só avisa. Suficiente pra cenário "2 coords no mesmo
 * jogo simultaneamente" que é raro mas pode acontecer.
 *
 * Para implementar locking REAL no futuro: incluir atualizado_em no payload
 * do client e fazer .lte('atualizado_em', clientTs) no update; se .count=0
 * = conflito → 409.
 */

const CONFLICT_WINDOW_MS = 3000

export async function detectConcurrentEdit(
  jogoId: string,
  supabase: SupabaseClient,
): Promise<{ warning?: string }> {
  const { data, error } = await supabase
    .from('jogos')
    .select('atualizado_em')
    .eq('id', jogoId)
    .maybeSingle()

  if (error || !data?.atualizado_em) return {}

  const lastEdit = new Date(data.atualizado_em as string).getTime()
  const now = Date.now()
  const deltaMs = now - lastEdit

  if (deltaMs >= 0 && deltaMs < CONFLICT_WINDOW_MS) {
    return {
      warning: 'Outro coord editou este jogo agora há pouco. Confirme se o resultado está correto.',
    }
  }

  return {}
}
