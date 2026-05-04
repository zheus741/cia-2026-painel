'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseFormData,
  requireCoordOrAdmin,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

const SCHEMA = [
  { name: 'nome', type: 'text' as const },
  { name: 'tipo_conteudo', type: 'text' as const },
  { name: 'patrocinado', type: 'boolean' as const },
  { name: 'estagios', type: 'array' as const },
  { name: 'sla_por_estagio', type: 'array' as const },
  { name: 'ativo', type: 'boolean' as const },
]

function buildSlaJson(estagios: unknown, slaArray: unknown): Record<string, number> {
  const stages = Array.isArray(estagios) ? (estagios as string[]) : []
  const slas = Array.isArray(slaArray) ? (slaArray as string[]) : []
  const out: Record<string, number> = {}
  stages.forEach((s, i) => {
    const v = Number(slas[i] ?? 0)
    out[s] = Number.isFinite(v) ? v : 0
  })
  return out
}

export async function createPipeline(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const sla = buildSlaJson(data.estagios, data.sla_por_estagio)
    const insert = { ...data, sla_por_estagio: sla }
    const { error } = await supabase.from('pipeline_templates').insert(insert)
    if (error) throw error
  })
}

export async function updatePipeline(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const sla = buildSlaJson(data.estagios, data.sla_por_estagio)
    const update = { ...data, sla_por_estagio: sla }
    const { error } = await supabase.from('pipeline_templates').update(update).eq('id', id)
    if (error) throw error
  })
}

export async function deletePipeline(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('pipeline_templates').delete().eq('id', id)
    if (error) throw error
  })
}
