'use client'

import * as React from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2, Download } from 'lucide-react'
import { toast } from '@/components/toast'
import { buscarPreviewPlanilha, aplicarResultadosPlanilha, type PreviewItem } from './actions'

const STATUS_META: Record<PreviewItem['status'], { label: string; cor: string; bg: string; aplicavel: boolean }> = {
  novo:            { label: 'Novo',              cor: '#16794a', bg: 'rgba(34,197,94,0.10)',  aplicavel: true },
  conflito:        { label: 'Sobrescreve',       cor: '#b45309', bg: 'rgba(245,158,11,0.12)', aplicavel: true },
  igual:           { label: 'Já igual',          cor: '#64748b', bg: 'rgba(100,116,139,0.10)', aplicavel: false },
  sem_jogo:        { label: 'Time não casou',    cor: '#dc2626', bg: 'rgba(239,68,68,0.10)',  aplicavel: false },
  ambiguo:         { label: 'Ambíguo',           cor: '#dc2626', bg: 'rgba(239,68,68,0.10)',  aplicavel: false },
  sem_modalidade:  { label: 'Modalidade ?',      cor: '#dc2626', bg: 'rgba(239,68,68,0.10)',  aplicavel: false },
}

const MOD_LABEL: Record<string, string> = {
  futsal: 'Futsal', futebol: 'Futebol', fut7: 'Fut7', basquete: 'Basquete', handebol: 'Handebol',
  volei: 'Vôlei', 'volei-praia': 'Vôlei de Praia', peteca: 'Peteca', 'tenis-campo': 'Tênis de Campo', 'tenis-mesa': 'Tênis de Mesa',
}

export function ImportResultadosClient() {
  const [loading, setLoading] = React.useState(false)
  const [applying, setApplying] = React.useState(false)
  const [itens, setItens] = React.useState<PreviewItem[] | null>(null)
  const [meta, setMeta] = React.useState<{ abasComErro: string[]; totalLidos: number } | null>(null)
  const [sel, setSel] = React.useState<Set<number>>(new Set())

  async function buscar() {
    setLoading(true)
    setItens(null); setSel(new Set())
    try {
      const r = await buscarPreviewPlanilha()
      if (!r.ok || !r.data) { toast.error('Falha ao buscar a planilha', { description: r.error }); return }
      setItens(r.data.itens)
      setMeta({ abasComErro: r.data.abasComErro, totalLidos: r.data.totalLidos })
      // Pré-seleciona os "novos" (jogos ainda não encerrados).
      const novos = new Set<number>()
      r.data.itens.forEach((it, i) => { if (it.status === 'novo') novos.add(i) })
      setSel(novos)
      toast.success('Planilha lida', { description: `${r.data.itens.length} resultados encontrados` })
    } catch (e) {
      toast.error('Erro ao buscar', { description: e instanceof Error ? e.message : 'tente de novo' })
    } finally {
      setLoading(false)
    }
  }

  function toggle(i: number) {
    setSel(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })
  }

  async function aplicar() {
    if (!itens) return
    const escolhidos = [...sel].map(i => itens[i]).filter(it => it.jogoId)
    if (escolhidos.length === 0) { toast.error('Selecione ao menos um resultado'); return }
    setApplying(true)
    try {
      const r = await aplicarResultadosPlanilha(escolhidos)
      if (!r.ok || !r.data) { toast.error('Falha ao aplicar', { description: r.error }); return }
      toast.success('Resultados aplicados', { description: `${r.data.aplicados} aplicados · ${r.data.erros} erros` })
      buscar()  // recarrega preview
    } catch (e) {
      toast.error('Erro ao aplicar', { description: e instanceof Error ? e.message : 'tente de novo' })
    } finally {
      setApplying(false)
    }
  }

  const aplicaveis = itens?.filter(it => STATUS_META[it.status].aplicavel) ?? []
  const naoCasados = itens?.filter(it => !STATUS_META[it.status].aplicavel && it.status !== 'igual') ?? []

  function placarStr(it: PreviewItem): string {
    const base = `${it.res.placarA}${it.res.isSet ? ' sets' : ''} × ${it.res.placarB}`
    if (it.res.penA != null && it.res.penB != null) return `${base}  (pên ${it.res.penA}×${it.res.penB})`
    return base
  }

  return (
    <div className="space-y-5">
      {/* Ações topo */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={buscar}
          disabled={loading || applying}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--green)] px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {loading ? 'Buscando…' : 'Buscar resultados da planilha'}
        </button>
        {meta && (
          <span className="text-xs text-[var(--muted-foreground)]">
            {meta.totalLidos} resultados lidos
            {meta.abasComErro.length > 0 && (
              <span className="ml-2 text-amber-600">⚠ abas com erro: {meta.abasComErro.join(', ')}</span>
            )}
          </span>
        )}
      </div>

      {itens && (
        <>
          {/* Aplicáveis */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-bold text-[var(--foreground)]">
                Resultados pra aplicar <span className="text-[var(--muted-foreground)]">({aplicaveis.length})</span>
              </h2>
              <button
                onClick={aplicar}
                disabled={applying || sel.size === 0}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--green)] px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Aplicar selecionados ({sel.size})
              </button>
            </div>

            {aplicaveis.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                Nenhum resultado novo pra aplicar. Tudo já está lançado. ✓
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {itens.map((it, i) => {
                  const m = STATUS_META[it.status]
                  if (!m.aplicavel) return null
                  return (
                    <label key={i} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--muted)]/30">
                      <input type="checkbox" checked={sel.has(i)} onChange={() => toggle(i)} className="h-4 w-4 shrink-0 accent-[var(--green)]" />
                      <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: m.cor, background: m.bg }}>
                        {m.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-[var(--foreground)]">
                          {it.res.timeA} <span className="tabular-nums text-[var(--green)]">{placarStr(it)}</span> {it.res.timeB}
                        </div>
                        <div className="truncate text-[11px] text-[var(--muted-foreground)]">
                          {MOD_LABEL[it.res.modalidadeSlug ?? ''] ?? it.res.modCode} · {it.res.categoria} · {it.res.fase ?? '—'} · {it.res.aba}
                          {it.placarAtual && <span className="ml-1 text-amber-600">· atual no painel: {it.placarAtual} ({it.jogoStatusAtual})</span>}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Não casados / atenção */}
          {naoCasados.length > 0 && (
            <div className="rounded-2xl border border-amber-300/50 bg-amber-50/40 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-amber-200/60 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-amber-800">Precisam de atenção ({naoCasados.length})</h2>
              </div>
              <div className="divide-y divide-amber-200/50">
                {itens.map((it, i) => {
                  const m = STATUS_META[it.status]
                  if (m.aplicavel || it.status === 'igual') return null
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                      <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: m.cor, background: m.bg }}>
                        {m.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium text-[var(--foreground)]">
                          {it.res.timeA} {it.res.placarA}×{it.res.placarB} {it.res.timeB}
                        </div>
                        <div className="truncate text-[10px] text-[var(--muted-foreground)]">
                          {MOD_LABEL[it.res.modalidadeSlug ?? ''] ?? it.res.modCode} · {it.res.categoria} · {it.res.aba}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="px-4 py-2.5 text-[11px] text-amber-700/80">
                &quot;Time não casou&quot; = nome diferente do cadastrado (ajuste o nome ou um alias). &quot;Ambíguo&quot; = mais de um jogo bate.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
