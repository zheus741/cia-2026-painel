'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { atualizarCaptacao } from './actions'
import { setStatus } from '@/app/conteudos/actions'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Pessoa {
  nome: string
  foto_url: string | null
}

export interface ConteudoDetalhe {
  id: string
  titulo: string
  tipo: string
  status: string
  prioridade: number
  horario_previsto: string | null
  briefing: string | null
  canal: string | null
  myRoles: string[]
  dia: { nome_dia: string; data: string } | null
  setor: { nome: string } | null
  patrocinador: { nome: string } | null
  vinculadoA: string | null
  captacao: Pessoa | null
  design: Pessoa | null
  edicao: Pessoa | null
  captacao_id: string | null
}

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho:    { label: 'Rascunho',    color: 'text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]' },
  em_producao: { label: 'Em produção', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  publicado:   { label: 'Publicado',   color: 'text-[var(--green-bright)] bg-[var(--green)]/10 border-[var(--green)]/30' },
}

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  reels:            { label: 'Reels',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  feed:             { label: 'Feed',    color: 'bg-[var(--green)]/15 text-[var(--green-bright)] border-[var(--green)]/30' },
  stories:          { label: 'Stories', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  material_youtube: { label: 'YouTube', color: 'bg-red-50 text-red-600 border-red-200' },
  foto:             { label: 'Foto',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  video:            { label: 'Vídeo',   color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
}

function parseTipos(tipo: string | null): string[] {
  if (!tipo) return []
  return tipo.split(',').map(t => t.trim()).filter(Boolean)
}

function getIniciais(nome: string) {
  const parts = nome.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}

function fmtDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
}

function prioridadeInfo(p: number): { label: string; dot: string } {
  if (p <= 2) return { label: 'Alta',  dot: 'bg-red-500' }
  if (p === 3) return { label: 'Média', dot: 'bg-amber-400' }
  return { label: 'Baixa', dot: 'bg-[var(--green-bright)]' }
}

// ── Field row ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <span
        className="w-28 shrink-0 pt-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1 text-[13px]" style={{ color: 'var(--foreground)' }}>
        {children}
      </div>
    </div>
  )
}

function Vazio() {
  return <span style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>—</span>
}

function PessoaCell({ pessoa }: { pessoa: Pessoa | null }) {
  if (!pessoa) return <Vazio />
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border)]"
        style={{ background: 'rgba(46,107,66,0.15)' }}
      >
        {pessoa.foto_url ? (
          <Image src={pessoa.foto_url} alt={pessoa.nome} fill sizes="24px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-[var(--green-bright)]">
            {getIniciais(pessoa.nome)}
          </div>
        )}
      </div>
      <span>{pessoa.nome}</span>
    </div>
  )
}

// ── StatusSelector — operador designado atualiza o status ────────────────────

const STATUS_OPTS: { value: string; label: string; color: string }[] = [
  { value: 'rascunho',     label: 'Rascunho',     color: 'text-[var(--muted-foreground)]' },
  { value: 'em_producao',  label: 'Em produção',  color: 'text-blue-600' },
  { value: 'pronto',       label: 'Pronto',       color: 'text-amber-600' },
  { value: 'publicado',    label: 'Publicado',    color: 'text-[var(--green-bright)]' },
]

function StatusSelector({
  conteudoId,
  current,
}: {
  conteudoId: string
  current: string
}) {
  const [value, setValue] = useState(current)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setValue(next)
    setSaved(false)
    setErr(null)
    startTransition(async () => {
      const res = await setStatus(conteudoId, next)
      if (res.ok) setSaved(true)
      else setErr(res.error ?? 'Erro ao salvar')
    })
  }

  const opt = STATUS_OPTS.find(o => o.value === value)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--green)] disabled:opacity-50"
      >
        {STATUS_OPTS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {pending && <span className="text-[11px] text-[var(--muted-foreground)]">Salvando…</span>}
      {saved && !pending && <span className="text-[11px] text-[var(--green-bright)] font-semibold">✓ Salvo</span>}
      {err && <span className="text-[11px] text-red-500">{err}</span>}
    </div>
  )
}

// ── CaptacaoSelector — só aparece para lider_fv ───────────────────────────────

function CaptacaoSelector({
  conteudoId,
  current,
  operadores,
}: {
  conteudoId: string
  current: { id?: string; nome: string; foto_url: string | null } | null
  operadores: { id: string; nome: string; foto_url: string | null }[]
}) {
  const [value, setValue] = useState(current ? operadores.find(o => o.nome === current.nome)?.id ?? '' : '')
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value || null
    setValue(e.target.value)
    setErr(null)
    setSaved(false)
    startTransition(async () => {
      const res = await atualizarCaptacao(conteudoId, newId)
      if (res.ok) setSaved(true)
      else setErr(res.error ?? 'Erro ao salvar')
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--green)] disabled:opacity-50"
      >
        <option value="">— sem responsável —</option>
        {operadores.map(o => (
          <option key={o.id} value={o.id}>{o.nome}</option>
        ))}
      </select>
      {pending && <span className="text-[11px] text-[var(--muted-foreground)]">Salvando…</span>}
      {saved  && !pending && <span className="text-[11px] text-[var(--green-bright)] font-semibold">✓ Salvo</span>}
      {err    && <span className="text-[11px] text-red-500">{err}</span>}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────────

export function ConteudoDetalheModal({
  conteudo,
  onClose,
  userRole,
  userId,
  operadoresFV = [],
}: {
  conteudo: ConteudoDetalhe | null
  onClose: () => void
  userRole?: string
  userId?: string
  operadoresFV?: { id: string; nome: string; foto_url: string | null }[]
}) {
  if (!conteudo) return null

  const c = conteudo
  const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.rascunho
  const tipos = parseTipos(c.tipo)
  const prio = prioridadeInfo(c.prioridade)
  const podeEditarCaptacao = userRole === 'lider_fv' || userRole === 'lider_area' || userRole === 'coordenacao' || userRole === 'admin'
  // Operador designado pode atualizar o status
  const eOperadorDesignado = !!userId && userId === c.captacao_id

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {tipos.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1">
              {tipos.map(t => (
                <span
                  key={t}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[9px] font-bold',
                    TIPO_CONFIG[t]?.color ?? 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
                  )}
                >
                  {TIPO_CONFIG[t]?.label ?? t}
                </span>
              ))}
            </div>
          )}
          <DialogTitle className="pr-6 text-[var(--foreground)]">{c.titulo}</DialogTitle>
        </DialogHeader>

        <div className="-mt-1">
          <Field label="Status">
            {eOperadorDesignado ? (
              <StatusSelector conteudoId={c.id} current={c.status} />
            ) : (
              <span className={cn('inline-block rounded border px-2 py-0.5 text-[10px] font-bold', statusCfg.color)}>
                {statusCfg.label}
              </span>
            )}
          </Field>

          <Field label="Prioridade">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', prio.dot)} />
              {prio.label}
            </span>
          </Field>

          <Field label="Dia">
            {c.dia ? `${c.dia.nome_dia} · ${fmtDate(c.dia.data)}` : <Vazio />}
          </Field>

          <Field label="Horário">
            {c.horario_previsto
              ? <span className="font-mono font-semibold" style={{ color: 'var(--gold)' }}>{c.horario_previsto}</span>
              : <Vazio />}
          </Field>

          <Field label="Canal">{c.canal || <Vazio />}</Field>
          <Field label="Setor">{c.setor?.nome || <Vazio />}</Field>
          <Field label="Patrocinador">{c.patrocinador?.nome || <Vazio />}</Field>
          <Field label="Vinculado a">{c.vinculadoA || <Vazio />}</Field>

          {/* Captação: editável para lider_fv+, read-only para os demais */}
          <Field label="Captação">
            {podeEditarCaptacao ? (
              <div className="space-y-1">
                <CaptacaoSelector
                  conteudoId={c.id}
                  current={c.captacao}
                  operadores={operadoresFV}
                />
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Só este campo pode ser alterado aqui.
                </p>
              </div>
            ) : (
              <PessoaCell pessoa={c.captacao} />
            )}
          </Field>

          <Field label="Design"><PessoaCell pessoa={c.design} /></Field>
          <Field label="Edição"><PessoaCell pessoa={c.edicao} /></Field>

          <Field label="Briefing">
            {c.briefing
              ? <p className="whitespace-pre-wrap leading-relaxed">{c.briefing}</p>
              : <span style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>Vazio</span>}
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}
