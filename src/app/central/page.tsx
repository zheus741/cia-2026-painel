import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { CentralClient } from './CentralClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'CIA 2026 · Central de Jogos',
  description: 'Todos os resultados da Copa Inter Atléticas 2026.',
}

const JOGO_SELECT = `
  id, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome,
  placar_a, placar_b, status, wo, inicio, divisao, fase, categoria, teste,
  modalidade:modalidades(nome, icone, slug),
  setor:setores(nome),
  equipe_a:equipe_a_id(nome, slug, divisao, conferencia, cor_primaria, universidade, logo_url),
  equipe_b:equipe_b_id(nome, slug, divisao, conferencia, cor_primaria, universidade, logo_url)
`

export default async function CentralPage() {
  await requireProfile()
  const supabase = await createClient()

  const { data: jogosRaw, error } = await supabase
    .from('jogos')
    .select(JOGO_SELECT)
    .neq('status', 'cancelado')
    .neq('teste', true)
    .order('inicio', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Falha ao carregar jogos: ${error.message}`)

  // normalise Supabase join arrays
  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  type RawEquipe = {
    nome: string | null; slug: string; divisao: string | null
    conferencia: string | null; cor_primaria: string | null
    universidade: string | null; logo_url: string | null
  }
  type RawMod  = { nome: string; icone: string; slug: string }
  type RawSetor = { nome: string }

  const jogos = (jogosRaw ?? []).map(j => ({
    ...j,
    modalidade: arr(j.modalidade  as RawMod   | RawMod[]   | null),
    setor:      arr(j.setor       as RawSetor | RawSetor[] | null),
    equipe_a:   arr(j.equipe_a    as RawEquipe | RawEquipe[] | null),
    equipe_b:   arr(j.equipe_b    as RawEquipe | RawEquipe[] | null),
  }))

  return <CentralClient jogos={jogos} />
}
