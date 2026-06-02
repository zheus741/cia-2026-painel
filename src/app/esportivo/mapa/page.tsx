import { requireProfile } from '@/lib/auth/current-user'
import { createClient } from '@/lib/supabase/server'
import { MapaEsportivoLoader } from './MapaEsportivoLoader'
import type { Venue, Quadra } from './types'

export const dynamic = 'force-dynamic'

// Nome amigável pra algumas praças (a planilha usa abreviação)
const NOMES_AMIGAVEIS: Record<string, string> = {
  UIRAP: 'Uirapuru Iate Clube',
  CEMEA: 'CEMEA Boa Vista',
  CORINA: 'Ginásio Corina de Oliveira',
  UTC: 'UTC — Uberaba Tênis Clube',
  SESI: 'Clube SESI Minas',
  CIE: 'CIE — Centro de Iniciação ao Esporte',
  NENEZAO: 'Campo Nenenzão',
  UBERABAO: 'Estádio Uberabão',
}

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Prefixo comum (por palavra) entre os nomes das quadras → nome da praça. */
function prefixoComum(nomes: string[]): string {
  if (nomes.length === 1) return nomes[0]
  const tokens = nomes.map(n => n.trim().split(/\s+/))
  const min = Math.min(...tokens.map(t => t.length))
  const out: string[] = []
  for (let i = 0; i < min; i++) {
    const w = tokens[0][i]
    if (tokens.every(t => semAcento(t[i]).toUpperCase() === semAcento(w).toUpperCase())) out.push(w)
    else break
  }
  return out.join(' ') || nomes[0]
}

export default async function MapaEsportivoPage() {
  const profile = await requireProfile()
  const isAdmin = ['admin', 'coordenacao', 'coordenador_esportivo'].includes(profile.role)
  const supabase = await createClient()

  const [{ data: setoresRaw }, { data: jogosRaw }, { data: modsRaw }] = await Promise.all([
    supabase
      .from('setores')
      .select('id, nome, lat, lng, endereco, maps_url, capacidade_pessoas, tem_wifi, tem_ponto_apoio, tem_youtube_live, alimentacao, notas_acesso')
      .eq('tipo', 'esportivo'),
    supabase.from('jogos').select('setor_id, modalidade_id').not('setor_id', 'is', null),
    supabase.from('modalidades').select('id, nome'),
  ])

  const modNome = new Map<string, string>((modsRaw ?? []).map(m => [m.id as string, m.nome as string]))
  // setor_id -> set de modalidades (nome curto, sem gênero)
  const modsPorSetor = new Map<string, Set<string>>()
  for (const j of jogosRaw ?? []) {
    const sid = j.setor_id as string
    const nome = modNome.get(j.modalidade_id as string)
    if (!sid || !nome) continue
    const limpo = nome.replace(/\s*(masculin[oa]|feminin[oa]|misto|masc\.?|fem\.?)\s*$/i, '').trim()
    if (!modsPorSetor.has(sid)) modsPorSetor.set(sid, new Set())
    modsPorSetor.get(sid)!.add(limpo)
  }

  // Agrupa setores (quadras) por coordenada → praça física
  const grupos = new Map<string, typeof setoresRaw>()
  const semGeo: string[] = []
  for (const s of setoresRaw ?? []) {
    if (s.lat == null || s.lng == null) { semGeo.push(s.nome as string); continue }
    const key = `${Number(s.lat).toFixed(4)},${Number(s.lng).toFixed(4)}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(s)
  }

  const venues: Venue[] = []
  let id = 0
  for (const [key, lista] of grupos) {
    const arr = lista!
    const lat = Number(arr[0].lat), lng = Number(arr[0].lng)
    const base = prefixoComum(arr.map(s => s.nome as string)).replace(/\s+\d+$/, '').trim()
    const baseKey = semAcento(base).toUpperCase()
    const nome = NOMES_AMIGAVEIS[baseKey] ?? base
    const quadras: Quadra[] = arr
      .map(s => ({
        nome: s.nome as string,
        modalidades: [...(modsPorSetor.get(s.id as string) ?? [])].sort(),
        capacidade: (s.capacidade_pessoas as number | null) ?? null,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    const endereco = (arr.find(s => s.endereco)?.endereco as string | null) ?? null
    const maps_url = (arr.find(s => s.maps_url)?.maps_url as string | null) ?? null
    const notas = (arr.find(s => s.notas_acesso)?.notas_acesso as string | null) ?? null
    const modalidades = [...new Set(quadras.flatMap(q => q.modalidades))].sort()
    venues.push({
      id: id++, key, nome, endereco, lat, lng, maps_url, notas,
      quadras, modalidades,
      wifi: arr.some(s => s.tem_wifi),
      apoio: arr.some(s => s.tem_ponto_apoio),
      live: arr.some(s => s.tem_youtube_live),
    })
  }
  venues.sort((a, b) => b.modalidades.length - a.modalidades.length || a.nome.localeCompare(b.nome, 'pt-BR'))
  // reatribui ids estáveis após sort
  venues.forEach((v, i) => { v.id = i })

  return <MapaEsportivoLoader venues={venues} semGeo={semGeo.sort()} isAdmin={isAdmin} />
}
