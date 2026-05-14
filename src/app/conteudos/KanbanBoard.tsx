'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { emitNavStart } from '@/components/NavigationProgress'
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
import { createClient } from '@/lib/supabase/client'

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

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  reels:            { label: 'Reels',            color: 'bg-purple-50 text-purple-700 border-purple-200' },
  feed:             { label: 'Feed',             color: 'bg-[var(--green)]/15 text-[var(--green-bright)] border-[var(--green)]/30' },
  stories:          { label: 'Stories',          color: 'bg-blue-50 text-blue-700 border-blue-200' },
  material_youtube: { label: 'Material YouTube', color: 'bg-red-50 text-red-600 border-red-200' },
  foto:             { label: 'Foto',             color: 'bg-amber-50 text-amber-700 border-amber-200' },
  video:            { label: 'Vídeo',            color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
}

const TIPO_OPTIONS = Object.entries(TIPO_CONFIG).map(([value, { label }]) => ({ value, label }))

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho:    { label: 'Rascunho',    color: 'text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]' },
  em_producao: { label: 'Em produção', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  publicado:   { label: 'Publicado',   color: 'text-[var(--green-bright)] bg-[var(--green)]/10 border-[var(--green)]/30' },
  arquivado:   { label: 'Arquivado',   color: 'text-[var(--muted-foreground)] bg-[var(--muted)]/50 border-[var(--border)]/50' },
  cancelado:   { label: 'Cancelado',   color: 'text-red-600 bg-red-50 border-red-200' },
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

/** Parse comma-separated tipo string → array of tipo keys */
function parseTipos(tipo: string | null | undefined): string[] {
  if (!tipo) return []
  return tipo.split(',').map(t => t.trim()).filter(Boolean)
}

/** Parse comma-separated canal string → array of canal keys */
function parseCanais(canal: string | null | undefined): string[] {
  if (!canal) return []
  return canal.split(',').map(c => c.trim()).filter(Boolean)
}

// ── Canais: cor de destaque (borda topo do card) + badge ─────────────────────
const CANAL_CONFIG: Record<string, {
  label:  string
  cor:    string   // hex — borda topo do card
  badge:  string   // tailwind classes do badge
}> = {
  instagram_cia:       { label: 'Instagram CIA',        cor: '#E1306C', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  tiktok_cia:          { label: 'TikTok CIA',           cor: '#69C9D0', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  instagram_exp:       { label: 'Instagram EXP',        cor: '#A855F7', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  instagram_grupo_exp: { label: 'Instagram Grupo EXP',  cor: '#7C3AED', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  tiktok_exp:          { label: 'TikTok EXP',           cor: '#EE1D52', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  instagram_nix:       { label: 'Instagram NIX',         cor: '#F97316', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  x_cia:               { label: 'X CIA',                cor: '#94A3B8', badge: 'bg-slate-100 text-slate-600 border-slate-300' },
  youtube_exp:         { label: 'YouTube EXP',           cor: '#EF4444', badge: 'bg-red-50 text-red-600 border-red-200' },
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
  if (c.jogo)        return { label: 'Esportivo',   emoji: '🏆', color: 'text-[var(--green-bright)] bg-[var(--green-dim)]/30 border-[var(--green-dim)]/50' }
  if (c.show)        return { label: 'Show',         emoji: '🎤', color: 'text-purple-700 bg-purple-50 border-purple-200' }
  if (c.festa)       return { label: 'Festivo',      emoji: '🎉', color: 'text-rose-700 bg-rose-50 border-rose-200' }
  if (c.patrocinador)return { label: 'Patrocinado',  emoji: '🤝', color: 'text-[var(--gold)] bg-[var(--gold-dim)]/20 border-[var(--gold-dim)]/30' }
  if (c.modalidade)  return { label: c.modalidade.nome, emoji: c.modalidade.icone ?? '🏅', color: 'text-blue-700 bg-blue-50 border-blue-200' }
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
  c, perfis, onEdit, onDelete, onMove, onView, isBeingDragged, readOnly,
}: {
  c: Conteudo
  perfis: Perfil[]
  onEdit: () => void
  onDelete: () => void
  onMove: (status: string) => void
  onView: () => void
  isBeingDragged: boolean
  readOnly?: boolean
}) {
  const hasPrev = !!PREV_STATUS[c.status]
  const hasNext = !!NEXT_STATUS[c.status]
  const canais     = parseCanais(c.canal_publicacao)
  const canalCfgs  = canais.map(k => CANAL_CONFIG[k]).filter(Boolean)
  const canalCfg   = canalCfgs[0] ?? null  // primary canal (for top border)

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
        'group relative cursor-grab active:cursor-grabbing select-none',
        'transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(10,15,11,0.08)]',
        isBeingDragged && 'opacity-30 scale-[0.97] pointer-events-none',
      )}
      style={{
        borderRadius: 14,
        border: '1px solid rgba(10,15,11,0.07)',
        background: 'var(--card)',
        padding: '12px 12px 10px',
        borderTop: canalCfgs.length === 0
          ? '1px solid rgba(10,15,11,0.07)'
          : canalCfgs.length === 1
          ? `2.5px solid ${canalCfgs[0].cor}`
          : undefined,
        backgroundImage: canalCfgs.length >= 2
          ? `linear-gradient(to right, ${canalCfgs.map((cfg, i) => `${cfg.cor} ${Math.round(i * 100 / canalCfgs.length)}%, ${cfg.cor} ${Math.round((i + 1) * 100 / canalCfgs.length)}%`).join(', ')}) top / 100% 2.5px no-repeat`
          : undefined,
        backgroundOrigin: canalCfgs.length >= 2 ? 'border-box' : undefined,
      }}
    >
      {/* Priority stripe */}
      <div
        className={cn('absolute left-0 top-3 w-1 rounded-r', PRIORIDADE_COLOR[c.prioridade] ?? 'bg-[var(--muted)]')}
        style={{ height: 28 }}
      />

      <div className="pl-2">
        {/* Tipo tags */}
        {parseTipos(c.tipo).length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1">
            {parseTipos(c.tipo).map(t => (
              <span key={t} className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight', TIPO_CONFIG[t]?.color ?? 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]')}>
                {TIPO_CONFIG[t]?.label ?? t}
              </span>
            ))}
          </div>
        )}
        {/* Título */}
        <p className="text-xs font-medium leading-snug text-[var(--foreground)] line-clamp-2">{c.titulo}</p>

        {/* Canal badges — multi */}
        {canalCfgs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {canalCfgs.map((cfg, i) => (
              <span key={canais[i]} className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide', cfg.badge)}>
                {cfg.label}
              </span>
            ))}
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
          {!readOnly && hasPrev && (
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
          {!readOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              title="Editar"
              className="rounded p-1 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {!readOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              title="Excluir"
              className="rounded p-1 hover:bg-red-500/20 text-[var(--muted-foreground)] hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          {!readOnly && hasNext && (
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
        style={{ background: 'var(--card)' }}
      >
        {/* Título */}
        <div className="border-b border-[var(--border)] px-5 pt-5 pb-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {parseTipos(c.tipo).map(t => (
              <span key={t} className={cn('rounded border px-2 py-0.5 text-[10px] font-bold tracking-wide', TIPO_CONFIG[t]?.color ?? 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]')}>
                {TIPO_CONFIG[t]?.label ?? t}
              </span>
            ))}
            <span className="font-mono text-[10px] text-[var(--muted-foreground)]/50">
              #{c.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
          <h2
            className="text-base font-bold leading-snug"
            style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              letterSpacing: '-0.02em',
              color: '#0A0F0B',
            }}
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
            {parseCanais(c.canal_publicacao).length > 0
              ? <>
                  {parseCanais(c.canal_publicacao).map(k => (
                    <Pill key={k} color={CANAL_CONFIG[k]?.badge}>
                      {CANAL_CONFIG[k]?.label ?? k}
                    </Pill>
                  ))}
                </>
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
          style={{ background: 'rgba(254,252,248,0.97)', backdropFilter: 'blur(12px)' }}
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
  const [selectedTipos, setSelectedTipos] = React.useState<string[]>(
    editing?.tipo ? parseTipos(editing.tipo) : ['feed']
  )
  const [selectedCanais, setSelectedCanais] = React.useState<string[]>(
    editing?.canal_publicacao ? parseCanais(editing.canal_publicacao) : []
  )
  const [status, setStatus_]        = React.useState(editing?.status ?? defaultStatus ?? 'rascunho')
  const [prioridade, setPrioridade] = React.useState(String(editing?.prioridade ?? 3))
  const [diaId, setDiaId]           = React.useState(editing?.dia_id ?? '')
  const [horario, setHorario]       = React.useState(editing?.horario_previsto ?? '')
  const [setorId, setSetorId]       = React.useState(editing?.setor_id ?? '')
  const [patroId, setPatroId]       = React.useState(editing?.patrocinador_id ?? '')
  const [briefing, setBriefing]     = React.useState(editing?.briefing ?? '')
  const [link, setLink]             = React.useState(editing?.link_publicado ?? '')
  const [captacaoId, setCaptacaoId] = React.useState(editing?.responsavel_captacao_id ?? '')
  const [designId, setDesignId]     = React.useState(editing?.responsavel_design_id ?? '')
  const [edicaoId2, setEdicaoId2]   = React.useState(editing?.responsavel_edicao_id ?? '')

  React.useEffect(() => {
    if (!open) return
    setError(null); setLoading(false)
    setTitulo(editing?.titulo ?? '')
    setSelectedTipos(editing?.tipo ? parseTipos(editing.tipo) : ['feed'])
    setSelectedCanais(editing?.canal_publicacao ? parseCanais(editing.canal_publicacao) : [])
    setStatus_(editing?.status ?? defaultStatus ?? 'rascunho')
    setPrioridade(String(editing?.prioridade ?? 3))
    setDiaId(editing?.dia_id ?? '')
    setHorario(editing?.horario_previsto ?? '')
    setSetorId(editing?.setor_id ?? '')
    setPatroId(editing?.patrocinador_id ?? '')
    setBriefing(editing?.briefing ?? '')
    setLink(editing?.link_publicado ?? '')
    setCaptacaoId(editing?.responsavel_captacao_id ?? '')
    setDesignId(editing?.responsavel_design_id ?? '')
    setEdicaoId2(editing?.responsavel_edicao_id ?? '')
  }, [open, editing, defaultStatus])

  async function submit() {
    if (!titulo.trim()) { setError('Título obrigatório.'); return }
    if (selectedTipos.length === 0) { setError('Selecione pelo menos um tipo.'); return }
    setLoading(true); setError(null)
    try {
      const payload: ConteudoPayload & { link_publicado?: string } = {
        edicao_id:               edicaoId,
        titulo:                  titulo.trim(),
        tipo:                    selectedTipos.join(','),
        status,
        prioridade:              Number(prioridade),
        dia_id:                  nullIfNone(diaId),
        horario_previsto:        horario || null,
        setor_id:                nullIfNone(setorId),
        patrocinador_id:         nullIfNone(patroId),
        canal_publicacao:        selectedCanais.length > 0 ? selectedCanais.join(',') : null,
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

          {/* Tipos — multi-tag */}
          <div>
            <Label className="mb-2 block text-xs">
              Tipo(s) *
              <span className="ml-1.5 font-normal text-[var(--muted-foreground)]">selecione um ou mais</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TIPO_OPTIONS.map(o => {
                const active = selectedTipos.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setSelectedTipos(prev =>
                      prev.includes(o.value) ? prev.filter(t => t !== o.value) : [...prev, o.value]
                    )}
                    className={cn(
                      'rounded border px-2.5 py-1 text-[11px] font-semibold transition-all',
                      active
                        ? TIPO_CONFIG[o.value].color
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green)]/40 hover:text-[var(--foreground)]',
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status */}
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

          {/* Prioridade */}
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

          {/* Canal(is) — multi-chip */}
          <div>
            <Label className="mb-2 block text-xs">
              Canal(is)
              <span className="ml-1.5 font-normal text-[var(--muted-foreground)]">selecione um ou mais</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {CANAL_OPTIONS.map(o => {
                const active = selectedCanais.includes(o.value)
                const cfg = CANAL_CONFIG[o.value]
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setSelectedCanais(prev =>
                      prev.includes(o.value) ? prev.filter(k => k !== o.value) : [...prev, o.value]
                    )}
                    className={cn(
                      'rounded border px-2.5 py-1 text-[11px] font-semibold transition-all',
                      active
                        ? cfg?.badge ?? 'border-[var(--border)] text-[var(--muted-foreground)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green)]/40 hover:text-[var(--foreground)]',
                    )}
                    style={active && cfg ? { borderColor: `${cfg.cor}60` } : undefined}
                  >
                    <span
                      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: cfg?.cor ?? '#999', verticalAlign: 'middle' }}
                    />
                    {o.label}
                  </button>
                )
              })}
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
  isDragOver, onDragOver, onDragLeave, onDrop, dragId, readOnly,
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
  readOnly?: boolean
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
        // Mobile: largura total. Desktop: largura fixa de coluna (288px).
        'flex w-full md:w-72 shrink-0 flex-col overflow-hidden transition-all duration-150',
        isDragOver ? 'ring-2 ring-[var(--green)]/30' : '',
      )}
      style={{
        borderRadius: 20,
        border: isDragOver ? '1px solid rgba(46,107,66,0.25)' : '1px solid rgba(10,15,11,0.08)',
        background: isDragOver ? 'rgba(46,107,66,0.04)' : 'var(--card)',
      }}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(10,15,11,0.06)' }}>
        <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', col.dot)} />
        <span className={cn('text-[11px] font-bold uppercase tracking-[0.11em]', col.color)}>{col.label}</span>
        <span
          className="ml-auto text-[10px] font-bold"
          style={{ background: 'rgba(10,15,11,0.07)', borderRadius: 99, padding: '1px 8px', color: 'rgba(10,15,11,0.42)' }}
        >
          {conteudos.length}
        </span>
        {!readOnly && (
          <button
            onClick={onAdd}
            title="Adicionar"
            className="rounded-full transition-colors"
            style={{ padding: '3px', color: 'rgba(10,15,11,0.30)' }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {conteudos.length === 0 && !isDragOver ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-[11px]" style={{ color: 'rgba(10,15,11,0.28)' }}>Vazio</p>
            {!readOnly && (
              <button
                onClick={onAdd}
                className="transition-colors"
                style={{
                  borderRadius: 999,
                  border: '1px dashed rgba(10,15,11,0.18)',
                  padding: '4px 14px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'rgba(10,15,11,0.38)',
                }}
              >
                + Adicionar
              </button>
            )}
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
              readOnly={readOnly}
            />
          ))
        )}

        {isDragOver && (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--green)]/40 py-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--green-bright)] animate-pulse">
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
  /** dia_id ativo vindo da URL (?dia=<uuid>). Quando presente, o servidor já
   *  filtrou os cards por esse dia — o cliente sincroniza o filtro visual. */
  activeDiaId?:   string
  /** Oculta todos os botões de criar/editar/mover/excluir. Somente leitura. */
  readOnly?:      boolean
}

export function KanbanBoard({ edicaoId, conteudos: initial, dias, setores, patrocinadores, perfis, activeDiaId, readOnly }: KanbanBoardProps) {
  const router = useRouter()
  const [conteudos, setConteudos] = React.useState(initial)
  const [search, setSearch]             = React.useState('')
  // filterDia é controlado pela URL (?dia=) → inicia com activeDiaId se presente
  const [filterDia, setFilterDia]       = React.useState(activeDiaId ?? '')
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
  // Sync filterDia com URL (caso o usuário navegue back/forward)
  React.useEffect(() => { setFilterDia(activeDiaId ?? '') }, [activeDiaId])

  // PERF: refs para acessar lookups mais recentes dentro do useEffect do canal
  // sem precisar re-inscrever a cada mudança de props (que são quase estáticas
  // mas o React não sabe disso).
  const diasRef           = React.useRef(dias)
  const setoresRef        = React.useRef(setores)
  const patrocinadoresRef = React.useRef(patrocinadores)
  React.useEffect(() => {
    diasRef.current           = dias
    setoresRef.current        = setores
    patrocinadoresRef.current = patrocinadores
  }, [dias, setores, patrocinadores])

  // ── Supabase real-time: sincroniza mudanças de outros usuários ──────────────
  // PERF v2: hidratação CLIENTE-SIDE do payload.new com lookups que já temos
  // na memória (dias, setores, patrocinadores). Isso elimina o roundtrip de
  // fetchOne(id) para ~90% dos eventos (drag-drop, edição de título, etc.).
  //
  // Antes: evento → fetchOne 7-joins (~150ms) → setState
  // Agora: evento → hidrata local (~5ms) → setState
  //                ↑ 20× mais rápido para observers
  //
  // Para cards com jogo/show/festa/modalidade (FKs que NÃO temos client-side),
  // o card aparece imediatamente com os dados básicos e um fetchOne em background
  // enriquece os joins especiais ~150ms depois. Progressive enhancement.
  React.useEffect(() => {
    const supabase = createClient()
    const SELECT_COLS = `
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
    `

    async function fetchOne(id: string): Promise<Conteudo | null> {
      const { data } = await supabase
        .from('conteudos')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle()
      return (data ?? null) as unknown as Conteudo | null
    }

    // Projeta payload.new (raw row) → Conteudo usando lookups locais.
    // Preserva joins especiais (jogo/show/festa/modalidade) do card anterior
    // se os FKs não mudaram — evita "piscar" enquanto o background fetch carrega.
    function hydrate(raw: Record<string, unknown>, prev?: Conteudo): Conteudo {
      const r = raw as unknown as Conteudo
      const dia = r.dia_id ? diasRef.current.find(d => d.id === r.dia_id) : null
      const set = r.setor_id ? setoresRef.current.find(s => s.id === r.setor_id) : null
      const pat = r.patrocinador_id ? patrocinadoresRef.current.find(p => p.id === r.patrocinador_id) : null
      return {
        ...r,
        dia:          dia ? { nome_dia: dia.nome_dia, data: dia.data } : null,
        setor:        set ? { nome: set.nome } : null,
        patrocinador: pat ? { nome: pat.nome } : null,
        jogo:       prev && prev.jogo_id       === r.jogo_id       ? prev.jogo       ?? null : null,
        show:       prev && prev.show_id       === r.show_id       ? prev.show       ?? null : null,
        festa:      prev && prev.festa_id      === r.festa_id      ? prev.festa      ?? null : null,
        modalidade: prev && prev.modalidade_id === r.modalidade_id ? prev.modalidade ?? null : null,
      }
    }

    // Detecta se precisa do fetchOne para enriquecer jogo/show/festa/modalidade.
    function needsEnrichment(r: Conteudo, prev?: Conteudo): boolean {
      const hasSpecial = !!(r.jogo_id || r.show_id || r.festa_id || r.modalidade_id)
      if (!hasSpecial) return false
      if (!prev) return true   // novo card com FK especial → busca
      return (
        prev.jogo_id       !== r.jogo_id       ||
        prev.show_id       !== r.show_id       ||
        prev.festa_id      !== r.festa_id      ||
        prev.modalidade_id !== r.modalidade_id
      )
    }

    // Enriquecimento em background — substitui o card com joins completos.
    function enrich(id: string) {
      fetchOne(id).then(full => {
        if (full) setConteudos(prev => prev.map(c => c.id === id ? full : c))
      })
    }

    const channel = supabase
      .channel('kanban-conteudos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conteudos' }, (payload) => {
        const r = payload.new as unknown as Conteudo
        // Filtro server-side por dia: ignora cards de outros dias
        if (activeDiaId && r.dia_id !== activeDiaId) return

        const hydrated = hydrate(payload.new as Record<string, unknown>)
        setConteudos(prev => prev.some(c => c.id === r.id) ? prev : [...prev, hydrated])

        if (needsEnrichment(r)) enrich(r.id)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conteudos' }, (payload) => {
        const r = payload.new as unknown as Conteudo

        // Card saiu do filtro de dia ativo → remove
        if (activeDiaId && r.dia_id !== activeDiaId) {
          setConteudos(prev => prev.filter(c => c.id !== r.id))
          return
        }

        let shouldEnrich = false
        setConteudos(prev => {
          const existing = prev.find(c => c.id === r.id)
          shouldEnrich = needsEnrichment(r, existing)
          const hydrated = hydrate(payload.new as Record<string, unknown>, existing)
          if (!existing) return [...prev, hydrated]   // não tinha → adiciona
          return prev.map(c => c.id === r.id ? hydrated : c)
        })

        if (shouldEnrich) enrich(r.id)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'conteudos' }, (payload) => {
        const id = (payload.old as { id: string }).id
        setConteudos(prev => prev.filter(c => c.id !== id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeDiaId])

  const filtered = React.useMemo(() => {
    let list = conteudos
    if (search)                        list = list.filter(c => c.titulo.toLowerCase().includes(search.toLowerCase()))
    if (filterDia && filterDia !== '__all__')     list = list.filter(c => c.dia_id === filterDia)
    if (filterTipo && filterTipo !== '__all__')   list = list.filter(c => parseTipos(c.tipo).includes(filterTipo))
    if (filterPerfil && filterPerfil !== '__all__') {
      list = list.filter(c =>
        c.responsavel_captacao_id === filterPerfil ||
        c.responsavel_design_id   === filterPerfil ||
        c.responsavel_edicao_id   === filterPerfil
      )
    }
    if (filterCanal && filterCanal !== '__all__') {
      list = list.filter(c => parseCanais(c.canal_publicacao).includes(filterCanal))
    }
    return list
  }, [conteudos, search, filterDia, filterTipo, filterPerfil, filterCanal])

  async function handleMove(c: Conteudo, status: string) {
    // PERF: optimistic update — o ator vê o card mover INSTANTANEAMENTE.
    // Se o servidor retornar erro, revertemos.
    const prevStatus = c.status
    setConteudos(prev => prev.map(x => x.id === c.id ? { ...x, status } : x))
    if (viewCard?.id === c.id) setViewCard(v => v ? { ...v, status } : v)
    setMoving(c.id)
    const res = await setStatus(c.id, status)
    setMoving(null)
    if (!res.ok) {
      // Rollback em caso de erro de rede / permissão
      setConteudos(prev => prev.map(x => x.id === c.id ? { ...x, status: prevStatus } : x))
      if (viewCard?.id === c.id) setViewCard(v => v ? { ...v, status: prevStatus } : v)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await deleteConteudo(deleteTarget.id)
      if (res && !res.ok) throw new Error(res.error ?? 'Erro ao deletar')
      setConteudos(prev => prev.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error('[handleDelete]', err)
      // mantém o card no kanban — não remove da UI se falhou
    } finally {
      setDeleting(false)
    }
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
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-6 py-3" style={{ background: 'var(--cream)', backdropFilter: 'blur(8px)' }}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'rgba(10,15,11,0.35)' }} />
          <input
            className="h-8 w-48 pl-9 pr-3 text-[12px] outline-none"
            style={{
              borderRadius: 999,
              border: '1px solid rgba(10,15,11,0.12)',
              background: 'rgba(10,15,11,0.04)',
              color: 'var(--foreground)',
            }}
            placeholder="Buscar conteúdo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={filterDia || '__all__'}
          onValueChange={(v) => {
            // emitNavStart dispara a barra de progresso antes da navegação.
            // Navega via URL para que o servidor filtre os cards server-side.
            emitNavStart()
            if (v === '__all__') {
              router.push('/conteudos')
            } else {
              router.push(`/conteudos?dia=${v}`)
            }
          }}
        >
          <SelectTrigger className="h-8 w-36 text-[11px] rounded-full border-[rgba(10,15,11,0.12)] bg-[rgba(10,15,11,0.04)]">
            <SelectValue placeholder="Todos os dias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os dias</SelectItem>
            {dias.map(d => <SelectItem key={d.id} value={d.id}>{d.nome_dia}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-8 w-36 text-[11px] rounded-full border-[rgba(10,15,11,0.12)] bg-[rgba(10,15,11,0.04)]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPerfil} onValueChange={setFilterPerfil}>
          <SelectTrigger className="h-8 w-36 text-[11px] rounded-full border-[rgba(10,15,11,0.12)] bg-[rgba(10,15,11,0.04)]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {perfis.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCanal} onValueChange={setFilterCanal}>
          <SelectTrigger className="h-8 w-40 text-[11px] rounded-full border-[rgba(10,15,11,0.12)] bg-[rgba(10,15,11,0.04)]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os canais</SelectItem>
            {CANAL_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: CANAL_CONFIG[o.value]?.cor }} />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-3 text-[11px]" style={{ color: 'rgba(10,15,11,0.45)' }}>
          <span><span className="font-bold" style={{ color: '#0A0F0B' }}>{total}</span> conteúdos</span>
          <span><span className="font-bold" style={{ color: 'var(--green)' }}>{publicados}</span> publicados</span>
          <span style={{ color: 'rgba(10,15,11,0.30)' }}>
            {total > 0 ? Math.round((publicados / total) * 100) : 0}% entregues
          </span>
        </div>

        {/* CTA editorial */}
        {!readOnly && (
          <button
            onClick={() => setDialog({ open: true })}
            className="flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
              background: '#0A0F0B',
              color: '#FAF7F0',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Novo conteúdo
          </button>
        )}
      </div>

      {/* ── Columns ────────────────────────────────────────────────── */}
      {/* Mobile: empilha vertical (column). Desktop: row horizontal com scroll-x. */}
      <div className="flex-1 md:overflow-x-auto overflow-y-auto">
        <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 md:min-w-max">
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
                readOnly={readOnly}
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
