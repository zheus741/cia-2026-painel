import { createClient } from '@/lib/supabase/server'
import { KanbanBoard, type Conteudo, type Dia, type Setor, type Patrocin, type Perfil } from './KanbanBoard'

export default async function ConteudosPage() {
  const supabase = await createClient()

  const [
    { data: edicoes },
    { data: conteudos },
    { data: dias },
    { data: setores },
    { data: patrocinadores },
    { data: perfis },
  ] = await Promise.all([
    supabase.from('edicoes').select('id').eq('ativa', true).maybeSingle().then(r => ({ data: r.data })),

    supabase
      .from('conteudos')
      .select(`
        id, titulo, tipo, status, prioridade,
        dia_id, setor_id, patrocinador_id, jogo_id, show_id, festa_id, modalidade_id,
        canal_publicacao, briefing, horario_previsto, link_publicado,
        responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id,
        dia:dia_id (nome_dia, data),
        setor:setor_id (nome),
        patrocinador:patrocinador_id (nome),
        jogo:jogo_id (equipe_a_nome, equipe_b_nome, modalidade:modalidade_id (nome, icone)),
        show:show_id (nome, inicio),
        festa:festa_id (nome, tema, inicio),
        modalidade:modalidade_id (nome, icone),
        responsavel_captacao:responsavel_captacao_id (id, nome, foto_url),
        responsavel_design:responsavel_design_id (id, nome, foto_url),
        responsavel_edicao:responsavel_edicao_id (id, nome, foto_url)
      `)
      .order('prioridade', { ascending: true })
      .order('criado_em', { ascending: false }),

    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome').order('nome'),
    supabase.from('patrocinadores').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('profiles').select('id, nome, foto_url').eq('ativo', true).order('nome'),
  ])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-lg font-bold cia-gold-text" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Kanban de Conteúdo
        </h1>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Arraste os cards para mudar o status · clique para ver os detalhes
        </p>
      </div>

      {/* Board */}
      <div className="min-h-0 flex-1">
        <KanbanBoard
          edicaoId={(edicoes as { id: string } | null)?.id ?? ''}
          conteudos={(conteudos ?? []) as unknown as Conteudo[]}
          dias={(dias ?? []) as Dia[]}
          setores={(setores ?? []) as Setor[]}
          patrocinadores={(patrocinadores ?? []) as Patrocin[]}
          perfis={(perfis ?? []) as Perfil[]}
        />
      </div>
    </div>
  )
}
