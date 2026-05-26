/**
 * Visualização pública (interna) de patrocinadores.
 *
 * Aberto a TODOS os autenticados (operadores, líderes, coordenação e admin).
 * Read-only — para gerenciar use /admin/patrocinadores (admin + coordenação).
 *
 * Passa as server actions reais (já com guard requireCoordOrAdmin) por dois motivos:
 *  - Funções comuns não podem cruzar Server→Client em RSC (precisa ser 'use server')
 *  - Defesa em profundidade: mesmo se algum botão de edição escapar do canEdit=false,
 *    a server action recusa server-side
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { AppShell } from '@/components/app-shell'
import { FicharioClient, type PatrocinadorRow, type ConteudoStat } from '../admin/patrocinadores/FicharioClient'
import { createPatrocinador, updatePatrocinador, deletePatrocinador } from '../admin/patrocinadores/actions'

export default async function PatrocinadoresPublicoPage() {
  await requireProfile()
  const supabase = await createClient()

  const [{ data: patData }, { data: contData }] = await Promise.all([
    supabase
      .from('patrocinadores')
      .select('id, nome, slug, logo_url, cor_marca, cota, contato_nome, contato_email, contato_telefone, observacoes, ativo')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('conteudos')
      .select('patrocinador_id, status')
      .not('patrocinador_id', 'is', null)
      .not('status', 'in', '(arquivado,cancelado)'),
  ])

  const patrocinadores = (patData ?? []) as PatrocinadorRow[]

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
    <AppShell section="Patrocinadores">
      <FicharioClient
        patrocinadores={patrocinadores}
        conteudoStats={conteudoStats}
        onCreate={createPatrocinador}
        onUpdate={updatePatrocinador}
        onDelete={deletePatrocinador}
        canEdit={false}
        detailHrefPrefix="/patrocinadores"
      />
    </AppShell>
  )
}
