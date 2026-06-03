export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { setEscopoStatus, setEscopoStatusBulk } from './actions'
import { EntregaRapidaClient, type MarcaEntrega, type ItemEntrega } from './EntregaRapidaClient'

export default async function EntregaRapidaPage() {
  const profile = await requireProfile()
  if (!['admin', 'coordenacao'].includes(profile.role)) {
    redirect('/')
  }

  const supabase = await createClient()
  const [{ data: patData }, { data: escopoData }] = await Promise.all([
    supabase
      .from('patrocinadores')
      .select('id, nome, logo_url, cor_marca')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('escopo_itens')
      .select('id, patrocinador_id, tipo_conteudo, canal, descricao, quantidade_prevista, status, prazo_limite')
      .order('prazo_limite', { nullsFirst: false }),
  ])

  const itensPorMarca = new Map<string, ItemEntrega[]>()
  for (const e of (escopoData ?? [])) {
    const pid = e.patrocinador_id as string
    if (!pid) continue
    const arr = itensPorMarca.get(pid) ?? []
    arr.push({
      id: e.id as string,
      tipo_conteudo: (e.tipo_conteudo as string | null) ?? null,
      canal: (e.canal as string | null) ?? null,
      descricao: (e.descricao as string | null) ?? null,
      quantidade_prevista: (e.quantidade_prevista as number | null) ?? 1,
      status: (e.status as string | null) ?? 'pendente',
      prazo_limite: (e.prazo_limite as string | null) ?? null,
    })
    itensPorMarca.set(pid, arr)
  }

  // Só marcas que têm escopo cadastrado (não dá pra "entregar" o que não foi contratado).
  const marcas: MarcaEntrega[] = (patData ?? [])
    .map((p) => ({
      id: p.id as string,
      nome: p.nome as string,
      logo_url: (p.logo_url as string | null) ?? null,
      cor_marca: (p.cor_marca as string | null) ?? null,
      itens: itensPorMarca.get(p.id as string) ?? [],
    }))
    .filter((m) => m.itens.length > 0)

  return (
    <EntregaRapidaClient
      marcas={marcas}
      setStatus={setEscopoStatus}
      setStatusBulk={setEscopoStatusBulk}
    />
  )
}
