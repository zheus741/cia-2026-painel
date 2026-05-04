import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createFesta, updateFesta, deleteFesta } from './actions'

interface Festa {
  id: string
  nome: string
  tema: string | null
  dia_id: string | null
  setor_id: string | null
  inicio: string | null
  fim_previsto: string | null
  dia?: { nome_dia: string; data: string }
  setor?: { nome: string }
}

export default async function FestasPage() {
  const supabase = await createClient()
  const [{ data: festas }, { data: dias }, { data: setores }] = await Promise.all([
    supabase
      .from('festas')
      .select('id, nome, tema, dia_id, setor_id, inicio, fim_previsto, dia:dia_id(nome_dia, data), setor:setor_id(nome)')
      .order('inicio', { ascending: true, nullsFirst: false }),
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome').order('nome'),
  ])

  const fields: FieldDef[] = [
    { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Festa Noturna · Sábado', span: 'half' },
    { name: 'tema', label: 'Tema', type: 'text', placeholder: 'Festa a Fantasia', span: 'half' },
    {
      name: 'dia_id',
      label: 'Dia',
      type: 'select',
      required: true,
      span: 'half',
      options: (dias ?? []).map((d) => ({
        value: d.id,
        label: `${d.nome_dia} · ${d.data}`,
      })),
    },
    {
      name: 'setor_id',
      label: 'Setor',
      type: 'select',
      span: 'half',
      options: (setores ?? []).map((s) => ({ value: s.id, label: s.nome })),
    },
    { name: 'inicio', label: 'Início', type: 'datetime', span: 'half' },
    { name: 'fim_previsto', label: 'Fim previsto', type: 'datetime', span: 'half' },
    { name: 'observacoes', label: 'Observações', type: 'textarea' },
  ]

  const columns: ColumnDef<Festa>[] = [
    {
      key: 'nome',
      label: 'Festa',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.nome}</span>
          {r.tema && <Badge variant="accent">{r.tema}</Badge>}
        </div>
      ),
    },
    { key: 'dia', label: 'Dia', render: (r) => r.dia ? `${r.dia.nome_dia} · ${r.dia.data}` : '—' },
    { key: 'setor', label: 'Setor', render: (r) => r.setor?.nome ?? '—' },
    {
      key: 'janela',
      label: 'Janela',
      render: (r) =>
        r.inicio && r.fim_previsto
          ? `${new Date(r.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} → ${new Date(r.fim_previsto).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : '—',
    },
  ]

  return (
    <CrudClient<Festa>
      entityLabel="Festa"
      entityLabelPlural="Festas"
      description="Blocos de festa: tarde (Sexta Arena, Sábado Arena) e noturna. O tema do dia faz a comunicação."
      columns={columns}
      fields={fields}
      data={(festas ?? []) as unknown as Festa[]}
      onCreate={createFesta}
      onUpdate={updateFesta}
      onDelete={deleteFesta}
    />
  )
}
