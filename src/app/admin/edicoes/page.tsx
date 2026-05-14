import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createEdicao, updateEdicao, deleteEdicao } from './actions'

interface Edicao {
  id: string
  nome: string
  ano: number
  cidade: string | null
  data_inicio: string
  data_fim: string
  ativa: boolean
  periodo: string
  status_text: string
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'CIA 2026', span: 'half' },
  { name: 'ano', label: 'Ano', type: 'number', required: true, placeholder: '2026', span: 'half' },
  { name: 'cidade', label: 'Cidade', type: 'text', placeholder: 'Uberaba', span: 'half' },
  { name: 'ativa', label: 'Ativa', type: 'boolean', helper: 'Edição em curso', span: 'half' },
  { name: 'data_inicio', label: 'Data início', type: 'date', required: true, span: 'half' },
  { name: 'data_fim', label: 'Data fim', type: 'date', required: true, span: 'half' },
]

const columns: ColumnDef<Edicao>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'periodo', label: 'Período' },
  { key: 'status_text', label: 'Status' },
]

export default async function EdicoesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('edicoes').select('id, nome, ano, cidade, data_inicio, data_fim, ativa').order('ano', { ascending: false })

  const processed = (data ?? []).map((r) => ({
    ...r,
    periodo: `${r.data_inicio} → ${r.data_fim}`,
    status_text: r.ativa ? 'Ativa' : 'Inativa',
  })) as Edicao[]

  return (
    <CrudClient<Edicao>
      entityLabel="Edição" entityLabelPlural="Edições"
      eyebrow="Gestão"
      description="Cada edição é um evento (ano). A ativa é a fonte das demais entidades."
      columns={columns} fields={fields} data={processed}
      onCreate={createEdicao} onUpdate={updateEdicao} onDelete={deleteEdicao}
    />
  )
}
