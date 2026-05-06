import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createFesta, updateFesta, deleteFesta } from './actions'

interface Festa {
  id: string
  nome: string
  tema: string | null
  dia_id: string | null
  setor_id: string | null
  inicio: string | null
  fim_previsto: string | null
  dia_label: string
  setor_label: string
  janela_label: string
}

export default async function FestasPage() {
  const supabase = await createClient()
  const [{ data: festas }, { data: dias }, { data: setores }] = await Promise.all([
    supabase.from('festas').select('id, nome, tema, dia_id, setor_id, inicio, fim_previsto, dia:dia_id(nome_dia, data), setor:setor_id(nome)').order('inicio', { ascending: true, nullsFirst: false }),
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome').order('nome'),
  ])

  const fields: FieldDef[] = [
    { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Festa Noturna · Sábado', span: 'half' },
    { name: 'tema', label: 'Tema', type: 'text', placeholder: 'Festa a Fantasia', span: 'half' },
    { name: 'dia_id', label: 'Dia', type: 'select', required: true, span: 'half', options: (dias ?? []).map((d) => ({ value: d.id, label: `${d.nome_dia} · ${d.data}` })) },
    { name: 'setor_id', label: 'Setor', type: 'select', span: 'half', options: (setores ?? []).map((s) => ({ value: s.id, label: s.nome })) },
    { name: 'inicio', label: 'Início', type: 'datetime', span: 'half' },
    { name: 'fim_previsto', label: 'Fim previsto', type: 'datetime', span: 'half' },
    { name: 'observacoes', label: 'Observações', type: 'textarea' },
  ]

  const columns: ColumnDef<Festa>[] = [
    { key: 'nome', label: 'Festa' },
    { key: 'tema', label: 'Tema' },
    { key: 'dia_label', label: 'Dia' },
    { key: 'setor_label', label: 'Setor' },
    { key: 'janela_label', label: 'Janela' },
  ]

  const fmt = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const processed = (festas ?? []).map((r) => {
    const dia = r.dia as unknown as { nome_dia: string; data: string } | null
    const setor = r.setor as unknown as { nome: string } | null
    return {
      ...r,
      dia_label: dia ? `${dia.nome_dia} · ${dia.data}` : '—',
      setor_label: setor?.nome ?? '—',
      janela_label: r.inicio && r.fim_previsto ? `${fmt(r.inicio)} → ${fmt(r.fim_previsto)}` : '—',
    }
  }) as Festa[]

  return (
    <CrudClient<Festa>
      entityLabel="Festa" entityLabelPlural="Festas"
      description="Blocos de festa: tarde (Sexta Arena, Sábado Arena) e noturna."
      columns={columns} fields={fields} data={processed}
      onCreate={createFesta} onUpdate={updateFesta} onDelete={deleteFesta}
    />
  )
}
