'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Camera, CheckSquare, ClipboardList, Swords, MapPin, Music,
  Heart, Lightbulb, BookOpen, Calendar,
  BarChart3, Radio, UserCircle, Tv2,
} from 'lucide-react'
import { CoordDashboard, TimelineVertical, dayLabel } from './CoordDashboard'
import type {
  CoordConteudoHoje,
  CoordJogo,
  CoordShow,
  CoordFesta,
  CoordTurnoCount,
  CoordPatrocinador,
} from './CoordDashboard'
import { AnalyticsCards } from './AnalyticsCards'
import type { RankingItem, LacunaItem, VolumePorHora, AtleticaItem } from './AnalyticsCards'
import { HomeBriefing } from './HomeBriefing'
import { HomeQuickGrid } from './HomeQuickGrid'
import { HomeMetrics } from './HomeMetrics'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WeatherDay {
  label: string
  tMax: number
  tMin: number
  rain: number
  emoji: string
}

interface ContentStats {
  total: number
  rascunho: number
  em_producao: number
  publicado: number
}

interface HeatCell {
  tipo: string
  dia: number
  count: number
}

interface TurnoHoje {
  id: string
  inicio: string
  fim: string
  funcao: string
  setor: { nome: string } | null
}

interface ChecklistInst {
  id: string
  nome_override: string | null
  show: { nome: string } | null
  jogo: { equipe_a_nome: string; equipe_b_nome: string } | null
  checklist_itens: { id: string; status: string }[]
}

interface Props {
  profile: { nome: string; role: string; funcao_principal: string | null } | null
  contentStats: ContentStats
  heatmapData: HeatCell[]
  turnosHoje: TurnoHoje[]
  checklistsAtivos: ChecklistInst[]
  diffDays: number
  eventActive: boolean
  weatherDays: WeatherDay[] | null
  isCoord: boolean
  isOperador: boolean
  coordConteudosHoje?: CoordConteudoHoje[]
  coordJogosHoje?: CoordJogo[]
  coordShowsHoje?: CoordShow[]
  coordFestasHoje?: CoordFesta[]
  coordTurnosHoje?: CoordTurnoCount[]
  coordPatrocinadores?: CoordPatrocinador[]
  coordConteudosPorPatrocinador?: { patrocinador_id: string | null; status: string }[]
  coordChecklistItens?: { id: string; status: string }[]
  coordDiasEvento?: { id: string; data: string }[]
  coordDiaAtualId?: string | null
  coordTurnosCoberturaAV?: { setor_id: string; funcao: string; dia_id: string }[]
  coordYoutubeSetorIds?: string[]
  analyticsRanking?:       RankingItem[]
  analyticsLacunas?:       LacunaItem[]
  analyticsVolumePorHora?: VolumePorHora[]
  analyticsAtleticas?:     AtleticaItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  coordenacao: 'Coordenação',
  lider_area:  'Líder de área',
  operador:    'Operador',
}

// ─────────────────────────────────────────────────────────────────────────────
// EditorialHeader — bold display heading with optional CTA (replaces SectionHeader)
// ─────────────────────────────────────────────────────────────────────────────

function EditorialHeader({
  title,
  subtitle,
  cta,
}: {
  title:    string
  subtitle?: string
  cta?:     React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
      <div>
        <h2 style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 'clamp(28px, 3vw, 40px)',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: '#0A0F0B',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            marginTop: 6,
            fontSize: 14, fontWeight: 500,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {cta}
    </div>
  )
}

// AgendaSection foi movida para /agenda (página dedicada)

type CatFilter = 'todos' | 'jogos' | 'shows' | 'festas' | 'youtube'

function AgendaSection({
  jogosHoje,
  showsHoje,
  festasHoje,
  diasEvento,
  diaAtualId,
  turnosCoberturaAV = [],
  youtubeSetorIds = [],
}: {
  jogosHoje:  CoordJogo[]
  showsHoje:  CoordShow[]
  festasHoje: CoordFesta[]
  diasEvento: { id: string; data: string }[]
  diaAtualId: string | null
  turnosCoberturaAV?: { setor_id: string; funcao: string; dia_id: string }[]
  youtubeSetorIds?: string[]
}) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(diaAtualId)
  const [cat, setCat] = useState<CatFilter>('todos')

  useEffect(() => {
    if (!selectedDayId && diaAtualId) setSelectedDayId(diaAtualId)
  }, [diaAtualId, selectedDayId])

  const jogosFiltered  = selectedDayId ? jogosHoje.filter(j => j.dia_id === selectedDayId) : jogosHoje
  const showsFiltered  = selectedDayId ? showsHoje.filter(s => s.dia_id === selectedDayId) : showsHoje
  const festasFiltered = selectedDayId ? festasHoje.filter(f => f.dia_id === selectedDayId) : festasHoje
  const isToday        = selectedDayId === diaAtualId

  // Coverage map para o dia selecionado
  const coberturaPorSetor = useMemo(() => {
    const result: Record<string, { foto: boolean; video: boolean }> = {}
    for (const t of turnosCoberturaAV) {
      if (t.dia_id !== selectedDayId) continue
      if (!t.setor_id) continue
      if (!result[t.setor_id]) result[t.setor_id] = { foto: false, video: false }
      if (t.funcao === 'foto')  result[t.setor_id].foto  = true
      if (t.funcao === 'video') result[t.setor_id].video = true
    }
    return result
  }, [turnosCoberturaAV, selectedDayId])

  // Filtros finais por categoria
  const jFinal =
    cat === 'shows' || cat === 'festas' ? [] :
    cat === 'youtube' ? jogosFiltered.filter(j => j.setor_id && youtubeSetorIds.includes(j.setor_id)) :
    jogosFiltered

  const sFinal =
    cat === 'jogos' || cat === 'festas' ? [] :
    cat === 'youtube' ? showsFiltered.filter(s => s.setor_id && youtubeSetorIds.includes(s.setor_id)) :
    showsFiltered

  const fFinal =
    cat === 'jogos' || cat === 'shows' ? [] :
    cat === 'youtube' ? festasFiltered.filter(f => f.setor_id && youtubeSetorIds.includes(f.setor_id)) :
    festasFiltered

  const youtubeCount = [
    ...jogosFiltered.filter(j => j.setor_id && youtubeSetorIds.includes(j.setor_id)),
    ...showsFiltered.filter(s => s.setor_id && youtubeSetorIds.includes(s.setor_id)),
    ...festasFiltered.filter(f => f.setor_id && youtubeSetorIds.includes(f.setor_id)),
  ].length

  const cats: { key: CatFilter; icon: string; label: string; count: number }[] = [
    { key: 'todos',   icon: '📋', label: 'Todos',   count: jogosFiltered.length + showsFiltered.length + festasFiltered.length },
    { key: 'jogos',   icon: '🏆', label: 'Jogos',   count: jogosFiltered.length },
    { key: 'shows',   icon: '🎤', label: 'Shows',   count: showsFiltered.length },
    { key: 'festas',  icon: '🎉', label: 'Festas',  count: festasFiltered.length },
    { key: 'youtube', icon: '📺', label: 'YouTube',  count: youtubeCount },
  ]

  return (
    <div className="cia-edit-card cia-edit-card--cream" style={{ minHeight: 0, padding: '24px 28px' }}>

      {/* Day filter — editorial pills */}
      {diasEvento.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {diasEvento.map(d => {
            const isSel = selectedDayId === d.id
            const isAct = d.id === diaAtualId
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDayId(d.id)}
                style={{
                  position: 'relative',
                  padding: '7px 14px',
                  borderRadius: 999,
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '-0.01em',
                  background: isSel ? '#0A0F0B' : 'rgba(10,15,11,0.05)',
                  color: isSel ? '#FFFFFF' : 'rgba(10,15,11,0.55)',
                  border: '1px solid transparent',
                  transition: 'all 0.18s ease',
                  cursor: 'pointer',
                }}
              >
                {dayLabel(d.data)}
                {isAct && (
                  <span style={{
                    position: 'absolute',
                    top: -2, right: -2,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#2e6b42',
                    boxShadow: '0 0 6px rgba(46,107,66,0.7)',
                    border: '2px solid #FAF7F0',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Category filter — colored pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {cats.map(c => {
          const isSel = cat === c.key
          const isYt  = c.key === 'youtube'
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 999,
                fontSize: 12, fontWeight: 700,
                letterSpacing: '-0.01em',
                background: isSel
                  ? isYt ? 'rgba(196,107,74,0.18)' : 'rgba(10,15,11,0.06)'
                  : 'transparent',
                border: `1px solid ${
                  isSel
                    ? isYt ? 'rgba(196,107,74,0.40)' : 'rgba(10,15,11,0.18)'
                    : 'rgba(10,15,11,0.10)'
                }`,
                color: isSel
                  ? isYt ? '#A04A2E' : '#0A0F0B'
                  : isYt ? 'rgba(196,107,74,0.65)' : 'rgba(10,15,11,0.55)',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 14 }}>{c.icon}</span>
              <span>{c.label}</span>
              {c.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  letterSpacing: '-0.02em',
                  padding: '1px 7px',
                  borderRadius: 999,
                  background: isSel
                    ? isYt ? '#A04A2E' : '#0A0F0B'
                    : 'rgba(10,15,11,0.10)',
                  color: isSel ? '#FFFFFF' : 'rgba(10,15,11,0.65)',
                  marginLeft: 2,
                }}>
                  {c.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <TimelineVertical
        jogosHoje={jFinal}
        showsHoje={sFinal}
        festasHoje={fFinal}
        isToday={isToday}
        coberturaPorSetor={coberturaPorSetor}
      />
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// OperacionalSection — turnos + checklists do dia (role: operador)
// ─────────────────────────────────────────────────────────────────────────────

function OperacionalSection({
  turnosHoje,
  checklistsAtivos,
}: {
  turnosHoje: TurnoHoje[]
  checklistsAtivos: ChecklistInst[]
}) {
  return (
    <>
      {/* Minha escala */}
      <div className="cia-metrics-col-6 cia-edit-card cia-edit-card--cream cia-metrics-cell" style={{ minHeight: 240 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(10,15,11,0.55)', letterSpacing: '-0.01em' }}>
          minha escala hoje
        </span>
        <h3 style={{ marginTop: 4, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0F0B', lineHeight: 1.05 }}>
          {turnosHoje.length === 0 ? 'Livre hoje' : `${turnosHoje.length} turno${turnosHoje.length === 1 ? '' : 's'}`}
        </h3>
        {turnosHoje.length === 0 ? (
          <p style={{ marginTop: 12, fontSize: 13, color: 'rgba(10,15,11,0.45)' }}>Sem turnos agendados para hoje.</p>
        ) : (
          <ul className="mt-4 space-y-2 flex-1 overflow-y-auto" style={{ maxHeight: 180 }}>
            {turnosHoje.map(t => (
              <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(46,107,66,0.06)', border: '1px solid rgba(46,107,66,0.15)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e6b42', boxShadow: '0 0 6px rgba(46,107,66,0.50)', flexShrink: 0 }} />
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0F0B', letterSpacing: '-0.01em', textTransform: 'capitalize' }}>
                    {t.funcao.replace(/_/g, ' ')}
                  </p>
                  {t.setor && <p style={{ fontSize: 11, color: 'rgba(10,15,11,0.55)', marginTop: 1 }}>{t.setor.nome}</p>}
                </div>
                <span style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 12, fontWeight: 700, color: '#2e6b42', letterSpacing: '-0.02em', flexShrink: 0 }}>
                  {new Date(t.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' '}–{' '}
                  {new Date(t.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Checklists */}
      <div className="cia-metrics-col-6 cia-edit-card cia-edit-card--lavender cia-metrics-cell" style={{ minHeight: 240 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(45,27,92,0.65)', letterSpacing: '-0.01em' }}>checklists ativos</span>
          <Link href="/checklist" style={{ fontSize: 11, fontWeight: 700, color: '#2D1B5C', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: 3 }}>ver todos</Link>
        </div>
        <h3 style={{ marginTop: 4, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0F0B', lineHeight: 1.05 }}>
          {checklistsAtivos.length === 0 ? 'Nada criado' : `${checklistsAtivos.length} aberto${checklistsAtivos.length === 1 ? '' : 's'}`}
        </h3>
        {checklistsAtivos.length === 0 ? (
          <p style={{ marginTop: 12, fontSize: 13, color: 'rgba(45,27,92,0.50)' }}>Nenhum checklist criado ainda.</p>
        ) : (
          <ul className="mt-4 space-y-2 flex-1 overflow-y-auto" style={{ maxHeight: 180 }}>
            {checklistsAtivos.map(inst => {
              const itens = inst.checklist_itens ?? []
              const feitos = itens.filter(i => i.status === 'feito').length
              const pctCheck = itens.length > 0 ? Math.round((feitos / itens.length) * 100) : 0
              const titulo = inst.nome_override ?? inst.show?.nome ?? (inst.jogo ? `${inst.jogo.equipe_a_nome} × ${inst.jogo.equipe_b_nome}` : 'Checklist')
              return (
                <li key={inst.id}>
                  <Link href={`/checklist/${inst.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.40)', border: '1px solid rgba(45,27,92,0.14)', textDecoration: 'none', transition: 'all 0.18s ease' }} className="hover:bg-white">
                    <CheckSquare style={{ width: 14, height: 14, color: '#2D1B5C', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#0A0F0B', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</span>
                    <span style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontSize: 13, fontWeight: 800, color: pctCheck === 100 ? '#2e6b42' : '#2D1B5C', letterSpacing: '-0.02em', flexShrink: 0 }}>{pctCheck}%</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeClient
// ─────────────────────────────────────────────────────────────────────────────

export function HomeClient({
  profile,
  contentStats,
  heatmapData,
  turnosHoje,
  checklistsAtivos,
  diffDays,
  eventActive,
  weatherDays,
  isCoord,
  isOperador,
  coordConteudosHoje      = [],
  coordJogosHoje          = [],
  coordShowsHoje          = [],
  coordFestasHoje         = [],
  coordTurnosHoje         = [],
  coordPatrocinadores     = [],
  coordConteudosPorPatrocinador = [],
  coordChecklistItens     = [],
  coordDiasEvento         = [],
  coordDiaAtualId         = null,
  coordTurnosCoberturaAV  = [],
  coordYoutubeSetorIds    = [],
  analyticsRanking        = [],
  analyticsLacunas        = [],
  analyticsVolumePorHora  = [],
  analyticsAtleticas      = [],
}: Props) {
  const pct = contentStats.total > 0
    ? Math.round((contentStats.publicado / contentStats.total) * 100)
    : 0

  const [tab, setTab] = useState<'comandos' | 'analises'>('comandos')

  // Quick-access cards (editorial bold)
  const quickCards: Parameters<typeof HomeQuickGrid>[0]['cards'] = [
    { href: '/conteudos',            label: 'Conteúdos',    meta: `${contentStats.total} ativos · ${pct}% publicados`, tone: 'terracotta', span: 'lg', icon: Camera },
    { href: '/pautas',               label: 'Pautas',       meta: 'Banco de ideias',                                    tone: 'lavender',   span: 'md', icon: Lightbulb },
    { href: '/agenda',               label: 'Agenda',       meta: 'Jogos · shows · festas',                             tone: 'electric',   span: 'md', icon: Calendar },
    { href: '/wiki',                 label: 'Wiki',         meta: 'Acervo',                                              tone: 'gold',       span: 'sm', icon: BookOpen },
    { href: '/checklist',            label: 'Checklists',   meta: 'Tarefas por evento',                                  tone: 'green',      span: 'md', icon: CheckSquare },
    { href: '/minha-escala',         label: 'Minha escala', meta: 'Seus turnos',                                         tone: 'lavender',   span: 'md', icon: UserCircle },
    { href: '/admin/escala',         label: 'Escala AV',    meta: 'Foto e vídeo',                                        tone: 'cream',      span: 'md', icon: ClipboardList },
    { href: '/mapa',                 label: 'Mapa',         meta: 'Setores e WiFi',                                      tone: 'terracotta', span: 'md', icon: MapPin },
    { href: '/admin/jogos',          label: 'Jogos',        meta: 'Modalidades',                                         tone: 'electric',   span: 'sm', icon: Swords },
    { href: '/admin/shows',          label: 'Shows',        meta: 'Música',                                              tone: 'lavender',   span: 'sm', icon: Music },
    { href: '/admin/patrocinadores', label: 'Patrocínios',  meta: 'Marcas parceiras',                                    tone: 'gold',       span: 'sm', icon: Heart },
    { href: '/placar',               label: 'Placar',       meta: 'Ao vivo',                                             tone: 'green',      span: 'sm', icon: Radio },
  ]

  return (
    <main className="relative z-10 flex-1 overflow-y-auto">

      {/* ══════════════════════════════════════════════════════════
          BRIEFING — editorial hero (lavender · gold · terracotta)
          ══════════════════════════════════════════════════════════ */}
      <HomeBriefing
        userName={profile?.nome ?? 'time'}
        userRole={profile?.role ? ROLE_LABEL[profile.role] ?? null : null}
        diffDays={diffDays}
        eventActive={eventActive}
        publicados={contentStats.publicado}
        total={contentStats.total}
        emProducao={contentStats.em_producao}
        rascunho={contentStats.rascunho}
      />

      {/* ══════════════════════════════════════════════════════════
          QUICK GRID — bold colored module cards
          ══════════════════════════════════════════════════════════ */}
      <HomeQuickGrid cards={quickCards} />

      {/* ══════════════════════════════════════════════════════════
          METRICS — saúde · pipeline · clima · cobertura (editorial)
          ══════════════════════════════════════════════════════════ */}
      <HomeMetrics
        contentStats={contentStats}
        heatmapData={heatmapData}
        weatherDays={weatherDays}
      />

      {/* ══════════════════════════════════════════════════════════
          TABS — Comandos / Análises
          ══════════════════════════════════════════════════════════ */}
      <section style={{ padding: '8px 24px 40px' }}>
        <div className="mx-auto max-w-7xl">

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderBottom: '1px solid var(--border)',
            marginBottom: 28,
          }}>
            {([
              { key: 'comandos', label: 'Comandos' },
              { key: 'analises', label: 'Análises' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: tab === t.key ? 'var(--foreground)' : 'rgba(10,15,11,0.40)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t.key
                    ? '2px solid var(--foreground)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color 0.18s ease, border-color 0.18s ease',
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            ))}

            {/* TV mode — move aqui, sai do header */}
            <a
              href="/tv"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                background: '#0A0F0B',
                color: '#FFFFFF',
                fontSize: 12, fontWeight: 700,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
              }}
            >
              <Tv2 style={{ width: 13, height: 13 }} />
              Modo TV
            </a>
          </div>

          {/* Tab: Comandos */}
          {tab === 'comandos' && (
            <div>
              <CoordDashboard
                conteudosHoje={coordConteudosHoje}
                jogosHoje={coordJogosHoje}
                showsHoje={coordShowsHoje}
                festasHoje={coordFestasHoje}
                turnosHoje={coordTurnosHoje}
                patrocinadores={coordPatrocinadores}
                conteudosPorPatrocinador={coordConteudosPorPatrocinador}
                checklistItens={coordChecklistItens}
                diasEvento={coordDiasEvento}
                diaAtualId={coordDiaAtualId}
              />

              {/* Operacional — só para role operador */}
              {isOperador && (
                <div className="mt-6 grid" style={{
                  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                  gap: 14,
                }}>
                  <OperacionalSection
                    turnosHoje={turnosHoje}
                    checklistsAtivos={checklistsAtivos}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tab: Análises */}
          {tab === 'analises' && (
            <AnalyticsCards
              ranking={analyticsRanking}
              lacunas={analyticsLacunas}
              volumePorHora={analyticsVolumePorHora}
              atleticas={analyticsAtleticas}
            />
          )}
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════
          STATUS BAR — final do scroll
          ══════════════════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 32px' }}>
        <div className="mx-auto max-w-7xl">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 20px',
            borderRadius: 999,
            background: '#FAF7F0',
            border: '1px solid rgba(10,15,11,0.08)',
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
            flexWrap: 'wrap',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#2e6b42',
              boxShadow: '0 0 8px rgba(46,107,66,0.50)',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 700, color: '#2e6b42' }}>Sistema operacional</span>
            <span style={{ color: 'rgba(10,15,11,0.30)' }}>·</span>
            <span>Supabase · RLS ativo</span>
            <div className="ml-auto flex items-center gap-2">
              <BarChart3 style={{ width: 14, height: 14, color: 'rgba(10,15,11,0.30)' }} />
              <span style={{ fontWeight: 700, color: 'rgba(10,15,11,0.45)' }}>CIA 2026 · v0.7</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
