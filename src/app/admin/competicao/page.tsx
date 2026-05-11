import { createClient } from '@/lib/supabase/server'
import CompeticaoClient from './CompeticaoClient'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Competição · Admin · CIA 2026' }

export default async function CompeticaoPage() {
  const supabase = await createClient()

  const [atleticasRes, inscricoesRes, modalidadesRes] = await Promise.all([
    supabase
      .from('equipes')
      .select('id, nome, slug, divisao, conferencia, seed, universidade')
      .eq('tipo', 'atletica')
      .order('divisao', { ascending: true, nullsFirst: false })
      .order('seed', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true }),
    supabase
      .from('inscricoes')
      .select(
        'id, equipe_id, modalidade_id, categoria, divisao, conferencia, cabeca_chave, equipes:equipe_id(nome,slug), modalidades:modalidade_id(nome,icone,slug)',
      ),
    supabase
      .from('modalidades')
      .select('id, nome, slug, icone')
      .order('nome', { ascending: true }),
  ])

  const rawInscricoes = inscricoesRes.data

  type RawEquipe = { nome: string; slug: string }
  type RawMod = { nome: string; icone: string | null; slug: string }

  const inscricoes = (rawInscricoes ?? []).map((r: {
    id: string; equipe_id: string; modalidade_id: string
    categoria: string; divisao: string; conferencia: string | null
    cabeca_chave: 1 | 2 | null
    equipes: RawEquipe | RawEquipe[] | null
    modalidades: RawMod | RawMod[] | null
  }) => {
    const eq = Array.isArray(r.equipes) ? r.equipes[0] : r.equipes
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    return {
      id: r.id, equipe_id: r.equipe_id, modalidade_id: r.modalidade_id,
      categoria: r.categoria, divisao: r.divisao, conferencia: r.conferencia,
      cabeca_chave: r.cabeca_chave,
      equipe_nome: eq?.nome ?? '?', equipe_slug: eq?.slug ?? '',
      modalidade_nome: mod?.nome ?? '?', modalidade_icone: mod?.icone ?? null,
      modalidade_slug: mod?.slug ?? '',
    }
  })

  return (
    <CompeticaoClient
      atleticas={atleticasRes.data ?? []}
      inscricoes={inscricoes}
      modalidades={modalidadesRes.data ?? []}
    />
  )
}
