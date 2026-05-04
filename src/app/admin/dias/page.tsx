import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createDia, updateDia, deleteDia } from './actions'

interface Dia {
  id: string
  data: string
  nome_dia: string
  tema: string | null
  observacoes: string | null
}

const fields: FieldDef[] = [
  { name: 'data', label: 'Data', type: 'date', required: true, span: 'half' },
  {
    name: 'nome_dia',
    label: 'Nome do dia',
    type: 'select',
    required: true,
    span: 'half',
    options: [
      { value: 'Segunda', label: 'Segunda' },
      { value: 'Terça', label: 'Terça' },
      { value: 'Quarta', label: 'Quarta' },
      { value: 'Quinta', label: 'Quinta' },
      { value: 'Sexta', label: 'Sexta' },
      { value: 'Sábado', label: 'Sábado' },
      { value: 'Domingo', label: 'Domingo' },
    ],
  },
  { name: 'tema', label: 'Tema', type: 'text', placeholder: 'Festa do Pijama, Copa do Mundo...' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const columns: ColumnDef<Dia>[] = [
  { key: 'data', label: 'Data' },
  { key: 'nome_dia', label: 'Dia' },
  {
    key: 'tema',
    label: 'Tema',
    render: (r) => (r.tema ? <Badge variant="accent">{r.tema}</Badge> : '—'),
  },
]

export default async function DiasPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('dias_evento')
    .select('id, data, nome_dia, tema, observacoes')
    .order('data')

  return (
    <CrudClient<Dia>
      entityLabel="Dia"
      entityLabelPlural="Dias do evento"
      description="Os 4 dias da CIA. Cada dia pode ter um tema (ex: Festa do Pijama)."
      columns={columns}
      fields={fields}
      data={(data ?? []) as Dia[]}
      onCreate={createDia}
      onUpdate={updateDia}
      onDelete={deleteDia}
    />
  )
}
