'use client'

/**
 * useNavBadges() — hook que retorna contadores ao vivo pra exibir badges
 * em itens da navegação principal.
 *
 *  - aoVivo: nº de jogos com status='ao_vivo' (placar)
 *
 * Atualiza em real-time via Supabase channel, com DEBOUNCE: uma rajada
 * de updates em jogos (ex: vários gols seguidos) coalesce num único
 * recount. Crítico no D-Day — esse hook roda em TODOS os usuários.
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NavBadges {
  aoVivo: number
}

export function useNavBadges(): NavBadges {
  const [badges, setBadges] = useState<NavBadges>({ aoVivo: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let alive = true

    async function recount() {
      const { count } = await supabase
        .from('jogos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ao_vivo')
      if (alive) setBadges(prev => ({ ...prev, aoVivo: count ?? 0 }))
    }

    // Fetch inicial
    recount()

    // Subscribe em UPDATE da tabela jogos — debounce 4s coalesce a rajada
    const channel = supabase
      .channel('nav-badges-jogos')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jogos',
      }, () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { if (alive) recount() }, 4000)
      })
      .subscribe()

    return () => {
      alive = false
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  return badges
}
