export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { createPatrocinador, updatePatrocinador, deletePatrocinador } from './actions'
import { FicharioClient, type PatrocinadorRow, type ConteudoStat } from './FicharioClient'

export default async function PatrocinadoresPage() {
  const supabase = await createClient()

  const [profile, { data: patData }, { data: escopoData }] = await Promise.all([
    requireProfile(),
    supabase
      .from('patrocinadores')
      .select('id, nome, slug, logo_url, cor_marca, cota, contato_nome, contato_email, contato_telefone, observacoes, ativo')
      .order('nome'),
    // FONTE ÚNICA: % entregue por escopo contratado (igual home/TV/dossiê)
    supabase.from('escopo_itens').select('patrocinador_id, quantidade_prevista, status'),
  ])

  const patrocinadores = (patData ?? []) as PatrocinadorRow[]
  const canEdit = ['admin', 'coordenacao'].includes(profile.role)

  // Stats por patrocinador a partir do ESCOPO: total = unidades contratadas,
  // publicados = unidades entregues, em_producao = unidades em produção.
  const statsMap = new Map<string, { publicados: number; em_producao: number; total: number }>()
  for (const row of (escopoData ?? [])) {
    const pid = row.patrocinador_id as string
    if (!pid) continue
    if (!statsMap.has(pid)) statsMap.set(pid, { publicados: 0, em_producao: 0, total: 0 })
    const s = statsMap.get(pid)!
    const q = (row.quantidade_prevista as number | null) ?? 1
    s.total += q
    if (row.status === 'entregue')    s.publicados  += q
    if (row.status === 'em_producao') s.em_producao += q
  }

  const conteudoStats: ConteudoStat[] = Array.from(statsMap.entries()).map(([patrocinador_id, s]) => ({
    patrocinador_id,
    ...s,
  }))

  return (
    <FicharioClient
      patrocinadores={patrocinadores}
      conteudoStats={conteudoStats}
      onCreate={createPatrocinador}
      onUpdate={updatePatrocinador}
      onDelete={deletePatrocinador}
      canEdit={canEdit}
      dossieHref="/patrocinadores/dossie"
    />
  )
}
