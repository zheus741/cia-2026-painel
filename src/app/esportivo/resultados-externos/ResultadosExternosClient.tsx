'use client'

/**
 * Página de Resultados Externos — Fase B
 *
 * Modalidades onde o resultado vem de SISTEMA EXTERNO (judô, jiu-jitsu,
 * atletismo, natação, xadrez). Coord anexa PDF/XLSX + lança colocação
 * por atlética. Pontos calculados automaticamente.
 */

import React, { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Trophy, Upload, FileText, X, Save,
  AlertCircle, CheckCircle2, Download, Trash2, Plus, Info, Crown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CONFERENCIAS } from '@/lib/conferencias'
import {
  salvarColocacoes,
  removerColocacao,
  registrarAnexo,
  removerAnexo,
  gerarSignedUrl,
  type ColocacaoInput,
} from './actions'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface Modalidade {
  id:    string
  nome:  string
  slug:  string
  icone: string | null
}

interface Atletica {
  id:           string
  nome:         string
  slug:         string
  divisao:      string | null
  conferencia:  string | null
  cor_primaria: string | null
}

interface Colocacao {
  id:            string
  modalidade_id: string
  divisao:       string
  equipe_id:     string
  colocacao:     number
  pontos:        number
  observacoes:   string | null
  updated_at:    string
}

interface Anexo {
  id:               string
  modalidade_id:    string
  divisao:          string
  storage_path:     string
  arquivo_nome:     string
  arquivo_tipo:     string | null
  arquivo_tamanho:  number | null
  descricao:        string | null
  created_at:       string
}

interface Props {
  modalidades: Modalidade[]
  atleticas:   Atletica[]
  colocacoes:  Colocacao[]
  anexos:      Anexo[]
  canEdit:     boolean
}

// ── Constants ───────────────────────────────────────────────────────────────

const DIVISOES_PRINCIPAIS = ['1ª Divisão', '2ª Divisão', 'Super 08']

/** Tabela de pontuação Art. 44 (também usada client-side pra preview). */
function calcPontosPreview(colocacao: number, divisao: string): number {
  if (colocacao <= 0) return 0
  const tabela: Record<number, number> = { 1: 13, 2: 10, 3: 7, 4: 6, 5: 4, 6: 3, 7: 2, 8: 1 }
  const ehPrincipal = DIVISOES_PRINCIPAIS.includes(divisao)
  if (!ehPrincipal && colocacao > 4) return 0
  return tabela[colocacao] ?? 0
}

function getModalidadeAccent(slug: string): string {
  if (slug.startsWith('judo')) return '#a855f7'
  if (slug.startsWith('jiu-jitsu')) return '#7c3aed'
  if (slug.startsWith('atletismo')) return '#f59e0b'
  if (slug.startsWith('natacao')) return '#0ea5e9'
  if (slug === 'xadrez') return '#0f172a'
  return 'var(--green-bright)'
}

function getModalidadeCategoria(slug: string): string {
  if (slug.endsWith('-masc')) return 'Masculino'
  if (slug.endsWith('-fem')) return 'Feminino'
  return 'Misto'
}

function fmtBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

function fmtData(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// ── Main component ──────────────────────────────────────────────────────────

export function ResultadosExternosClient({ modalidades, atleticas, colocacoes, anexos, canEdit }: Props) {
  // Estado: modalidade aberta no editor (slug)
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [divisaoSelecionada, setDivisaoSelecionada] = useState<string>('1ª Divisão')

  // Lista de divisões disponíveis (das atléticas + conferências)
  const divisoesDisponiveis = useMemo(() => {
    const set = new Set<string>(DIVISOES_PRINCIPAIS)
    for (const a of atleticas) {
      if (a.divisao) set.add(a.divisao)
      if (a.conferencia) set.add(a.conferencia)
    }
    return Array.from(set).sort((a, b) => {
      const ip = DIVISOES_PRINCIPAIS.indexOf(a)
      const jp = DIVISOES_PRINCIPAIS.indexOf(b)
      if (ip >= 0 && jp >= 0) return ip - jp
      if (ip >= 0) return -1
      if (jp >= 0) return 1
      return a.localeCompare(b)
    })
  }, [atleticas])

  // ── Tela 1: lista de modalidades ────────────────────────────────────────
  if (!openSlug) {
    return (
      <div className="space-y-6">
        <Header />
        <ModalidadesGrid
          modalidades={modalidades}
          colocacoes={colocacoes}
          anexos={anexos}
          onOpen={setOpenSlug}
        />
        <InfoBox />
      </div>
    )
  }

  // ── Tela 2: editor de modalidade ────────────────────────────────────────
  const modalidade = modalidades.find(m => m.slug === openSlug)
  if (!modalidade) return null

  return (
    <ModalidadeEditor
      modalidade={modalidade}
      atleticas={atleticas}
      divisoes={divisoesDisponiveis}
      divisaoSelecionada={divisaoSelecionada}
      setDivisaoSelecionada={setDivisaoSelecionada}
      colocacoes={colocacoes.filter(c => c.modalidade_id === modalidade.id)}
      anexos={anexos.filter(a => a.modalidade_id === modalidade.id)}
      canEdit={canEdit}
      onBack={() => setOpenSlug(null)}
    />
  )
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2">
          <Link
            href="/esportivo"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65 hover:text-[var(--green-bright)] transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Núcleo Esportivo
          </Link>
        </div>
        <p className="cia-page-header__eyebrow">Esportivo</p>
        <h1 className="cia-page-header__title">Resultados Externos</h1>
        <p className="cia-page-header__subtitle">
          Modalidades cujos resultados vêm de sistema externo — judô, jiu-jitsu, atletismo, natação, xadrez.
          Anexe o PDF/XLSX oficial e lance a colocação de cada atlética.
        </p>
      </div>
    </header>
  )
}

// ─── Grid de modalidades ────────────────────────────────────────────────────

function ModalidadesGrid({
  modalidades, colocacoes, anexos, onOpen,
}: {
  modalidades: Modalidade[]
  colocacoes:  Colocacao[]
  anexos:      Anexo[]
  onOpen:      (slug: string) => void
}) {
  if (modalidades.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Nenhuma modalidade externa cadastrada
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
          Rode a migration 0027 no Supabase pra criar as modalidades.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {modalidades.map(m => {
        const accent = getModalidadeAccent(m.slug)
        const cat    = getModalidadeCategoria(m.slug)
        const cMod   = colocacoes.filter(c => c.modalidade_id === m.id)
        const aMod   = anexos.filter(a => a.modalidade_id === m.id)

        // Divisões com pelo menos 1 colocação
        const divsComResultado = Array.from(new Set(cMod.map(c => c.divisao)))

        return (
          <button
            key={m.id}
            onClick={() => onOpen(m.slug)}
            className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-current hover:shadow-lg"
            style={{ '--accent': accent } as React.CSSProperties}
          >
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-50"
              style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
            />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: `${accent}18`, border: `1px solid ${accent}33` }}
                >
                  {m.icone}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold leading-tight text-[var(--foreground)]"
                     style={{ fontSize: 17, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
                    {m.nome}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                    {cat}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]/50 transition-transform group-hover:translate-x-1" />
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Colocações" value={cMod.length} />
                <Stat label="Anexos" value={aMod.length} icon={<FileText className="h-3 w-3" />} />
                <Stat label="Divisões" value={divsComResultado.length} />
              </div>

              {/* Divisões com resultado */}
              {divsComResultado.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {divsComResultado.slice(0, 4).map(d => (
                    <span
                      key={d}
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}33` }}
                    >
                      {d}
                    </span>
                  ))}
                  {divsComResultado.length > 4 && (
                    <span className="text-[9px] text-[var(--muted-foreground)]/60 self-center">
                      +{divsComResultado.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--muted)]/30 px-2 py-1.5">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <p className="text-base font-extrabold tabular-nums leading-none text-[var(--foreground)]"
           style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
          {value}
        </p>
      </div>
      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]/65">
        {label}
      </p>
    </div>
  )
}

function InfoBox() {
  return (
    <details className="group rounded-xl border border-[var(--border)] bg-[var(--card)]/40">
      <summary className="flex cursor-pointer items-center gap-2 list-none px-4 py-2.5">
        <Info className="h-3.5 w-3.5 text-[var(--green-bright)]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          Como funciona
        </span>
        <span className="ml-auto text-[var(--muted-foreground)]/50 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-[var(--border)] px-4 py-3 space-y-2 text-[12px] text-[var(--muted-foreground)]">
        <p>
          <strong className="text-[var(--foreground)]">Essas modalidades não rodam pela app</strong> —
          os jogos/lutas/provas acontecem em sistemas externos e nós recebemos só o resultado final.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">Fluxo:</strong>
        </p>
        <ol className="ml-4 space-y-1 list-decimal">
          <li>Anexe o PDF/XLSX oficial com os resultados (súmula da arbitragem)</li>
          <li>Lance a colocação final (1º, 2º, 3º…) de cada atlética inscrita</li>
          <li>Sistema calcula automaticamente os pontos (Art. 44/46 — 13/10/7/6/4/3/2/1)</li>
          <li>Pontos entram na <Link href="/esportivo/classificacao" className="text-[var(--green-bright)] underline">classificação geral</Link></li>
        </ol>
        <p>
          <strong className="text-[var(--foreground)]">Categoria de peso / prova individual:</strong>{' '}
          use o campo &ldquo;observação&rdquo; pra diferenciar (ex: &ldquo;Leve · -73kg&rdquo;, &ldquo;100m livre&rdquo;).
        </p>
      </div>
    </details>
  )
}

// ─── Editor de modalidade ───────────────────────────────────────────────────

function ModalidadeEditor({
  modalidade, atleticas, divisoes, divisaoSelecionada, setDivisaoSelecionada,
  colocacoes, anexos, canEdit, onBack,
}: {
  modalidade:        Modalidade
  atleticas:         Atletica[]
  divisoes:          string[]
  divisaoSelecionada: string
  setDivisaoSelecionada: (d: string) => void
  colocacoes:        Colocacao[]
  anexos:            Anexo[]
  canEdit:           boolean
  onBack:            () => void
}) {
  const accent = getModalidadeAccent(modalidade.slug)
  const cat = getModalidadeCategoria(modalidade.slug)

  // Colocações + anexos filtrados pela divisão selecionada
  const colocacoesDivisao = colocacoes.filter(c => c.divisao === divisaoSelecionada)
  const anexosDivisao = anexos.filter(a => a.divisao === divisaoSelecionada)

  // Atléticas dessa divisão (1ª/2ª usa `divisao`, Super 08 + conferências usa `conferencia`)
  const atleticasDivisao = useMemo(() => {
    return atleticas.filter(a => {
      if (DIVISOES_PRINCIPAIS.includes(divisaoSelecionada)) return a.divisao === divisaoSelecionada
      return a.conferencia === divisaoSelecionada
    })
  }, [atleticas, divisaoSelecionada])

  return (
    <div className="space-y-5">
      {/* Header do editor */}
      <div className="space-y-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65 hover:text-[var(--green-bright)] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Todas as modalidades
        </button>

        <div
          className="relative overflow-hidden rounded-2xl border bg-[var(--card)] p-5"
          style={{ borderColor: `${accent}44` }}
        >
          <div
            className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full opacity-30 blur-3xl"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
          />
          <div className="relative flex flex-wrap items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}
            >
              {modalidade.icone}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className="font-extrabold tracking-tight leading-tight"
                style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', color: accent, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                {modalidade.nome}
              </h2>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/65">
                {cat}
                {colocacoes.length > 0 && (
                  <> · <span className="text-[var(--foreground)]">{colocacoes.length} colocações totais</span></>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de divisão */}
      <div className="flex flex-wrap gap-1.5">
        {divisoes.map(d => {
          const ativa = d === divisaoSelecionada
          const isPrincipal = DIVISOES_PRINCIPAIS.includes(d)
          return (
            <button
              key={d}
              onClick={() => setDivisaoSelecionada(d)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                ativa
                  ? 'border-current shadow-sm'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--green-dim)]/50'
              }`}
              style={ativa ? {
                background: `${accent}15`,
                color: accent,
              } : undefined}
            >
              {d}
              {!isPrincipal && (
                <span className="ml-1 text-[8px] opacity-60">(intraconf · top 4)</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Layout 2 colunas: colocações + anexos */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Coluna esquerda: tabela de colocações */}
        <ColocacoesEditor
          modalidade={modalidade}
          divisao={divisaoSelecionada}
          atleticas={atleticasDivisao}
          colocacoes={colocacoesDivisao}
          accent={accent}
          canEdit={canEdit}
        />

        {/* Coluna direita: anexos */}
        <AnexosPanel
          modalidade={modalidade}
          divisao={divisaoSelecionada}
          anexos={anexosDivisao}
          accent={accent}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}

// ─── Editor de colocações ───────────────────────────────────────────────────

function ColocacoesEditor({
  modalidade, divisao, atleticas, colocacoes, accent, canEdit,
}: {
  modalidade: Modalidade
  divisao:    string
  atleticas:  Atletica[]
  colocacoes: Colocacao[]
  accent:     string
  canEdit:    boolean
}) {
  // Estado local: linhas editáveis (UI state, salvas só ao apertar "Salvar tudo")
  type Row = {
    id?:          string
    equipe_id:    string
    colocacao:    number
    observacoes:  string
  }

  const [rows, setRows] = useState<Row[]>(() =>
    colocacoes.map(c => ({
      id:          c.id,
      equipe_id:   c.equipe_id,
      colocacao:   c.colocacao,
      observacoes: c.observacoes ?? '',
    }))
  )
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Sincroniza quando o usuário troca de divisão (colocacoes muda)
  React.useEffect(() => {
    setRows(colocacoes.map(c => ({
      id:          c.id,
      equipe_id:   c.equipe_id,
      colocacao:   c.colocacao,
      observacoes: c.observacoes ?? '',
    })))
  }, [colocacoes])

  function addRow() {
    setRows(prev => [...prev, { equipe_id: '', colocacao: 0, observacoes: '' }])
  }

  function removeRow(idx: number) {
    const row = rows[idx]
    if (row.id) {
      startTransition(async () => {
        await removerColocacao(row.id!)
        setRows(prev => prev.filter((_, i) => i !== idx))
      })
    } else {
      setRows(prev => prev.filter((_, i) => i !== idx))
    }
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function handleSalvar() {
    const valid = rows
      .filter(r => r.equipe_id && r.colocacao >= 0)
    if (valid.length === 0) {
      setSaveMsg('Nenhuma colocação válida pra salvar.')
      return
    }
    startTransition(async () => {
      const payload: ColocacaoInput[] = valid.map(r => ({
        id:          r.id,
        equipe_id:   r.equipe_id,
        colocacao:   r.colocacao,
        observacoes: r.observacoes || null,
      }))
      const result = await salvarColocacoes(modalidade.id, divisao, payload)
      if (result.ok && result.data) {
        setSaveMsg(`✓ ${result.data.salvos} colocações salvas`)
        setTimeout(() => setSaveMsg(null), 3000)
      } else {
        setSaveMsg(`✗ ${result.error ?? 'erro ao salvar'}`)
      }
    })
  }

  // Sort options pra dropdown (atléticas não usadas em cima)
  const usedIds = new Set(rows.map(r => r.equipe_id).filter(Boolean))

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-extrabold text-[var(--foreground)]">
            Colocações — {divisao}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65 mt-0.5">
            {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}
            {atleticas.length > 0 && ` · ${atleticas.length} atléticas nessa divisão`}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {saveMsg && (
              <span className={`text-[11px] font-semibold ${saveMsg.startsWith('✓') ? 'text-[var(--green-bright)]' : 'text-red-500'}`}>
                {saveMsg}
              </span>
            )}
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:border-current hover:text-[var(--green-bright)] transition-colors"
            >
              <Plus className="h-3 w-3" /> Linha
            </button>
            <button
              onClick={handleSalvar}
              disabled={isPending || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              style={{ background: accent, color: 'white' }}
            >
              <Save className="h-3 w-3" />
              {isPending ? 'Salvando…' : 'Salvar tudo'}
            </button>
          </div>
        )}
      </div>

      {atleticas.length === 0 ? (
        <div className="p-8 text-center text-[12px] text-[var(--muted-foreground)]">
          Nenhuma atlética cadastrada nessa divisão.
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-[12px] text-[var(--muted-foreground)]">
          Nenhuma colocação lançada ainda.
          {canEdit && (
            <button
              onClick={addRow}
              className="ml-2 inline-flex items-center gap-1 text-[var(--green-bright)] font-bold hover:underline"
            >
              <Plus className="h-3 w-3" /> Adicionar linha
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left bg-[var(--muted)]/30 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]/70">
                <th className="px-3 py-2 w-[60px] text-center">Pos</th>
                <th className="px-3 py-2">Atlética</th>
                <th className="px-3 py-2 w-[180px]">Observação <span className="opacity-60 normal-case font-normal">(peso, prova, etc)</span></th>
                <th className="px-3 py-2 w-[80px] text-right">Pontos</th>
                {canEdit && <th className="px-3 py-2 w-[40px]"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const pts = calcPontosPreview(row.colocacao, divisao)
                const medalha = row.colocacao === 1 ? '🥇' : row.colocacao === 2 ? '🥈' : row.colocacao === 3 ? '🥉' : null
                const equipeOptions = atleticas.filter(a => !usedIds.has(a.id) || a.id === row.equipe_id)

                return (
                  <tr key={idx} className="border-t border-[var(--border)]/60 hover:bg-[var(--muted)]/10">
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {medalha && <span className="text-base leading-none">{medalha}</span>}
                        {canEdit ? (
                          <input
                            type="number"
                            min={0}
                            value={row.colocacao || ''}
                            onChange={e => updateRow(idx, { colocacao: parseInt(e.target.value) || 0 })}
                            className="w-12 rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-1 text-center text-sm font-extrabold tabular-nums focus:border-[var(--green-bright)] outline-none"
                            placeholder="—"
                          />
                        ) : (
                          <span className="font-extrabold tabular-nums">{row.colocacao || '—'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <select
                          value={row.equipe_id}
                          onChange={e => updateRow(idx, { equipe_id: e.target.value })}
                          className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[12px] font-semibold focus:border-[var(--green-bright)] outline-none"
                        >
                          <option value="">— Selecione —</option>
                          {equipeOptions.map(a => (
                            <option key={a.id} value={a.id}>{a.nome}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{atleticas.find(a => a.id === row.equipe_id)?.nome ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <input
                          type="text"
                          value={row.observacoes}
                          onChange={e => updateRow(idx, { observacoes: e.target.value })}
                          placeholder="ex: -73kg, 100m livre…"
                          className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[12px] focus:border-[var(--green-bright)] outline-none"
                        />
                      ) : (
                        <span className="text-[var(--muted-foreground)]">{row.observacoes || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className="font-extrabold tabular-nums"
                        style={{ color: pts > 0 ? accent : 'var(--muted-foreground)' }}
                      >
                        {pts}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeRow(idx)}
                          className="text-[var(--muted-foreground)]/40 hover:text-red-500 transition-colors"
                          title="Remover linha"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] bg-[var(--muted)]/20">
                <td colSpan={3} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] text-right">
                  Total
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className="text-base font-extrabold tabular-nums"
                    style={{ color: accent, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                  >
                    {rows.reduce((s, r) => s + calcPontosPreview(r.colocacao, divisao), 0)}
                  </span>
                </td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Panel de anexos ────────────────────────────────────────────────────────

function AnexosPanel({
  modalidade, divisao, anexos, accent, canEdit,
}: {
  modalidade: Modalidade
  divisao:    string
  anexos:     Anexo[]
  accent:     string
  canEdit:    boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleUpload(file: File) {
    setError(null)
    if (file.size > 20 * 1024 * 1024) {
      setError('Arquivo maior que 20 MB.')
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
      const path = `${modalidade.slug}/${divisao.replace(/[^a-zA-Z0-9]/g, '_')}/${ts}_${safeName}`

      const { error: uploadErr } = await supabase.storage
        .from('resultados-externos')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadErr) {
        setError(`Erro no upload: ${uploadErr.message}`)
        setUploading(false)
        return
      }

      // Registrar no banco
      startTransition(async () => {
        const r = await registrarAnexo({
          modalidadeId:   modalidade.id,
          divisao,
          storagePath:    path,
          arquivoNome:    file.name,
          arquivoTipo:    file.type || null,
          arquivoTamanho: file.size,
        })
        if (!r.ok) setError(`Erro ao registrar: ${r.error}`)
        setUploading(false)
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'erro desconhecido'
      setError(`Erro: ${msg}`)
      setUploading(false)
    }
  }

  async function handleDownload(anexo: Anexo) {
    const r = await gerarSignedUrl(anexo.storage_path)
    if (r.ok && r.data) {
      window.open(r.data.url, '_blank')
    } else {
      alert(`Erro ao gerar URL: ${r.error}`)
    }
  }

  function handleRemover(id: string) {
    if (!confirm('Remover este anexo definitivamente?')) return
    startTransition(async () => {
      await removerAnexo(id)
    })
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-extrabold text-[var(--foreground)]">
          Anexos
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]/65 mt-0.5">
          {anexos.length} {anexos.length === 1 ? 'arquivo' : 'arquivos'} · {divisao}
        </p>
      </div>

      {/* Upload area */}
      {canEdit && (
        <div className="p-3 border-b border-[var(--border)]">
          <label
            className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors ${
              uploading
                ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/15'
                : 'border-[var(--border)] hover:border-current hover:bg-[var(--muted)]/20'
            }`}
            style={{ borderColor: uploading ? accent : undefined }}
          >
            <Upload className="h-5 w-5" style={{ color: accent }} />
            <span className="text-[11px] font-bold text-[var(--foreground)]">
              {uploading || isPending ? 'Enviando…' : 'Anexar arquivo'}
            </span>
            <span className="text-[9px] text-[var(--muted-foreground)]/60 text-center">
              PDF · XLSX · PNG · JPG · até 20 MB
            </span>
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
              className="hidden"
              disabled={uploading || isPending}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
                e.target.value = ''
              }}
            />
          </label>
          {error && (
            <p className="mt-2 text-[10px] font-semibold text-red-500">{error}</p>
          )}
        </div>
      )}

      {/* Lista de anexos */}
      {anexos.length === 0 ? (
        <div className="p-6 text-center">
          <FileText className="mx-auto h-6 w-6 text-[var(--muted-foreground)]/20 mb-2" />
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Nenhum anexo nessa divisão ainda.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {anexos.map(a => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--muted)]/10">
              <FileText className="h-4 w-4 text-[var(--muted-foreground)]/60 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-[var(--foreground)]" title={a.arquivo_nome}>
                  {a.arquivo_nome}
                </p>
                <p className="text-[9px] text-[var(--muted-foreground)]/60">
                  {fmtBytes(a.arquivo_tamanho)} · {fmtData(a.created_at)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(a)}
                className="shrink-0 p-1 rounded text-[var(--muted-foreground)]/60 hover:text-[var(--green-bright)] hover:bg-[var(--green-dim)]/20"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {canEdit && (
                <button
                  onClick={() => handleRemover(a.id)}
                  disabled={isPending}
                  className="shrink-0 p-1 rounded text-[var(--muted-foreground)]/60 hover:text-red-500"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
