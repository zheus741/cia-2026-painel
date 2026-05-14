import { createClient } from '@/lib/supabase/server'
import { type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createEquipe, updateEquipe, deleteEquipe } from './actions'
import { EquipesClient } from './EquipesClient'

interface Equipe {
  id: string
  nome: string
  slug: string | null
  tipo: string
  divisao: string | null
  universidade: string | null
  logo_url: string | null
  cor_primaria: string | null
  tipo_label: string
}

const TIPO_LABEL: Record<string, string> = {
  atletica: 'Atlética', cheer: 'Cheer', bateria: 'Bateria',
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'ENGENHARIA UFU' },
  {
    name: 'tipo', label: 'Tipo', type: 'select', required: true, span: 'half',
    options: [
      { value: 'atletica', label: 'Atlética' }, { value: 'cheer', label: 'Cheer' }, { value: 'bateria', label: 'Bateria' },
    ],
  },
  { name: 'divisao', label: 'Divisão / Nível', type: 'text', placeholder: '1ª Divisão / COED 2.1', span: 'half' },
  { name: 'universidade', label: 'Universidade', type: 'text', placeholder: 'UFU', span: 'half' },
  { name: 'cor_primaria', label: 'Cor primária', type: 'color', span: 'half' },
  { name: 'logo_url', label: 'Logo (URL)', type: 'text', placeholder: 'https://...' },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'eng-ufu' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const columns: ColumnDef<Equipe>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'tipo_label', label: 'Tipo' },
  { key: 'divisao', label: 'Divisão' },
  { key: 'universidade', label: 'Universidade' },
]

export default async function EquipesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('equipes').select('id, nome, slug, tipo, divisao, universidade, logo_url, cor_primaria').order('nome')

  const processed = (data ?? []).map((r) => ({
    ...r,
    tipo_label: TIPO_LABEL[r.tipo] ?? r.tipo,
  })) as Equipe[]

  return (
    <EquipesClient
      data={processed}
      fields={fields}
      columns={columns}
      onCreate={createEquipe}
      onUpdate={updateEquipe}
      onDelete={deleteEquipe}
    />
  )
}
