import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { ResultadosExternosClient } from './ResultadosExternosClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Resultados Externos · Núcleo Esportivo' }

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'

const SLUGS_EXTERNOS = [
  'judo-masc', 'judo-fem',
  'jiu-jitsu-masc', 'jiu-jitsu-fem',
  'atletismo-masc', 'atletismo-fem',
  'natacao-masc', 'natacao-fem',
  'xadrez',
]

export default async function ResultadosExternosPage() {
  const profile = await requireProfile()
  const canEdit = ['admin', 'coordenacao'].includes(profile.role)
  const supabase = await createClient()

  // Modalidades externas (lutas, provas, xadrez)
  const { data: modalidades } = await supabase
    .from('modalidades')
    .select('id, nome, slug, icone')
    .eq('edicao_id', EDICAO_ID)
    .in('slug', SLUGS_EXTERNOS)
    .order('nome')

  // Todas as atléticas com divisão/conferência (pra dropdown de seleção)
  const { data: atleticas } = await supabase
    .from('equipes')
    .select('id, nome, slug, divisao, conferencia, cor_primaria')
    .eq('tipo', 'atletica')
    .eq('edicao_id', EDICAO_ID)
    .order('nome')

  // Colocações existentes
  const { data: colocacoes } = await supabase
    .from('resultados_externos')
    .select('id, modalidade_id, divisao, equipe_id, colocacao, pontos, observacoes, updated_at')
    .eq('edicao_id', EDICAO_ID)
    .order('colocacao', { nullsFirst: false })

  // Anexos
  const { data: anexos } = await supabase
    .from('resultados_externos_anexos')
    .select('id, modalidade_id, divisao, storage_path, arquivo_nome, arquivo_tipo, arquivo_tamanho, descricao, created_at')
    .eq('edicao_id', EDICAO_ID)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">
      <ResultadosExternosClient
        modalidades={modalidades ?? []}
        atleticas={atleticas ?? []}
        colocacoes={colocacoes ?? []}
        anexos={anexos ?? []}
        canEdit={canEdit}
      />
    </div>
  )
}
