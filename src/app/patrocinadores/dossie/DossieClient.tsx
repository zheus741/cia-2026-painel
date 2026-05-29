'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search, Printer, Layers, Film, ImageIcon, Star, Radio,
  FileText, Repeat, Clock, Mail, Phone, User, AlertTriangle, CheckCircle2,
} from 'lucide-react'

const SANS = 'var(--font-dm-sans), system-ui, sans-serif'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DossiePatrocinador {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  cor_marca: string | null
  cota: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  observacoes: string | null
}

export interface DossieEscopoItem {
  id: string
  patrocinador_id: string
  tipo_conteudo: string | null
  canal: string | null
  quantidade_prevista: number
  descricao: string | null
  prazo_limite: string | null
  status: string
  dia_id: string | null
}

interface ConteudoStat {
  patrocinador_id: string
  total: number
  publicados: number
}

interface Props {
  patrocinadores: DossiePatrocinador[]
  escopo: DossieEscopoItem[]
  conteudoStats: ConteudoStat[]
  diaLabels: Record<string, string>
}

// ── Mapeamentos ────────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  story_rapido:      { label: 'Story Rápido',     Icon: Layers,    color: '#a78bfa' },
  story_editado:     { label: 'Story Editado',    Icon: Layers,    color: '#818cf8' },
  reels:             { label: 'Reels',            Icon: Film,      color: '#f472b6' },
  card_feed:         { label: 'Card Feed',        Icon: ImageIcon, color: '#60a5fa' },
  card_patrocinado:  { label: 'Card Patroc.',     Icon: Star,      color: '#d4a017' },
  cobertura_ao_vivo: { label: 'Cobertura',        Icon: Radio,     color: '#2e9e6b' },
  texto_legenda:     { label: 'Texto',            Icon: FileText,  color: '#64748b' },
  repost:            { label: 'Repost',           Icon: Repeat,    color: '#e07a3f' },
}

const CANAL_LABEL: Record<string, string> = {
  instagram_feed: 'IG Feed', instagram_stories: 'IG Stories', instagram_reels: 'IG Reels',
  tiktok: 'TikTok', youtube: 'YouTube', youtube_shorts: 'YT Shorts',
  twitter_x: 'X', facebook: 'Facebook', whatsapp_status: 'WA', outro: 'Outro',
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendente:    { label: 'Pendente',    bg: 'rgba(10,15,11,0.05)',   text: 'rgba(10,15,11,0.6)', dot: '#94a3b8' },
  em_producao: { label: 'Em produção', bg: 'rgba(59,130,246,0.10)', text: '#2563eb',            dot: '#3b82f6' },
  entregue:    { label: 'Entregue',    bg: 'rgba(46,158,107,0.12)', text: '#1f7a52',            dot: '#2e9e6b' },
  atrasado:    { label: 'Atrasado',    bg: 'rgba(192,57,43,0.10)',  text: '#c0392b',            dot: '#c0392b' },
}

const COTA_ORDER = ['Master', 'Ouro', 'Prata', 'Apoio']
const COTA_CFG: Record<string, { bg: string; text: string; border: string }> = {
  Master: { bg: 'rgba(138,95,6,0.12)',   text: '#8a5f06', border: 'rgba(138,95,6,0.35)' },
  Ouro:   { bg: 'rgba(212,160,23,0.12)', text: '#a67c0a', border: 'rgba(212,160,23,0.35)' },
  Prata:  { bg: 'rgba(100,116,139,0.12)',text: '#475569', border: 'rgba(100,116,139,0.35)' },
  Apoio:  { bg: 'rgba(46,107,66,0.10)',  text: '#2e6b42', border: 'rgba(46,107,66,0.30)' },
}

function fmtPrazo(d: string | null) {
  if (!d) return null
  const [year, month, day] = d.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── Componente principal ────────────────────────────────────────────────────

export function DossieClient({ patrocinadores, escopo, conteudoStats, diaLabels }: Props) {
  const [busca, setBusca] = useState('')

  // Indexa escopo por patrocinador
  const escopoPorPat = useMemo(() => {
    const m = new Map<string, DossieEscopoItem[]>()
    for (const e of escopo) {
      if (!m.has(e.patrocinador_id)) m.set(e.patrocinador_id, [])
      m.get(e.patrocinador_id)!.push(e)
    }
    return m
  }, [escopo])

  const contMap = useMemo(
    () => new Map(conteudoStats.map(c => [c.patrocinador_id, c])),
    [conteudoStats],
  )

  // ── Totais globais ────────────────────────────────────────────────────────
  const totais = useMemo(() => {
    let unidadesTotal = 0, unidadesEntregues = 0
    let itensPendentes = 0, itensAtrasados = 0, itensEntregues = 0, itensEmProducao = 0
    for (const e of escopo) {
      unidadesTotal += e.quantidade_prevista
      if (e.status === 'entregue') { unidadesEntregues += e.quantidade_prevista; itensEntregues++ }
      else if (e.status === 'pendente')    itensPendentes++
      else if (e.status === 'atrasado')    itensAtrasados++
      else if (e.status === 'em_producao') itensEmProducao++
    }
    const pct = unidadesTotal > 0 ? Math.round((unidadesEntregues / unidadesTotal) * 100) : 0
    return {
      unidadesTotal, unidadesEntregues, pct,
      itensPendentes, itensAtrasados, itensEntregues, itensEmProducao,
      totalItens: escopo.length,
    }
  }, [escopo])

  // ── Filtro de busca ───────────────────────────────────────────────────────
  const buscaNorm = busca.trim().toLowerCase()
  const patFiltrados = useMemo(() => {
    if (!buscaNorm) return patrocinadores
    return patrocinadores.filter(p =>
      p.nome.toLowerCase().includes(buscaNorm) ||
      (p.cota ?? '').toLowerCase().includes(buscaNorm) ||
      (escopoPorPat.get(p.id) ?? []).some(e =>
        (e.tipo_conteudo ?? '').toLowerCase().includes(buscaNorm) ||
        (e.descricao ?? '').toLowerCase().includes(buscaNorm),
      ),
    )
  }, [patrocinadores, buscaNorm, escopoPorPat])

  // Ordena por cota (Master → Apoio → sem cota), depois nome
  const patOrdenados = useMemo(() => {
    const cotaRank = (c: string | null) => {
      const i = COTA_ORDER.indexOf(c ?? '')
      return i === -1 ? 99 : i
    }
    return [...patFiltrados].sort((a, b) =>
      cotaRank(a.cota) - cotaRank(b.cota) || a.nome.localeCompare(b.nome, 'pt-BR'),
    )
  }, [patFiltrados])

  return (
    <div style={{ fontFamily: SANS, color: '#0A0F0B' }}>

      {/* ─── Breadcrumb + título ─── */}
      <div className="mb-5 flex items-center gap-2 print:hidden">
        <Link
          href="/patrocinadores"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:border-[rgba(10,15,11,0.20)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={13} />
          Patrocinadores
        </Link>
      </div>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(10,15,11,0.55)', letterSpacing: '-0.01em' }}>
            visão geral consolidada · {patrocinadores.length} patrocinadores ativos
          </p>
          <h1 style={{
            marginTop: 4,
            fontFamily: SANS,
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.045em',
            lineHeight: 0.95,
          }}>
            Dossiê de Entregas
          </h1>
        </div>

        {/* Busca + imprimir */}
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2" style={{ minWidth: 200 }}>
            <Search size={14} style={{ color: 'rgba(10,15,11,0.4)', flexShrink: 0 }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Filtrar patrocinador, tipo..."
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%', color: '#0A0F0B' }}
            />
          </div>
          <button
            onClick={() => window.print()}
            title="Imprimir / salvar PDF"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-xs font-semibold text-[var(--muted-foreground)] hover:border-[rgba(10,15,11,0.20)] hover:text-[var(--foreground)] transition-colors"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </header>

      {/* ─── Resumo executivo (cards de totais) ─── */}
      <section
        className="mb-8 grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        <StatCard label="Progresso geral" big={`${totais.pct}%`} sub={`${totais.unidadesEntregues}/${totais.unidadesTotal} unidades`} tone={totais.pct >= 70 ? 'green' : totais.pct >= 40 ? 'gold' : 'red'} />
        <StatCard label="Itens contratados" big={String(totais.totalItens)} sub={`${patrocinadores.length} patrocinadores`} tone="ink" />
        <StatCard label="Entregues" big={String(totais.itensEntregues)} sub="itens concluídos" tone="green" />
        <StatCard label="Em produção" big={String(totais.itensEmProducao)} sub="em andamento" tone="blue" />
        <StatCard label="Pendentes" big={String(totais.itensPendentes)} sub="aguardando" tone="ink" />
        <StatCard label="Atrasados" big={String(totais.itensAtrasados)} sub="fora do prazo" tone="red" alert={totais.itensAtrasados > 0} />
      </section>

      {/* ─── Lista por patrocinador ─── */}
      <div className="space-y-5">
        {patOrdenados.map(p => (
          <PatrocinadorBloco
            key={p.id}
            p={p}
            itens={escopoPorPat.get(p.id) ?? []}
            cont={contMap.get(p.id)}
            diaLabels={diaLabels}
          />
        ))}

        {patOrdenados.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
            <p style={{ fontSize: 14, color: 'rgba(10,15,11,0.5)' }}>
              {busca ? 'Nenhum patrocinador corresponde à busca.' : 'Nenhum patrocinador cadastrado.'}
            </p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  )
}

// ── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ label, big, sub, tone, alert }: {
  label: string; big: string; sub: string
  tone: 'green' | 'gold' | 'red' | 'blue' | 'ink'
  alert?: boolean
}) {
  const colorMap = {
    green: '#1f7a52', gold: '#a67c0a', red: '#c0392b', blue: '#2563eb', ink: '#0A0F0B',
  }
  return (
    <div
      className="rounded-2xl border bg-[var(--card)] p-4"
      style={{ borderColor: alert ? 'rgba(192,57,43,0.30)' : 'var(--border)' }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,15,11,0.5)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{
        marginTop: 6,
        fontFamily: SANS,
        fontSize: 34, fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 0.95,
        color: colorMap[tone],
        fontVariantNumeric: 'tabular-nums',
      }}>
        {big}
      </p>
      <p style={{ marginTop: 4, fontSize: 11, fontWeight: 500, color: 'rgba(10,15,11,0.5)' }}>
        {sub}
      </p>
    </div>
  )
}

// ── Bloco de um patrocinador ──────────────────────────────────────────────────

function PatrocinadorBloco({ p, itens, cont, diaLabels }: {
  p: DossiePatrocinador
  itens: DossieEscopoItem[]
  cont?: ConteudoStat
  diaLabels: Record<string, string>
}) {
  const cotaCfg = p.cota ? COTA_CFG[p.cota] : null
  const cor = p.cor_marca || '#2e6b42'

  // Progresso de unidades
  const totalUnid = itens.reduce((s, i) => s + i.quantidade_prevista, 0)
  const entregUnid = itens.filter(i => i.status === 'entregue').reduce((s, i) => s + i.quantidade_prevista, 0)
  const pct = totalUnid > 0 ? Math.round((entregUnid / totalUnid) * 100) : 0
  const atrasados = itens.filter(i => i.status === 'atrasado').length

  return (
    <section
      className="overflow-hidden rounded-2xl border bg-[var(--card)] break-inside-avoid"
      style={{ borderColor: 'var(--border)', borderLeft: `4px solid ${cor}` }}
    >
      {/* Header do patrocinador */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo / inicial */}
          <div
            className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.logo_url
              ? <img src={p.logo_url} alt={p.nome} className="h-full w-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <span style={{ fontSize: 16, fontWeight: 800, color: cor }}>{p.nome.slice(0, 2).toUpperCase()}</span>}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#0A0F0B' }}>
                {p.nome}
              </h2>
              {cotaCfg && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 999,
                  background: cotaCfg.bg, color: cotaCfg.text, border: `1px solid ${cotaCfg.border}`,
                }}>
                  {p.cota}
                </span>
              )}
            </div>
            {/* Contato inline */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5" style={{ fontSize: 11, color: 'rgba(10,15,11,0.55)' }}>
              {p.contato_nome && <span className="inline-flex items-center gap-1"><User size={10} />{p.contato_nome}</span>}
              {p.contato_email && <span className="inline-flex items-center gap-1"><Mail size={10} />{p.contato_email}</span>}
              {p.contato_telefone && <span className="inline-flex items-center gap-1"><Phone size={10} />{p.contato_telefone}</span>}
            </div>
          </div>
        </div>

        {/* Progresso + link */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              {atrasados > 0 && (
                <span className="inline-flex items-center gap-1" style={{ fontSize: 10, fontWeight: 700, color: '#c0392b' }}>
                  <AlertTriangle size={11} />{atrasados}
                </span>
              )}
              <span style={{
                fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
                color: pct === 100 ? '#1f7a52' : '#0A0F0B', fontVariantNumeric: 'tabular-nums',
              }}>
                {pct}%
              </span>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(10,15,11,0.5)', fontWeight: 600 }}>
              {entregUnid}/{totalUnid} unid · {itens.length} itens
            </p>
          </div>
          <Link
            href={`/patrocinadores/${p.id}`}
            className="print:hidden shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:border-[rgba(10,15,11,0.20)] hover:text-[var(--foreground)] transition-colors"
          >
            Abrir ficha
          </Link>
        </div>
      </div>

      {/* Barra de progresso */}
      {totalUnid > 0 && (
        <div className="h-1 w-full bg-[var(--muted)]">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#2e9e6b' : cor }} />
        </div>
      )}

      {/* Tabela de escopo */}
      {itens.length === 0 ? (
        <div className="p-4 text-center" style={{ fontSize: 12, color: 'rgba(10,15,11,0.45)' }}>
          Nenhuma entrega cadastrada para este patrocinador.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(10,15,11,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-2 py-2 text-left">Canal</th>
                <th className="px-2 py-2 text-center">Qtd</th>
                <th className="px-2 py-2 text-left">Descrição</th>
                <th className="px-2 py-2 text-left">Prazo</th>
                <th className="px-4 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map(item => {
                const meta = item.tipo_conteudo ? TIPO_META[item.tipo_conteudo] : null
                const Icon = meta?.Icon ?? FileText
                const iconColor = meta?.color ?? '#64748b'
                const statusMeta = STATUS_META[item.status] ?? STATUS_META.pendente
                const prazo = fmtPrazo(item.prazo_limite)
                const diaNome = item.dia_id ? diaLabels[item.dia_id] : null

                return (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--border)', fontSize: 12.5 }}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5" style={{ fontWeight: 600, color: '#0A0F0B' }}>
                        <span className="flex h-5 w-5 items-center justify-center rounded" style={{ background: `${iconColor}18` }}>
                          <Icon size={11} style={{ color: iconColor }} />
                        </span>
                        {meta?.label ?? item.tipo_conteudo ?? '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5" style={{ color: 'rgba(10,15,11,0.6)' }}>
                      {item.canal ? (CANAL_LABEL[item.canal] ?? item.canal) : '—'}
                    </td>
                    <td className="px-2 py-2.5 text-center" style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#0A0F0B' }}>
                      {item.quantidade_prevista}
                    </td>
                    <td className="px-2 py-2.5" style={{ color: 'rgba(10,15,11,0.6)', maxWidth: 280 }}>
                      <span className="line-clamp-1">{item.descricao || '—'}</span>
                    </td>
                    <td className="px-2 py-2.5" style={{ color: 'rgba(10,15,11,0.6)', whiteSpace: 'nowrap' }}>
                      {prazo ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} />
                          {prazo}{diaNome ? ` · ${diaNome}` : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                        style={{ background: statusMeta.bg, color: statusMeta.text, fontSize: 10, fontWeight: 700 }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusMeta.dot }} />
                        {statusMeta.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Observações + stats de conteúdo */}
      {(p.observacoes || (cont && cont.total > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2.5" style={{ background: 'rgba(10,15,11,0.015)' }}>
          {p.observacoes ? (
            <p style={{ fontSize: 11.5, color: 'rgba(10,15,11,0.6)', fontStyle: 'italic', flex: 1, minWidth: 0 }}>
              {p.observacoes}
            </p>
          ) : <span />}
          {cont && cont.total > 0 && (
            <span className="inline-flex items-center gap-1.5 shrink-0" style={{ fontSize: 11, fontWeight: 600, color: '#1f7a52' }}>
              <CheckCircle2 size={12} />
              {cont.publicados}/{cont.total} conteúdos publicados
            </span>
          )}
        </div>
      )}
    </section>
  )
}
