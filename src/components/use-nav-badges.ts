'use client'

/**
 * useNavBadges() — hook que retorna contadores ao vivo pra exibir badges
 * em itens da navegação principal.
 *
 * Por enquanto:
 *  - aoVivo: nº de jogos com status='ao_vivo' (placar)
 *
 * Atualiza em real-time via Supabase channel.
 * Custo: 1 fetch inicial + 1 listener — best-effort, silencia erros.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NavBadges {
  aoVivo: number
}

export function useNavBadges(): NavBadges {
  const [badges, setBadges] = useState<NavBadges>({ aoVivo: 0 })

  useEffect(() => {
    const supabase = createClient()
    let alive = true

    // Fetch inicial
    supabase
      .from('jogos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ao_vivo')
      .then(({ count }) => {
        if (alive) setBadges(prev => ({ ...prev, aoVivo: count ?? 0 }))
      })

    // Subscribe em UPDATE da tabela jogos pra recontagem
    // (refetch leve: só re-conta quando algo muda no status)
    const channel = supabase
      .channel('nav-badges-jogos')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jogos',
      }, async () => {
        const { count } = await supabase
          .from('jogos')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ao_vivo')
        if (alive) setBadges(prev => ({ ...prev, aoVivo: count ?? 0 }))
      })
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
  }, [])

  return badges
}
