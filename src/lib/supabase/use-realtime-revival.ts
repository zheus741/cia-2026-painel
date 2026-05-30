'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Revive um canal Realtime após eventos que o matam silenciosamente.
 *
 * PROBLEMA: quando o dispositivo dorme (TV, celular bloqueado, laptop fechado)
 * o WebSocket morre, mas o Supabase NEM SEMPRE emite CHANNEL_ERROR/CLOSED —
 * o callback de status do .subscribe() não dispara. Resultado: tela "conectada"
 * (verde) mas congelada, sem receber updates. Crítico para TVs ligadas o dia todo.
 *
 * SOLUÇÃO: ouvir os eventos do navegador que indicam "acabou de acordar":
 *   - visibilitychange (aba voltou a ficar visível)
 *   - online (rede voltou)
 *   - focus (janela recuperou foco)
 * e forçar re-subscribe + um onWake() opcional (ex: router.refresh) pra
 * ressincronizar o estado que pode ter perdido enquanto dormia.
 *
 * Uso:
 *   const channelRef = useRef<RealtimeChannel | null>(null)
 *   useEffect(() => {
 *     const channel = supabase.channel(...).on(...).subscribe()
 *     channelRef.current = channel
 *     return () => { supabase.removeChannel(channel) }
 *   }, [])
 *   useRealtimeRevival(channelRef, () => router.refresh())
 */
export function useRealtimeRevival(
  channelRef: React.RefObject<RealtimeChannel | null>,
  onWake?: () => void,
) {
  // Throttle: não revive mais de 1× a cada 3s (evita storm em eventos repetidos)
  const lastRevivalRef = useRef(0)

  useEffect(() => {
    function revive(reason: string) {
      const now = Date.now()
      if (now - lastRevivalRef.current < 3000) return
      lastRevivalRef.current = now

      const channel = channelRef.current
      if (channel) {
        const state = channel.state
        // Só re-subscreve se o canal NÃO está claramente saudável.
        // 'joined' = ok. Qualquer outro estado (closed/errored/leaving/joining
        // travado) merece um re-subscribe.
        if (state !== 'joined') {
          try { channel.subscribe() } catch { /* best-effort */ }
        }
      }
      // Ressincroniza estado perdido durante o sono
      onWake?.()
      void reason
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') revive('visibility')
    }
    function onOnline()  { revive('online') }
    function onFocus()   { revive('focus') }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onFocus)
    }
  }, [channelRef, onWake])
}
