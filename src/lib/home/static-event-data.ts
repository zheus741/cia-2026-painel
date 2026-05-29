/**
 * Helper para queries da home que NÃO mudam por usuário.
 *
 * Cacheado com `unstable_cache` revalidate=30s — diminui drasticamente o
 * pressure no DB. Sem ele, 100 users navegando = ~500 queries/min só de
 * dados que mudam a cada minuto/hora.
 *
 * Use createServiceClient (bypassa RLS) — dados aqui são públicos pra
 * qualquer autenticado mesmo. Não vaza nada que o user não veria de outra
 * forma; só economiza round-trips.
 */

import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import type { CoordJogo, CoordPatrocinador } from '@/app/CoordDashboard'

export interface StaticEventData {
  jogos:          CoordJogo[]
  patrocinadores: CoordPatrocinador[]
  modalidades:    { id: string; nome: string }[]
  setoresEsportivos: { id: string; nome: string; cor_hex: string | null }[]
  atleticas:      { id: string; nome: string; slug: string; cor_primaria: string | null }[]
  youtubeSetorIds: string[]
}

async function _fetchStaticEventData(): Promise<StaticEventData> {
  const supabase = createServiceClient()

  const [
    jogosRes,
    patroRes,
    modalRes,
    setoresEspRes,
    atleticasRes,
    youtubeSetoresRes,
  ] = await Promise.all([
    supabase
      .from('jogos')
      .select(`
        id, equipe_a_nome, equipe_b_nome, equipe_a_id, equipe_b_id,
        inicio, fim_previsto, dia_id, modalidade_id, setor_id, status,
        modalidades:modalidade_id(nome, icone)
      `)
      .order('inicio'),

    supabase
      .from('patrocinadores')
      .select('id, nome, ativo, logo_url')
      .eq('ativo', true),

    supabase.from('modalidades').select('id, nome'),

    supabase.from('setores').select('id, nome, cor_hex').eq('tipo', 'esportivo'),

    supabase.from('equipes')
      .select('id, nome, slug, cor_primaria')
      .eq('tipo', 'atletica'),

    supabase
      .from('setores')
      .select('id')
      .eq('tem_youtube_live', true),
  ])

  return {
    jogos:          (jogosRes.data       ?? []) as CoordJogo[],
    patrocinadores: (patroRes.data       ?? []) as CoordPatrocinador[],
    modalidades:    (modalRes.data       ?? []) as { id: string; nome: string }[],
    setoresEsportivos: (setoresEspRes.data ?? []) as { id: string; nome: string; cor_hex: string | null }[],
    atleticas:      (atleticasRes.data   ?? []) as { id: string; nome: string; slug: string; cor_primaria: string | null }[],
    youtubeSetorIds: ((youtubeSetoresRes.data ?? []) as { id: string }[]).map(s => s.id),
  }
}

/**
 * Cacheado por 30s, tag 'home-static-event-data'.
 * Para invalidar manualmente: revalidateTag('home-static-event-data') após
 * mutações em jogos/patrocinadores/etc.
 */
export const getStaticEventData = unstable_cache(
  _fetchStaticEventData,
  ['home-static-event-data'],
  { revalidate: 30, tags: ['home-static-event-data'] },
)
