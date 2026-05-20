export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { CheckSquare } from 'lucide-react'
import { NovaInstanciaForm } from './NovaInstanciaForm'
import { ChecklistListClient } from './ChecklistListClient'
import { deletarInstancia } from './actions'
import { getCurrentProfile, hasRole } from '@/lib/auth/current-user'

export default async function ChecklistPage() {
  const supabase = await createClient()

  const [
    { data: instancias },
    { data: templates },
    { data: jogosDB },
    { data: showsDB },
    { data: festasDB },
    { data: patrocinadores },
    { data: edicao },
    { data: diasDB },
    profile,
  ] = await Promise.all([
    supabase
      .from('checklist_instancias')
      .select(`
        id, nome_override, criado_em,
        template:checklist_templates(nome, tipo),
        dia:dias_evento(nome_dia, data),
        jogo:jogos(equipe_a_nome, equipe_b_nome, inicio),
        show:shows(nome, inicio),
        festa:festas(nome, inicio),
        patrocinador:patrocinadores(nome),
        responsavel:profiles(nome),
        checklist_itens(id, status)
      `)
      .order('criado_em', { ascending: false }),
    supabase.from('checklist_templates').select('id, nome, tipo').eq('ativo', true).order('nome'),
    supabase.from('jogos').select('id, equipe_a_nome, equipe_b_nome, inicio').order('inicio'),
    supabase.from('shows').select('id, nome, inicio').order('inicio'),
    supabase.from('festas').select('id, nome, inicio').order('inicio'),
    supabase.from('patrocinadores').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('edicoes').select('id').eq('ativa', true).maybeSingle(),
    supabase.from('dias_evento').select('id, nome_dia').order('data'),
    getCurrentProfile(),
  ])

  const rows = (instancias ?? []).map((inst) => {
    const itens = (inst.checklist_itens as { id: string; status: string }[]) ?? []
    const total = itens.length
    const feitos = itens.filter((i) => i.status === 'feito').length
    const pendentes = itens.filter((i) => i.status === 'pendente').length
    const pct = total > 0 ? Math.round((feitos / total) * 100) : 0

    const t = inst.template as unknown as { nome: string; tipo: string } | null
    const dia = inst.dia as unknown as { nome_dia: string; data: string } | null
    const jogo = inst.jogo as unknown as { equipe_a_nome: string; equipe_b_nome: string; inicio: string } | null
    const show = inst.show as unknown as { nome: string; inicio: string } | null
    const festa = inst.festa as unknown as { nome: string; inicio: string } | null
    const patrocinador = inst.patrocinador as unknown as { nome: string } | null

    const titulo = inst.nome_override
      ?? (jogo ? `${jogo.equipe_a_nome} × ${jogo.equipe_b_nome}` : null)
      ?? show?.nome ?? festa?.nome ?? patrocinador?.nome ?? t?.nome ?? '—'

    const horario = jogo?.inicio ?? show?.inicio ?? festa?.inicio ?? null
    return { ...inst, titulo, dia, horario, t, total, feitos, pendentes, pct }
  })

  const isCoord = profile ? hasRole(profile, 'admin', 'coordenacao') : false

  const edicaoId = edicao?.id ?? '00000000-0000-0000-0000-000000000001'

  const jogosForm = (jogosDB ?? []).map((j) => ({
    id: j.id,
    label: [j.equipe_a_nome, j.equipe_b_nome].filter(Boolean).join(' × ') ||
      (j.inicio ? new Date(j.inicio).toLocaleDateString('pt-BR') : 'Jogo'),
  }))
  const showsForm = (showsDB ?? []).map((s) => ({ id: s.id, label: s.nome }))
  const festasForm = (festasDB ?? []).map((f) => ({ id: f.id, label: f.nome }))
  const diasForm = (diasDB ?? []).map((d) => ({ id: d.id, nome_dia: d.nome_dia }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="cia-page-header" style={{ marginBottom: 0 }}>
          <p className="cia-page-header__eyebrow">Operações</p>
          <h1 className="cia-page-header__title">Checklists</h1>
          <p className="cia-page-header__subtitle">Checklists operacionais — jogos, shows, festas e ativações.</p>
        </div>
      </div>

      <NovaInstanciaForm
        edicaoId={edicaoId}
        templates={(templates ?? []) as { id: string; nome: string; tipo: string }[]}
        jogos={jogosForm}
        shows={showsForm}
        festas={festasForm}
        patrocinadores={(patrocinadores ?? []) as { id: string; nome: string }[]}
        dias={diasForm}
      />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-12 text-center">
          <CheckSquare className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Nenhum checklist criado ainda.</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
            Use o botão acima para criar o primeiro.
          </p>
        </div>
      ) : (
        <ChecklistListClient
          rows={rows}
          isCoord={isCoord}
          deletarInstancia={deletarInstancia}
        />
      )}
    </div>
  )
}
