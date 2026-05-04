import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createModalidade, updateModalidade, deleteModalidade } from './actions'

interface Modalidade {
  id: string
  nome: string
  slug: string
  icone: string | null
  categorias: string[] | null
  divisoes: string[] | null
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Basquete', span: 'half' },
  { name: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'basquete', helper: 'Identificador único, lowercase, sem espaços', span: 'half' },
  { name: 'icone', label: 'Ícone (emoji)', type: 'text', placeholder: '🏀', span: 'half' },
  {
    name: 'categorias',
    label: 'Categorias',
    type: 'tags',
    placeholder: 'Masculino, Feminino',
    helper: 'Separe por vírgula',
  },
  {
    name: 'divisoes',
    label: 'Divisões',
    type: 'tags',
    placeholder: '1ª Divisão, 2ª Divisão',
    helper: 'Separe por vírgula',
  },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const columns: ColumnDef<Modalidade>[] = [
  {
    key: 'nome',
    label: 'Modalidade',
    render: (r) => (
      <div className="flex items-center gap-2">
        <span className="text-lg">{r.icone}</span>
        <span className="font-medium">{r.nome}</span>
      </div>
    ),
  },
  { key: 'slug', label: 'Slug', render: (r) => <span className="font-mono text-xs">{r.slug}</span> },
  {
    key: 'categorias',
    label: 'Categorias',
    render: (r) =>
      r.categorias?.length ? (
        <div className="flex flex-wrap gap-1">
          {r.categorias.map((c) => (
            <Badge key={c} variant="secondary">{c}</Badge>
          ))}
        </div>
      ) : '—',
  },
  {
    key: 'divisoes',
    label: 'Divisões',
    render: (r) =>
      r.divisoes?.length ? (
        <div className="flex flex-wrap gap-1">
          {r.divisoes.map((d) => (
            <Badge key={d} variant="accent">{d}</Badge>
          ))}
        </div>
      ) : '—',
  },
]

export default async function ModalidadesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('modalidades')
    .select('id, nome, slug, icone, categorias, divisoes')
    .order('nome')

  return (
    <CrudClient<Modalidade>
      entityLabel="Modalidade"
      entityLabelPlural="Modalidades"
      description="Modalidades esportivas + Cheer + Bateria. Cada uma com categorias e/ou divisões."
      columns={columns}
      fields={fields}
      data={(data ?? []) as Modalidade[]}
      onCreate={createModalidade}
      onUpdate={updateModalidade}
      onDelete={deleteModalidade}
    />
  )
}
