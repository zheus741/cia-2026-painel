import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createPipeline, updatePipeline, deletePipeline } from './actions'

interface Pipeline {
  id: string
  nome: string
  tipo_conteudo: string
  patrocinado: boolean
  estagios: string[]
  sla_por_estagio: Record<string, number>
  ativo: boolean
  sla_array?: string[]
  tipo_label: string
  pipeline_label: string
  status_label: string
}

const TIPOS_CONTEUDO = [
  { value: 'story_rapido', label: 'Story rápido' }, { value: 'story_editado', label: 'Story editado' },
  { value: 'reels', label: 'Reels' }, { value: 'card_feed', label: 'Card feed' },
  { value: 'card_patrocinado', label: 'Card patrocinado' }, { value: 'texto_legenda', label: 'Texto / legenda' },
  { value: 'repost', label: 'Repost' }, { value: 'cobertura_ao_vivo', label: 'Cobertura ao vivo' },
]

const ESTAGIOS = ['captura','pesquisa','edicao_video','edicao_foto','design_arte','redacao','aprovacao_coord','aprovacao_patro','publicacao']

const ESTAGIO_LABEL: Record<string, string> = {
  captura: 'Captura', pesquisa: 'Pesquisa', edicao_video: 'Ed.Vídeo', edicao_foto: 'Ed.Foto',
  design_arte: 'Design', redacao: 'Redação', aprovacao_coord: 'Aprov.Coord', aprovacao_patro: 'Aprov.Patro', publicacao: 'Publicação',
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome do template', type: 'text', required: true, placeholder: 'Reels com aprovação' },
  { name: 'tipo_conteudo', label: 'Tipo de conteúdo', type: 'select', required: true, span: 'half', options: TIPOS_CONTEUDO },
  { name: 'patrocinado', label: 'Patrocinado', type: 'boolean', span: 'half', helper: 'Inclui aprovação do patrocinador' },
  { name: 'estagios', label: 'Estágios (em ordem)', type: 'tags', required: true, placeholder: 'captura, edicao_video, publicacao', helper: `Use os slugs: ${ESTAGIOS.join(', ')}` },
  { name: 'sla_array', label: 'SLA por estágio (min, na mesma ordem)', type: 'tags', placeholder: '0, 20, 10', helper: 'Ex: 0 = imediato. Mesma ordem dos estágios.' },
  { name: 'ativo', label: 'Ativo', type: 'boolean', defaultValue: true },
]

const columns: ColumnDef<Pipeline>[] = [
  { key: 'nome', label: 'Template' },
  { key: 'tipo_label', label: 'Tipo' },
  { key: 'pipeline_label', label: 'Pipeline' },
  { key: 'status_label', label: 'Status' },
]

export default async function PipelinesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('pipeline_templates').select('id, nome, tipo_conteudo, patrocinado, estagios, sla_por_estagio, ativo').order('nome')

  const processed = (data ?? []).map((p) => ({
    ...p,
    sla_array: (p.estagios as string[]).map((s) => String((p.sla_por_estagio as Record<string, number>)?.[s] ?? 0)),
    tipo_label: TIPOS_CONTEUDO.find((t) => t.value === p.tipo_conteudo)?.label ?? p.tipo_conteudo,
    pipeline_label: (p.estagios as string[]).map((s) => ESTAGIO_LABEL[s] ?? s).join(' → '),
    status_label: p.ativo ? 'Ativo' : 'Inativo',
  })) as Pipeline[]

  return (
    <CrudClient<Pipeline>
      entityLabel="Pipeline" entityLabelPlural="Pipeline templates"
      description="Defina os estágios pelos quais cada tipo de peça passa. SLA é tempo-alvo por estágio."
      columns={columns} fields={fields} data={processed}
      onCreate={createPipeline} onUpdate={updatePipeline} onDelete={deletePipeline}
    />
  )
}
