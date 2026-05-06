import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createTag, updateTag, deleteTag } from './actions'

interface Tag {
  id: string
  nome: string
  slug: string
  categoria: string | null
  cor_hex: string | null
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Festa do Pijama', span: 'half' },
  { name: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'festa-do-pijama', span: 'half' },
  {
    name: 'categoria', label: 'Categoria', type: 'select', span: 'half',
    options: [
      { value: 'tema', label: 'Tema' }, { value: 'formato', label: 'Formato' },
      { value: 'patrocinio', label: 'Patrocínio' }, { value: 'dia', label: 'Dia' },
      { value: 'vibe', label: 'Vibe' },
    ],
  },
  { name: 'cor_hex', label: 'Cor', type: 'color', span: 'half' },
]

const columns: ColumnDef<Tag>[] = [
  { key: 'nome', label: 'Tag' },
  { key: 'slug', label: 'Slug' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'cor_hex', label: 'Cor' },
]

export default async function TagsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('tags').select('id, nome, slug, categoria, cor_hex').order('categoria', { ascending: true }).order('nome')

  return (
    <CrudClient<Tag>
      entityLabel="Tag" entityLabelPlural="Tags"
      description="Tags pra organizar referências do moodboard. Categorias: tema, formato, patrocínio, dia, vibe."
      columns={columns} fields={fields} data={(data ?? []) as Tag[]}
      onCreate={createTag} onUpdate={updateTag} onDelete={deleteTag}
    />
  )
}
