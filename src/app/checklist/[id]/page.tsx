export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, User } from 'lucide-react'
import { ChecklistUI } from './ChecklistUI'
import { DeleteInstanciaButton } from './DeleteInstanciaButton'
import { getCurrentProfile, hasRole } from '@/lib/auth/current-user'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChecklistDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: inst }, profile] = await Promise.all([
    supabase
      .from('checklist_instancias')
      .select(`
        id, nome_override, criado_em,
        template:checklist_templates(nome, tipo),
        dia:dias_evento(nome_dia, data),
        jogo:jogos(equipe_a_nome, equipe_b_nome, inicio, modalidade:modalidades(nome)),
        show:shows(nome, inicio, setor:setores(nome)),
        festa:festas(nome, inicio),
        patrocinador:patrocinadores(nome),
        responsavel:profiles(nome),
        checklist_itens(
          id, label, obrigatorio, ordem, status, link_post, observacao, feito_em,
          operador:profiles(nome)
        )
      `)
      .eq('id', id)
      .single(),
    getCurrentProfile(),
  ])

  if (!inst) notFound()

  const isCoord = profile ? hasRole(profile, 'admin', 'coordenacao') : false

  const t = inst.template as unknown as { nome: string; tipo: string } | null
  const dia = inst.dia as unknown as { nome_dia: string; data: string } | null
  const jogo = inst.jogo as unknown as { equipe_a_nome: string; equipe_b_nome: string; inicio: string; modalidade: { nome: string } | null } | null
  const show = inst.show as unknown as { nome: string; inicio: string; setor: { nome: string } | null } | null
  const festa = inst.festa as unknown as { nome: string; inicio: string } | null
  const patrocinador = inst.patrocinador as unknown as { nome: string } | null
  const responsavel = inst.responsavel as unknown as { nome: string } | null

  const titulo = inst.nome_override
    ?? (jogo ? `${jogo.equipe_a_nome} × ${jogo.equipe_b_nome}` : null)
    ?? show?.nome
    ?? festa?.nome
    ?? patrocinador?.nome
    ?? t?.nome
    ?? '—'

  const subtitulo = jogo?.modalidade?.nome
    ?? show?.setor?.nome
    ?? patrocinador?.nome
    ?? null

  const horario = jogo?.inicio ?? show?.inicio ?? festa?.inicio ?? null

  const tipoLabel: Record<string, string> = {
    jogo: 'Jogo',
    show: 'Show',
    festa: 'Festa',
    ativacao_patrocinador: 'Ativação',
  }

  const itens = ((inst.checklist_itens ?? []) as unknown as {
    id: string
    label: string
    obrigatorio: boolean
    ordem: number
    status: 'pendente' | 'feito' | 'nao_aplica'
    link_post: string | null
    observacao: string | null
    feito_em: string | null
    operador: { nome: string } | { nome: string }[] | null
  }[]).map((item) => ({
    ...item,
    operador: Array.isArray(item.operador)
      ? (item.operador[0] as { nome: string } | undefined) ?? null
      : item.operador as { nome: string } | null,
  }))

  const feitos = itens.filter((i) => i.status === 'feito').length
  const obrigatoriosPendentes = itens.filter(
    (i) => i.obrigatorio && i.status === 'pendente',
  ).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Voltar + ações */}
      <div className="flex items-center justify-between">
        <Link
          href="/checklist"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Checklists
        </Link>
        {isCoord && <DeleteInstanciaButton instanciaId={inst.id} />}
      </div>

      {/* Header */}
      <div>
        {t && (
          <p className="text-xs uppercase tracking-widest text-[var(--accent)]">
            {tipoLabel[t.tipo] ?? t.tipo}
          </p>
        )}
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{subtitulo}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--muted-foreground)]">
          {dia && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {dia.nome_dia}
              {horario && (
                <> · {new Date(horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </span>
          )}
          {responsavel && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {responsavel.nome}
            </span>
          )}
          <span className="ml-auto font-semibold tabular-nums">
            {feitos}/{itens.length} feitos
          </span>
          {obrigatoriosPendentes > 0 && (
            <span className="text-orange-400 text-xs">
              {obrigatoriosPendentes} obrigatório{obrigatoriosPendentes !== 1 ? 's' : ''} pendente{obrigatoriosPendentes !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="cia-gold-rule" />

      {itens.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Este checklist não tem itens. Verifique se foi criado corretamente.
        </p>
      ) : (
        <ChecklistUI instanciaId={inst.id} itens={itens} isCoord={isCoord} />
      )}
    </div>
  )
}
