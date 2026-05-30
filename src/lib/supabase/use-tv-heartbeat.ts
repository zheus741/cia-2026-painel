'use client'

import { useEffect, useRef } from 'react'

/**
 * Heartbeat de segurança para telas de exibição (modo TV).
 *
 * Mesmo com reconnect + revival, uma TV ligada o dia todo pode acumular
 * estados-zumbi (memory leak, canal travado em 'joining', drift de relógio).
 * Esta é a REDE DE SEGURANÇA FINAL: força um reload completo da página a cada
 * N minutos, garantindo que a TV sempre volte a um estado limpo e sincronizado.
 *
 * Defensivo: só recarrega se a aba estiver VISÍVEL (não recarrega TV em
 * standby) e respeita um intervalo mínimo.
 *
 * Uso (só em /tv e /tv/placar — NÃO em telas interativas):
 *   useTvHeartbeat(20) // reload a cada 20 min
 */
export function useTvHeartbeat(intervalMinutes = 20) {
  const mountedAt = useRef(Date.now())

  useEffect(() => {
    const intervalMs = Math.max(5, intervalMinutes) * 60_000

    const id = setInterval(() => {
      // Só recarrega se visível — evita reload de TV em sleep/standby,
      // que pode deixar a tela preta até alguém acordar o dispositivo.
      if (document.visibilityState !== 'visible') return
      // Sanidade: não recarrega nos primeiros 60s após montar
      if (Date.now() - mountedAt.current < 60_000) return
      window.location.reload()
    }, intervalMs)

    return () => clearInterval(id)
  }, [intervalMinutes])
}
