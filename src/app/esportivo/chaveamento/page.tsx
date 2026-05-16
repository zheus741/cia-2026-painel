import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { PageHeader } from '@/components/page-header'
import { ChaveamentoClient, type JogoChave, type Modalidade, type ChaveConfig } from './ChaveamentoClient'

/**
 * /esportivo/chaveamento
 *
 * Visualização de chaves (single elimination) gerada a partir dos jogos
 * importados via XLSX. NÃO cria nada novo — apenas agrupa por modalidade +
 * categoria + divisão e renderiza no formato bracket.
 *
 * Acessível a admin, coord, coord_esportivo, op_esportivo, e qualquer um
 * que possa ver placar (read-only).
 */
export default async function ChaveamentoPage() {
  // Auth: qualquer usuário aprovado pode ver (read-only)
  await requireProfile()

  const supabase = await createClient()

  const [{ data: jogosDB }, { data: modalidadesDB }, { data: chaveConfigsDB }] = await Promise.all([
    supabase
      .from('jogos')
      .select(`
        id, dia_id, setor_id, inicio, status, wo,
        modalidade_id, categoria, divisao, fase,
        equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome,
        placar_a, placar_b,
        modalidade:modalidades(nome, icone, slug),
        equipe_a:equipe_a_id(slug, cor_primaria, universidade, logo_url),
        equipe_b:equipe_b_id(slug, cor_primaria, universidade, logo_url)
      `)
      .neq('status', 'cancelado')
      .order('inicio', { ascending: true, nullsFirst: false }),
    supabase.from('modalidades').select('id, nome, slug, icone, categorias, divisoes').order('nome'),
    supabase.from('chave_config').select('id, modalidade_id, categoria, divisao, num_teams, seeds'),
  ])

  // Normaliza: Supabase pode devolver join como array
  const arr = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)
  type EquipeRef = { slug: string; cor_primaria: string | null; universidade: string | null; logo_url: string | null }
  type ModalidadeRef = { nome: string; icone: string; slug: string }

  const jogos: JogoChave[] = (jogosDB ?? []).map((j) => ({
    ...j,
    modalidade: arr(j.modalidade as unknown as ModalidadeRef | ModalidadeRef[] | null),
    equipe_a:   arr(j.equipe_a   as unknown as EquipeRef | EquipeRef[] | null),
    equipe_b:   arr(j.equipe_b   as unknown as EquipeRef | EquipeRef[] | null),
  }))

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">
      <PageHeader
        eyebrow="Esportivo"
        title="Chaveamento"
        subtitle={`${jogos.length} jogos importados — visualize as chaves single elimination por divisão.`}
      />

      <ChaveamentoClient
        jogos={jogos}
        modalidades={(modalidadesDB ?? []) as Modalidade[]}
        chaveConfigs={(chaveConfigsDB ?? []) as ChaveConfig[]}
      />
    </div>
  )
}
