'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { safe, type ActionResult } from '@/lib/admin/actions-helper'
import { requireProfile } from '@/lib/auth/current-user'

const CANAL = 'palco-principal'
const PAPEIS_REGIE = ['admin', 'coordenacao', 'lider_fv', 'lider_area', 'coordenador_esportivo']

export interface BroadcastPatch {
  mosca_on?: boolean
  ao_vivo?: boolean
  gc_on?: boolean
  gc_tipo?: string | null
  gc_titulo?: string | null
  gc_subtitulo?: string | null
  gc_detalhe?: string | null
  np_on?: boolean
  np_musica?: string | null
  np_artista?: string | null
  patroc_on?: boolean
  patroc_id?: string | null
  patroc_modo?: string | null
  placa_on?: boolean
  placa_tipo?: string | null
  placa_payload?: unknown
  crawl_on?: boolean
  crawl_texto?: string | null
}

async function guard() {
  const profile = await requireProfile()
  if (!PAPEIS_REGIE.includes(profile.role ?? '')) {
    throw new Error('Sem permissão para operar a Régie.')
  }
  return profile
}

/** Aplica um patch parcial no estado ao vivo (merge). */
export async function setBroadcast(patch: BroadcastPatch): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb
      .from('broadcast_estado')
      .update({ ...patch, updated_at: new Date().toISOString(), updated_by: profile.id })
      .eq('id', CANAL)
    if (error) throw error
  })
}

/** Registra uma entrada no as-run (pós-produção / relatório de patrocínio). */
export async function logBroadcast(
  acao: string,
  rotulo: string | null,
  payload?: unknown,
  patrocId?: string | null,
): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_log').insert({
      canal: CANAL, acao, rotulo,
      payload: payload ?? null,
      patroc_id: patrocId ?? null,
      criado_por: profile.id,
    })
    if (error) throw error
  })
}

/** Botão de pânico: tira tudo do ar (mantém mosca + ao_vivo). */
export async function limparTudo(): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_estado').update({
      gc_on: false, np_on: false, patroc_on: false, placa_on: false, crawl_on: false,
      updated_at: new Date().toISOString(), updated_by: profile.id,
    }).eq('id', CANAL)
    if (error) throw error
  })
}
