export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createPatrocinador, updatePatrocinador, deletePatrocinador } from './actions'
import { FicharioClient, type PatrocinadorRow, type ConteudoStat } from './FicharioClient'

export default async function PatrocinadoresPage() {
  const supabase = await createClient()

  const [{ data: patData }, { data: contData }] = await Promise.all([
    supabase
      .from('patrocinadores')
      .select('id, nome, slug, logo_url, cor_marca, cota, contato_nome, contato_email, contato_telefone, observacoes, ativo')
      .order('nome'),
    supabase
      .from('conteudos')
      .select('patrocinador_id, status')
      .not('patrocinador_id', 'is', null)
      .not('status', 'in', '(arquivado,cancelado)'),
  ])

  const patrocinadores = (patData ?? []) as PatrocinadorRow[]

  // Build per-sponsor stats
  const statsMap = new Map<string, { publicados: number; em_producao: number; total: number }>()
  for (const row of (contData ?? [])) {
    const pid = row.patrocinador_id as string
    if (!statsMap.has(pid)) statsMap.set(pid, { publicados: 0, em_producao: 0, total: 0 })
    const s = statsMap.get(pid)!
    s.total++
    if (row.status === 'publicado') s.publicados++
    if (['em_andamento', 'pendente', 'pausado', 'em_producao'].includes(row.status)) s.em_producao++
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
    />
  )
}
