import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, CheckSquare, FileText, MapPin, Clock } from 'lucide-react'

const FUNCAO_LABEL: Record<string, string> = {
  foto: 'Foto', video: 'Vídeo', social: 'Social', reporter: 'Repórter',
  editor: 'Editor', drone: 'Drone', roaming: 'Roaming',
  coordenacao: 'Coord.', producao: 'Produção', design: 'Design',
}

const FUNCAO_COLOR: Record<string, string> = {
  foto: 'bg-purple-900/20 text-purple-300 border-purple-700/30',
  video: 'bg-purple-900/20 text-purple-300 border-purple-700/30',
  drone: 'bg-purple-900/20 text-purple-300 border-purple-700/30',
  social: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
  editor: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
  design: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
  reporter: 'bg-orange-900/20 text-orange-300 border-orange-700/30',
  roaming: 'bg-orange-900/20 text-orange-300 border-orange-700/30',
  coordenacao: 'bg-[var(--green-dim)]/20 text-[var(--green-bright)] border-[var(--green-dim)]/40',
  producao: 'bg-[var(--green-dim)]/20 text-[var(--green-bright)] border-[var(--green-dim)]/40',
}

const ESTAGIO_LABEL: Record<string, string> = {
  captura: 'Captura', pesquisa: 'Pesquisa', edicao_video: 'Edição Vídeo',
  edicao_foto: 'Edição Foto', design_arte: 'Design', redacao: 'Redação',
  aprovacao_coord: 'Aprov. Coord', aprovacao_patro: 'Aprov. Patro', publicacao: 'Publicação',
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function fmtDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export default async function MinhaEscalaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [turnosRes, checklistsRes, estagiosRes] = await Promise.all([
    supabase
      .from('turnos')
      .select('id, funcao, inicio, fim, is_roaming, observacoes, dia:dias_evento(nome_dia, data), setor:setores(nome)')
      .eq('user_id', user.id)
      .order('inicio'),
    supabase
      .from('checklist_instancias')
      .select(`
        id, nome_override,
        template:checklist_templates(nome, tipo),
        dia:dias_evento(nome_dia, data),
        jogo:jogos(equipe_a_nome, equipe_b_nome),
        show:shows(nome),
        checklist_itens(id, status)
      `)
      .eq('responsavel_id', user.id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('estagios_conteudo')
      .select('id, estagio, status, conteudo:conteudos(id, titulo, tipo, status)')
      .eq('dono_id', user.id)
      .in('status', ['pendente', 'em_andamento'])
      .order('ordem'),
  ])

  // Group turnos by dia
  type TurnoRow = {
    id: string; funcao: string; inicio: string; fim: string
    is_roaming: boolean; observacoes: string | null
    dia: { nome_dia: string; data: string } | null
    setor: { nome: string } | null
  }

  const turnos = (turnosRes.data ?? []).map((r) => ({
    ...r,
    dia: r.dia as unknown as { nome_dia: string; data: string } | null,
    setor: r.setor as unknown as { nome: string } | null,
  })) as TurnoRow[]

  const turnosByDia = turnos.reduce<Record<string, TurnoRow[]>>((acc, t) => {
    const key = t.dia?.data ?? 'sem-dia'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const diasOrdenados = Object.keys(turnosByDia).sort()

  // Checklists
  const checklists = (checklistsRes.data ?? []).map((inst) => {
    const itens = (inst.checklist_itens as { id: string; status: string }[]) ?? []
    const total = itens.length
    const feitos = itens.filter((i) => i.status === 'feito').length
    const pct = total > 0 ? Math.round((feitos / total) * 100) : 0
    const t = inst.template as unknown as { nome: string; tipo: string } | null
    const dia = inst.dia as unknown as { nome_dia: string; data: string } | null
    const jogo = inst.jogo as unknown as { equipe_a_nome: string; equipe_b_nome: string } | null
    const show = inst.show as unknown as { nome: string } | null
    const titulo = inst.nome_override
      ?? (jogo ? `${jogo.equipe_a_nome} × ${jogo.equipe_b_nome}` : null)
      ?? show?.nome ?? t?.nome ?? '—'
    return { id: inst.id, titulo, dia, total, feitos, pct }
  })

  // Conteúdos
  type EstagioRow = {
    id: string; estagio: string; status: string
    conteudo: { id: string; titulo: string; tipo: string; status: string } | null
  }
  const estagios = (estagiosRes.data ?? []).map((r) => ({
    ...r,
    conteudo: r.conteudo as unknown as { id: string; titulo: string; tipo: string; status: string } | null,
  })) as EstagioRow[]

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Pessoal</p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          Minha Escala
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Seus turnos, checklists e conteúdos atribuídos.
        </p>
      </div>

      {/* ── Turnos ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Escala de turnos</h2>
        </div>

        {diasOrdenados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum turno cadastrado para você.</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
              Peça ao coordenador para te adicionar em{' '}
              <Link href="/admin/escala" className="underline hover:text-[var(--accent)]">/admin/escala</Link>.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {diasOrdenados.map((data) => {
              const dTurnos = turnosByDia[data]!
              const dia = dTurnos[0].dia
              return (
                <div key={data} className="cia-glass rounded-xl border border-[var(--border)] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    {dia ? `${dia.nome_dia} · ${fmtDate(dia.data)}` : data}
                  </p>
                  <div className="space-y-2">
                    {dTurnos.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2.5">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="tabular-nums text-sm font-semibold">
                              {fmtTime(t.inicio)}–{fmtTime(t.fim)}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${FUNCAO_COLOR[t.funcao] ?? 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                              {FUNCAO_LABEL[t.funcao] ?? t.funcao}
                            </span>
                            {t.is_roaming && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-orange-700/30 bg-orange-900/20 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                                Roaming
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                            {t.setor && (
                              <>
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span>{t.setor.nome}</span>
                              </>
                            )}
                            {t.observacoes && (
                              <span className="ml-1 text-[var(--muted-foreground)]/60">· {t.observacoes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Checklists ───────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Checklists atribuídos a mim</h2>
        </div>

        {checklists.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum checklist atribuído a você.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {checklists.map((c) => (
              <Link
                key={c.id}
                href={`/checklist/${c.id}`}
                className="group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 p-4 transition-all hover:border-[var(--green)] hover:bg-[var(--card)]"
              >
                <div>
                  <p className="text-sm font-semibold leading-snug">{c.titulo}</p>
                  {c.dia && (
                    <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {c.dia.nome_dia} · {fmtDate(c.dia.data)}
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-[var(--muted-foreground)]">{c.feitos}/{c.total} itens</span>
                    <span className={c.pct === 100 ? 'text-[var(--green-bright)] font-semibold' : 'text-[var(--muted-foreground)]'}>
                      {c.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--green-bright)] transition-all"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Conteúdos em andamento ───────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <FileText className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Conteúdos em andamento</h2>
        </div>

        {estagios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum conteúdo atribuído a você no momento.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {estagios.map((e) => (
              <Link
                key={e.id}
                href="/conteudos"
                className="group flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)]/60 px-4 py-3 transition-all hover:border-[var(--green)] hover:bg-[var(--card)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.conteudo?.titulo ?? '—'}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                    {ESTAGIO_LABEL[e.estagio] ?? e.estagio}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                  e.status === 'em_andamento'
                    ? 'bg-blue-900/20 text-blue-300 border-blue-700/30'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
                }`}>
                  {e.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
