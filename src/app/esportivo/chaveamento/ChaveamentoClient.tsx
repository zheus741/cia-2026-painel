'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Trophy, ChevronRight, ChevronLeft, Search, Inbox, ArrowLeft,
  Radio, Clock, CheckCircle2, Users, Calendar, Crown, X, Swords,
  Layers, Sparkles, RefreshCw, AlertTriangle, Settings, Save, ChevronDown,
} from 'lucide-react'
import { BracketView } from './BracketView'
import { recalcularChaveAction } from '@/app/placar/actions'
import { upsertChaveConfig } from './actions'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/confirm-dialog'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface JogoChave {
  id: string
  dia_id: string
  setor_id: string | null
  inicio: string | null
  status: string
  wo: 'a' | 'b' | 'duplo' | null
  modalidade_id: string | null
  categoria: string | null
  divisao: string | null
  fase: string | null
  equipe_a_id: string | null
  equipe_b_id: string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  placar_a: number | null
  placar_b: number | null
  modalidade: { nome: string; icone: string; slug: string } | null
  equipe_a: { slug: string; cor_primaria: string | null; universidade: string | null; logo_url: string | null } | null
  equipe_b: { slug: string; cor_primaria: string | null; universidade: string | null; logo_url: string | null } | null
}

export interface Modalidade {
  id: string
  nome: string
  slug: string
  icone: string | null
  categorias: string[] | null
  divisoes: string[] | null
}

export interface ChaveConfig {
  id: string
  modalidade_id: string
  categoria: string
  divisao: string
  num_teams: number
  seeds: string[]  // array de nomes de atléticas em P1..PN
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Divisões disponíveis — extraídas dos jogos + ordem canônica */
const DIVISIONS_ORDER = [
  '1ª Divisão',
  '2ª Divisão',
  'Super 08',
  'Atlanta', 'Cyber City', 'Eldorado', 'Espetáculo',
  'Allura', 'Kazura', 'Urah', 'Ranach', 'Athempura',
]

function ordemDivisao(div: string): number {
  const idx = DIVISIONS_ORDER.findIndex(d => d.toLowerCase() === div.toLowerCase())
  return idx === -1 ? 999 : idx
}

/** Identifica uma "chave" pela combinação modalidade+categoria+divisão */
interface ChaveKey {
  modalidade: string
  categoria: string
  divisao: string
}

interface ChaveInfo extends ChaveKey {
  modalidadeIcone: string
  modalidadeSlug: string
  totalJogos: number
  jogosEncerrados: number
  jogosAoVivo: number
  hasFinal: boolean
}

// ── StatBlock (usado no hero da chave aberta) ────────────────────────────────
function StatBlock({
  icon, label, value, accent, subtitle,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  accent?: 'green' | 'red'
  subtitle?: string
}) {
  const accentClasses =
    accent === 'green' ? 'border-[var(--green-bright)]/30 bg-[var(--green-dim)]/10 text-[var(--green-bright)]'
    : accent === 'red'   ? 'border-red-500/30 bg-red-500/8 text-red-500'
    : 'border-[var(--border)] bg-[var(--card)]/40 text-[var(--foreground)]'

  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 ${accentClasses}`}>
      <span className="opacity-80">{icon}</span>
      <div className="leading-tight">
        <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">{label}</p>
        <p className="text-base font-extrabold tabular-nums">
          {value}
          {subtitle && <span className="ml-1 text-[10px] font-bold opacity-60">{subtitle}</span>}
        </p>
      </div>
    </div>
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  jogos: JogoChave[]
  modalidades: Modalidade[]
  chaveConfigs: ChaveConfig[]
}

export function ChaveamentoClient({ jogos, modalidades, chaveConfigs }: Props) {
  const [divisaoAtiva, setDivisaoAtiva] = useState<string>('1ª Divisão')
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')
  const [chaveAberta, setChaveAberta] = useState<ChaveKey | null>(null)
  const [busca, setBusca] = useState('')
  const [isRecalcPending, startRecalcTransition] = useTransition()
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [configEditorSeeds, setConfigEditorSeeds] = useState('')
  const [configEditorNumTeams, setConfigEditorNumTeams] = useState('')
  const [isSavingConfig, startSaveConfigTransition] = useTransition()

  // ── Derived: lista de divisões dos jogos ────────────────────────────────────
  const divisoesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const j of jogos) if (j.divisao) set.add(j.divisao)
    return Array.from(set).sort((a, b) => ordemDivisao(a) - ordemDivisao(b))
  }, [jogos])

  // ── Derived: lista de chaves (combos modalidade+cat+div com >=1 jogo) ───────
  // Robusto: aceita categoria null (agrupa como "—") pra não esconder jogos importados sem categoria preenchida.
  const chaves: ChaveInfo[] = useMemo(() => {
    const map = new Map<string, ChaveInfo>()
    for (const j of jogos) {
      // Modalidade e divisão são obrigatórios. Categoria pode faltar (vira "—").
      if (!j.modalidade || !j.divisao) continue
      if (j.divisao !== divisaoAtiva) continue
      if (modalidadeFiltro && j.modalidade.slug !== modalidadeFiltro) continue
      const cat = j.categoria ?? '—'
      if (categoriaFiltro && cat !== categoriaFiltro) continue

      const key = `${j.modalidade.slug}::${cat}::${j.divisao}`
      if (!map.has(key)) {
        map.set(key, {
          modalidade: j.modalidade.nome,
          modalidadeIcone: j.modalidade.icone,
          modalidadeSlug: j.modalidade.slug,
          categoria: cat,
          divisao: j.divisao,
          totalJogos: 0,
          jogosEncerrados: 0,
          jogosAoVivo: 0,
          hasFinal: false,
        })
      }
      const c = map.get(key)!
      c.totalJogos++
      if (j.status === 'encerrado') c.jogosEncerrados++
      if (j.status === 'ao_vivo')    c.jogosAoVivo++
      if (j.fase === 'final')        c.hasFinal = true
    }
    let list = Array.from(map.values())
    if (busca) {
      const q = busca.toLowerCase()
      list = list.filter(c =>
        c.modalidade.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) =>
      a.modalidade.localeCompare(b.modalidade) || a.categoria.localeCompare(b.categoria)
    )
  }, [jogos, divisaoAtiva, modalidadeFiltro, categoriaFiltro, busca])

  // ── Stats globais do evento (todas divisões/filtros) ────────────────────────
  const overviewStats = useMemo(() => {
    const total = jogos.length
    const aoVivo = jogos.filter(j => j.status === 'ao_vivo').length

    // Jogos hoje (timezone São Paulo)
    const now = new Date()
    const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const tEnd   = tStart + 86_400_000
    const hoje = jogos.filter(j => {
      if (!j.inicio) return false
      const t = new Date(j.inicio).getTime()
      return t >= tStart && t < tEnd && j.status !== 'encerrado'
    }).length

    // Atléticas únicas (por nome)
    const atleticas = new Set<string>()
    for (const j of jogos) {
      if (j.equipe_a_nome) atleticas.add(j.equipe_a_nome.trim().toUpperCase())
      if (j.equipe_b_nome) atleticas.add(j.equipe_b_nome.trim().toUpperCase())
    }

    // Chaves únicas
    const chavesSet = new Set<string>()
    for (const j of jogos) {
      if (!j.modalidade || !j.divisao) continue
      chavesSet.add(`${j.modalidade.slug}::${j.categoria ?? '—'}::${j.divisao}`)
    }

    return {
      totalJogos: total,
      aoVivo,
      hoje,
      atleticas: atleticas.size,
      chaves: chavesSet.size,
    }
  }, [jogos])

  // ── Stats por divisão (pra mostrar nos cards das tabs) ─────────────────────
  const statsPorDivisao = useMemo(() => {
    const map = new Map<string, { total: number; aoVivo: number; chaves: number }>()
    const chavesByDiv = new Map<string, Set<string>>()

    for (const j of jogos) {
      if (!j.divisao) continue
      if (!map.has(j.divisao)) {
        map.set(j.divisao, { total: 0, aoVivo: 0, chaves: 0 })
        chavesByDiv.set(j.divisao, new Set())
      }
      const s = map.get(j.divisao)!
      s.total++
      if (j.status === 'ao_vivo') s.aoVivo++
      if (j.modalidade) {
        chavesByDiv.get(j.divisao)!.add(`${j.modalidade.slug}::${j.categoria ?? '—'}::${j.divisao}`)
      }
    }
    for (const [div, set] of chavesByDiv) {
      map.get(div)!.chaves = set.size
    }
    return map
  }, [jogos])

  // ── Mapa numTeams por chave (modalidade+cat+div) ───────────────────────────
  const numTeamsPorChave = useMemo(() => {
    const m = new Map<string, number>()
    for (const cc of chaveConfigs) {
      const md = modalidades.find(mo => mo.id === cc.modalidade_id)
      if (!md) continue
      m.set(`${md.slug}::${cc.categoria}::${cc.divisao}`, cc.num_teams)
    }
    return m
  }, [chaveConfigs, modalidades])

  // ── Próximo jogo POR chave (pra preview no card) ───────────────────────────
  const proximoJogoPorChave = useMemo(() => {
    const now = Date.now()
    const m = new Map<string, JogoChave>()
    for (const j of jogos) {
      if (!j.modalidade || !j.divisao || !j.inicio) continue
      if (new Date(j.inicio).getTime() <= now) continue
      if (j.status === 'encerrado') continue
      const key = `${j.modalidade.slug}::${j.categoria ?? '—'}::${j.divisao}`
      const current = m.get(key)
      if (!current || new Date(j.inicio).getTime() < new Date(current.inicio!).getTime()) {
        m.set(key, j)
      }
    }
    return m
  }, [jogos])

  // ── Diagnóstico: quantos jogos estão sem campos essenciais na divisão atual? ─
  const diagnostico = useMemo(() => {
    const jogosDivisao = jogos.filter(j => j.divisao === divisaoAtiva)
    return {
      total:          jogosDivisao.length,
      semModalidade:  jogosDivisao.filter(j => !j.modalidade).length,
      semCategoria:   jogosDivisao.filter(j => !j.categoria).length,
      semFase:        jogosDivisao.filter(j => !j.fase).length,
    }
  }, [jogos, divisaoAtiva])

  // ── Modalidades disponíveis filtradas por divisão ativa ─────────────────────
  const modalidadesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const j of jogos) {
      if (j.divisao !== divisaoAtiva) continue
      if (j.modalidade?.slug) set.add(j.modalidade.slug)
    }
    return modalidades.filter(m => set.has(m.slug))
  }, [jogos, modalidades, divisaoAtiva])

  // ── Categorias disponíveis filtradas por div+modalidade ─────────────────────
  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const j of jogos) {
      if (j.divisao !== divisaoAtiva) continue
      if (modalidadeFiltro && j.modalidade?.slug !== modalidadeFiltro) continue
      if (j.categoria) set.add(j.categoria)
    }
    return Array.from(set).sort()
  }, [jogos, divisaoAtiva, modalidadeFiltro])

  // ── Render do bracket de uma chave específica ───────────────────────────────
  if (chaveAberta) {
    const jogosChave = jogos.filter(j =>
      j.modalidade?.slug === chaveAberta.modalidade &&
      j.categoria === chaveAberta.categoria &&
      j.divisao === chaveAberta.divisao
    )

    // Stats
    const totalJ      = jogosChave.length
    const encerradosJ = jogosChave.filter(j => j.status === 'encerrado').length
    const aoVivoJ     = jogosChave.filter(j => j.status === 'ao_vivo').length
    const completude  = totalJ > 0 ? Math.round((encerradosJ / totalJ) * 100) : 0

    // Próximo jogo agendado
    const now = Date.now()
    const proximoJogo = jogosChave
      .filter(j => j.inicio && new Date(j.inicio).getTime() > now && j.status !== 'encerrado')
      .sort((a, b) => new Date(a.inicio!).getTime() - new Date(b.inicio!).getTime())[0] ?? null

    // Config da chave
    const modalidadeAtual = modalidades.find(m => m.slug === chaveAberta.modalidade)
    const config = modalidadeAtual ? chaveConfigs.find(cc =>
      cc.modalidade_id === modalidadeAtual.id &&
      cc.categoria === chaveAberta.categoria &&
      cc.divisao === chaveAberta.divisao
    ) : null

    // Meta info da chave atual (todas as chaves da mesma divisão, sem filtros)
    const todasNaDivisao: ChaveInfo[] = (() => {
      const m = new Map<string, ChaveInfo>()
      for (const j of jogos) {
        if (!j.modalidade || !j.divisao) continue
        if (j.divisao !== chaveAberta.divisao) continue
        const cat = j.categoria ?? '—'
        const key = `${j.modalidade.slug}::${cat}::${j.divisao}`
        if (!m.has(key)) {
          m.set(key, {
            modalidade: j.modalidade.nome,
            modalidadeIcone: j.modalidade.icone,
            modalidadeSlug: j.modalidade.slug,
            categoria: cat,
            divisao: j.divisao,
            totalJogos: 0,
            jogosEncerrados: 0,
            jogosAoVivo: 0,
            hasFinal: false,
          })
        }
        const c = m.get(key)!
        c.totalJogos++
        if (j.status === 'encerrado') c.jogosEncerrados++
        if (j.status === 'ao_vivo') c.jogosAoVivo++
        if (j.fase === 'final') c.hasFinal = true
      }
      return Array.from(m.values()).sort((a, b) =>
        a.modalidade.localeCompare(b.modalidade) || a.categoria.localeCompare(b.categoria)
      )
    })()

    const currentIdx = todasNaDivisao.findIndex(c =>
      c.modalidadeSlug === chaveAberta.modalidade &&
      c.categoria === chaveAberta.categoria &&
      c.divisao === chaveAberta.divisao
    )
    const meta      = currentIdx >= 0 ? todasNaDivisao[currentIdx] : null
    const prevChave = currentIdx > 0 ? todasNaDivisao[currentIdx - 1] : null
    const nextChave = currentIdx >= 0 && currentIdx < todasNaDivisao.length - 1
      ? todasNaDivisao[currentIdx + 1] : null

    function fmtHora(ts: string | null): string {
      if (!ts) return ''
      try {
        return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      } catch { return '' }
    }
    function fmtData(ts: string | null): string {
      if (!ts) return ''
      try {
        return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      } catch { return '' }
    }

    return (
      <div className="space-y-5">
        {/* ─── Hero card ─── */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)]/85 to-[var(--green-dim)]/8 p-5 md:p-6">
          {/* Glow decorativo */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.20), transparent 70%)' }}
          />

          {/* Top row: back + nav */}
          <div className="relative flex items-center justify-between gap-3">
            <button
              onClick={() => setChaveAberta(null)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)]"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">Todas as chaves</span>
              <span className="sm:hidden">Voltar</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { if (prevChave) { setChaveAberta({ modalidade: prevChave.modalidadeSlug, categoria: prevChave.categoria, divisao: prevChave.divisao }); setShowConfigEditor(false) } }}
                disabled={!prevChave}
                title={prevChave ? `${prevChave.modalidade} · ${prevChave.categoria}` : 'Primeira chave da divisão'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted-foreground)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="hidden md:inline-flex min-w-[88px] items-center justify-center rounded-full bg-[var(--muted)]/30 px-3 py-1 text-[10px] font-bold tabular-nums uppercase tracking-wider text-[var(--muted-foreground)]">
                {currentIdx >= 0 ? currentIdx + 1 : 0} / {todasNaDivisao.length}
              </span>
              <button
                onClick={() => { if (nextChave) { setChaveAberta({ modalidade: nextChave.modalidadeSlug, categoria: nextChave.categoria, divisao: nextChave.divisao }); setShowConfigEditor(false) } }}
                disabled={!nextChave}
                title={nextChave ? `${nextChave.modalidade} · ${nextChave.categoria}` : 'Última chave da divisão'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted-foreground)]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {/* Botão "Recalcular chave" — reprocessa todos os jogos encerrados pra propagar
                  vencedores na chave. Útil quando jogos foram encerrados antes do avanço
                  automático existir, ou quando há suspeita de inconsistência. */}
              {(() => {
                const modalidadeAtualLocal = modalidades.find(m => m.slug === chaveAberta.modalidade)
                if (!modalidadeAtualLocal) return null
                return (
                  <button
                    onClick={async () => {
                      if (isRecalcPending) return
                      const ok = await confirmDialog({
                        title: 'Recalcular avanço da chave?',
                        description: 'Vai reprocessar todos os jogos encerrados em ordem (oitavas → quartas → semi → final) e atualizar os jogos seguintes com os vencedores. Operação segura e idempotente.',
                        confirmLabel: 'Recalcular',
                      })
                      if (!ok) return
                      startRecalcTransition(async () => {
                        const result = await recalcularChaveAction(
                          modalidadeAtualLocal.id,
                          chaveAberta.categoria,
                          chaveAberta.divisao,
                        )
                        if (result.ok && result.data) {
                          const d = result.data
                          toast.success('Recálculo da chave concluído', {
                            description: `${d.total} jogos processados · ${d.propagados} avançadas · ${d.pulados} já ok · ${d.errors} erros`,
                            duration: 8000,
                          })
                        } else {
                          toast.error('Falha no recálculo', { description: 'Veja o console pra detalhes.' })
                          console.error('[recalcular]', result)
                        }
                      })
                    }}
                    disabled={isRecalcPending}
                    title="Reprocessa todos os jogos encerrados desta chave e propaga vencedores"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] transition-all hover:border-[var(--gold-bright)]/40 hover:text-[var(--gold-bright)] disabled:opacity-40"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRecalcPending ? 'animate-spin' : ''}`} />
                    {isRecalcPending ? 'Recalculando…' : 'Recalcular'}
                  </button>
                )
              })()}
            </div>
          </div>

          {/* Main: icon + title + stats */}
          <div className="relative mt-5 flex flex-col gap-5 md:flex-row md:items-center md:gap-6">

            {/* Icon + title block */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--green-bright)]/25 bg-gradient-to-br from-[var(--green-dim)]/20 to-transparent text-3xl shadow-[0_0_24px_rgba(34,197,94,0.15)]">
                {meta?.modalidadeIcone ?? '🏆'}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] md:text-[28px]">
                  {meta?.modalidade ?? chaveAberta.modalidade}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-dim)]/15 px-2.5 py-0.5 font-bold uppercase tracking-wider text-[var(--green-bright)]">
                    {chaveAberta.categoria}
                  </span>
                  <span className="text-[var(--muted-foreground)]/40">·</span>
                  <span className="font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    {chaveAberta.divisao}
                  </span>
                  {config && (
                    <>
                      <span className="text-[var(--muted-foreground)]/40">·</span>
                      <span className="font-semibold tabular-nums text-[var(--muted-foreground)]">
                        {config.num_teams} equipes
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stats column */}
            <div className="md:ml-auto flex flex-wrap items-center gap-2 md:gap-3">
              <StatBlock
                icon={<Trophy className="h-3.5 w-3.5" />}
                label="Jogos"
                value={totalJ}
              />
              <StatBlock
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Encerrados"
                value={encerradosJ}
                accent="green"
                subtitle={`${completude}%`}
              />
              {aoVivoJ > 0 && (
                <StatBlock
                  icon={<Radio className="h-3.5 w-3.5 animate-pulse" />}
                  label="Ao vivo"
                  value={aoVivoJ}
                  accent="red"
                />
              )}
              {proximoJogo && (
                <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <div className="leading-tight">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/55">
                      Próximo
                    </p>
                    <p className="text-[11px] font-bold tabular-nums text-[var(--foreground)]">
                      {fmtData(proximoJogo.inicio)} · {fmtHora(proximoJogo.inicio)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {totalJ > 0 && (
            <div className="relative mt-5 h-1 w-full overflow-hidden rounded-full bg-[var(--muted)]/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--green-dim)] via-[var(--green-bright)] to-[#e8b94f] transition-all duration-500"
                style={{ width: `${completude}%` }}
              />
            </div>
          )}
        </div>

        {/* ─── Config panel ─── */}
        {(() => {
          const modalidadeAtualLocal = modalidades.find(m => m.slug === chaveAberta.modalidade)
          if (!modalidadeAtualLocal) return null

          // Auto-sugestão de seeds: times únicos dos jogos de oitavas (ou quartas, se não há oitavas)
          const oitavasJogos = jogosChave.filter(j => j.fase === 'oitavas')
          const fontJogos    = oitavasJogos.length > 0 ? oitavasJogos : jogosChave
          const suggestedTeams = Array.from(new Set(
            fontJogos.flatMap(j => [j.equipe_a_nome, j.equipe_b_nome]).filter(Boolean) as string[]
          )).sort()

          // num_teams auto: em single elimination, num_games = num_teams - 1
          const suggestedNumTeams = jogosChave.length + 1

          function openEditor() {
            if (!config) {
              setConfigEditorNumTeams(String(suggestedNumTeams))
              setConfigEditorSeeds(suggestedTeams.join('\n'))
            } else {
              setConfigEditorNumTeams(String(config.num_teams))
              setConfigEditorSeeds(config.seeds.join('\n'))
            }
            setShowConfigEditor(true)
          }

          function handleSave() {
            const seeds = configEditorSeeds
              .split('\n')
              .map(s => s.trim())
              .filter(Boolean)
            const numTeams = parseInt(configEditorNumTeams, 10)

            if (isNaN(numTeams) || numTeams < 2) {
              toast.error('Número de equipes inválido')
              return
            }
            if (seeds.length < 2) {
              toast.error('Precisa de pelo menos 2 seeds')
              return
            }

            const capModalidadeId = modalidadeAtualLocal!.id
            const capCategoria    = chaveAberta!.categoria
            const capDivisao      = chaveAberta!.divisao
            startSaveConfigTransition(async () => {
              const result = await upsertChaveConfig(
                capModalidadeId,
                capCategoria,
                capDivisao,
                numTeams,
                seeds,
              )
              if (result.ok) {
                toast.success('Seeds configuradas!', {
                  description: `${seeds.length} equipes · ${numTeams} vagas no bracket`,
                })
                setShowConfigEditor(false)
              } else {
                toast.error('Falha ao salvar', { description: result.error })
              }
            })
          }

          return (
            <div className={`rounded-2xl border ${
              !config
                ? 'border-amber-500/35 bg-amber-500/5'
                : 'border-[var(--border)] bg-[var(--card)]/40'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {!config ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <Settings className="h-4 w-4 shrink-0 text-[var(--green-bright)]" />
                  )}
                  <div>
                    {!config ? (
                      <>
                        <p className="text-[12px] font-bold text-amber-500">
                          Seeds não configuradas — propagação automática desativada
                        </p>
                        <p className="text-[11px] text-amber-700/80">
                          Defina as seeds para que o vencedor de cada jogo avance automaticamente na chave.
                        </p>
                      </>
                    ) : (
                      <p className="text-[12px] font-semibold text-[var(--muted-foreground)]">
                        Seeds configuradas · <span className="tabular-nums text-[var(--foreground)]">{config.num_teams}</span> equipes
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => showConfigEditor ? setShowConfigEditor(false) : openEditor()}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                    !config
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                      : 'border-[var(--border)] bg-[var(--card)]/60 text-[var(--muted-foreground)] hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)]'
                  }`}
                >
                  {showConfigEditor ? (
                    <><ChevronDown className="h-3 w-3" /> Fechar</>
                  ) : (
                    <><Settings className="h-3 w-3" /> {!config ? 'Configurar seeds' : 'Editar seeds'}</>
                  )}
                </button>
              </div>

              {/* Editor (collapsible) */}
              {showConfigEditor && (
                <div className="border-t border-[var(--border)]/60 px-4 pb-4 pt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                    {/* num_teams */}
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">
                        Nº equipes
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={64}
                        value={configEditorNumTeams}
                        onChange={e => setConfigEditorNumTeams(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm tabular-nums text-[var(--foreground)] focus:border-[var(--green-bright)]/60 focus:outline-none"
                      />
                      <p className="mt-1 text-[10px] text-[var(--muted-foreground)]/55">
                        Auto: {suggestedNumTeams} (jogos + 1)
                      </p>
                    </div>

                    {/* seeds */}
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/70">
                        Seeds — uma equipe por linha (1ª = melhor colocada)
                      </label>
                      <textarea
                        value={configEditorSeeds}
                        onChange={e => setConfigEditorSeeds(e.target.value)}
                        rows={Math.max(6, suggestedTeams.length)}
                        placeholder={suggestedTeams.slice(0, 3).join('\n') + '\n...'}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/35 focus:border-[var(--green-bright)]/60 focus:outline-none resize-y min-h-[120px]"
                      />
                      <p className="mt-1 text-[10px] text-[var(--muted-foreground)]/55">
                        {configEditorSeeds.split('\n').filter(s => s.trim()).length} seeds · sugeridas de {suggestedTeams.length} times nos jogos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowConfigEditor(false)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSavingConfig}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green-bright)]/50 bg-[var(--green-dim)]/20 px-4 py-1.5 text-[11px] font-bold text-[var(--green-bright)] transition-all hover:bg-[var(--green-dim)]/35 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {isSavingConfig ? 'Salvando…' : 'Salvar seeds'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        <BracketView jogos={jogosChave} config={config ?? null} />
      </div>
    )
  }

  // ── Render principal: overview + tabs + filtros + lista de chaves ─────────
  const divisoesAll  = divisoesDisponiveis.length > 0 ? divisoesDisponiveis : ['1ª Divisão']
  const principais   = divisoesAll.filter(d => d.toLowerCase().includes('divis') || d.toLowerCase().includes('super'))
  const conferencias = divisoesAll.filter(d => !principais.includes(d))
  const hasActiveFilters = !!(modalidadeFiltro || categoriaFiltro || busca)
  const modalidadeAtiva = modalidades.find(m => m.slug === modalidadeFiltro)

  function fmtData(ts: string | null): string {
    if (!ts) return ''
    try { return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
    catch { return '' }
  }
  function fmtHora(ts: string | null): string {
    if (!ts) return ''
    try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) }
    catch { return '' }
  }

  return (
    <div className="space-y-5">

      {/* ─── Stats overview strip ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--card)]/70 via-[var(--card)]/40 to-transparent">
        {/* Glow decorativo */}
        <div
          className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)' }}
        />
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <OverviewStat icon={<Trophy className="h-3.5 w-3.5 text-[var(--green-bright)]" />}
                        value={overviewStats.chaves} label="Chaves" />
          <span className="hidden sm:inline-block h-7 w-px bg-[var(--border)]" />
          <OverviewStat icon={<Swords className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />}
                        value={overviewStats.totalJogos} label="Jogos" />
          <span className="hidden sm:inline-block h-7 w-px bg-[var(--border)]" />
          <OverviewStat icon={<Users className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />}
                        value={overviewStats.atleticas} label="Atléticas" />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {overviewStats.hoje > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/8 px-3 py-1 text-[11px] font-bold text-amber-500">
                <Calendar className="h-3 w-3" />
                <span className="tabular-nums">{overviewStats.hoje}</span> hoje
              </span>
            )}
            {overviewStats.aoVivo > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/8 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-500">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="tabular-nums">{overviewStats.aoVivo}</span> ao vivo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Divisões principais (cards) ─── */}
      {principais.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted-foreground)]/60">
            <Sparkles className="h-3 w-3" />
            Divisões
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {principais.map(div => {
              const stats = statsPorDivisao.get(div) ?? { total: 0, aoVivo: 0, chaves: 0 }
              const isAtiva = divisaoAtiva === div
              return (
                <button
                  key={div}
                  onClick={() => { setDivisaoAtiva(div); setModalidadeFiltro(''); setCategoriaFiltro('') }}
                  className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
                    isAtiva
                      ? 'border-[var(--green-bright)]/45 bg-gradient-to-br from-[var(--green-dim)]/20 via-[var(--card)] to-[var(--card)] shadow-[0_0_24px_rgba(34,197,94,0.12)]'
                      : 'border-[var(--border)] bg-[var(--card)]/50 hover:border-[var(--green-dim)]/40 hover:bg-[var(--card)]/80'
                  }`}
                >
                  {isAtiva && (
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl"
                      style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.25), transparent 70%)' }}
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <p className={`text-sm font-extrabold tracking-tight ${
                      isAtiva ? 'text-[var(--green-bright)]' : 'text-[var(--foreground)]'
                    }`}>
                      {div}
                    </p>
                    {stats.aoVivo > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-500">
                        <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                        {stats.aoVivo}
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1.5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/65 font-semibold">
                    <span>
                      <strong className="tabular-nums text-[var(--foreground)] font-extrabold">{stats.chaves}</strong> chaves
                    </span>
                    <span className="text-[var(--border)]">·</span>
                    <span>
                      <strong className="tabular-nums text-[var(--foreground)] font-extrabold">{stats.total}</strong> jogos
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Conferências (chips compactos) ─── */}
      {conferencias.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted-foreground)]/55">
            <Layers className="h-3 w-3" />
            Conferências Super 08
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conferencias.map(div => {
              const stats = statsPorDivisao.get(div) ?? { total: 0, aoVivo: 0, chaves: 0 }
              const isAtiva = divisaoAtiva === div
              return (
                <button
                  key={div}
                  onClick={() => { setDivisaoAtiva(div); setModalidadeFiltro(''); setCategoriaFiltro('') }}
                  title={`${stats.chaves} chaves · ${stats.total} jogos`}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${
                    isAtiva
                      ? 'border-[var(--green-bright)]/45 bg-[var(--green-dim)]/15 text-[var(--green-bright)] shadow-[0_0_12px_rgba(34,197,94,0.10)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]/50 hover:text-[var(--foreground)]'
                  }`}
                >
                  <span>{div}</span>
                  {stats.chaves > 0 && (
                    <span className={`tabular-nums text-[9px] ${
                      isAtiva ? 'text-[var(--green-bright)]/75' : 'text-[var(--muted-foreground)]/55'
                    }`}>
                      {stats.chaves}
                    </span>
                  )}
                  {stats.aoVivo > 0 && (
                    <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Filtros ─── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Modalidade */}
          <div className="relative">
            <select
              value={modalidadeFiltro}
              onChange={e => { setModalidadeFiltro(e.target.value); setCategoriaFiltro('') }}
              className="appearance-none rounded-xl border border-[var(--border)] bg-[var(--card)] pl-3 pr-8 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--green-dim)]/50 focus:border-[var(--green-bright)] focus:outline-none cursor-pointer"
            >
              <option value="">Todas as modalidades</option>
              {modalidadesDisponiveis.map(m => (
                <option key={m.slug} value={m.slug}>{m.icone ?? '·'} {m.nome}</option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-[var(--muted-foreground)]/60" />
          </div>

          {/* Categoria */}
          {categoriasDisponiveis.length > 1 && (
            <div className="relative">
              <select
                value={categoriaFiltro}
                onChange={e => setCategoriaFiltro(e.target.value)}
                className="appearance-none rounded-xl border border-[var(--border)] bg-[var(--card)] pl-3 pr-8 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--green-dim)]/50 focus:border-[var(--green-bright)] focus:outline-none cursor-pointer"
              >
                <option value="">Todas as categorias</option>
                {categoriasDisponiveis.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-[var(--muted-foreground)]/60" />
            </div>
          )}

          {/* Busca */}
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 transition-colors focus-within:border-[var(--green-bright)]/50">
            <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)]/55" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar modalidade ou categoria..."
              className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="text-[var(--muted-foreground)]/50 hover:text-[var(--foreground)]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="text-[10px] uppercase tracking-widest font-bold text-[var(--muted-foreground)]/55">
            <span className="tabular-nums text-[var(--foreground)] text-sm font-extrabold">{chaves.length}</span>{' '}
            {chaves.length === 1 ? 'chave' : 'chaves'}
          </div>
        </div>

        {/* Active filter tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--muted-foreground)]/55">
              Filtros ativos:
            </span>
            {modalidadeAtiva && (
              <FilterTag
                label={modalidadeAtiva.nome}
                onRemove={() => { setModalidadeFiltro(''); setCategoriaFiltro('') }}
              />
            )}
            {categoriaFiltro && (
              <FilterTag label={categoriaFiltro} onRemove={() => setCategoriaFiltro('')} />
            )}
            {busca && (
              <FilterTag label={`"${busca}"`} onRemove={() => setBusca('')} />
            )}
            <button
              onClick={() => { setModalidadeFiltro(''); setCategoriaFiltro(''); setBusca('') }}
              className="ml-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60 hover:text-[var(--green-bright)] transition-colors"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* ─── Lista de chaves ─── */}
      {chaves.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)]/20" />
          <p className="text-base font-bold text-[var(--foreground)]">
            Nenhuma chave para os filtros selecionados
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
            Tente trocar de divisão ou limpar os filtros
          </p>

          {hasActiveFilters && (
            <button
              onClick={() => { setModalidadeFiltro(''); setCategoriaFiltro(''); setBusca('') }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15 px-4 py-1.5 text-xs font-bold text-[var(--green-bright)] transition-all hover:bg-[var(--green-dim)]/25"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </button>
          )}

          {/* Diagnóstico — se há jogos na divisão mas sem chaves, mostra o motivo */}
          {diagnostico.total > 0 && !hasActiveFilters && (
            <div className="mx-auto mt-5 max-w-md rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                ⚠ Jogos importados mas incompletos
              </p>
              <p className="text-[11px] text-amber-700/80 mb-3">
                Esta divisão tem <strong className="tabular-nums">{diagnostico.total}</strong> jogos, mas estão sem campos obrigatórios pra formar uma chave:
              </p>
              <ul className="space-y-1 text-[11px] text-[var(--muted-foreground)]">
                {diagnostico.semModalidade > 0 && (
                  <li><strong className="text-red-500 tabular-nums">{diagnostico.semModalidade}</strong> sem <strong>modalidade</strong></li>
                )}
                {diagnostico.semCategoria > 0 && (
                  <li><strong className="text-amber-600 tabular-nums">{diagnostico.semCategoria}</strong> sem <strong>categoria</strong> (Masculino/Feminino)</li>
                )}
                {diagnostico.semFase > 0 && (
                  <li><strong className="text-amber-600 tabular-nums">{diagnostico.semFase}</strong> sem <strong>fase</strong> (oitavas/quartas/etc)</li>
                )}
              </ul>
              <p className="mt-3 text-[11px] text-[var(--muted-foreground)]/70">
                Edite os jogos em <strong>/admin/jogos</strong> ou ajuste a planilha e re-importe.
              </p>
            </div>
          )}

          {diagnostico.total === 0 && (
            <p className="mt-3 text-xs text-[var(--muted-foreground)]/60">
              As chaves aparecem aqui quando a planilha é importada em <strong>Esportivo → Importar</strong>.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {chaves.map(c => {
            const completude = c.totalJogos > 0 ? Math.round((c.jogosEncerrados / c.totalJogos) * 100) : 0
            const numTeams   = numTeamsPorChave.get(`${c.modalidadeSlug}::${c.categoria}::${c.divisao}`)
            const proximoJ   = proximoJogoPorChave.get(`${c.modalidadeSlug}::${c.categoria}::${c.divisao}`)
            const isLive     = c.jogosAoVivo > 0
            return (
              <button
                key={`${c.modalidadeSlug}-${c.categoria}-${c.divisao}`}
                onClick={() => { setChaveAberta({ modalidade: c.modalidadeSlug, categoria: c.categoria, divisao: c.divisao }); setShowConfigEditor(false) }}
                className={`group relative overflow-hidden rounded-2xl border bg-[var(--card)] text-left transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                  isLive
                    ? 'border-red-500/35 hover:border-red-500/55 shadow-[0_0_20px_rgba(239,68,68,0.08)]'
                    : 'border-[var(--border)] hover:border-[var(--green-bright)]/45'
                }`}
              >
                {/* Live strip on top */}
                {isLive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
                )}

                {/* Header section */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--green-dim)]/12 to-transparent text-[26px] leading-none">
                    {c.modalidadeIcone}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold leading-tight text-[var(--foreground)] tracking-tight">
                      {c.modalidade}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/75">
                      {c.categoria}
                    </p>
                  </div>
                  {isLive && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      ao vivo
                    </span>
                  )}
                </div>

                {/* Divider with subtle gradient */}
                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                {/* Body section */}
                <div className="px-4 py-3 space-y-3">
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="leading-tight">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/55">Equipes</p>
                      <p className="mt-0.5 text-[15px] font-extrabold tabular-nums text-[var(--foreground)]">{numTeams ?? '—'}</p>
                    </div>
                    <div className="leading-tight">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/55">Jogos</p>
                      <p className="mt-0.5 text-[15px] font-extrabold tabular-nums text-[var(--foreground)]">{c.totalJogos}</p>
                    </div>
                    <div className="leading-tight">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/55">Done</p>
                      <p className="mt-0.5 text-[15px] font-extrabold tabular-nums text-[var(--green-bright)]">{c.jogosEncerrados}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                      <span className="text-[var(--muted-foreground)]/55">Completude</span>
                      <span className="tabular-nums text-[var(--foreground)]">{completude}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--green-dim)] via-[var(--green-bright)] to-[#e8b94f] transition-all duration-500"
                        style={{ width: `${completude}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer with próximo jogo + CTA */}
                <div className="flex items-center justify-between border-t border-[var(--border)]/60 bg-[var(--muted)]/15 px-4 py-2.5">
                  <div className="min-w-0 text-[10px]">
                    {proximoJ ? (
                      <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                        <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                        <span className="font-bold tabular-nums text-[var(--foreground)]">
                          {fmtData(proximoJ.inicio)} · {fmtHora(proximoJ.inicio)}
                        </span>
                      </span>
                    ) : c.hasFinal ? (
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Crown className="h-3 w-3" />
                        tem final
                      </span>
                    ) : (
                      <span className="text-[var(--muted-foreground)]/40">—</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--green-bright)] transition-all group-hover:gap-1.5">
                    Ver chave
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── OverviewStat (usado no strip de stats no topo da home) ───────────────────
function OverviewStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="opacity-90">{icon}</span>
      <div className="leading-tight">
        <p className="text-xl font-extrabold tabular-nums text-[var(--foreground)] tracking-tight">{value}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">{label}</p>
      </div>
    </div>
  )
}

// ── FilterTag (chip de filtro ativo com X) ──────────────────────────────────
function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--green-dim)]/40 bg-[var(--green-dim)]/12 pl-2.5 pr-1 py-0.5 text-[11px] font-bold text-[var(--green-bright)]">
      {label}
      <button
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--green-dim)]/30 transition-colors"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}
