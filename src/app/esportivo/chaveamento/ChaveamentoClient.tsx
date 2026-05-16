'use client'

import { useMemo, useState } from 'react'
import { Trophy, ChevronRight, Search, Inbox } from 'lucide-react'
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

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  jogos: JogoChave[]
  modalidades: Modalidade[]
}

export function ChaveamentoClient({ jogos, modalidades }: Props) {
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
  const chaves: ChaveInfo[] = useMemo(() => {
    const map = new Map<string, ChaveInfo>()
    for (const j of jogos) {
      if (!j.modalidade || !j.categoria || !j.divisao) continue
      if (j.divisao !== divisaoAtiva) continue
      if (modalidadeFiltro && j.modalidade.slug !== modalidadeFiltro) continue
      if (categoriaFiltro && j.categoria !== categoriaFiltro) continue

      const key = `${j.modalidade.slug}::${j.categoria}::${j.divisao}`
      if (!map.has(key)) {
        map.set(key, {
          modalidade: j.modalidade.nome,
          modalidadeIcone: j.modalidade.icone,
          modalidadeSlug: j.modalidade.slug,
          categoria: j.categoria,
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
    const meta = chaves.find(c =>
      c.modalidadeSlug === chaveAberta.modalidade &&
      c.categoria === chaveAberta.categoria &&
      c.divisao === chaveAberta.divisao
    )

    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            onClick={() => setChaveAberta(null)}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            ← Voltar às chaves
          </button>
          <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)]/40" />
          <span className="font-semibold text-[var(--foreground)]">
            {meta?.modalidadeIcone ?? '🏆'} {meta?.modalidade}
          </span>
          <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)]/40" />
          <span className="text-[var(--muted-foreground)]">{chaveAberta.categoria}</span>
          <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)]/40" />
          <span className="text-[var(--muted-foreground)]">{chaveAberta.divisao}</span>
        </div>

        <BracketView jogos={jogosChave} />
      </div>
    )
  }

  // ── Render principal: tabs + filtros + lista de chaves ──────────────────────
  return (
    <div className="space-y-5">

      {/* Tabs de divisão */}
      <div className="flex flex-wrap gap-2">
        {(divisoesDisponiveis.length > 0 ? divisoesDisponiveis : ['1ª Divisão']).map(div => {
          const count = jogos.filter(j => j.divisao === div).length
          const isAtiva = divisaoAtiva === div
          return (
            <button
              key={div}
              onClick={() => { setDivisaoAtiva(div); setModalidadeFiltro(''); setCategoriaFiltro('') }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                isAtiva
                  ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15 text-[var(--green-bright)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]/50 hover:text-[var(--foreground)]'
              }`}
            >
              {div}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  isAtiva ? 'bg-[var(--green-bright)]/20' : 'bg-[var(--border)]/60'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

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
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhuma chave para os filtros selecionados.
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
            As chaves aparecem aqui quando a planilha é importada em Esportivo → Importar.
          </p>
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
