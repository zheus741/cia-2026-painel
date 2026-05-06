import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckSquare, AlertCircle, Clock } from 'lucide-react'
import { NovaInstanciaForm } from './NovaInstanciaForm'

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

  const tipoLabel: Record<string, string> = {
    jogo: 'Jogo', show: 'Show', festa: 'Festa', ativacao_patrocinador: 'Ativação',
  }
  const tipoColor: Record<string, string> = {
    jogo: 'text-[var(--green-bright)] bg-[var(--green-dim)]/30',
    show: 'text-purple-400 bg-purple-900/30',
    festa: 'text-pink-400 bg-pink-900/30',
    ativacao_patrocinador: 'text-yellow-400 bg-yellow-900/30',
  }

  const edicaoId = edicao?.id ?? '00000000-0000-0000-0000-000000000001'

  const jogosForm = (jogosDB ?? []).map((j) => ({
    id: j.id,
    label: [j.equipe_a_nome, j.equipe_b_nome].filter(Boolean).join(' × ') ||
      (j.inicio ? new Date(j.inicio).toLocaleDateString('pt-BR') : 'Jogo'),
  }))
  const showsForm = (showsDB ?? []).map((s) => ({ id: s.id, label: s.nome }))
  const festasForm = (festasDB ?? []).map((f) => ({ id: f.id, label: f.nome }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Operações</p>
          <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
            Checklists
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Checklists operacionais — jogos, shows, festas e ativações.
          </p>
        </div>
      </div>

      <NovaInstanciaForm
        edicaoId={edicaoId}
        templates={(templates ?? []) as { id: string; nome: string; tipo: string }[]}
        jogos={jogosForm}
        shows={showsForm}
        festas={festasForm}
        patrocinadores={(patrocinadores ?? []) as { id: string; nome: string }[]}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/checklist/${row.id}`}
              className="group flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  {row.t && (
                    <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tipoColor[row.t.tipo] ?? ''}`}>
                      {tipoLabel[row.t.tipo] ?? row.t.tipo}
                    </span>
                  )}
                  <h3 className="text-sm font-semibold leading-snug">{row.titulo}</h3>
                </div>
                <span className="shrink-0 text-2xl font-bold tabular-nums text-[var(--muted-foreground)]">
                  {row.pct}%
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className="h-full rounded-full bg-[var(--green-bright)] transition-all"
                  style={{ width: `${row.pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                {row.dia && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {row.dia.nome_dia}
                    {row.horario && (
                      <> · {new Date(row.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </span>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  {row.pendentes > 0 && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <AlertCircle className="h-3 w-3" />
                      {row.pendentes} pendente{row.pendentes !== 1 ? 's' : ''}
                    </span>
                  )}
                  {row.pendentes === 0 && row.total > 0 && (
                    <span className="text-[var(--green-bright)]">Concluído</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
