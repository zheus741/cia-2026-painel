/**
 * Visualização pública (interna) de patrocinadores.
 *
 * Aberto a TODOS os autenticados (operadores, líderes, coordenação e admin).
 * Read-only — para gerenciar use /admin/patrocinadores (admin + coordenação).
 *
 * As server actions originais ficam em /admin/patrocinadores/actions.ts e já
 * têm guard `requireCoordOrAdmin` server-side, então mesmo se passar callbacks
 * "vazias" aqui, a defesa em profundidade tá preservada.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { AppShell } from '@/components/app-shell'
import { FicharioClient, type PatrocinadorRow, type ConteudoStat } from '../admin/patrocinadores/FicharioClient'

// Noop callbacks: read-only não usa, mas o tipo de FicharioClient exige.
async function noop(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: 'Sem permissão.' }
}

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
        onCreate={noop}
        onUpdate={noop as never}
        onDelete={noop as never}
        canEdit={false}
        detailHref={(id) => `/patrocinadores/${id}`}
      />
    </AppShell>
  )
}
