'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle, ChevronRight,
  ChevronLeft, Search, Filter, Eye, Calendar, Layers,
  ExternalLink, Clock, Tag, Handshake, Radio, MapPin,
  Star, Trophy, CheckCircle2, Camera, Palette, Film,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  createConteudo, updateConteudo, deleteConteudo, setStatus,
  type ConteudoPayload,
} from './actions'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Perfil    { id: string; nome: string; foto_url: string | null }
export interface Dia       { id: string; nome_dia: string; data: string }
export interface Setor     { id: string; nome: string }
export interface Patrocin  { id: string; nome: string }

export interface Conteudo {
  id:                      string
  titulo:                  string
  tipo:                    string
  status:                  string
  prioridade:              number
  dia_id:                  string | null
  setor_id:                string | null
  patrocinador_id:         string | null
  jogo_id:                 string | null
  show_id:                 string | null
  festa_id:                string | null
  modalidade_id:           string | null
  canal_publicacao:        string | null
  briefing:                string | null
  horario_previsto:        string | null
  link_publicado:          string | null
  responsavel_captacao_id: string | null
  responsavel_design_id:   string | null
  responsavel_edicao_id:   string | null
  dia?:             { nome_dia: string; data: string } | null
  setor?:           { nome: string } | null
  patrocinador?:    { nome: string } | null
  jogo?:            { equipe_a_nome: string; equipe_b_nome: string; modalidade?: { nome: string; icone?: string } | null } | null
  show?:            { nome: string; inicio?: string } | null
  festa?:           { nome: string; tema?: string; inicio?: string } | null
  modalidade?:      { nome: string; icone?: string } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUNAS = [
  { status: 'rascunho',    label: 'Rascunho',    color: 'text-[var(--muted-foreground)]', dot: 'bg-[var(--muted-foreground)]' },
  { status: 'em_producao', label: 'Em produção', color: 'text-blue-400',                 dot: 'bg-blue-400' },
  { status: 'publicado',   label: 'Publicado',   color: 'text-[var(--green-bright)]',     dot: 'bg-[var(--green-bright)]' },
  { status: 'arquivado',   label: 'Arquivado',   color: 'text-[var(--muted-foreground)]', dot: 'bg-[var(--muted-foreground)]' },
]

const NEXT_STATUS: Record<string, string> = {
  rascunho:    'em_producao',
  em_producao: 'publicado',
  publicado:   'arquivado',
}
const PREV_STATUS: Record<string, string> = {
  em_producao: 'rascunho',
  publicado:   'em_producao',
  arquivado:   'em_producao',
}

const TIPO_LABEL: Record<string, string> = {
  story_rapido:      'Story Rápido',
  story_editado:     'Story Edit.',
  reels:             'Reels',
  card_feed:         'Card Feed',
  card_patrocinado:  'Card Patro.',
  texto_legenda:     'Legenda',
  repost:            'Repost',
  cobertura_ao_vivo: 'Live',
}

const TIPO_COLOR: Record<string, string> = {
  story_rapido:      'bg-blue-500/15 text-blue-300 border-blue-500/30',
  story_editado:     'bg-blue-500/15 text-blue-300 border-blue-500/30',
  reels:             'bg-purple-500/15 text-purple-300 border-purple-500/30',
  card_feed:         'bg-[var(--green)]/15 text-[var(--green-bright)] border-[var(--green)]/30',
  card_patrocinado:  'bg-[var(--gold-dim)]/20 text-[var(--gold)] border-[var(--gold-dim)]/40',
  texto_legenda:     'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  repost:            'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  cobertura_ao_vivo: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho:    { label: 'Rascunho',    color: 'text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]' },
  em_producao: { label: 'Em produção', color: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
  publicado:   { label: 'Publicado',   color: 'text-[var(--green-bright)] bg-[var(--green)]/10 border-[var(--green)]/30' },
  arquivado:   { label: 'Arquivado',   color: 'text-[var(--muted-foreground)] bg-[var(--muted)]/50 border-[var(--border)]/50' },
  cancelado:   { label: 'Cancelado',   color: 'text-red-400 bg-red-500/10 border-red-500/30' },
}

const PRIORIDADE_COLOR: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-blue-400',
  5: 'bg-[var(--muted-foreground)]',
}

const PRIORIDADE_LABEL: Record<number, string> = {
  1: '🔴 Alta',
  2: '🟠 Importante',
  3: '🟡 Normal',
  4: '🔵 Baixa',
  5: '⚪ Quando der',
}

const TIPO_CONTEUDO_OPTIONS = [
  { value: 'story_rapido',      label: 'Story Rápido' },
  { value: 'story_editado',     label: 'Story Editado' },
  { value: 'reels',             label: 'Reels' },
  { value: 'card_feed',         label: 'Card Feed' },
  { value: 'card_patrocinado',  label: 'Card Patrocinado' },
  { value: 'texto_legenda',     label: 'Texto / Legenda' },
  { value: 'repost',            label: 'Repost' },
  { value: 'cobertura_ao_vivo', label: 'Cobertura Ao Vivo' },
]

// ── Canais: cor de destaque (borda topo do card) + badge ─────────────────────
const CANAL_CONFIG: Record<string, {
  label:  string
  cor:    string   // hex — borda topo do card
  badge:  string   // tailwind classes do badge
}> = {
  instagram_cia:       { label: 'Instagram CIA',        cor: '#E1306C', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  tiktok_cia:          { label: 'TikTok CIA',           cor: '#69C9D0', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  instagram_exp:       { label: 'Instagram EXP',        cor: '#A855F7', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  instagram_grupo_exp: { label: 'Instagram Grupo EXP',  cor: '#7C3AED', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  tiktok_exp:          { label: 'TikTok EXP',           cor: '#EE1D52', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  instagram_nix:       { label: 'Instagram NIX',         cor: '#F97316', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  x_cia:               { label: 'X CIA',                cor: '#94A3B8', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  youtube_exp:         { label: 'YouTube EXP',           cor: '#EF4444', badge: 'bg-red-500/20 text-red-300 border-red-500/40' },
}

const CANAL_OPTIONS = Object.entries(CANAL_CONFIG).map(([value, { label }]) => ({ value, label }))

// ── Ordenação cronológica ─────────────────────────────────────────────────────
function sortCronologico(a: Conteudo, b: Conteudo): number {
  // Sem dia → vai ao final
  const diaA = a.dia?.data ?? '9999-99-99'
  const diaB = b.dia?.data ?? '9999-99-99'
  if (diaA !== diaB) return diaA.localeCompare(diaB)
  // Mesmo dia → ordena por horário (sem horário vai ao final do dia)
  const horA = a.horario_previsto ?? '99:99'
  const horB = b.horario_previsto ?? '99:99'
  if (horA !== horB) return horA.localeCompare(horB)
  // Desempate por prioridade
  return a.prioridade - b.prioridade
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nullIfNone(v: string): string | null {
  return v === '' || v === '__none__' ? null : v
}

function getCategoria(c: Conteudo): { label: string; emoji: string; color: string } | null {
  if (c.jogo)        return { label: 'Esportivo',   emoji: '🏆', color: 'text-green-400 bg-green-500/10 border-green-500/25' }
  if (c.show)        return { label: 'Show',         emoji: '🎤', color: 'text-purple-400 bg-purple-500/10 border-purple-500/25' }
  if (c.festa)       return { label: 'Festivo',      emoji: '🎉', color: 'text-pink-400 bg-pink-500/10 border-pink-500/25' }
  if (c.patrocinador)return { label: 'Patrocinado',  emoji: '🤝', color: 'text-[var(--gold)] bg-[var(--gold-dim)]/20 border-[var(--gold-dim)]/30' }
  if (c.modalidade)  return { label: c.modalidade.nome, emoji: c.modalidade.icone ?? '🏅', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' }
  return null
}

function getVinculo(c: Conteudo): string | null {
  if (c.jogo)  return `${c.jogo.equipe_a_nome} × ${c.jogo.equipe_b_nome}`
  if (c.show)  return c.show.nome
  if (c.festa) return c.festa.tema ? `${c.festa.nome} · ${c.festa.tema}` : c.festa.nome
  return null
}

function formatHorario(raw: string | null | undefined): string {
  if (!raw) return ''
  if (raw.includes('T')) {
    return new Date(raw).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  }
  return raw
}

// ── Mini avatar ───────────────────────────────────────────────────────────────

function MiniAvatar({ perfil, size = 20 }: { perfil: Perfil; size?: number }) {
  const initials = perfil.nome.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      title={perfil.nome}
      className="shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border)]"
      style={{ width: size, height: size, background: 'rgba(45,90,61,0.5)' }}
    >
      {perfil.foto_url ? (
        <Image src={perfil.foto_url} alt={perfil.nome} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-[var(--green-bright)]">
          {initials}
        </div>
      )}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ConteudoCard({
  c, perfis, onEdit, onDelete, onMove, onView, isBeingDragged,
}: {
  c: Conteudo
  perfis: Perfil[]
  onEdit: () => void
  onDelete: () => void
  onMove: (status: string) => void
  onView: () => void
  isBeingDragged: boolean
}) {
  const hasPrev = !!PREV_STATUS[c.status]
  const hasNext = !!NEXT_STATUS[c.status]
  const canalCfg = c.canal_publicacao ? CANAL_CONFIG[c.canal_publicacao] : null

  // Responsáveis via lookup local no array de perfis
  const findPerfil = (id: string | null) => id ? perfis.find(p => p.id === id) ?? null : null
  const assignees = [
    findPerfil(c.responsavel_captacao_id),
    findPerfil(c.responsavel_design_id),
    findPerfil(c.responsavel_edicao_id),
  ]
    .filter((p): p is Perfil => !!p)
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i) // dedup

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: c.id, srcStatus: c.status }))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onView}
      className={cn(
        'group relative rounded-lg border border-[var(--border)] bg-[var(--card)] p-3',
        'cursor-grab active:cursor-grabbing select-none',
        'transition-all hover:border-[var(--green)]/40 hover:shadow-[0_0_12px_rgba(74,138,92,0.08)]',
        isBeingDragged && 'opacity-30 scale-[0.97] border-dashed pointer-events-none',
      )}
      style={canalCfg ? { borderTop: `2px solid ${canalCfg.cor}` } : undefined}
    >
      {/* Priority stripe */}
      <div
        className={cn('absolute left-0 top-3 w-1 rounded-r', PRIORIDADE_COLOR[c.prioridade] ?? 'bg-[var(--muted)]')}
        style={{ height: 28 }}
      />

      <div className="pl-2">
        {/* Tipo + Título */}
        <div className="flex items-start gap-2">
          <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide', TIPO_COLOR[c.tipo] ?? '')}>
            {TIPO_LABEL[c.tipo] ?? c.tipo}
          </span>
          <p className="flex-1 text-xs font-medium leading-snug text-[var(--foreground)] line-clamp-2">{c.titulo}</p>
        </div>

        {/* Canal badge */}
        {canalCfg && (
          <div className="mt-1.5">
            <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide', canalCfg.badge)}>
              {canalCfg.label}
            </span>
          </div>
        )}

        {/* Meta: dia, horário, patrocinador */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
          {c.dia && <span>📅 {c.dia.nome_dia}</span>}
          {c.horario_previsto && (
            <span className="font-mono font-semibold text-[var(--gold)]">⏰ {formatHorario(c.horario_previsto)}</span>
          )}
          {c.patrocinador && <span className="text-[var(--gold)]">🤝 {c.patrocinador.nome}</span>}
          {c.link_publicado && (
            <a
              href={c.link_publicado}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--green-bright)] underline underline-offset-2"
            >
              ver post
            </a>
          )}
        </div>

        {/* Responsáveis (avatares) */}
        {assignees.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {assignees.map(p => <MiniAvatar key={p.id} perfil={p} />)}
          </div>
        )}

        {/* Actions — aparecem no hover */}
        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {hasPrev && (
            <button
              title="Voltar status"
              onClick={(e) => { e.stopPropagation(); onMove(PREV_STATUS[c.status]) }}
              className="rounded p-1 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onView() }}
            title="Ver detalhes"
            className="rounded p-1 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--green-bright)]"
          >
            <Eye className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            title="Editar"
            className="rounded p-1 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="Excluir"
            className="rounded p-1 hover:bg-red-500/20 text-[var(--muted-foreground)] hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          {hasNext && (
            <button
              title="Avançar status"
              onClick={(e) => { e.stopPropagation(); onMove(NEXT_STATUS[c.status]) }}
              className="ml-auto rounded p-1 hover:bg-[var(--green)]/20 text-[var(--muted-foreground)] hover:text-[var(--green-bright)]"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── View dialog — property rows ───────────────────────────────────────────────

function PropRow({
  icon: Icon, label, children, accent,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className="grid items-center gap-3 border-b border-[var(--border)]/50 px-4 py-2.5 last:border-0"
      style={{ gridTemplateColumns: '14px 110px 1fr' }}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', accent ? 'text-[var(--gold)]' : 'text-[var(--muted-foreground)]')} />
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

function Empty() {
  return <span className="text-[11px] italic text-[var(--muted-foreground)]/40">Vazio</span>
}

function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold',
      color ?? 'text-[var(--foreground)] bg-[var(--muted)] border-[var(--border)]',
    )}>
      {children}
    </span>
  )
}

function PersonRow({ perfil, label }: { perfil: Perfil | null | undefined; label: string }) {
  if (!perfil) return null
  const initials = perfil.nome.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--green-dim)]/60"
        style={{ width: 24, height: 24, background: 'rgba(45,90,61,0.5)' }}
      >
        {perfil.foto_url ? (
          <Image src={perfil.foto_url} alt={perfil.nome} fill sizes="24px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-[var(--green-bright)]">
            {initials}
          </div>
        )}
      </div>
      <span className="text-[11px] font-semibold text-[var(--foreground)]">{perfil.nome}</span>
    </div>
  )
}

function ConteudoViewDialog({
  conteudo, perfis, onClose, onEdit, onDelete,
}: {
  conteudo: Conteudo | null
  perfis: Perfil[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  if (!conteudo) return null
  const c = conteudo
  const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.rascunho
  const categoria = getCategoria(c)
  const vinculo   = getVinculo(c)
  const findPerfil = (id: string | null) => id ? perfis.find(p => p.id === id) ?? null : null
  const captacao = findPerfil(c.responsavel_captacao_id)
  const design   = findPerfil(c.responsavel_design_id)
  const edicao   = findPerfil(c.responsavel_edicao_id)

  return (
    <Dialog open={!!conteudo} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="max-w-[480px] max-h-[92vh] overflow-y-auto p-0 gap-0"
        style={{ background: 'rgba(8,16,9,0.98)' }}
      >
        {/* Título */}
        <div className="border-b border-[var(--border)] px-5 pt-5 pb-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold tracking-wide', TIPO_COLOR[c.tipo] ?? '')}>
              {TIPO_LABEL[c.tipo] ?? c.tipo}
            </span>
            <span className="font-mono text-[10px] text-[var(--muted-foreground)]/50">
              #{c.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
          <h2
            className="text-base font-bold leading-snug text-[var(--foreground)]"
            style={{ fontFamily: 'Orbitron, monospace', letterSpacing: '0.04em' }}
          >
            {c.titulo}
          </h2>
        </div>

        {/* Propriedades */}
        <div>
          <PropRow icon={CheckCircle2} label="Status">
            <Pill color={statusCfg.color}>{statusCfg.label}</Pill>
          </PropRow>

          <PropRow icon={Star} label="Prioridade">
            {c.prioridade ? <Pill>{PRIORIDADE_LABEL[c.prioridade]}</Pill> : <Empty />}
          </PropRow>

          <PropRow icon={Calendar} label="Dia">
            {c.dia
              ? <span className="text-[11px] font-semibold text-[var(--foreground)]">{c.dia.nome_dia} · <span className="font-mono text-[var(--muted-foreground)]">{c.dia.data}</span></span>
              : <Empty />}
          </PropRow>

          <PropRow icon={Clock} label="Horário" accent>
            {c.horario_previsto
              ? <span className="font-mono text-base font-bold tracking-widest text-[var(--gold)]">{formatHorario(c.horario_previsto)}</span>
              : <Empty />}
          </PropRow>

          <PropRow icon={Trophy} label="Categoria">
            {categoria ? <Pill color={categoria.color}>{categoria.emoji} {categoria.label}</Pill> : <Empty />}
          </PropRow>

          <PropRow icon={Layers} label="Vinculado a">
            {vinculo
              ? <span className="text-[11px] font-semibold text-[var(--foreground)]">{vinculo}</span>
              : <Empty />}
          </PropRow>

          <PropRow icon={Radio} label="Canal">
            {c.canal_publicacao
              ? <Pill color={CANAL_CONFIG[c.canal_publicacao]?.badge}>
                  {CANAL_CONFIG[c.canal_publicacao]?.label ?? c.canal_publicacao}
                </Pill>
              : <Empty />}
          </PropRow>

          <PropRow icon={MapPin} label="Setor">
            {c.setor
              ? <span className="text-[11px] font-semibold text-[var(--foreground)]">{c.setor.nome}</span>
              : <Empty />}
          </PropRow>

          <PropRow icon={Handshake} label="Patrocinador" accent={!!c.patrocinador}>
            {c.patrocinador
              ? <Pill color="text-[var(--gold)] bg-[var(--gold-dim)]/20 border-[var(--gold-dim)]/30">🤝 {c.patrocinador.nome}</Pill>
              : <Empty />}
          </PropRow>

          {/* ── Responsáveis ────────────────────────────── */}
          <PropRow icon={Camera} label="Captação">
            {captacao ? <PersonRow perfil={captacao} label="Captação" /> : <Empty />}
          </PropRow>

          <PropRow icon={Palette} label="Design">
            {design ? <PersonRow perfil={design} label="Design" /> : <Empty />}
          </PropRow>

          <PropRow icon={Film} label="Edição">
            {edicao ? <PersonRow perfil={edicao} label="Edição" /> : <Empty />}
          </PropRow>
        </div>

        {/* Briefing */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Briefing</p>
          {c.briefing
            ? <p className="whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2.5 text-[12px] leading-relaxed text-[var(--foreground)]">{c.briefing}</p>
            : <p className="text-xs italic text-[var(--muted-foreground)]/40">Sem briefing — adicione via edição.</p>}
        </div>

        {/* Link publicado */}
        {c.link_publicado && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <a
              href={c.link_publicado}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 px-3 py-2 text-xs text-[var(--green-bright)] hover:border-[var(--green)]/40 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{c.link_publicado}</span>
            </a>
          </div>
        )}

        {/* Footer */}
        <div
          className="sticky bottom-0 flex items-center justify-between border-t border-[var(--border)] px-5 py-3"
          style={{ background: 'rgba(6,12,7,0.97)', backdropFilter: 'blur(12px)' }}
        >
          <Button variant="destructive" size="sm" onClick={() => { onClose(); setTimeout(onDelete, 150) }} className="text-xs">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
          <Button size="sm" onClick={() => { onClose(); setTimeout(onEdit, 150) }}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Create/Edit dialog ────────────────────────────────────────────────────────

function PerfisSelect({
  label, value, onChange, perfis, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  perfis: Perfil[]
  placeholder?: string
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder ?? '— ninguém —'} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— ninguém —</SelectItem>
          {perfis.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface ConteudoDialogProps {
  open: boolean
  onClose: () => void
  edicaoId: string
  dias: Dia[]
  setores: Setor[]
  patrocinadores: Patrocin[]
  perfis: Perfil[]
  editing?: Conteudo
  defaultStatus?: string
}

function ConteudoDialog({ open, onClose, edicaoId, dias, setores, patrocinadores, perfis, editing, defaultStatus }: ConteudoDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError]     = React.useState<string | null>(null)

  const [titulo, setTitulo]         = React.useState(editing?.titulo ?? '')
  const [tipo, setTipo]             = React.useState(editing?.tipo ?? 'story_rapido')
  const [status, setStatus_]        = React.useState(editing?.status ?? defaultStatus ?? 'rascunho')
  const [prioridade, setPrioridade] = React.useState(String(editing?.prioridade ?? 3))
  const [diaId, setDiaId]           = React.useState(editing?.dia_id ?? '')
  const [horario, setHorario]       = React.useState(editing?.horario_previsto ?? '')
  const [setorId, setSetorId]       = React.useState(editing?.setor_id ?? '')
  const [patroId, setPatroId]       = React.useState(editing?.patrocinador_id ?? '')
  const [canal, setCanal]           = React.useState(editing?.canal_publicacao ?? '')
  const [briefing, setBriefing]     = React.useState(editing?.briefing ?? '')
  const [link, setLink]             = React.useState(editing?.link_publicado ?? '')
  const [captacaoId, setCaptacaoId] = React.useState(editing?.responsavel_captacao_id ?? '')
  const [designId, setDesignId]     = React.useState(editing?.responsavel_design_id ?? '')
  const [edicaoId2, setEdicaoId2]   = React.useState(editing?.responsavel_edicao_id ?? '')

  React.useEffect(() => {
    if (!open) return
    setError(null); setLoading(false)
    setTitulo(editing?.titulo ?? '')
    setTipo(editing?.tipo ?? 'story_rapido')
    setStatus_(editing?.status ?? defaultStatus ?? 'rascunho')
    setPrioridade(String(editing?.prioridade ?? 3))
    setDiaId(editing?.dia_id ?? '')
    setHorario(editing?.horario_previsto ?? '')
    setSetorId(editing?.setor_id ?? '')
    setPatroId(editing?.patrocinador_id ?? '')
    setCanal(editing?.canal_publicacao ?? '')
    setBriefing(editing?.briefing ?? '')
    setLink(editing?.link_publicado ?? '')
    setCaptacaoId(editing?.responsavel_captacao_id ?? '')
    setDesignId(editing?.responsavel_design_id ?? '')
    setEdicaoId2(editing?.responsavel_edicao_id ?? '')
  }, [open, editing, defaultStatus])

  async function submit() {
    if (!titulo.trim()) { setError('Título obrigatório.'); return }
    setLoading(true); setError(null)
    try {
      const payload: ConteudoPayload & { link_publicado?: string } = {
        edicao_id:               edicaoId,
        titulo:                  titulo.trim(),
        tipo,
        status,
        prioridade:              Number(prioridade),
        dia_id:                  nullIfNone(diaId),
        horario_previsto:        horario || null,
        setor_id:                nullIfNone(setorId),
        patrocinador_id:         nullIfNone(patroId),
        canal_publicacao:        nullIfNone(canal),
        briefing:                briefing || null,
        responsavel_captacao_id: nullIfNone(captacaoId),
        responsavel_design_id:   nullIfNone(designId),
        responsavel_edicao_id:   nullIfNone(edicaoId2),
        ...(link ? { link_publicado: link } : {}),
      }
      const res = editing ? await updateConteudo(editing.id, payload) : await createConteudo(payload)
      if (!res.ok) { setError(res.error ?? 'Erro ao salvar.'); return }
      router.refresh()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar conteúdo' : 'Novo conteúdo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <Label className="mb-1.5 block text-xs">Título *</Label>
            <Input className="text-sm" placeholder="Ex: Highlights Futsal Masculino Quinta" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          {/* Tipo + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_CONTEUDO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus_}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="em_producao">Em produção</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dia + Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Dia</Label>
              <Select value={diaId} onValueChange={setDiaId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— dia —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem dia</SelectItem>
                  {dias.map(d => <SelectItem key={d.id} value={d.id}>{d.nome_dia} · {d.data}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-xs text-[var(--gold)]">
                <Clock className="h-3 w-3" /> Horário *
              </Label>
              <Input
                type="time"
                className="h-8 font-mono text-xs"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              />
            </div>
          </div>

          {/* Prioridade + Canal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">🔴 1 — Alta</SelectItem>
                  <SelectItem value="2">🟠 2 — Importante</SelectItem>
                  <SelectItem value="3">🟡 3 — Normal</SelectItem>
                  <SelectItem value="4">🔵 4 — Baixa</SelectItem>
                  <SelectItem value="5">⚪ 5 — Quando der</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— canal —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Indefinido</SelectItem>
                  {CANAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Setor + Patrocinador */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Setor / Área</Label>
              <Select value={setorId} onValueChange={setSetorId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— setor —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Geral</SelectItem>
                  {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Patrocinador</Label>
              <Select value={patroId} onValueChange={setPatroId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— patro —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {patrocinadores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Responsáveis ─────────────────────────────────────────── */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              <span>Responsáveis</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <PerfisSelect label="📷 Captação" value={captacaoId} onChange={setCaptacaoId} perfis={perfis} />
              <PerfisSelect label="🎨 Design"   value={designId}   onChange={setDesignId}   perfis={perfis} />
              <PerfisSelect label="🎬 Edição"   value={edicaoId2}  onChange={setEdicaoId2}  perfis={perfis} />
            </div>
          </div>

          {/* Briefing */}
          <div>
            <Label className="mb-1.5 block text-xs">Briefing / Descrição</Label>
            <textarea
              className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
              rows={4}
              placeholder="O que precisa ser capturado, editado, publicado..."
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
            />
          </div>

          {/* Link publicado */}
          {(status === 'publicado' || editing?.link_publicado) && (
            <div>
              <Label className="mb-1.5 block text-xs">Link publicado</Label>
              <Input className="text-xs" placeholder="https://instagram.com/p/..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />{error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({
  col, conteudos, perfis, onAdd, onEdit, onDelete, onMove, onView,
  isDragOver, onDragOver, onDragLeave, onDrop, dragId,
}: {
  col: (typeof COLUNAS)[number]
  conteudos: Conteudo[]
  perfis: Perfil[]
  onAdd: () => void
  onEdit: (c: Conteudo) => void
  onDelete: (c: Conteudo) => void
  onMove: (c: Conteudo, status: string) => void
  onView: (c: Conteudo) => void
  isDragOver: boolean
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (cardId: string, srcStatus: string) => void
  dragId: string | null
}) {
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    try {
      const { id, srcStatus } = JSON.parse(e.dataTransfer.getData('text/plain'))
      onDrop(id, srcStatus)
    } catch { /* ignore */ }
  }

  return (
    <div
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border transition-all duration-150',
        isDragOver
          ? 'border-[var(--green)]/60 bg-[var(--green)]/5 shadow-[0_0_24px_rgba(74,138,92,0.12)]'
          : 'border-[var(--border)] bg-[var(--card)]/40',
      )}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className={cn('h-2 w-2 rounded-full', col.dot)} />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', col.color)}>{col.label}</span>
        <span className="ml-auto rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">
          {conteudos.length}
        </span>
        <button onClick={onAdd} title="Adicionar" className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col space-y-2 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {conteudos.length === 0 && !isDragOver ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-xs text-[var(--muted-foreground)]/60">Vazio</p>
            <button
              onClick={onAdd}
              className="rounded border border-dashed border-[var(--border)] px-3 py-1.5 text-[10px] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              + Adicionar
            </button>
          </div>
        ) : (
          conteudos.map(c => (
            <ConteudoCard
              key={c.id}
              c={c}
              perfis={perfis}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
              onMove={(s) => onMove(c, s)}
              onView={() => onView(c)}
              isBeingDragged={dragId === c.id}
            />
          ))
        )}

        {isDragOver && (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--green)]/50 py-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--green-bright)] animate-pulse">
            ✦ Soltar aqui
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main KanbanBoard ──────────────────────────────────────────────────────────

interface KanbanBoardProps {
  edicaoId:       string
  conteudos:      Conteudo[]
  dias:           Dia[]
  setores:        Setor[]
  patrocinadores: Patrocin[]
  perfis:         Perfil[]
}

export function KanbanBoard({ edicaoId, conteudos: initial, dias, setores, patrocinadores, perfis }: KanbanBoardProps) {
  const router = useRouter()
  const [conteudos, setConteudos] = React.useState(initial)
  const [search, setSearch]             = React.useState('')
  const [filterDia, setFilterDia]       = React.useState('')
  const [filterTipo, setFilterTipo]     = React.useState('')
  const [filterPerfil, setFilterPerfil] = React.useState('')
  const [filterCanal, setFilterCanal]   = React.useState('')

  const [dragId, setDragId]     = React.useState<string | null>(null)
  const [dragOver, setDragOver] = React.useState<string | null>(null)

  const [dialog, setDialog] = React.useState<{ open: boolean; editing?: Conteudo; defaultStatus?: string }>({ open: false })
  const [viewCard, setViewCard]         = React.useState<Conteudo | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Conteudo | null>(null)
  const [deleting, setDeleting]         = React.useState(false)
  const [moving, setMoving]             = React.useState<string | null>(null)

  React.useEffect(() => { setConteudos(initial) }, [initial])

  const filtered = React.useMemo(() => {
    let list = conteudos
    if (search)                        list = list.filter(c => c.titulo.toLowerCase().includes(search.toLowerCase()))
    if (filterDia && filterDia !== '__all__')     list = list.filter(c => c.dia_id === filterDia)
    if (filterTipo && filterTipo !== '__all__')   list = list.filter(c => c.tipo === filterTipo)
    if (filterPerfil && filterPerfil !== '__all__') {
      list = list.filter(c =>
        c.responsavel_captacao_id === filterPerfil ||
        c.responsavel_design_id   === filterPerfil ||
        c.responsavel_edicao_id   === filterPerfil
      )
    }
    if (filterCanal && filterCanal !== '__all__') {
      list = list.filter(c => c.canal_publicacao === filterCanal)
    }
    return list
  }, [conteudos, search, filterDia, filterTipo, filterPerfil, filterCanal])

  async function handleMove(c: Conteudo, status: string) {
    setMoving(c.id)
    const res = await setStatus(c.id, status)
    setMoving(null)
    if (res.ok) {
      setConteudos(prev => prev.map(x => x.id === c.id ? { ...x, status } : x))
      if (viewCard?.id === c.id) setViewCard(v => v ? { ...v, status } : v)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteConteudo(deleteTarget.id)
    setDeleting(false)
    setConteudos(prev => prev.filter(c => c.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  function handleDrop(colStatus: string, cardId: string, srcStatus: string) {
    if (srcStatus === colStatus) { setDragId(null); setDragOver(null); return }
    const card = conteudos.find(c => c.id === cardId)
    if (!card) return
    handleMove(card, colStatus)
    setDragId(null); setDragOver(null)
  }

  const total      = filtered.length
  const publicados = filtered.filter(c => c.status === 'publicado').length

  return (
    <div
      className="flex flex-col h-full"
      onDragEnd={() => { setDragId(null); setDragOver(null) }}
    >
      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-6 py-3 bg-[var(--card)]/40 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            className="h-8 w-52 rounded-md border border-[var(--border)] bg-[var(--card)] pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            placeholder="Buscar conteúdo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterDia} onValueChange={setFilterDia}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <Filter className="mr-1.5 h-3 w-3" /><SelectValue placeholder="Todos os dias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os dias</SelectItem>
            {dias.map(d => <SelectItem key={d.id} value={d.id}>{d.nome_dia}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {TIPO_CONTEUDO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPerfil} onValueChange={setFilterPerfil}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {perfis.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCanal} onValueChange={setFilterCanal}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os canais</SelectItem>
            {CANAL_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: CANAL_CONFIG[o.value]?.cor }}
                  />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span><span className="font-bold text-[var(--foreground)]">{total}</span> conteúdos</span>
          <span><span className="font-bold text-[var(--green-bright)]">{publicados}</span> publicados</span>
          <span className="text-[var(--muted-foreground)]/50">
            {total > 0 ? Math.round((publicados / total) * 100) : 0}% entregues
          </span>
        </div>

        <Button size="sm" onClick={() => setDialog({ open: true })}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo conteúdo
        </Button>
      </div>

      {/* ── Columns ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 min-w-max">
          {COLUNAS.map(col => {
            const colConteudos = filtered.filter(c => c.status === col.status).sort(sortCronologico)
            return (
              <KanbanColumn
                key={col.status}
                col={col}
                conteudos={colConteudos}
                perfis={perfis}
                onAdd={() => setDialog({ open: true, defaultStatus: col.status })}
                onEdit={(c) => setDialog({ open: true, editing: c })}
                onDelete={(c) => setDeleteTarget(c)}
                onMove={handleMove}
                onView={(c) => setViewCard(c)}
                isDragOver={dragOver === col.status}
                onDragOver={() => setDragOver(col.status)}
                onDragLeave={() => setDragOver(prev => prev === col.status ? null : prev)}
                onDrop={(id, src) => handleDrop(col.status, id, src)}
                dragId={dragId}
              />
            )
          })}
        </div>
      </div>

      {moving && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs text-[var(--foreground)] shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--green-bright)]" /> Movendo…
        </div>
      )}

      <ConteudoViewDialog
        conteudo={viewCard}
        perfis={perfis}
        onClose={() => setViewCard(null)}
        onEdit={() => { if (viewCard) { setDialog({ open: true, editing: viewCard }); setViewCard(null) } }}
        onDelete={() => { if (viewCard) { setDeleteTarget(viewCard); setViewCard(null) } }}
      />

      <ConteudoDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        edicaoId={edicaoId}
        dias={dias}
        setores={setores}
        patrocinadores={patrocinadores}
        perfis={perfis}
        editing={dialog.editing}
        defaultStatus={dialog.defaultStatus}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir conteúdo?</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            "<strong>{deleteTarget?.titulo}</strong>" será removido permanentemente.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
