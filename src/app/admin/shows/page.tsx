import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createShow, updateShow, deleteShow } from './actions'

interface Show {
  id: string
  nome: string
  tipo: string | null
  dia_id: string | null
  setor_id: string | null
  inicio: string | null
  fim_previsto: string | null
  duracao_minutos: number | null
  embaixador: boolean
  ordem_no_palco: number | null
  dia?: { nome_dia: string; data: string }
  setor?: { nome: string }
}

export default async function ShowsPage() {
  const supabase = await createClient()
  const [{ data: shows }, { data: dias }, { data: setores }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, nome, tipo, dia_id, setor_id, inicio, fim_previsto, duracao_minutos, embaixador, ordem_no_palco, dia:dia_id(nome_dia, data), setor:setor_id(nome)')
      .order('inicio', { ascending: true, nullsFirst: false }),
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome').eq('tipo', 'palco').order('nome'),
  ])

  const fields: FieldDef[] = [
    { name: 'nome', label: 'Atração', type: 'text', required: true, placeholder: 'Pedro Sampaio' },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select',
      span: 'half',
      options: [
        { value: 'show', label: 'Show' },
        { value: 'dj_set', label: 'DJ Set' },
        { value: 'apresentacao', label: 'Apresentação' },
      ],
    },
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
      label: 'Palco',
      type: 'select',
      required: true,
      options: (setores ?? []).map((s) => ({ value: s.id, label: s.nome })),
    },
    { name: 'inicio', label: 'Início', type: 'datetime', span: 'half' },
    { name: 'fim_previsto', label: 'Fim previsto', type: 'datetime', span: 'half' },
    { name: 'duracao_minutos', label: 'Duração (min)', type: 'number', span: 'half' },
    { name: 'ordem_no_palco', label: 'Ordem no palco', type: 'number', span: 'half' },
    { name: 'embaixador', label: 'Embaixador', type: 'boolean', helper: 'Atração-âncora do dia' },
    { name: 'observacoes', label: 'Observações', type: 'textarea' },
  ]

  const columns: ColumnDef<Show>[] = [
    {
      key: 'nome',
      label: 'Atração',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.nome}</span>
          {r.embaixador && <Badge variant="accent">Embaixador</Badge>}
        </div>
      ),
    },
    {
      key: 'dia',
      label: 'Dia',
      render: (r) =>
        r.dia ? (
          <span>{r.dia.nome_dia} · {r.dia.data}</span>
        ) : '—',
    },
    { key: 'setor', label: 'Palco', render: (r) => r.setor?.nome ?? '—' },
    {
      key: 'inicio',
      label: 'Horário',
      render: (r) =>
        r.inicio
          ? new Date(r.inicio).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
    },
    {
      key: 'duracao_minutos',
      label: 'Duração',
      render: (r) => (r.duracao_minutos ? `${r.duracao_minutos} min` : '—'),
    },
  ]

  return (
    <CrudClient<Show>
      entityLabel="Show"
      entityLabelPlural="Shows"
      description="Atrações por dia e palco. Cadastre quem sobe, em qual ordem, e janela esperada."
      columns={columns}
      fields={fields}
      data={(shows ?? []) as unknown as Show[]}
      onCreate={createShow}
      onUpdate={updateShow}
      onDelete={deleteShow}
    />
  )
}
