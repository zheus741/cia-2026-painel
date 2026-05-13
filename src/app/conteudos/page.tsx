import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/current-user'
import { getCachedDias, getCachedSetores, getCachedPatrocinadores, getCachedPerfis } from '@/lib/cache/lookups'
import { KanbanBoard, type Conteudo, type Dia, type Setor, type Patrocin, type Perfil } from './KanbanBoard'
import { AlertCircle, Download } from 'lucide-react'

// Tipos de conteúdo relevantes por funcao de equipe
const TIPOS_POR_FUNCAO: Record<string, string[]> = {
  foto:  ['story_rapido', 'story_editado', 'card_feed', 'card_patrocinado', 'cobertura_ao_vivo'],
  video: ['reels', 'story_rapido', 'story_editado', 'cobertura_ao_vivo'],
}

export default async function ConteudosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // PERF: getCurrentProfile() é cacheado por request — uma única chamada a
  // auth.getUser() + profile fetch (~240ms total em vez de 480ms).
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  // ?dia=<uuid> → filtra server-side, reduz carga da query pesada em ~4x no D-Day
  const { dia: diaParam } = await searchParams
  const activeDiaId = typeof diaParam === 'string' ? diaParam : undefined

  let tipoFilter: string[] | null = null
  if (profile?.funcao_principal && TIPOS_POR_FUNCAO[profile.funcao_principal]) {
    if (profile.role === 'lider_area' || profile.role === 'operador') {
      tipoFilter = TIPOS_POR_FUNCAO[profile.funcao_principal]
    }
  }

  // PERF: dia/setor/patrocinador removidos do JOIN — já temos esses dados nos
  // cached lookups. Hidratamos client-side com Maps (O(1)) depois da query.
  // Mantemos apenas joins dinâmicos (jogo/show/festa/modalidade).
  let conteudosQuery = supabase
    .from('conteudos')
    .select(`
      id, titulo, tipo, status, prioridade,
      dia_id, setor_id, patrocinador_id, jogo_id, show_id, festa_id, modalidade_id,
      canal_publicacao, briefing, horario_previsto, link_publicado,
      responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id,
      jogo:jogo_id (equipe_a_nome, equipe_b_nome, modalidade:modalidade_id (nome, icone)),
      show:show_id (nome, inicio),
      festa:festa_id (nome, tema, inicio),
      modalidade:modalidade_id (nome, icone)
    `)
    .order('dia_id',           { ascending: true,  nullsFirst: false })
    .order('horario_previsto', { ascending: true,  nullsFirst: false })
    .order('prioridade',       { ascending: true })

  // PERF: filtra por dia quando URL param presente — evita trazer todos os
  // cards de todos os dias na query mais pesada do sistema.
  if (activeDiaId) {
    conteudosQuery = conteudosQuery.eq('dia_id', activeDiaId) as typeof conteudosQuery
  }

  if (tipoFilter) {
    conteudosQuery = conteudosQuery.in('tipo', tipoFilter) as typeof conteudosQuery
  }

  // PERF: lookup tables servidas do cache Next.js (revalidate: 300s)
  // Economiza ~150ms por request nos ~3 queries de referência.
  const [
    edicaoRes,
    conteudosRes,
    dias,
    setores,
    patrocinadores,
    perfis,
  ] = await Promise.all([
    supabase.from('edicoes').select('id').eq('ativa', true).maybeSingle(),
    conteudosQuery,
    getCachedDias(),
    getCachedSetores(),
    getCachedPatrocinadores(),
    getCachedPerfis(),
  ])

  // Log errors server-side (lookup tables já logam dentro de lookups.ts)
  if (conteudosRes.error) console.error('[conteudos] query error:', JSON.stringify(conteudosRes.error))

  // PERF: hidrata dia/setor/patrocinador a partir dos lookups cacheados (O(1) por row)
  // em vez de depender dos JOINs SQL — economiza o custo de serializar N objetos aninhados.
  const diasMap         = new Map((dias         as Dia[]).map(d => [d.id, d]))
  const setoresMap      = new Map((setores      as Setor[]).map(s => [s.id, s]))
  const patrocinadoresMap = new Map((patrocinadores as Patrocin[]).map(p => [p.id, p]))

  const conteudos = ((conteudosRes.data ?? []) as unknown as Conteudo[]).map(c => ({
    ...c,
    dia:          c.dia_id          ? (diasMap.get(c.dia_id)          ?? null) : null,
    setor:        c.setor_id        ? (setoresMap.get(c.setor_id)      ?? null) : null,
    patrocinador: c.patrocinador_id ? (patrocinadoresMap.get(c.patrocinador_id) ?? null) : null,
  }))

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
          conteudos={conteudos}
          dias={dias as Dia[]}
          setores={setores as Setor[]}
          patrocinadores={patrocinadores as Patrocin[]}
          perfis={perfis as Perfil[]}
          activeDiaId={activeDiaId}
          readOnly={profile?.role === 'operador'}
        />
      </div>
    </div>
  )
}
