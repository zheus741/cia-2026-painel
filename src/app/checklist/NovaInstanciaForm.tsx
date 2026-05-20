'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { criarInstancia } from './actions'
import { useRouter } from 'next/navigation'

interface Template { id: string; nome: string; tipo: string }
interface Jogo { id: string; label: string }
interface Show { id: string; label: string }
interface Festa { id: string; label: string }
interface Patrocinador { id: string; nome: string }
interface Dia { id: string; nome_dia: string }

interface Props {
  edicaoId: string
  templates: Template[]
  jogos: Jogo[]
  shows: Show[]
  festas: Festa[]
  patrocinadores: Patrocinador[]
  dias: Dia[]
}

const TIPO_LABEL: Record<string, string> = {
  jogo: 'Jogo', show: 'Show', festa: 'Festa', ativacao_patrocinador: 'Ativação',
}

export function NovaInstanciaForm({ edicaoId, templates, jogos, shows, festas, patrocinadores, dias }: Props) {
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [vinculo, setVinculo] = useState('')
  const [vinculoId, setVinculoId] = useState('')
  const [nomeOverride, setNomeOverride] = useState('')
  const [diaId, setDiaId] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const selectedTemplate = templates.find((t) => t.id === templateId)
  const tipoTemplate = selectedTemplate?.tipo ?? ''

  const vinculoOptions: { value: string; label: string }[] = (() => {
    if (vinculo === 'jogo') return jogos.map((j) => ({ value: j.id, label: j.label }))
    if (vinculo === 'show') return shows.map((s) => ({ value: s.id, label: s.label }))
    if (vinculo === 'festa') return festas.map((f) => ({ value: f.id, label: f.label }))
    if (vinculo === 'patrocinador') return patrocinadores.map((p) => ({ value: p.id, label: p.nome }))
    return []
  })()

  function reset() {
    setTemplateId(''); setVinculo(''); setVinculoId(''); setNomeOverride(''); setDiaId('')
    setOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!templateId) return
    startTransition(async () => {
      await criarInstancia({
        template_id: templateId,
        edicao_id: edicaoId,
        dia_id: diaId || null,
        jogo_id: vinculo === 'jogo' ? vinculoId || null : null,
        show_id: vinculo === 'show' ? vinculoId || null : null,
        festa_id: vinculo === 'festa' ? vinculoId || null : null,
        patrocinador_id: vinculo === 'patrocinador' ? vinculoId || null : null,
        nome_override: nomeOverride.trim() || null,
      })
      reset()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-[var(--green-dim)]/40 bg-[var(--green-dim)]/10 px-4 py-2 text-sm font-semibold text-[var(--green-bright)] transition-colors hover:bg-[var(--green-dim)]/20"
      >
        <Plus className="h-4 w-4" />
        Novo checklist
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--green-dim)]/40 bg-[var(--card)] p-5 space-y-4 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Novo checklist</p>
        <button type="button" onClick={reset} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Template */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Template *</label>
        <select
          value={templateId}
          onChange={(e) => { setTemplateId(e.target.value); setVinculo(''); setVinculoId('') }}
          required
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="">Selecione um template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {TIPO_LABEL[t.tipo] ?? t.tipo} — {t.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Vínculo */}
      {selectedTemplate && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Vincular a</label>
            <select
              value={vinculo}
              onChange={(e) => { setVinculo(e.target.value); setVinculoId('') }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="">Nenhum (manual)</option>
              {(tipoTemplate === 'jogo' || !tipoTemplate) && <option value="jogo">Jogo</option>}
              {(tipoTemplate === 'show' || !tipoTemplate) && <option value="show">Show</option>}
              {(tipoTemplate === 'festa' || !tipoTemplate) && <option value="festa">Festa</option>}
              {(tipoTemplate === 'ativacao_patrocinador' || !tipoTemplate) && <option value="patrocinador">Patrocinador</option>}
            </select>
          </div>

          {vinculo && vinculoOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                {vinculo === 'jogo' ? 'Jogo' : vinculo === 'show' ? 'Show' : vinculo === 'festa' ? 'Festa' : 'Patrocinador'}
              </label>
              <select
                value={vinculoId}
                onChange={(e) => setVinculoId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="">Selecione...</option>
                {vinculoOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Nome override */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Nome (opcional)</label>
        <input
          type="text"
          value={nomeOverride}
          onChange={(e) => setNomeOverride(e.target.value)}
          placeholder="Deixe vazio para gerar automaticamente"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50"
        />
      </div>

      {/* Dia do evento */}
      {dias.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Dia do evento (opcional)</label>
          <select
            value={diaId}
            onChange={(e) => setDiaId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            <option value="">Sem dia específico</option>
            {dias.map((d) => (
              <option key={d.id} value={d.id}>{d.nome_dia}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!templateId || isPending}
          className="flex-1 rounded-lg bg-[var(--green-dim)] py-2 text-sm font-semibold text-[var(--green-bright)] transition-colors hover:bg-[var(--green)] hover:text-black disabled:opacity-40"
        >
          {isPending ? 'Criando...' : 'Criar checklist'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
