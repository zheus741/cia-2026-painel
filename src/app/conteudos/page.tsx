import { createClient } from '@/lib/supabase/server'
import { KanbanBoard, type Conteudo, type Dia, type Setor, type Patrocin, type Perfil } from './KanbanBoard'
import { AlertCircle, Download } from 'lucide-react'

// Tipos de conteúdo relevantes por funcao de equipe
const TIPOS_POR_FUNCAO: Record<string, string[]> = {
  foto:  ['story_rapido', 'story_editado', 'card_feed', 'card_patrocinado', 'cobertura_ao_vivo'],
  video: ['reels', 'story_rapido', 'story_editado', 'cobertura_ao_vivo'],
}

export default async function ConteudosPage() {
  const supabase = await createClient()

  // Check current user's funcao for filtering
  const { data: { user } } = await supabase.auth.getUser()
  let tipoFilter: string[] | null = null
  if (user) {
    const { data: me } = await supabase
      .from('profiles')
      .select('role, funcao_principal')
      .eq('id', user.id)
      .maybeSingle()
    if (me?.funcao_principal && TIPOS_POR_FUNCAO[me.funcao_principal]) {
      // Only filter for non-admin/coord roles
      if (me.role === 'lider_area' || me.role === 'operador') {
        tipoFilter = TIPOS_POR_FUNCAO[me.funcao_principal]
      }
    }
  }

  let conteudosQuery = supabase
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
      modalidade:modalidade_id (nome, icone)
    `)
    .order('dia_id',           { ascending: true,  nullsFirst: false })
    .order('horario_previsto', { ascending: true,  nullsFirst: false })
    .order('prioridade',       { ascending: true })

  if (tipoFilter) {
    conteudosQuery = conteudosQuery.in('tipo', tipoFilter) as typeof conteudosQuery
  }

  const [
    edicaoRes,
    conteudosRes,
    diasRes,
    setoresRes,
    patrocinRes,
    perfisRes,
  ] = await Promise.all([
    supabase.from('edicoes').select('id').eq('ativa', true).maybeSingle(),
    conteudosQuery,
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome').order('nome'),
    supabase.from('patrocinadores').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('profiles').select('id, nome, foto_url').eq('ativo', true).order('nome'),
  ])

  // Log all errors server-side
  if (conteudosRes.error) console.error('[conteudos] query error:', JSON.stringify(conteudosRes.error))
  if (diasRes.error)      console.error('[dias] query error:', JSON.stringify(diasRes.error))
  if (setoresRes.error)   console.error('[setores] query error:', JSON.stringify(setoresRes.error))
  if (perfisRes.error)    console.error('[perfis] query error:', JSON.stringify(perfisRes.error))

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-4 flex items-end justify-between gap-4">
        <div className="cia-page-header" style={{ marginBottom: 0 }}>
          <p className="cia-page-header__eyebrow">Produção</p>
          <h1 className="cia-page-header__title">Kanban de Conteúdo</h1>
          <p className="cia-page-header__subtitle">
            Arraste os cards para mudar o status · clique para ver os detalhes
          </p>
        </div>
        <a
          href="/api/backup"
          download
          title="Baixar backup JSON de todos os conteúdos"
          className="flex items-center gap-2 shrink-0 transition-all"
          style={{
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            color: 'rgba(10,15,11,0.50)',
            border: '1px solid rgba(10,15,11,0.12)',
            background: 'rgba(10,15,11,0.03)',
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Backup
        </a>
      </div>

      {/* Erro visível se a query de conteúdos falhar */}
      {conteudosRes.error && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar conteúdos</p>
            <p className="mt-0.5 font-mono text-xs text-red-300/80">
              {(conteudosRes.error as { message?: string }).message
                ?? (conteudosRes.error as { details?: string }).details
                ?? JSON.stringify(conteudosRes.error)}
            </p>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="min-h-0 flex-1">
        <KanbanBoard
          edicaoId={edicaoRes.data?.id ?? ''}
          conteudos={(conteudosRes.data ?? []) as unknown as Conteudo[]}
          dias={(diasRes.data ?? []) as Dia[]}
          setores={(setoresRes.data ?? []) as Setor[]}
          patrocinadores={(patrocinRes.data ?? []) as Patrocin[]}
          perfis={(perfisRes.data ?? []) as Perfil[]}
        />
      </div>
    </div>
  )
}
