'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseFormData,
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

const SCHEMA = [
  { name: 'nome',               type: 'text'          as const },
  { name: 'tipo',               type: 'text'          as const },
  { name: 'endereco',           type: 'nullable_text' as const },
  { name: 'lat',                type: 'number'        as const },
  { name: 'lng',                type: 'number'        as const },
  { name: 'capacidade_pessoas', type: 'number'        as const },
  { name: 'cor_hex',            type: 'nullable_text' as const },
  { name: 'observacoes',        type: 'nullable_text' as const },
  { name: 'maps_url',           type: 'nullable_text' as const },
  { name: 'tem_wifi',           type: 'boolean'       as const },
  { name: 'tem_ponto_apoio',    type: 'boolean'       as const },
  { name: 'alimentacao',        type: 'nullable_text' as const },
  { name: 'notas_acesso',       type: 'nullable_text' as const },
  { name: 'tem_youtube_live',   type: 'boolean'       as const },
]

export async function createSetor(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('setores').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

// Base da praça: tira os sufixos de quadra do fim do nome para agrupar as
// quadras da mesma praça (CEMEA 01..04 → CEMEA), mantendo locais distintos
// separados (SESI ≠ SESI Clube).
const STRIP_QUADRA = /^(Q\d+|V\d+|VP\d+|B\d+|\d+|F7|CAMPO|GIN[ÁA]SIO|GINASIO|VOLEI|FUTSAL|BASQUETE|HANDEBOL|OU|UIC)$/i
function baseNomePraca(nome: string): string {
  const t = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase().split(' ')
  while (t.length > 1 && STRIP_QUADRA.test(t[t.length - 1])) t.pop()
  return t.join(' ')
}

export async function updateSetor(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)

    // coordenada anterior (pra detectar se mudou)
    const { data: antes } = await supabase
      .from('setores').select('lat, lng, tipo').eq('id', id).maybeSingle()

    const { error } = await supabase.from('setores').update(data).eq('id', id)
    if (error) throw error

    // Propaga a nova coordenada pras quadras irmãs da MESMA praça que ainda não
    // têm link de Maps próprio — assim corrigir uma quadra alinha as demais.
    const lat = (data as Record<string, unknown>).lat as number | null
    const lng = (data as Record<string, unknown>).lng as number | null
    const tipo = (data as Record<string, unknown>).tipo as string | undefined
    const nome = (data as Record<string, unknown>).nome as string | undefined
    const mudou = lat != null && lng != null && (!antes || antes.lat !== lat || antes.lng !== lng)
    if (mudou && tipo === 'esportivo' && nome) {
      const base = baseNomePraca(nome)
      const { data: irmas } = await supabase
        .from('setores')
        .select('id, nome, maps_url')
        .eq('tipo', 'esportivo')
        .neq('id', id)
      const alvos = (irmas ?? []).filter(s => !s.maps_url && baseNomePraca(s.nome as string) === base)
      if (alvos.length > 0) {
        await supabase.from('setores').update({ lat, lng }).in('id', alvos.map(s => s.id))
      }
    }
  })
}

export async function deleteSetor(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('setores').delete().eq('id', id)
    if (error) throw error
  })
}
