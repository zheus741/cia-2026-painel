import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { ImportJogosDialog } from './ImportJogosDialog'
import { createJogo, updateJogo, deleteJogo } from './actions'

interface Jogo {
  id: string
  modalidade_id: string | null
  dia_id: string | null
  setor_id: string | null
  categoria: string | null
  divisao: string | null
  fase: string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  inicio: string | null
  fim_previsto: string | null
  status: string
  confronto_label: string
  modalidade_label: string
  dia_label: string
  setor_label: string
  inicio_label: string
  status_label: string
}

const FASE_LABEL: Record<string, string> = {
  grupos: 'Grupos', oitavas: 'Oitavas', quartas: 'Quartas', semifinal: 'Semi', final: 'Final',
}

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado', ao_vivo: 'Ao vivo', encerrado: 'Encerrado', cancelado: 'Cancelado',
}

export default async function JogosPage() {
  const supabase = await createClient()
  const [{ data: jogos }, { data: dias }, { data: setores }, { data: modalidades }] = await Promise.all([
    supabase.from('jogos').select('id, modalidade_id, dia_id, setor_id, categoria, divisao, fase, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, status, modalidade:modalidade_id(nome, icone), dia:dia_id(nome_dia, data), setor:setor_id(nome)').order('inicio', { ascending: true, nullsFirst: false }),
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome').order('nome'),
    supabase.from('modalidades').select('id, nome, icone').order('nome'),
  ])

  const fields: FieldDef[] = [
    { name: 'modalidade_id', label: 'Modalidade', type: 'select', required: true, span: 'half', options: (modalidades ?? []).map((m) => ({ value: m.id, label: `${m.icone} ${m.nome}` })) },
    { name: 'categoria', label: 'Categoria', type: 'select', span: 'half', options: [{ value: 'Masculino', label: 'Masculino' }, { value: 'Feminino', label: 'Feminino' }, { value: 'Misto', label: 'Misto' }] },
    { name: 'dia_id', label: 'Dia', type: 'select', required: true, span: 'half', options: (dias ?? []).map((d) => ({ value: d.id, label: `${d.nome_dia} · ${d.data}` })) },
    { name: 'setor_id', label: 'Quadra / Setor', type: 'select', span: 'half', options: (setores ?? []).map((s) => ({ value: s.id, label: s.nome })) },
    { name: 'divisao', label: 'Divisão', type: 'text', placeholder: '1ª, 2ª, 3ªR, 3ªL, 4ª', span: 'half' },
    { name: 'fase', label: 'Fase', type: 'select', span: 'half', options: [{ value: 'grupos', label: 'Fase de Grupos' }, { value: 'oitavas', label: 'Oitavas de final' }, { value: 'quartas', label: 'Quartas de final' }, { value: 'semifinal', label: 'Semifinal' }, { value: 'final', label: 'Final' }] },
    { name: 'equipe_a_nome', label: 'Equipe A', type: 'text', placeholder: 'ENG UFU', span: 'half' },
    { name: 'equipe_b_nome', label: 'Equipe B', type: 'text', placeholder: 'MED UFMG', span: 'half' },
    { name: 'inicio', label: 'Início', type: 'datetime', span: 'half' },
    { name: 'fim_previsto', label: 'Fim previsto', type: 'datetime', span: 'half' },
    { name: 'observacoes', label: 'Observações', type: 'textarea' },
  ]

  const columns: ColumnDef<Jogo>[] = [
    { key: 'confronto_label', label: 'Confronto' },
    { key: 'modalidade_label', label: 'Modalidade' },
    { key: 'dia_label', label: 'Dia' },
    { key: 'setor_label', label: 'Quadra' },
    { key: 'inicio_label', label: 'Horário' },
    { key: 'status_label', label: 'Status' },
  ]

  const processed = (jogos ?? []).map((r) => {
    const mod = r.modalidade as unknown as { nome: string; icone: string } | null
    const dia = r.dia as unknown as { nome_dia: string; data: string } | null
    const setor = r.setor as unknown as { nome: string } | null
    const equipes = r.equipe_a_nome && r.equipe_b_nome ? `${r.equipe_a_nome} × ${r.equipe_b_nome}` : r.equipe_a_nome ?? r.equipe_b_nome ?? '—'
    const detalhes = [r.divisao, r.fase ? FASE_LABEL[r.fase] ?? r.fase : null].filter(Boolean).join(' · ')
    return {
      ...r,
      confronto_label: detalhes ? `${equipes} (${detalhes})` : equipes,
      modalidade_label: mod ? `${mod.icone} ${mod.nome}${r.categoria ? ' ' + r.categoria : ''}` : '—',
      dia_label: dia ? `${dia.nome_dia} · ${dia.data}` : '—',
      setor_label: setor?.nome ?? '—',
      inicio_label: r.inicio ? new Date(r.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
      status_label: STATUS_LABEL[r.status] ?? r.status,
    }
  }) as Jogo[]

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-6 pt-6">
        <ImportJogosDialog
          dias={(dias ?? []) as { id: string; nome_dia: string; data: string }[]}
          setores={(setores ?? []) as { id: string; nome: string }[]}
          modalidades={(modalidades ?? []) as { id: string; nome: string }[]}
        />
      </div>
      <CrudClient<Jogo>
        entityLabel="Jogo" entityLabelPlural="Jogos"
        description="Confrontos por dia e quadra. Use o botão 'Importar tabela' para carregar o xlsx oficial ou cadastre manualmente."
        columns={columns} fields={fields} data={processed}
        onCreate={createJogo} onUpdate={updateJogo} onDelete={deleteJogo}
      />
    </div>
  )
}
