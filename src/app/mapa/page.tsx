import { createClient } from '@/lib/supabase/server'
import { MapaEsportivoClient, type VenueEsportivo } from './MapaEsportivoClient'

export const dynamic = 'force-dynamic'

export default async function MapaPage() {
  const supabase = await createClient()

  // Locais esportivos REAIS = setores onde há jogos. Para cada um, as
  // modalidades que acontecem ali.
  const { data: jogos } = await supabase
    .from('jogos')
    .select('setor:setores(id, nome), modalidade:modalidades(nome)')
    .not('setor_id', 'is', null)

  type Row = {
    setor: { id: string; nome: string } | { id: string; nome: string }[] | null
    modalidade: { nome: string } | { nome: string }[] | null
  }
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)

  const mapa = new Map<string, { nome: string; modalidades: Set<string> }>()
  for (const r of (jogos ?? []) as Row[]) {
    const setor = one(r.setor)
    if (!setor) continue
    const mod = one(r.modalidade)
    if (!mapa.has(setor.id)) mapa.set(setor.id, { nome: setor.nome, modalidades: new Set() })
    if (mod?.nome) mapa.get(setor.id)!.modalidades.add(mod.nome)
  }

  const venues: VenueEsportivo[] = [...mapa.entries()]
    .map(([id, v]) => ({ id, nome: v.nome, modalidades: [...v.modalidades].sort() }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return <MapaEsportivoClient venues={venues} />
}
