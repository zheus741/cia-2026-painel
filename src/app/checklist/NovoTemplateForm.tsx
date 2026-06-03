'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, GripVertical, Loader2, LayoutTemplate } from 'lucide-react'
import { criarTemplate } from './actions'
import { toast } from '@/components/toast'

interface Props {
  edicaoId: string
  funcoes: { value: string; label: string }[]
}

const TIPOS: { value: 'geral' | 'jogo' | 'show' | 'festa' | 'ativacao_patrocinador'; label: string; hint: string }[] = [
  { value: 'geral',                  label: 'Geral',      hint: 'Sem vínculo — montagem, credenciamento, limpeza…' },
  { value: 'jogo',                   label: 'Jogo',       hint: 'Cobertura de uma partida' },
  { value: 'show',                   label: 'Show',       hint: 'Cobertura de show/DJ' },
  { value: 'festa',                  label: 'Festa',      hint: 'Cobertura de festa/arena' },
  { value: 'ativacao_patrocinador',  label: 'Ativação',   hint: 'Entrega de patrocinador' },
]

type Item = { id: number; label: string; obrigatorio: boolean; funcao: string }
let _seq = 1
const novoItem = (): Item => ({ id: _seq++, label: '', obrigatorio: true, funcao: '' })

export function NovoTemplateForm({ edicaoId, funcoes }: Props) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<typeof TIPOS[number]['value']>('geral')
  const [itens, setItens] = useState<Item[]>([novoItem(), novoItem(), novoItem()])
  const [pending, start] = useTransition()
  const router = useRouter()

  function reset() {
    setNome(''); setTipo('geral'); setItens([novoItem(), novoItem(), novoItem()]); setOpen(false)
  }
  function upd(id: number, patch: Partial<Item>) {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const validos = itens.filter(i => i.label.trim())
    if (!nome.trim()) { toast.error('Dê um nome ao template'); return }
    if (validos.length === 0) { toast.error('Adicione ao menos um item'); return }
    start(async () => {
      const r = await criarTemplate({
        edicao_id: edicaoId,
        nome: nome.trim(),
        tipo,
        itens: validos.map(i => ({ label: i.label, obrigatorio: i.obrigatorio, funcao_requerida: i.funcao || null })),
      })
      if (r.ok) {
        toast.success('Template criado', { description: `${nome.trim()} · ${validos.length} itens` })
        reset(); router.refresh()
      } else {
        toast.error('Falha ao criar template', {
          description: /enum|invalid input value/i.test(r.error ?? '')
            ? "Rode a migration 0076 (tipo 'geral') no Supabase antes de usar o tipo Geral."
            : r.error,
        })
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--green-dim)]/50"
      >
        <LayoutTemplate className="h-4 w-4 text-[var(--green-bright)]" />
        Novo template
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="w-full rounded-xl border border-[var(--green-dim)]/40 bg-[var(--card)] p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Novo template de checklist</p>
        <button type="button" onClick={reset} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Nome *</label>
          <input
            value={nome} onChange={e => setNome(e.target.value)} autoFocus
            placeholder="Ex: Montagem de Palco"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Tipo</label>
          <select
            value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <p className="text-[10px] text-[var(--muted-foreground)]/70">{TIPOS.find(t => t.value === tipo)?.hint}</p>
        </div>
      </div>

      {/* Itens */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Itens do checklist</label>
        {itens.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]/40" />
            <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-[var(--muted-foreground)]/50">{idx + 1}</span>
            <input
              value={it.label}
              onChange={e => upd(it.id, { label: e.target.value })}
              placeholder="Descrição do item…"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-sm text-[var(--foreground)]"
            />
            {funcoes.length > 0 && (
              <select
                value={it.funcao}
                onChange={e => upd(it.id, { funcao: e.target.value })}
                title="Função responsável (opcional)"
                className="w-28 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-xs text-[var(--muted-foreground)]"
              >
                <option value="">Função…</option>
                {funcoes.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            )}
            <button
              type="button"
              onClick={() => upd(it.id, { obrigatorio: !it.obrigatorio })}
              title={it.obrigatorio ? 'Obrigatório' : 'Opcional'}
              className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold transition-colors"
              style={{
                color: it.obrigatorio ? 'var(--green-bright)' : 'var(--muted-foreground)',
                background: it.obrigatorio ? 'rgba(46,107,66,0.12)' : 'transparent',
                border: `1px solid ${it.obrigatorio ? 'rgba(46,107,66,0.3)' : 'var(--border)'}`,
              }}
            >
              {it.obrigatorio ? 'OBRIG' : 'OPC'}
            </button>
            <button
              type="button" onClick={() => setItens(prev => prev.filter(x => x.id !== it.id))}
              className="shrink-0 rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button" onClick={() => setItens(prev => [...prev, novoItem()])}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--green-bright)] hover:bg-[var(--green-dim)]/10"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar item
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit" disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar template
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          Cancelar
        </button>
      </div>
    </form>
  )
}
