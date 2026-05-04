import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createEquipe, updateEquipe, deleteEquipe } from './actions'

interface Equipe {
  id: string
  nome: string
  slug: string | null
  tipo: 'atletica' | 'cheer' | 'bateria'
  divisao: string | null
  universidade: string | null
  logo_url: string | null
  cor_primaria: string | null
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'ENGENHARIA UFU' },
  {
    name: 'tipo',
    label: 'Tipo',
    type: 'select',
    required: true,
    span: 'half',
    options: [
      { value: 'atletica', label: 'Atlética' },
      { value: 'cheer', label: 'Cheer' },
      { value: 'bateria', label: 'Bateria' },
    ],
  },
  { name: 'divisao', label: 'Divisão / Nível', type: 'text', placeholder: '1ª Divisão / COED 2.1', span: 'half' },
  { name: 'universidade', label: 'Universidade', type: 'text', placeholder: 'UFU', span: 'half' },
  { name: 'cor_primaria', label: 'Cor primária', type: 'color', span: 'half' },
  { name: 'logo_url', label: 'Logo (URL)', type: 'text', placeholder: 'https://...' },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'eng-ufu' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const tipoBadge: Record<string, { variant: 'default' | 'accent' | 'success' | 'warning' | 'secondary'; label: string }> = {
  atletica: { variant: 'success', label: 'Atlética' },
  cheer: { variant: 'accent', label: 'Cheer' },
  bateria: { variant: 'warning', label: 'Bateria' },
}

const columns: ColumnDef<Equipe>[] = [
  {
    key: 'nome',
    label: 'Nome',
    render: (r) => (
      <div className="flex items-center gap-2">
        {r.cor_primaria && (
          <span
            className="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
            style={{ background: r.cor_primaria }}
          />
        )}
        <span className="font-medium">{r.nome}</span>
      </div>
    ),
  },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (r) => {
      const t = tipoBadge[r.tipo]
      return <Badge variant={t.variant}>{t.label}</Badge>
    },
  },
  { key: 'divisao', label: 'Divisão' },
  { key: 'universidade', label: 'Universidade' },
]

export default async function EquipesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('equipes')
    .select('id, nome, slug, tipo, divisao, universidade, logo_url, cor_primaria')
    .order('nome')

  return (
    <CrudClient<Equipe>
      entityLabel="Equipe"
      entityLabelPlural="Equipes"
      description="Atléticas, baterias e times de cheer participantes. Já carregamos 32 atléticas no seed."
      columns={columns}
      fields={fields}
      data={(data ?? []) as Equipe[]}
      onCreate={createEquipe}
      onUpdate={updateEquipe}
      onDelete={deleteEquipe}
    />
  )
}
