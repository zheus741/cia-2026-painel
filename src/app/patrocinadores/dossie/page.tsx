/**
 * Dossiê de Patrocinadores — visão geral consolidada.
 *
 * Compila TODOS os patrocinadores ativos + escopo de entregas + progresso
 * num único scroll. Pensado pra a equipe abrir e ter o panorama completo
 * sem clicar ficha por ficha — "passar pra equipe" num briefing.
 *
 * Read-only. Aberto a todos autenticados.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { AppShell } from '@/components/app-shell'
import { DossieClient, type DossiePatrocinador, type DossieEscopoItem } from './DossieClient'

export default async function DossiePage() {
  await requireProfile()
  const supabase = await createClient()

  const [{ data: patData }, { data: escopoData }, { data: contData }, { data: diasData }] =
    await Promise.all([
      supabase
        .from('patrocinadores')
        .select('id, nome, slug, logo_url, cor_marca, cota, contato_nome, contato_email, contato_telefone, observacoes')
        .eq('ativo', true)
        .order('nome'),
      supabase
        .from('escopo_itens')
        .select('id, patrocinador_id, tipo_conteudo, canal, quantidade_prevista, descricao, prazo_limite, status, dia_id')
        .order('prazo_limite', { ascending: true, nullsFirst: false }),
      supabase
        .from('conteudos')
        .select('patrocinador_id, status')
        .not('patrocinador_id', 'is', null)
        .not('status', 'in', '(arquivado,cancelado)'),
      supabase
        .from('dias_evento')
        .select('id, nome_dia, data')
        .order('data'),
    ])

  const patrocinadores = (patData ?? []) as DossiePatrocinador[]
  const escopo = (escopoData ?? []) as DossieEscopoItem[]

  // Stats de conteúdos por patrocinador
  const contStats = new Map<string, { total: number; publicados: number }>()
  for (const c of (contData ?? [])) {
    const pid = c.patrocinador_id as string
    if (!contStats.has(pid)) contStats.set(pid, { total: 0, publicados: 0 })
    const s = contStats.get(pid)!
    s.total++
    if (c.status === 'publicado') s.publicados++
  }

  const diaLabels = new Map(
    (diasData ?? []).map(d => [d.id as string, (d.nome_dia as string) ?? '']),
  )

  return (
    <AppShell section="Patrocinadores" fullWidth>
      <DossieClient
        patrocinadores={patrocinadores}
        escopo={escopo}
        conteudoStats={Array.from(contStats.entries()).map(([patrocinador_id, s]) => ({
          patrocinador_id,
          ...s,
        }))}
        diaLabels={Object.fromEntries(diaLabels)}
      />
    </AppShell>
  )
}
