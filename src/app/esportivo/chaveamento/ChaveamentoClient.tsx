'use client'

import { useMemo, useState } from 'react'
import { Trophy, ChevronRight, ChevronLeft, Search, Inbox, ArrowLeft, Radio, Clock, CheckCircle2 } from 'lucide-react'
import { BracketView } from './BracketView'

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
                onClick={() => prevChave && setChaveAberta({
                  modalidade: prevChave.modalidadeSlug,
                  categoria: prevChave.categoria,
                  divisao: prevChave.divisao,
                })}
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
                onClick={() => nextChave && setChaveAberta({
                  modalidade: nextChave.modalidadeSlug,
                  categoria: nextChave.categoria,
                  divisao: nextChave.divisao,
                })}
                disabled={!nextChave}
                title={nextChave ? `${nextChave.modalidade} · ${nextChave.categoria}` : 'Última chave da divisão'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 text-[var(--muted-foreground)] transition-all hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted-foreground)]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
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

        <BracketView jogos={jogosChave} config={config ?? null} />
      </div>
    )
  }

  // ── Render principal: tabs + filtros + lista de chaves ──────────────────────
  return (
    <div className="space-y-5">

      {/* Tabs de divisão — divididas em 2 grupos: Divisões principais + Conferências */}
      {(() => {
        const divisoesAll = divisoesDisponiveis.length > 0 ? divisoesDisponiveis : ['1ª Divisão']
        const principais   = divisoesAll.filter(d => d.toLowerCase().includes('divis') || d.toLowerCase().includes('super'))
        const conferencias = divisoesAll.filter(d => !principais.includes(d))

        function renderTab(div: string) {
          const count = jogos.filter(j => j.divisao === div).length
          const isAtiva = divisaoAtiva === div
          return (
            <button
              key={div}
              onClick={() => { setDivisaoAtiva(div); setModalidadeFiltro(''); setCategoriaFiltro('') }}
              title={div}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                isAtiva
                  ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15 text-[var(--green-bright)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]/50 hover:text-[var(--foreground)]'
              }`}
            >
              <span className="truncate max-w-[160px]">{div}</span>
              {count > 0 && (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${
                  isAtiva ? 'bg-[var(--green-bright)]/20' : 'bg-[var(--border)]/60'
                }`}>{count}</span>
              )}
            </button>
          )
        }

        return (
          <div className="space-y-3">
            {principais.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50">Divisões</p>
                <div className="flex flex-wrap gap-1.5">
                  {principais.map(renderTab)}
                </div>
              </div>
            )}
            {conferencias.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50">
                  Conferências Super 08
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {conferencias.map(renderTab)}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Filtros: modalidade + categoria + busca */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Modalidade */}
        <select
          value={modalidadeFiltro}
          onChange={e => { setModalidadeFiltro(e.target.value); setCategoriaFiltro('') }}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--green-bright)] focus:outline-none"
        >
          <option value="">Todas as modalidades</option>
          {modalidadesDisponiveis.map(m => (
            <option key={m.slug} value={m.slug}>{m.icone ?? '·'} {m.nome}</option>
          ))}
        </select>

        {/* Categoria */}
        {categoriasDisponiveis.length > 1 && (
          <select
            value={categoriaFiltro}
            onChange={e => setCategoriaFiltro(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--green-bright)] focus:outline-none"
          >
            <option value="">Todas as categorias</option>
            {categoriasDisponiveis.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {/* Busca */}
        <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)]/50" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar chave..."
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none"
          />
        </div>
      </div>

      {/* Lista de chaves */}
      {chaves.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Nenhuma chave para os filtros selecionados.
          </p>

          {/* Diagnóstico — se há jogos na divisão mas sem chaves, mostra o motivo */}
          {diagnostico.total > 0 && (
            <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
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
            <p className="mt-2 text-xs text-[var(--muted-foreground)]/60">
              As chaves aparecem aqui quando a planilha é importada em <strong>Esportivo → Importar</strong>.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {chaves.map(c => {
            const completude = c.totalJogos > 0 ? Math.round((c.jogosEncerrados / c.totalJogos) * 100) : 0
            return (
              <button
                key={`${c.modalidadeSlug}-${c.categoria}-${c.divisao}`}
                onClick={() => setChaveAberta({
                  modalidade: c.modalidadeSlug,
                  categoria: c.categoria,
                  divisao: c.divisao,
                })}
                className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-all hover:border-[var(--green-bright)]/40 hover:bg-[var(--green-dim)]/5 hover:shadow-lg"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{c.modalidadeIcone}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)] leading-tight">
                        {c.modalidade}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/60">
                        {c.categoria}
                      </p>
                    </div>
                  </div>
                  {c.jogosAoVivo > 0 && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
                      <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                      ao vivo
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    <span className="font-semibold tabular-nums text-[var(--foreground)]">{c.totalJogos}</span> jogos
                  </span>
                  {c.hasFinal && (
                    <span className="text-[var(--green-bright)] font-semibold">tem final</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--muted-foreground)]/60">Completude</span>
                    <span className="font-semibold tabular-nums text-[var(--foreground)]">{completude}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full bg-[var(--green-bright)] transition-all"
                      style={{ width: `${completude}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-[var(--green-bright)] opacity-0 transition-opacity group-hover:opacity-100">
                  Ver chave
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
