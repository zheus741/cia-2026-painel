import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createPipeline, updatePipeline, deletePipeline } from './actions'

interface Pipeline {
  id: string
  nome: string
  tipo_conteudo: string
  patrocinado: boolean
  estagios: string[]
  sla_por_estagio: Record<string, number>
  ativo: boolean
  // Para o form: derivado, lista de slas na mesma ordem dos estágios
  sla_array?: string[]
}

const TIPOS_CONTEUDO = [
  { value: 'story_rapido', label: 'Story rápido' },
  { value: 'story_editado', label: 'Story editado' },
  { value: 'reels', label: 'Reels' },
  { value: 'card_feed', label: 'Card feed' },
  { value: 'card_patrocinado', label: 'Card patrocinado' },
  { value: 'texto_legenda', label: 'Texto / legenda' },
  { value: 'repost', label: 'Repost' },
  { value: 'cobertura_ao_vivo', label: 'Cobertura ao vivo' },
]

const ESTAGIOS = [
  'captura',
  'pesquisa',
  'edicao_video',
  'edicao_foto',
  'design_arte',
  'redacao',
  'aprovacao_coord',
  'aprovacao_patro',
  'publicacao',
]

const ESTAGIO_LABEL: Record<string, string> = {
  captura: 'Captura',
  pesquisa: 'Pesquisa',
  edicao_video: 'Edição vídeo',
  edicao_foto: 'Edição foto',
  design_arte: 'Design arte',
  redacao: 'Redação',
  aprovacao_coord: 'Aprov. coord',
  aprovacao_patro: 'Aprov. patro',
  publicacao: 'Publicação',
}

export default async function PipelinesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pipeline_templates')
    .select('id, nome, tipo_conteudo, patrocinado, estagios, sla_por_estagio, ativo')
    .order('nome')

  // mapeia sla_por_estagio (json) → sla_array (mesma ordem de estagios) pro form editar
  const enriched = (data ?? []).map((p) => ({
    ...p,
    sla_array: (p.estagios as string[]).map((s) =>
      String((p.sla_por_estagio as Record<string, number>)?.[s] ?? 0),
    ),
  })) as Pipeline[]

  const fields: FieldDef[] = [
    { name: 'nome', label: 'Nome do template', type: 'text', required: true, placeholder: 'Reels com aprovação' },
    {
      name: 'tipo_conteudo',
      label: 'Tipo de conteúdo',
      type: 'select',
      required: true,
      span: 'half',
      options: TIPOS_CONTEUDO,
    },
    {
      name: 'patrocinado',
      label: 'Patrocinado',
      type: 'boolean',
      span: 'half',
      helper: 'Inclui aprovação do patrocinador',
    },
    {
      name: 'estagios',
      label: 'Estágios (em ordem)',
      type: 'tags',
      required: true,
      placeholder: 'captura, edicao_video, publicacao',
      helper: `Use os slugs: ${ESTAGIOS.join(', ')}`,
    },
    {
      name: 'sla_array',
      label: 'SLA por estágio (min, na mesma ordem)',
      type: 'tags',
      placeholder: '0, 20, 10',
      helper: 'Ex: 0 = imediato. Mesma ordem dos estágios.',
    },
    { name: 'ativo', label: 'Ativo', type: 'boolean', defaultValue: true },
  ]

  const columns: ColumnDef<Pipeline>[] = [
    { key: 'nome', label: 'Template' },
    {
      key: 'tipo_conteudo',
      label: 'Tipo',
      render: (r) => (
        <Badge variant="secondary">
          {TIPOS_CONTEUDO.find((t) => t.value === r.tipo_conteudo)?.label ?? r.tipo_conteudo}
        </Badge>
      ),
    },
    {
      key: 'estagios',
      label: 'Pipeline',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1">
          {r.estagios.map((s, i) => (
            <span key={`${s}-${i}`} className="inline-flex items-center gap-1">
              <Badge variant="outline" className="text-[10px]">
                {ESTAGIO_LABEL[s] ?? s}
                <span className="ml-1 text-[var(--muted-foreground)]">
                  {(r.sla_por_estagio?.[s] ?? 0)}m
                </span>
              </Badge>
              {i < r.estagios.length - 1 && <span className="text-[var(--muted-foreground)]">→</span>}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'patrocinado',
      label: 'Patro',
      render: (r) => r.patrocinado ? <Badge variant="accent">Patrocinado</Badge> : '—',
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (r) => r.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>,
    },
  ]

  // injeta sla_array na "edicao" do form: precisamos converter no salvamento — já fazemos no actions.ts
  // mas pra renderizar no form, o estado inicial vem de sla_array (campo virtual)
  // Como CrudClient pega o valor de row[fieldName], setamos o sla_array enriched acima.

  return (
    <CrudClient<Pipeline>
      entityLabel="Pipeline"
      entityLabelPlural="Pipeline templates"
      description="Defina os estágios pelos quais cada tipo de peça passa. SLA é tempo-alvo por estágio."
      columns={columns}
      fields={fields}
      data={enriched}
      onCreate={createPipeline}
      onUpdate={updatePipeline}
      onDelete={deletePipeline}
    />
  )
}
