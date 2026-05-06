import { createClient } from '@/lib/supabase/server'
import { KanbanBoard, type Conteudo, type Dia, type Setor, type Patrocin, type Template } from './KanbanBoard'

export default async function ConteudosPage() {
  const supabase = await createClient()

  const [
    { data: conteudos },
    { data: dias },
    { data: setores },
    { data: patrocinadores },
    { data: templates },
  ] = await Promise.all([
    supabase
      .from('conteudos')
      .select(`
        id, titulo, tipo, status, prioridade,
        dia_id, setor_id, patrocinador_id, canal_publicacao,
        briefing, link_publicado, pipeline_template_id,
        dia:dia_id (nome_dia),
        patrocinador:patrocinador_id (nome),
        estagios_conteudo (id, estagio, status, ordem, dono:dono_id (nome))
      `)
      .order('prioridade', { ascending: true })
      .order('criado_em', { ascending: false }),
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome').order('nome'),
    supabase.from('patrocinadores').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('pipeline_templates').select('id, nome, tipo_conteudo').eq('ativo', true).order('nome'),
  ])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-lg font-bold cia-gold-text" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Pipeline de Conteúdo
        </h1>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Arraste ou avance o status com as setas
        </p>
      </div>

      {/* Board (takes remaining height) */}
      <div className="min-h-0 flex-1">
        <KanbanBoard
          conteudos={(conteudos ?? []) as unknown as Conteudo[]}
          dias={(dias ?? []) as Dia[]}
          setores={(setores ?? []) as Setor[]}
          patrocinadores={(patrocinadores ?? []) as Patrocin[]}
          templates={(templates ?? []) as Template[]}
        />
      </div>
    </div>
  )
}
