import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Mail, Phone, User, ExternalLink, Pencil } from 'lucide-react'
import { EscopoClient } from './EscopoClient'

interface Props {
  params: Promise<{ id: string }>
}

const COTA_STYLE: Record<string, string> = {
  Master: 'bg-[var(--gold-dim)]/20 text-[var(--gold)] border-[var(--gold-dim)]/40',
  Ouro:   'bg-yellow-900/20 text-yellow-400 border-yellow-700/30',
  Prata:  'bg-slate-800/40 text-slate-300 border-slate-600/30',
  Apoio:  'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
}

const STATUS_CONTEUDO: Record<string, { label: string; color: string }> = {
  rascunho:    { label: 'Rascunho',    color: 'text-[var(--muted-foreground)]' },
  em_producao: { label: 'Em produção', color: 'text-blue-400' },
  publicado:   { label: 'Publicado',   color: 'text-[var(--green-bright)]' },
  arquivado:   { label: 'Arquivado',   color: 'text-[var(--muted-foreground)]/60' },
  cancelado:   { label: 'Cancelado',   color: 'text-red-400' },
}

export default async function PatrocinadorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: pat }, { data: escopoRaw }, { data: conteudosRaw }] = await Promise.all([
    supabase
      .from('patrocinadores')
      .select('id, nome, slug, logo_url, cor_marca, cota, contato_nome, contato_email, contato_telefone, observacoes, ativo')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('escopo_itens')
      .select('id, tipo_conteudo, canal, quantidade_prevista, descricao, prazo_limite, status')
      .eq('patrocinador_id', id)
      .order('criado_em'),
    supabase
      .from('conteudos')
      .select('id, titulo, tipo, status, canal_publicacao, dia:dias_evento(nome_dia)')
      .eq('patrocinador_id', id)
      .order('criado_em', { ascending: false })
      .limit(20),
  ])

  if (!pat) notFound()

  const escopo = (escopoRaw ?? []) as {
    id: string; tipo_conteudo: string | null; canal: string | null
    quantidade_prevista: number; descricao: string | null
    prazo_limite: string | null; status: string
  }[]

  const conteudos = (conteudosRaw ?? []).map((c) => ({
    ...c,
    dia: c.dia as unknown as { nome_dia: string } | null,
  }))

  const cotaStyle = pat.cota ? (COTA_STYLE[pat.cota] ?? COTA_STYLE.Apoio) : COTA_STYLE.Apoio

  return (
    <div className="space-y-8">
      {/* ── Voltar ──────────────────────────────────────────────── */}
      <div>
        <Link
          href="/admin/patrocinadores"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Patrocinadores
        </Link>
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-5">
        {/* Logo / iniciais */}
        {pat.logo_url ? (
          <img
            src={pat.logo_url}
            alt={pat.nome}
            className="h-16 w-16 shrink-0 rounded-xl border border-[var(--border)] object-contain bg-white p-1"
          />
        ) : (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-xl font-bold text-white"
            style={{ background: pat.cor_marca ?? 'var(--green-dim)' }}
          >
            {pat.nome.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{pat.nome}</h1>
            {pat.cota && (
              <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${cotaStyle}`}>
                {pat.cota}
              </span>
            )}
            {!pat.ativo && (
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-0.5 text-xs text-[var(--muted-foreground)]">
                Inativo
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
            {pat.contato_nome && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {pat.contato_nome}
              </span>
            )}
            {pat.contato_email && (
              <a href={`mailto:${pat.contato_email}`} className="flex items-center gap-1.5 hover:text-[var(--foreground)]">
                <Mail className="h-3.5 w-3.5" />
                {pat.contato_email}
              </a>
            )}
            {pat.contato_telefone && (
              <a href={`tel:${pat.contato_telefone}`} className="flex items-center gap-1.5 hover:text-[var(--foreground)]">
                <Phone className="h-3.5 w-3.5" />
                {pat.contato_telefone}
              </a>
            )}
          </div>

          {pat.observacoes && (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{pat.observacoes}</p>
          )}
        </div>

        <Link
          href={`/admin/patrocinadores?edit=${id}`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar dados
        </Link>
      </div>

      {/* ── Escopo de entregas ──────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Escopo</p>
            <h2 className="mt-0.5 text-lg font-bold">Entregas contratadas</h2>
          </div>
        </div>
        <EscopoClient patrocinadorId={id} items={escopo} />
      </section>

      {/* ── Conteúdos vinculados ─────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Pipeline</p>
            <h2 className="mt-0.5 text-lg font-bold">Conteúdos vinculados</h2>
          </div>
          <Link
            href="/conteudos"
            className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver tudo
          </Link>
        </div>

        {conteudos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum conteúdo vinculado a este patrocinador.</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
              Crie conteúdos em{' '}
              <Link href="/conteudos" className="underline hover:text-[var(--accent)]">
                /conteudos
              </Link>{' '}
              e vincule ao criar o card.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {conteudos.map((c) => {
              const st = STATUS_CONTEUDO[c.status] ?? { label: c.status, color: 'text-[var(--muted-foreground)]' }
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/60 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.titulo}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {c.tipo?.replace(/_/g, ' ')}
                      {c.dia ? ` · ${c.dia.nome_dia}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${st.color}`}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
