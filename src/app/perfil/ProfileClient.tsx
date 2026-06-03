'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Camera, Loader2, CheckCircle2, AlertCircle, Calendar, Clock,
  MapPin, Layers, Radio, ChevronRight, Search, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ConteudoDetalheModal } from './ConteudoDetalheModal'

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  coordenacao: 'Coordenação',
  lider_area:  'Líder de área',
  operador:    'Operador',
}

const FUNCAO_LABEL: Record<string, string> = {
  foto:        '📷 Foto',
  video:       '🎬 Vídeo',
  social:      '📱 Social',
  reporter:    '🎤 Repórter',
  editor:      '✂️ Editor',
  drone:       '🚁 Drone',
  roaming:     '🏃 Roaming',
  coordenacao: '📋 Coordenação',
  producao:    '⚙️ Produção',
  design:      '🎨 Design',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho:    { label: 'Rascunho',    color: 'text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]' },
  em_producao: { label: 'Em produção', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  publicado:   { label: 'Publicado',   color: 'text-[var(--green-bright)] bg-[var(--green)]/10 border-[var(--green)]/30' },
}

const PRIORIDADE_COLOR: Record<number, string> = {
  1: 'bg-red-500', 2: 'bg-orange-400', 3: 'bg-yellow-400',
  4: 'bg-blue-400', 5: 'bg-[var(--muted-foreground)]',
}

const FUNCAO_COLOR: Record<string, string> = {
  foto:   'bg-purple-50 text-purple-700 border-purple-200',
  video:  'bg-purple-50 text-purple-700 border-purple-200',
  drone:  'bg-purple-50 text-purple-700 border-purple-200',
  social: 'bg-blue-50 text-blue-700 border-blue-200',
  editor: 'bg-blue-50 text-blue-700 border-blue-200',
  design: 'bg-blue-50 text-blue-700 border-blue-200',
  reporter: 'bg-orange-50 text-orange-700 border-orange-200',
  roaming:  'bg-orange-50 text-orange-700 border-orange-200',
  coordenacao: 'bg-[var(--green-dim)]/20 text-[var(--green-bright)] border-[var(--green-dim)]/40',
  producao:    'bg-[var(--green-dim)]/20 text-[var(--green-bright)] border-[var(--green-dim)]/40',
}

const ROLE_LABEL_FN: Record<string, string> = {
  captacao: '📷 Captação',
  design:   '🎨 Design',
  edicao:   '🎬 Edição',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
}

function parseTipos(tipo: string | null): string[] {
  if (!tipo) return []
  return tipo.split(',').map(t => t.trim()).filter(Boolean)
}

// ── Tipos config (minimal) ────────────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  reels:            { label: 'Reels',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  feed:             { label: 'Feed',    color: 'bg-[var(--green)]/15 text-[var(--green-bright)] border-[var(--green)]/30' },
  stories:          { label: 'Stories', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  material_youtube: { label: 'YouTube', color: 'bg-red-50 text-red-600 border-red-200' },
  foto:             { label: 'Foto',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  video:            { label: 'Vídeo',   color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Turno {
  id: string
  funcao: string
  inicio: string
  fim: string
  observacoes: string | null
  dia:   { nome_dia: string; data: string } | null
  setor: { nome: string } | null
}

interface Pessoa {
  nome: string
  foto_url: string | null
}

interface Conteudo {
  id: string
  titulo: string
  tipo: string
  status: string
  prioridade: number
  horario_previsto: string | null
  briefing: string | null
  canal: string | null
  myRoles: string[]
  dia:   { nome_dia: string; data: string } | null
  setor: { nome: string } | null
  patrocinador: { nome: string } | null
  vinculadoA: string | null
  captacao_id: string | null
  status_captacao: string | null
  design_id: string | null
  status_design: string | null
  link_design: string | null
  captacao: Pessoa | null
  design:   Pessoa | null
  edicao:   Pessoa | null
}

interface OperadorFV { id: string; nome: string; foto_url: string | null; empresa_cobertura?: string | null }

interface Props {
  userId: string
  profile: {
    nome: string
    email: string
    role: string
    funcao_principal: string | null
    foto_url: string | null
    telefone: string | null
  }
  turnos: Turno[]
  conteudos: Conteudo[]
  operadoresFV?: OperadorFV[]
  /** Verdadeiro quando o usuário é lider_fv — ativa a visão de equipe */
  isLiderFV?: boolean
  /** Empresa do lider_fv (ex: "Olharr") — exibida no cabeçalho da seção */
  empresaFV?: string | null
}

// ── Iniciais ──────────────────────────────────────────────────────────────────

function getIniciais(nome: string) {
  const parts = nome.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, tone = 'cream',
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'cream' | 'green' | 'gold' | 'electric'
}) {
  const styles: Record<typeof tone, { bg: string; text: string; muted: string }> = {
    cream:    { bg: 'cia-edit-card--cream', text: '#0A0F0B', muted: 'rgba(10,15,11,0.50)' },
    green:    { bg: 'cia-edit-card--green', text: '#FFFFFF', muted: 'rgba(255,255,255,0.65)' },
    gold:     { bg: 'cia-edit-card--gold',  text: '#0A0F0B', muted: 'rgba(70,50,5,0.65)' },
    electric: { bg: 'cia-edit-card--electric', text: '#FFFFFF', muted: 'rgba(255,255,255,0.65)' },
  }
  const s = styles[tone]
  return (
    <div className={cn('cia-edit-card', s.bg, 'flex flex-col justify-between')} style={{ minHeight: 120, padding: '18px 20px' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: s.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div>
        <div style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800,
          letterSpacing: '-0.04em', lineHeight: 1,
          color: s.text,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, fontWeight: 500, color: s.muted, marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Avatar upload ─────────────────────────────────────────────────────────────

function AvatarUpload({
  userId, fotoUrl, setFotoUrl, nome,
}: {
  userId: string
  fotoUrl: string | null
  setFotoUrl: (url: string) => void
  nome: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const iniciais = getIniciais(nome)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrMsg('Imagem muito grande. Máximo 5 MB.')
      setStatus('err')
      return
    }
    setUploading(true); setStatus('idle'); setErrMsg('')
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from('profiles').update({ foto_url: urlWithBust }).eq('id', userId)
      if (dbErr) throw dbErr
      setFotoUrl(urlWithBust)
      setStatus('ok')
      setTimeout(() => { setStatus('idle'); router.refresh() }, 2000)
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Erro ao enviar foto.')
      setStatus('err')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div
          className="relative h-24 w-24 rounded-full ring-2 ring-[var(--green-dim)] overflow-hidden"
          style={{ background: 'rgba(45,90,61,0.3)' }}
        >
          {fotoUrl ? (
            <Image src={fotoUrl} alt={nome} fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--green-bright)]"
              style={{ fontFamily: 'Orbitron, monospace' }}>
              {iniciais}
            </div>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Trocar foto"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--background)] transition-all hover:scale-110 disabled:opacity-50"
          style={{ background: 'var(--green)' }}
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            : <Camera className="h-3.5 w-3.5 text-white" />
          }
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} disabled={uploading} />
      {status === 'ok' && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--green-bright)]">
          <CheckCircle2 className="h-3.5 w-3.5" /> Foto atualizada!
        </div>
      )}
      {status === 'err' && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" /> {errMsg}
        </div>
      )}
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 style={{
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        fontSize: 22, fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#0A0F0B',
      }}>
        {title}
      </h2>
      {count !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'rgba(10,15,11,0.40)',
          letterSpacing: '0.04em',
          background: 'rgba(10,15,11,0.06)',
          borderRadius: 999,
          padding: '2px 9px',
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ── Main ProfileClient ─────────────────────────────────────────────────────────

export function ProfileClient({ userId, profile, turnos, conteudos, operadoresFV = [], isLiderFV = false, empresaFV = null }: Props) {
  const [fotoUrl, setFotoUrl] = useState(profile.foto_url)
  const [conteudoSel, setConteudoSel] = useState<Conteudo | null>(null)
  const [filtroEquipe, setFiltroEquipe] = useState<'todos' | 'meus'>('todos')
  // Filtros (mesmo conjunto do Kanban) — derivados dos próprios conteúdos
  const [busca, setBusca]           = useState('')
  const [filtroDia, setFiltroDia]   = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroCanal, setFiltroCanal] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroPatroc, setFiltroPatroc] = useState('')
  const isFV = profile.role === 'operador_fv' || profile.role === 'lider_fv'

  // ── KPI computation ─────────────────────────────────────────────────────────
  const total      = conteudos.length
  const publicados = conteudos.filter(c => c.status === 'publicado').length
  const producao   = conteudos.filter(c => c.status === 'em_producao').length
  const taxa       = total > 0 ? Math.round((publicados / total) * 100) : 0

  // ── Turnos grouped by event day ─────────────────────────────────────────────
  const turnosByDia = turnos.reduce<Record<string, Turno[]>>((acc, t) => {
    const key = t.dia?.data ?? 'sem-dia'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})
  const diasOrdenados = Object.keys(turnosByDia).sort()

  // ── Opções de filtro derivadas dos próprios conteúdos ──────────────────────
  const parseCanais = (s: string | null) => (s ?? '').split(',').map(x => x.trim()).filter(Boolean)
  const optDias   = [...new Map(conteudos.filter(c => c.dia).map(c => [c.dia!.data, c.dia!])).values()]
    .sort((a, b) => a.data.localeCompare(b.data))
  const optTipos  = [...new Set(conteudos.flatMap(c => parseTipos(c.tipo)))].sort()
  const optCanais = [...new Set(conteudos.flatMap(c => parseCanais(c.canal)))].sort()
  const optSetores = [...new Set(conteudos.filter(c => c.setor).map(c => c.setor!.nome))].sort()
  const optPatroc  = [...new Set(conteudos.filter(c => c.patrocinador).map(c => c.patrocinador!.nome))].sort()

  // ── Filtro de equipe (lider_fv) + filtros do Kanban ─────────────────────────
  const conteudosFiltrados = conteudos.filter(c => {
    if (isLiderFV && filtroEquipe === 'meus' && c.myRoles.length === 0) return false
    if (busca && !c.titulo.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroDia && c.dia?.data !== filtroDia) return false
    if (filtroTipo && !parseTipos(c.tipo).includes(filtroTipo)) return false
    if (filtroCanal && !parseCanais(c.canal).includes(filtroCanal)) return false
    if (filtroSetor && c.setor?.nome !== filtroSetor) return false
    if (filtroPatroc && c.patrocinador?.nome !== filtroPatroc) return false
    return true
  })

  // ── Active conteúdos first (em_producao before rascunho) ───────────────────
  const conteudosSorted = [...conteudosFiltrados].sort((a, b) => {
    const order = { em_producao: 0, rascunho: 1, publicado: 2 }
    const ao = order[a.status as keyof typeof order] ?? 3
    const bo = order[b.status as keyof typeof order] ?? 3
    if (ao !== bo) return ao - bo
    return a.prioridade - b.prioridade
  })

  const pctTone = taxa >= 70 ? 'green' : taxa >= 40 ? 'gold' : 'electric'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 cia-fade-in">

      {/* ── Hero row ─────────────────────────────────────────────────────────── */}
      <div className="mb-10 flex flex-wrap items-start gap-8">

        {/* Avatar + upload */}
        <AvatarUpload userId={userId} fotoUrl={fotoUrl} setFotoUrl={setFotoUrl} nome={profile.nome} />

        {/* Identity text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--gold)' }}>
            Meu perfil
          </p>
          <h1 style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
            letterSpacing: '-0.04em', lineHeight: 0.95,
            color: '#0A0F0B',
          }}>
            {profile.nome}
          </h1>
          <div className="cia-gold-rule mt-3 w-32" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span style={{
              fontSize: 12, fontWeight: 700,
              background: 'rgba(46,107,66,0.12)',
              border: '1px solid rgba(46,107,66,0.25)',
              color: '#2e6b42',
              borderRadius: 999, padding: '4px 12px',
              letterSpacing: '-0.01em',
            }}>
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
            {profile.funcao_principal && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                background: 'rgba(10,15,11,0.06)',
                border: '1px solid rgba(10,15,11,0.10)',
                color: 'rgba(10,15,11,0.65)',
                borderRadius: 999, padding: '4px 12px',
              }}>
                {FUNCAO_LABEL[profile.funcao_principal] ?? profile.funcao_principal}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1">
            <p style={{ fontSize: 13, color: 'rgba(10,15,11,0.55)', letterSpacing: '-0.01em' }}>
              {profile.email}
            </p>
            {profile.telefone && (
              <p style={{ fontSize: 13, color: 'rgba(10,15,11,0.55)' }}>{profile.telefone}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────────── */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Conteúdos"    value={total}      sub="atribuídos a mim"    tone="cream" />
        <KpiCard label="Publicados"   value={publicados} sub="entregues"            tone="green" />
        <KpiCard label="Em produção"  value={producao}   sub="em andamento"         tone="electric" />
        <KpiCard
          label="Taxa de entrega"
          value={`${taxa}%`}
          sub={taxa >= 70 ? 'Excelente 🎉' : taxa >= 40 ? 'Em progresso' : total === 0 ? 'Sem dados' : 'Atenção!'}
          tone={pctTone as 'green' | 'gold' | 'electric'}
        />
      </div>

      {/* ── Two-col: Agenda + Kanban ──────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">

        {/* ── LEFT: Agenda ──────────────────────────────────────────────────── */}
        <div>
          <SectionHeading title="Minha agenda" count={turnos.length} />

          {turnos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
              <Calendar className="mx-auto mb-3 h-8 w-8 opacity-20" />
              <p className="text-sm text-[var(--muted-foreground)]">Nenhum turno cadastrado.</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
                A coordenação irá te adicionar na escala.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {diasOrdenados.map(data => {
                const ts = turnosByDia[data]!
                const dia = ts[0]?.dia
                return (
                  <div key={data} className="cia-edit-card cia-edit-card--cream" style={{ padding: '16px 20px' }}>
                    {/* Day header */}
                    <div className="mb-3 flex items-center gap-2">
                      <Calendar style={{ width: 14, height: 14, color: 'rgba(10,15,11,0.45)', flexShrink: 0 }} />
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: 'rgba(10,15,11,0.55)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}>
                        {dia ? `${dia.nome_dia} · ${fmtDate(dia.data)}` : data}
                      </span>
                    </div>

                    {/* Turno list */}
                    <div className="space-y-2">
                      {ts.map(t => (
                        <div key={t.id} style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                          background: 'rgba(10,15,11,0.03)',
                          border: '1px solid rgba(10,15,11,0.07)',
                          borderRadius: 12, padding: '10px 14px',
                        }}>
                          {/* Funcao dot */}
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: t.funcao === 'foto' || t.funcao === 'video' || t.funcao === 'drone'
                              ? '#7C3AED'
                              : t.funcao === 'social' || t.funcao === 'editor' || t.funcao === 'design'
                              ? '#3B82F6'
                              : '#2e6b42',
                            flexShrink: 0, marginTop: 4,
                          }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span style={{
                                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                                fontSize: 15, fontWeight: 800,
                                color: '#0A0F0B',
                                letterSpacing: '-0.02em',
                              }}>
                                {fmtTime(t.inicio)} – {fmtTime(t.fim)}
                              </span>
                              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', FUNCAO_COLOR[t.funcao] ?? 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]')}>
                                {FUNCAO_LABEL[t.funcao] ?? t.funcao}
                              </span>
                            </div>
                            {t.setor && (
                              <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: 'rgba(10,15,11,0.55)' }}>
                                <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
                                {t.setor.nome}
                              </div>
                            )}
                            {t.observacoes && (
                              <p className="mt-1 text-[11px]" style={{ color: 'rgba(10,15,11,0.45)' }}>{t.observacoes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Conteúdos ──────────────────────────────────────────────── */}
        <div>
          {/* Cabeçalho da seção — lider_fv vê a equipe toda */}
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h2 style={{
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                fontSize: 22, fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#0A0F0B',
              }}>
                {isLiderFV ? 'Equipe' : 'Meus conteúdos'}
              </h2>
              {isLiderFV && empresaFV && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'var(--green)',
                  background: 'rgba(46,107,66,0.10)',
                  border: '1px solid rgba(46,107,66,0.20)',
                  borderRadius: 999, padding: '2px 10px',
                  letterSpacing: '0.02em',
                }}>
                  {empresaFV}
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: 'rgba(10,15,11,0.40)',
                letterSpacing: '0.04em',
                background: 'rgba(10,15,11,0.06)',
                borderRadius: 999,
                padding: '2px 9px',
              }}>
                {conteudosFiltrados.length}
              </span>
            </div>
            {/* Toggle Todos / Meus — só para lider_fv */}
            {isLiderFV && (
              <div className="flex overflow-hidden rounded-lg border border-[rgba(10,15,11,0.12)]">
                {(['todos', 'meus'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFiltroEquipe(opt)}
                    className="px-3 py-1.5 text-[11px] font-semibold transition-colors"
                    style={{
                      background: filtroEquipe === opt ? 'rgba(46,107,66,0.12)' : 'transparent',
                      color: filtroEquipe === opt ? '#2e6b42' : 'rgba(10,15,11,0.45)',
                    }}
                  >
                    {opt === 'todos' ? 'Equipe toda' : 'Só meus'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Barra de filtros (mesmo conjunto do Kanban) ─────────────────── */}
          {conteudos.length > 0 && (() => {
            const selStyle: React.CSSProperties = {
              height: 30, borderRadius: 999, paddingInline: 12,
              fontSize: 11, fontWeight: 600,
              border: '1px solid rgba(10,15,11,0.12)',
              background: 'rgba(10,15,11,0.03)', color: '#0A0F0B',
              cursor: 'pointer', appearance: 'none',
            }
            const ativos = [busca, filtroDia, filtroTipo, filtroCanal, filtroSetor, filtroPatroc].filter(Boolean).length
            return (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'rgba(10,15,11,0.35)' }} />
                  <input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar conteúdo…"
                    style={{ ...selStyle, width: 190, paddingLeft: 32, cursor: 'text' }}
                  />
                </div>
                <select value={filtroDia} onChange={e => setFiltroDia(e.target.value)} style={selStyle}>
                  <option value="">Todos os dias</option>
                  {optDias.map(d => <option key={d.data} value={d.data}>{d.nome_dia} · {d.data.slice(8, 10)}/{d.data.slice(5, 7)}</option>)}
                </select>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selStyle}>
                  <option value="">Todos os tipos</option>
                  {optTipos.map(t => <option key={t} value={t}>{TIPO_CONFIG[t]?.label ?? t}</option>)}
                </select>
                {optCanais.length > 0 && (
                  <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} style={selStyle}>
                    <option value="">Todos os canais</option>
                    {optCanais.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {optSetores.length > 0 && (
                  <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} style={selStyle}>
                    <option value="">Todos os setores</option>
                    {optSetores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                {optPatroc.length > 0 && (
                  <select value={filtroPatroc} onChange={e => setFiltroPatroc(e.target.value)} style={selStyle}>
                    <option value="">Patrocinador</option>
                    {optPatroc.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                {ativos > 0 && (
                  <button
                    onClick={() => { setBusca(''); setFiltroDia(''); setFiltroTipo(''); setFiltroCanal(''); setFiltroSetor(''); setFiltroPatroc('') }}
                    className="inline-flex items-center gap-1 transition-colors"
                    style={{ height: 30, borderRadius: 999, paddingInline: 10, fontSize: 11, fontWeight: 600, color: '#A04A2E', background: 'rgba(160,74,46,0.10)', border: '1px solid rgba(160,74,46,0.20)' }}
                  >
                    <X className="h-3 w-3" /> Limpar ({ativos})
                  </button>
                )}
              </div>
            )
          })()}

          {conteudosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
              <Layers className="mx-auto mb-3 h-8 w-8 opacity-20" />
              {conteudos.length > 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum conteúdo com esses filtros.
                </p>
              ) : (
                <>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {isLiderFV && filtroEquipe === 'todos'
                      ? 'Nenhum conteúdo atribuído à equipe ainda.'
                      : 'Nenhum conteúdo atribuído.'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
                    {isLiderFV
                      ? 'Clique num card para designar um operador de captação.'
                      : 'Aparecem aqui quando a coord te definir como responsável.'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {conteudosSorted.map(c => {
                const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.rascunho
                const tipos     = parseTipos(c.tipo)
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setConteudoSel(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setConteudoSel(c)
                      }
                    }}
                    className="cursor-pointer hover:brightness-[0.98]"
                    style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    minHeight: 44,
                    background: 'var(--card)',
                    border: '1px solid rgba(10,15,11,0.07)',
                    borderLeft: `3px solid ${
                      c.status === 'em_producao' ? '#5C68E8' :
                      c.status === 'publicado'   ? '#2e6b42' :
                      'rgba(10,15,11,0.18)'
                    }`,
                    borderRadius: 12, padding: '11px 14px',
                    transition: 'all 0.15s',
                  }}>
                    {/* Priority dot */}
                    <div
                      className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', PRIORIDADE_COLOR[c.prioridade] ?? 'bg-[var(--muted-foreground)]')}
                    />

                    <div className="min-w-0 flex-1">
                      {/* Types */}
                      {tipos.length > 0 && (
                        <div className="mb-1 flex flex-wrap gap-1">
                          {tipos.map(t => (
                            <span key={t} className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold', TIPO_CONFIG[t]?.color ?? 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]')}>
                              {TIPO_CONFIG[t]?.label ?? t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Title */}
                      <p style={{
                        fontSize: 13, fontWeight: 600,
                        color: '#0A0F0B',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                      }}>
                        {c.titulo}
                      </p>

                      {/* Meta row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]" style={{ color: 'rgba(10,15,11,0.55)' }}>
                        {c.dia && (
                          <span className="flex items-center gap-1">
                            <Calendar style={{ width: 9, height: 9 }} />
                            {c.dia.nome_dia}
                          </span>
                        )}
                        {c.horario_previsto && (
                          <span className="flex items-center gap-1 font-mono font-semibold" style={{ color: 'var(--gold)' }}>
                            <Clock style={{ width: 9, height: 9 }} />
                            {c.horario_previsto}
                          </span>
                        )}
                        {c.setor && (
                          <span className="flex items-center gap-1">
                            <MapPin style={{ width: 9, height: 9 }} />
                            {c.setor.nome}
                          </span>
                        )}
                      </div>

                      {/* Captação visível no card — útil para o lider ver quem está designado */}
                      {isLiderFV && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(10,15,11,0.50)' }}>
                          <Camera style={{ width: 9, height: 9, flexShrink: 0 }} />
                          {c.captacao
                            ? <span className="font-semibold" style={{ color: '#0A0F0B' }}>{c.captacao.nome}</span>
                            : <span className="italic" style={{ color: 'rgba(10,15,11,0.35)' }}>sem operador — toque para designar</span>
                          }
                        </div>
                      )}

                      {/* My roles + status */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {c.myRoles.map(r => (
                          <span key={r} style={{
                            fontSize: 9, fontWeight: 700,
                            background: 'rgba(46,107,66,0.10)',
                            border: '1px solid rgba(46,107,66,0.25)',
                            color: '#2e6b42', borderRadius: 999,
                            padding: '2px 8px', letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}>
                            {ROLE_LABEL_FN[r] ?? r}
                          </span>
                        ))}
                        <span className={cn('ml-auto rounded border px-2 py-0.5 text-[9px] font-bold', statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {!isFV && (
                <Link
                  href="/conteudos"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-xs font-semibold text-[var(--muted-foreground)] transition-all hover:border-[var(--green-dim)] hover:text-[var(--green-bright)]"
                >
                  Ver todos no kanban
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de detalhe do conteúdo (captação editável para lider_fv) ──── */}
      <ConteudoDetalheModal
        conteudo={conteudoSel}
        onClose={() => setConteudoSel(null)}
        userRole={profile.role}
        userId={userId}
        operadoresFV={operadoresFV}
        empresaFV={empresaFV}
      />

      {/* ── Footer note ──────────────────────────────────────────────────────── */}
      <p className="mt-12 text-center text-[11px] text-[var(--muted-foreground)]/50">
        Para alterar nome, cargo ou função fale com a coordenação. · CIA 2026
      </p>
    </div>
  )
}
