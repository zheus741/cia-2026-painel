import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createPatrocinador, updatePatrocinador, deletePatrocinador } from './actions'

interface Patrocinador {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  cor_marca: string | null
  cota: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  ativo: boolean
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Itaipava', span: 'half' },
  {
    name: 'cota',
    label: 'Cota',
    type: 'select',
    span: 'half',
    options: [
      { value: 'Master', label: 'Master' },
      { value: 'Ouro', label: 'Ouro' },
      { value: 'Prata', label: 'Prata' },
      { value: 'Apoio', label: 'Apoio' },
    ],
  },
  { name: 'logo_url', label: 'Logo (URL)', type: 'text', placeholder: 'https://...' },
  { name: 'cor_marca', label: 'Cor da marca', type: 'color', span: 'half' },
  { name: 'ativo', label: 'Ativo', type: 'boolean', span: 'half', defaultValue: true },
  { name: 'contato_nome', label: 'Contato', type: 'text', span: 'half' },
  { name: 'contato_email', label: 'E-mail', type: 'email', span: 'half' },
  { name: 'contato_telefone', label: 'Telefone', type: 'text', placeholder: '(00) 00000-0000' },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'itaipava' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const cotaBadge: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'secondary'> = {
  Master: 'default',
  Ouro: 'accent',
  Prata: 'secondary',
  Apoio: 'secondary',
}

const columns: ColumnDef<Patrocinador>[] = [
  {
    key: 'nome',
    label: 'Patrocinador',
    render: (r) => (
      <div className="flex items-center gap-2">
        {r.cor_marca && (
          <span
            className="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
            style={{ background: r.cor_marca }}
          />
        )}
        <span className="font-medium">{r.nome}</span>
      </div>
    ),
  },
  {
    key: 'cota',
    label: 'Cota',
    render: (r) =>
      r.cota ? <Badge variant={cotaBadge[r.cota] ?? 'secondary'}>{r.cota}</Badge> : '—',
  },
  { key: 'contato_nome', label: 'Contato' },
  { key: 'contato_email', label: 'E-mail' },
  {
    key: 'ativo',
    label: 'Status',
    render: (r) =>
      r.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>,
  },
]

export default async function PatrocinadoresPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('patrocinadores')
    .select('id, nome, slug, logo_url, cor_marca, cota, contato_nome, contato_email, contato_telefone, ativo')
    .order('nome')

  return (
    <CrudClient<Patrocinador>
      entityLabel="Patrocinador"
      entityLabelPlural="Patrocinadores"
      description="Cadastre cada patrocinador. Escopo de entregas (X stories, Y reels) será gerenciado dentro de cada um."
      columns={columns}
      fields={fields}
      data={(data ?? []) as Patrocinador[]}
      onCreate={createPatrocinador}
      onUpdate={updatePatrocinador}
      onDelete={deletePatrocinador}
    />
  )
}
