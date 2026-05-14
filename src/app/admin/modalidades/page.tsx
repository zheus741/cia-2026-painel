import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createModalidade, updateModalidade, deleteModalidade } from './actions'

interface Modalidade {
  id: string
  nome: string
  slug: string
  icone: string | null
  categorias: string[] | null
  divisoes: string[] | null
  nome_icone: string
  categorias_label: string
  divisoes_label: string
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Basquete', span: 'half' },
  { name: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'basquete', helper: 'Identificador único, lowercase, sem espaços', span: 'half' },
  { name: 'icone', label: 'Ícone (emoji)', type: 'text', placeholder: '🏀', span: 'half' },
  { name: 'categorias', label: 'Categorias', type: 'tags', placeholder: 'Masculino, Feminino', helper: 'Separe por vírgula' },
  { name: 'divisoes', label: 'Divisões', type: 'tags', placeholder: '1ª Divisão, 2ª Divisão', helper: 'Separe por vírgula' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const columns: ColumnDef<Modalidade>[] = [
  { key: 'nome_icone', label: 'Modalidade' },
  { key: 'slug', label: 'Slug' },
  { key: 'categorias_label', label: 'Categorias' },
  { key: 'divisoes_label', label: 'Divisões' },
]

export default async function ModalidadesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('modalidades').select('id, nome, slug, icone, categorias, divisoes').order('nome')

  const processed = (data ?? []).map((r) => ({
    ...r,
    nome_icone: r.icone ? `${r.icone} ${r.nome}` : r.nome,
    categorias_label: r.categorias?.join(', ') ?? '—',
    divisoes_label: r.divisoes?.join(', ') ?? '—',
  })) as Modalidade[]

  return (
    <CrudClient<Modalidade>
      entityLabel="Modalidade" entityLabelPlural="Modalidades"
      eyebrow="Esportivo"
      description="Modalidades esportivas + Cheer + Bateria. Cada uma com categorias e/ou divisões."
      columns={columns} fields={fields} data={processed}
      onCreate={createModalidade} onUpdate={updateModalidade} onDelete={deleteModalidade}
    />
  )
}
