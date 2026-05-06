import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
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
  status_label: string
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Itaipava', span: 'half' },
  { name: 'cota', label: 'Cota', type: 'select', span: 'half', options: [{ value: 'Master', label: 'Master' }, { value: 'Ouro', label: 'Ouro' }, { value: 'Prata', label: 'Prata' }, { value: 'Apoio', label: 'Apoio' }] },
  { name: 'logo_url', label: 'Logo (URL)', type: 'text', placeholder: 'https://...' },
  { name: 'cor_marca', label: 'Cor da marca', type: 'color', span: 'half' },
  { name: 'ativo', label: 'Ativo', type: 'boolean', span: 'half', defaultValue: true },
  { name: 'contato_nome', label: 'Contato', type: 'text', span: 'half' },
  { name: 'contato_email', label: 'E-mail', type: 'email', span: 'half' },
  { name: 'contato_telefone', label: 'Telefone', type: 'text', placeholder: '(00) 00000-0000' },
  { name: 'slug', label: 'Slug', type: 'text', placeholder: 'itaipava' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const columns: ColumnDef<Patrocinador>[] = [
  { key: 'nome', label: 'Patrocinador' },
  { key: 'cota', label: 'Cota' },
  { key: 'contato_nome', label: 'Contato' },
  { key: 'contato_email', label: 'E-mail' },
  { key: 'status_label', label: 'Status' },
]

export default async function PatrocinadoresPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('patrocinadores').select('id, nome, slug, logo_url, cor_marca, cota, contato_nome, contato_email, contato_telefone, ativo').order('nome')

  const processed = (data ?? []).map((r) => ({
    ...r,
    status_label: r.ativo ? 'Ativo' : 'Inativo',
  })) as Patrocinador[]

  return (
    <CrudClient<Patrocinador>
      entityLabel="Patrocinador" entityLabelPlural="Patrocinadores"
      description="Cadastre cada patrocinador. Escopo de entregas (X stories, Y reels) será gerenciado dentro de cada um."
      columns={columns} fields={fields} data={processed}
      onCreate={createPatrocinador} onUpdate={updatePatrocinador} onDelete={deletePatrocinador}
    />
  )
}
