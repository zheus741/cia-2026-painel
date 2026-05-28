import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { aggregatePracas } from '@/lib/competicao/pracas'
import { findLocalBySlug } from '@/lib/competicao/pracas-grupos'
import { AppShell } from '@/components/app-shell'
import { PracaPerfilClient } from './PracaPerfilClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  return {
    title: `Praça · ${slug.toUpperCase()} · CIA 2026`,
  }
}

export default async function PracaPerfilPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetches paralelos: setores, jogos completos, atléticas
  const [
    { data: setores },
    { data: jogos },
    { data: atleticas },
  ] = await Promise.all([
    supabase
      .from('setores')
      .select('id, nome, cor_hex')
      .eq('tipo', 'esportivo'),
    supabase
      .from('jogos')
      .select(`
        id, modalidade_id, categoria, divisao, fase,
        setor_id, inicio, fim_previsto, status,
        placar_a, placar_b, wo,
        equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome,
        modalidades:modalidade_id(nome, icone)
      `)
      .order('inicio', { ascending: true, nullsFirst: false }),
    supabase
      .from('equipes')
      .select('id, nome, slug, cor_primaria, divisao, conferencia')
      .eq('tipo', 'atletica'),
  ])

  // Agrega praças (quadras individuais)
  const pracas = aggregatePracas(
    (setores ?? []) as Array<{ id: string; nome: string; cor_hex: string | null }>,
    (jogos ?? []) as Array<{
      setor_id: string | null
      status:   string | null
      inicio:   string | null
      equipe_a_id: string | null
      equipe_b_id: string | null
      modalidades: { nome: string; icone: string | null } | { nome: string; icone: string | null }[] | null
    }>,
    (atleticas ?? []) as Array<{ id: string; nome: string; slug: string; cor_primaria: string | null }>,
  )

  // Encontra o local físico (agrupado)
  const local = findLocalBySlug(pracas, slug)
  if (!local) notFound()

  // Jogos detalhados deste local (todas as quadras dele) — pra timeline
  const quadrasIds = new Set(local.quadras.map(q => q.id))
  type JogoRaw = {
    id: string; modalidade_id: string; categoria: string | null; divisao: string | null
    fase: string | null; setor_id: string | null; inicio: string | null; fim_previsto: string | null
    status: string | null; placar_a: number | null; placar_b: number | null
    wo: 'a' | 'b' | 'duplo' | null
    equipe_a_id: string | null; equipe_b_id: string | null
    equipe_a_nome: string | null; equipe_b_nome: string | null
    modalidades: { nome: string; icone: string | null } | { nome: string; icone: string | null }[] | null
  }

  // Mapa setor_id → nome da quadra
  const setoresMap = new Map((setores ?? []).map(s => [s.id, s.nome as string]))

  const jogosDoLocal = ((jogos as JogoRaw[]) ?? [])
    .filter(j => j.setor_id && quadrasIds.has(j.setor_id))
    .map(j => {
      const mod = Array.isArray(j.modalidades) ? j.modalidades[0] : j.modalidades
      return {
        id:            j.id,
        setor_id:      j.setor_id,
        setor_nome:    j.setor_id ? (setoresMap.get(j.setor_id) ?? '—') : '—',
        modalidade:    mod?.nome ?? null,
        modalidade_icone: mod?.icone ?? null,
        categoria:     j.categoria,
        divisao:       j.divisao,
        fase:          j.fase,
        inicio:        j.inicio,
        fim_previsto:  j.fim_previsto,
        status:        j.status,
        placar_a:      j.placar_a,
        placar_b:      j.placar_b,
        wo:            j.wo,
        equipe_a_id:   j.equipe_a_id,
        equipe_b_id:   j.equipe_b_id,
        equipe_a_nome: j.equipe_a_nome,
        equipe_b_nome: j.equipe_b_nome,
      }
    })

  return (
    <AppShell section={local.nome} fullWidth>
      <div className="mx-auto w-full max-w-[1640px] px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">
        <PracaPerfilClient local={local} jogos={jogosDoLocal} />
      </div>
    </AppShell>
  )
}
