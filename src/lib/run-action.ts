'use client'

/**
 * runAction — wrapper de server actions com toast de erro automático.
 *
 * Resolve o problema "server actions silenciosas" da auditoria: encerrarJogo
 * falha por JWT expired → UI mostra "encerrado" otimista → jogo "ressuscita".
 * Agora qualquer falha mostra toast com a mensagem; opcional rollback.
 *
 * Uso:
 *   await runAction(
 *     () => encerrarJogo(jogo.id),
 *     {
 *       label: 'encerrar jogo',
 *       onSuccess: () => toast.success('Jogo encerrado'),
 *       onError:   () => onLocalUpdate(jogo.id, { status: 'ao_vivo' }), // rollback
 *     },
 *   )
 */

import { toast } from '@/components/toast'

// Compatível com ActionResult do helper do projeto: ok: boolean + opcional error/data.
// Usamos forma "loose" pra aceitar tanto discriminated union quanto a forma boolean.
export interface ActionResultLike<T = unknown> {
  ok:     boolean
  error?: string
  data?:  T
}

interface RunActionOptions<T> {
  /** Nome curto da ação pro toast (ex: "encerrar jogo"). */
  label?:     string
  /** Callback executado em sucesso (toast custom, navegação, etc). */
  onSuccess?: (data: T | undefined) => void
  /** Callback executado em falha — geralmente faz rollback do optimistic. */
  onError?:   (error: string) => void
  /** Quando true, mostra toast.success("X salvo") automático. Default: false. */
  silent?:    boolean
}

export async function runAction<T = unknown>(
  fn: () => Promise<ActionResultLike<T> | void>,
  opts: RunActionOptions<T> = {},
): Promise<boolean> {
  const { label = 'ação', onSuccess, onError, silent = true } = opts

  try {
    const result = await fn()

    // Actions void (sem retorno padrão ok/error): considera sucesso
    if (result === undefined || result === null) {
      if (!silent) toast.success(`${capitalize(label)} concluído`)
      onSuccess?.(undefined)
      return true
    }

    if (result.ok) {
      if (!silent) toast.success(`${capitalize(label)} concluído`)
      onSuccess?.(result.data)
      return true
    }

    const msg = result.error || 'Erro desconhecido'
    toast.error(`Falha ao ${label}`, { description: msg })
    onError?.(msg)
    return false
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado'
    toast.error(`Falha ao ${label}`, { description: msg })
    onError?.(msg)
    return false
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
