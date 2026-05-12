'use client'

/**
 * Admin da Liga Super 8 — montagem da tabela das 7 rodadas.
 *
 * Workflow esperado:
 *  1. Adicionar confrontos (1 por vez) via "Novo confronto"
 *     • DB valida unicidade (adversário, modalidade, rodada) — exibe erros amigáveis
 *  2. Quando tiver 8 atléticas distintas, usar "Sortear A1-A8"
 *  3. Editar/remover qualquer row pela tabela
 *  4. "Gerar jogo no placar" cria a row em `jogos` linkada
 */

import * as React from 'react'
import { useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Pencil, Shuffle, ExternalLink, AlertCircle, Trophy, X, Save, Radio } from 'lucide-react'
import { addSuper8Row, updateSuper8Row, deleteSuper8Row, sortearPosicoesSuper8, gerarJogoDoSuper8 } from './actions'
import type { Super8Row, Super8Participante, Super8Resumo } from '@/lib/competicao/super8'

interface Atletica {
  id: string; nome: string; slug: string | null
  divisao: string | null; conferencia: string | null
  cor_primaria: string | null; universidade: string | null
}

interface Modalidade {
  id: string; nome: string; icone: string | null
}

interface Props {
  edicaoNome:    string
  atleticas:     Atletica[]
  modalidades:   Modalidade[]
  rows:          Super8Row[]
  participantes: Super8Participante[]
  resumo:        Super8Resumo
}

const CATEGORIAS = ['M', 'F', 'COED']

// ─────────────────────────────────────────────────────────────────────────────

export function Super8AdminClient({ edicaoNome, atleticas, modalidades, rows: initialRows, participantes: initialParticipantes, resumo }: Props) {
  const [rows, setRows] = React.useState(initialRows)
  const [participantes, setParticipantes] = React.useState(initialParticipantes)
  const [error, setError] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [showNewRow, setShowNewRow] = React.useState(false)
  const [showSorteio, setShowSorteio] = React.useState(false)
  const [pending, startTransition] = useTransition()

  // ── Helpers ────────────────────────────────────────────────────────────────
  const refresh = () => {
    // Server vai revalidar; aqui mantemos otimismo + esperamos próximo SSR
    setEditingId(null)
    setShowNewRow(false)
    setShowSorteio(false)
  }

  const handleError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 6000)
  }

  // ── Actions wrappers ───────────────────────────────────────────────────────
  function handleAdd(form: NewRowForm) {
    if (!form.atletica_a_id || !form.atletica_b_id || !form.modalidade_id || !form.categoria) {
      handleError('Preencha todos os campos obrigatórios.')
      return
    }
    startTransition(async () => {
      const res = await addSuper8Row({
        rodada: form.rodada,
        atletica_a_id: form.atletica_a_id,
        atletica_b_id: form.atletica_b_id,
        modalidade_id: form.modalidade_id,
        categoria: form.categoria,
        posicao_a: form.posicao_a,
        posicao_b: form.posicao_b,
      })
      if (!res.ok) { handleError(res.error ?? 'Erro ao adicionar.'); return }
      refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Remover este confronto da liga?')) return
    startTransition(async () => {
      const res = await deleteSuper8Row(id)
      if (!res.ok) { handleError(res.error ?? 'Erro ao remover.'); return }
      setRows(prev => prev.filter(r => r.id !== id))
      // Recalcula participantes a partir das rows que sobraram
      setParticipantes(deriveParticipantesClient(rows.filter(r => r.id !== id)))
    })
  }

  function handleGerarJogo(super8RowId: string) {
    startTransition(async () => {
      const res = await gerarJogoDoSuper8(super8RowId)
      if (!res.ok) { handleError(res.error ?? 'Erro ao gerar jogo.'); return }
      refresh()
    })
  }

  function handleSortear(ordem: string[]) {
    startTransition(async () => {
      const res = await sortearPosicoesSuper8(ordem)
      if (!res.ok) { handleError(res.error ?? 'Erro no sorteio.'); return }
      setShowSorteio(false)
      // Re-aplica posições localmente (próximo SSR vai re-sincronizar)
      const map = new Map(ordem.map((id, idx) => [id, idx + 1]))
      setRows(prev => prev.map(r => ({
        ...r,
        posicao_a: map.get(r.atletica_a_id) ?? r.posicao_a,
        posicao_b: map.get(r.atletica_b_id) ?? r.posicao_b,
      })))
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const porRodada = new Map<number, Super8Row[]>()
  for (const r of rows) {
    if (!porRodada.has(r.rodada)) porRodada.set(r.rodada, [])
    porRodada.get(r.rodada)!.push(r)
  }
  const rodadas = Array.from(porRodada.keys()).sort()

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Header */}
      <header className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-amber-500/10 via-[var(--card)] to-[var(--card)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500/80">
          {edicaoNome} · Admin
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[var(--foreground)]">
          <Trophy className="h-6 w-6 text-amber-500" />
          Liga Super 8
        </h1>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Monte os 28 confrontos do playoff (7 rodadas × 4 jogos). DB valida unicidade automaticamente.
        </p>

        {/* Status row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill label="Participantes" value={`${resumo.participantes}/8`} accent={resumo.participantes === 8 ? 'emerald' : 'neutral'} />
          <Pill label="Rodadas montadas" value={`${resumo.rodadas_montadas}/7`} accent={resumo.rodadas_montadas === 7 ? 'emerald' : 'neutral'} />
          <Pill label="Confrontos" value={`${resumo.total_jogos}/28`} accent={resumo.total_jogos === 28 ? 'emerald' : 'neutral'} />

          <div className="ml-auto flex flex-wrap gap-2">
            <Link
              href="/esportivo/super-8"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
            >
              <ExternalLink className="h-3 w-3" /> Ver pública
            </Link>
            <button
              onClick={() => setShowSorteio(true)}
              disabled={participantes.length !== 8 || pending}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              title={participantes.length !== 8 ? 'Adicione 8 atléticas primeiro' : 'Sortear A1-A8'}
            >
              <Shuffle className="h-3 w-3" /> Sortear A1-A8
            </button>
            <button
              onClick={() => setShowNewRow(true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-bright)] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--green)] disabled:opacity-40"
            >
              <Plus className="h-3 w-3" /> Novo confronto
            </button>
          </div>
        </div>
      </header>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Painel novo confronto */}
      {showNewRow && (
        <NewRowPanel
          atleticas={atleticas}
          modalidades={modalidades}
          participantesAtuais={participantes}
          onCancel={() => setShowNewRow(false)}
          onSubmit={handleAdd}
          pending={pending}
        />
      )}

      {/* Painel sorteio */}
      {showSorteio && (
        <SorteioPanel
          participantes={participantes}
          onCancel={() => setShowSorteio(false)}
          onSubmit={handleSortear}
          pending={pending}
        />
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] py-12 text-center">
          <Trophy className="mx-auto h-8 w-8 text-[var(--muted-foreground)]/30" />
          <p className="mt-3 text-sm font-semibold text-[var(--muted-foreground)]">
            Nenhum confronto cadastrado ainda
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/70">
            Clique em <strong>Novo confronto</strong> para começar a montar a liga.
          </p>
        </div>
      )}

      {/* Tabela por rodada */}
      {rodadas.map(rod => {
        const jogos = porRodada.get(rod)!
        return (
          <section key={rod} className="rounded-xl border border-[var(--border)] bg-[var(--card)]/30">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                <span className="rounded-md bg-[var(--green-dim)]/30 px-2 py-0.5 font-mono text-[var(--green-bright)]">
                  R{rod}
                </span>
                Rodada {rod} · {jogos.length}/4 jogos
              </h2>
            </header>
            <div className="divide-y divide-[var(--border)]/40">
              {jogos.map(j => (
                <RowItem
                  key={j.id}
                  row={j}
                  atleticas={atleticas}
                  modalidades={modalidades}
                  isEditing={editingId === j.id}
                  onEdit={() => setEditingId(j.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => handleDelete(j.id)}
                  onGerarJogo={() => handleGerarJogo(j.id)}
                  onSaved={(updated) => {
                    setRows(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
                    setEditingId(null)
                  }}
                  onError={handleError}
                  pending={pending}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Pill
// ─────────────────────────────────────────────────────────────────────────────

function Pill({ label, value, accent }: { label: string; value: string; accent: 'emerald' | 'neutral' }) {
  const styles = accent === 'emerald'
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
    : 'border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)]'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${styles} px-2.5 py-1 text-[11px] font-bold`}>
      <span className="opacity-60">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// NewRowPanel — formulário de adicionar confronto
// ─────────────────────────────────────────────────────────────────────────────

interface NewRowForm {
  rodada:         number
  atletica_a_id:  string
  atletica_b_id:  string
  modalidade_id:  string
  categoria:      string
  posicao_a:      number | null
  posicao_b:      number | null
}

function NewRowPanel({
  atleticas, modalidades, participantesAtuais, onCancel, onSubmit, pending,
}: {
  atleticas:           Atletica[]
  modalidades:         Modalidade[]
  participantesAtuais: Super8Participante[]
  onCancel:            () => void
  onSubmit:            (form: NewRowForm) => void
  pending:             boolean
}) {
  const [form, setForm] = React.useState<NewRowForm>({
    rodada: 1, atletica_a_id: '', atletica_b_id: '',
    modalidade_id: '', categoria: 'M',
    posicao_a: null, posicao_b: null,
  })

  // Sugere atléticas — prioriza as que já são participantes
  const ordenadas = React.useMemo(() => {
    const partIds = new Set(participantesAtuais.map(p => p.atletica_id))
    return [...atleticas].sort((a, b) => {
      const ap = partIds.has(a.id) ? 0 : 1
      const bp = partIds.has(b.id) ? 0 : 1
      return ap - bp || a.nome.localeCompare(b.nome)
    })
  }, [atleticas, participantesAtuais])

  return (
    <div className="rounded-xl border border-[var(--green-bright)]/40 bg-[var(--card)] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
        <Plus className="h-4 w-4 text-[var(--green-bright)]" />
        Novo confronto
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Rodada (1-7)">
          <input
            type="number" min={1} max={7}
            value={form.rodada}
            onChange={e => setForm({ ...form, rodada: Math.max(1, Math.min(7, Number(e.target.value) || 1)) })}
            className="input"
          />
        </Field>
        <Field label="Modalidade">
          <select
            value={form.modalidade_id}
            onChange={e => setForm({ ...form, modalidade_id: e.target.value })}
            className="input"
          >
            <option value="">— selecione —</option>
            {modalidades.map(m => (
              <option key={m.id} value={m.id}>
                {m.icone ? `${m.icone} ` : ''}{m.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Atlética A">
          <select
            value={form.atletica_a_id}
            onChange={e => setForm({ ...form, atletica_a_id: e.target.value })}
            className="input"
          >
            <option value="">— selecione —</option>
            {ordenadas.map(a => (
              <option key={a.id} value={a.id} disabled={a.id === form.atletica_b_id}>
                {a.nome}{a.conferencia ? ` · ${a.conferencia}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Atlética B">
          <select
            value={form.atletica_b_id}
            onChange={e => setForm({ ...form, atletica_b_id: e.target.value })}
            className="input"
          >
            <option value="">— selecione —</option>
            {ordenadas.map(a => (
              <option key={a.id} value={a.id} disabled={a.id === form.atletica_a_id}>
                {a.nome}{a.conferencia ? ` · ${a.conferencia}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Categoria">
          <select
            value={form.categoria}
            onChange={e => setForm({ ...form, categoria: e.target.value })}
            className="input"
          >
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Posições A/B (opcional, A1-A8)">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" min={1} max={8} placeholder="A?"
              value={form.posicao_a ?? ''}
              onChange={e => setForm({ ...form, posicao_a: e.target.value ? Number(e.target.value) : null })}
              className="input"
            />
            <input
              type="number" min={1} max={8} placeholder="B?"
              value={form.posicao_b ?? ''}
              onChange={e => setForm({ ...form, posicao_b: e.target.value ? Number(e.target.value) : null })}
              className="input"
            />
          </div>
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/50"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--green-bright)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--green)] disabled:opacity-40"
        >
          {pending ? <Radio className="h-3 w-3 animate-pulse" /> : <Save className="h-3 w-3" />}
          Salvar confronto
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 6px 10px;
          font-size: 13px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--foreground);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</span>
      {children}
    </label>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// SorteioPanel — atribui A1-A8
// ─────────────────────────────────────────────────────────────────────────────

function SorteioPanel({
  participantes, onCancel, onSubmit, pending,
}: {
  participantes: Super8Participante[]
  onCancel:      () => void
  onSubmit:      (ordem: string[]) => void
  pending:       boolean
}) {
  // Embaralha a ordem inicial usando Fisher-Yates
  const [ordem, setOrdem] = React.useState<string[]>(() => {
    const arr = participantes.map(p => p.atletica_id)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })

  function reembaralhar() {
    setOrdem(prev => {
      const arr = [...prev]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    })
  }

  const byId = new Map(participantes.map(p => [p.atletica_id, p]))

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-400">
        <Shuffle className="h-4 w-4" />
        Sorteio A1–A8
      </h3>
      <p className="mb-3 text-xs text-[var(--muted-foreground)]">
        Atribui aleatoriamente as 8 atléticas às posições A1-A8 (Art. 55 do regulamento — Congresso Técnico).
        Pode re-embaralhar quantas vezes quiser antes de salvar.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ordem.map((id, idx) => {
          const p = byId.get(id)
          return (
            <div key={id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20 font-mono text-xs font-bold text-amber-400">
                A{idx + 1}
              </span>
              <span className="truncate text-xs font-semibold text-[var(--foreground)]">{p?.nome ?? '?'}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/50"
        >
          Cancelar
        </button>
        <button
          onClick={reembaralhar}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          <Shuffle className="h-3 w-3" /> Re-embaralhar
        </button>
        <button
          onClick={() => onSubmit(ordem)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
        >
          {pending ? <Radio className="h-3 w-3 animate-pulse" /> : <Save className="h-3 w-3" />}
          Salvar sorteio
        </button>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// RowItem — linha de confronto na rodada (com edição inline)
// ─────────────────────────────────────────────────────────────────────────────

function RowItem({
  row, atleticas, modalidades, isEditing,
  onEdit, onCancelEdit, onDelete, onGerarJogo, onSaved, onError, pending,
}: {
  row:          Super8Row
  atleticas:    Atletica[]
  modalidades:  Modalidade[]
  isEditing:    boolean
  onEdit:       () => void
  onCancelEdit: () => void
  onDelete:     () => void
  onGerarJogo:  () => void
  onSaved:      (row: Partial<Super8Row> & { id: string }) => void
  onError:      (msg: string) => void
  pending:      boolean
}) {
  const [editForm, setEditForm] = React.useState({
    rodada:        row.rodada,
    atletica_a_id: row.atletica_a_id,
    atletica_b_id: row.atletica_b_id,
    modalidade_id: row.modalidade_id,
    categoria:     row.categoria,
    posicao_a:     row.posicao_a,
    posicao_b:     row.posicao_b,
  })
  const [savingEdit, startEdit] = useTransition()

  function handleSave() {
    startEdit(async () => {
      const res = await updateSuper8Row(row.id, editForm)
      if (!res.ok) { onError(res.error ?? 'Erro ao salvar.'); return }
      onSaved({ id: row.id, ...editForm })
    })
  }

  if (isEditing) {
    return (
      <div className="space-y-2 bg-[var(--green-dim)]/10 px-4 py-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={editForm.atletica_a_id}
            onChange={e => setEditForm({ ...editForm, atletica_a_id: e.target.value })}
            className="input"
          >
            {atleticas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <select
            value={editForm.atletica_b_id}
            onChange={e => setEditForm({ ...editForm, atletica_b_id: e.target.value })}
            className="input"
          >
            {atleticas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <select
            value={editForm.modalidade_id}
            onChange={e => setEditForm({ ...editForm, modalidade_id: e.target.value })}
            className="input"
          >
            {modalidades.map(m => <option key={m.id} value={m.id}>{m.icone ?? '•'} {m.nome}</option>)}
          </select>
          <select
            value={editForm.categoria}
            onChange={e => setEditForm({ ...editForm, categoria: e.target.value })}
            className="input"
          >
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancelEdit} className="text-xs text-[var(--muted-foreground)]">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={savingEdit || pending}
            className="inline-flex items-center gap-1 rounded bg-[var(--green-bright)] px-2 py-1 text-[11px] font-semibold text-white"
          >
            <Save className="h-3 w-3" /> Salvar
          </button>
        </div>
        <style jsx>{`
          .input { width: 100%; padding: 4px 8px; font-size: 12px; border-radius: 6px;
                   border: 1px solid var(--border); background: var(--background); color: var(--foreground); }
        `}</style>
      </div>
    )
  }

  // ── View mode ─────────────────────────────────────────────────────────────
  const j = row.jogo
  const isEncerrado = j?.status === 'encerrado'
  const hasJogo     = !!j

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 text-sm">
      <span className="grid grid-cols-2 gap-1 text-[10px] font-mono font-bold text-[var(--muted-foreground)]/70">
        <span className="rounded border border-[var(--border)] px-1">A{row.posicao_a ?? '?'}</span>
        <span className="rounded border border-[var(--border)] px-1">A{row.posicao_b ?? '?'}</span>
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-semibold text-[var(--foreground)]">
            {row.atletica_a?.nome ?? '?'} <span className="text-[var(--muted-foreground)]/50">×</span> {row.atletica_b?.nome ?? '?'}
          </span>
          {row.modalidade && (
            <span className="text-[11px] text-[var(--muted-foreground)]">
              · {row.modalidade.icone ?? '•'} {row.modalidade.nome} · {row.categoria}
            </span>
          )}
        </div>
        {hasJogo && (
          <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]/70">
            {isEncerrado
              ? `Encerrado: ${j!.placar_a ?? 0} × ${j!.placar_b ?? 0}${j!.wo ? ` (W.O. ${j!.wo})` : ''}`
              : `Status: ${j!.status}`}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!hasJogo && (
          <button
            onClick={onGerarJogo}
            disabled={pending}
            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
            title="Cria a row em /jogos linkada"
          >
            + Jogo
          </button>
        )}
        <button
          onClick={onEdit}
          disabled={pending}
          className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={pending}
          className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Helper duplicado client-side (evita import server-only)
// ─────────────────────────────────────────────────────────────────────────────

function deriveParticipantesClient(rows: Super8Row[]): Super8Participante[] {
  const map = new Map<string, Super8Participante>()
  for (const r of rows) {
    if (r.atletica_a && !map.has(r.atletica_a_id)) {
      map.set(r.atletica_a_id, {
        posicao: r.posicao_a ?? 99, atletica_id: r.atletica_a_id,
        nome: r.atletica_a.nome, slug: r.atletica_a.slug,
        conferencia: r.atletica_a.conferencia, cor_primaria: r.atletica_a.cor_primaria,
      })
    }
    if (r.atletica_b && !map.has(r.atletica_b_id)) {
      map.set(r.atletica_b_id, {
        posicao: r.posicao_b ?? 99, atletica_id: r.atletica_b_id,
        nome: r.atletica_b.nome, slug: r.atletica_b.slug,
        conferencia: r.atletica_b.conferencia, cor_primaria: r.atletica_b.cor_primaria,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.posicao - b.posicao)
}
