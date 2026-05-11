'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Pencil,
  ArrowUpRight,
  Crown,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Trophy,
  AlertCircle,
} from 'lucide-react'
import { updateAtletica, updateInscricao } from './actions'
import { CONFERENCIAS, type ConferenciaMeta } from '@/lib/conferencias'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Atletica {
  id: string; nome: string; slug: string
  divisao: string | null; conferencia: string | null
  seed: number | null; universidade: string | null
}
interface NormalizedInscricao {
  id: string; equipe_id: string; modalidade_id: string
  categoria: string; divisao: string; conferencia: string | null
  cabeca_chave: 1 | 2 | null
  equipe_nome: string; equipe_slug: string
  modalidade_nome: string; modalidade_icone: string | null; modalidade_slug: string
}
interface Modalidade { id: string; nome: string; slug: string; icone: string | null }
interface Props {
  atleticas: Atletica[]
  inscricoes: NormalizedInscricao[]
  modalidades: Modalidade[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DIVISAO_CORES: Record<string, string> = {
  '1ª Divisão': '#A67D14',
  '2ª Divisão': '#2e6b42',
  'Super 08':   '#D8845F',
}

const CONF_MAP = new Map<string, ConferenciaMeta>(CONFERENCIAS.map(c => [c.nome, c]))

function confCor(nome: string | null): string {
  if (!nome) return '#6b7280'
  return CONF_MAP.get(nome)?.cor ?? '#6b7280'
}

function divCor(nome: string | null): string {
  if (!nome) return '#6b7280'
  return DIVISAO_CORES[nome] ?? '#6b7280'
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

interface EditForm {
  divisao: string
  conferencia: string
  seed: string
  universidade: string
}

interface EditModalProps {
  atletica: Atletica
  form: EditForm
  saving: boolean
  saveError: string | null
  onClose: () => void
  onChange: (f: EditForm) => void
  onSave: () => void
}

function EditModal({ atletica, form, saving, saveError, onClose, onChange, onSave }: EditModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(10,15,11,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(10,15,11,0.18)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 20, fontWeight: 700, color: '#0A0F0B', margin: 0 }}>
            Editar Atlética
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nome read-only */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
            Atlética
          </label>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0A0F0B' }}>{atletica.nome}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Divisão */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Divisão
            </label>
            <select
              value={form.divisao}
              onChange={e => onChange({ ...form, divisao: e.target.value })}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid rgba(10,15,11,0.15)', fontSize: 14,
                color: '#0A0F0B', background: '#fff', outline: 'none',
              }}
            >
              <option value="">Sem divisão</option>
              <option value="1ª Divisão">1ª Divisão</option>
              <option value="2ª Divisão">2ª Divisão</option>
              <option value="Super 08">Super 08</option>
            </select>
          </div>

          {/* Conferência */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Conferência
            </label>
            <select
              value={form.conferencia}
              onChange={e => onChange({ ...form, conferencia: e.target.value })}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid rgba(10,15,11,0.15)', fontSize: 14,
                color: '#0A0F0B', background: '#fff', outline: 'none',
              }}
            >
              <option value="">Nenhuma</option>
              {CONFERENCIAS.map(c => (
                <option key={c.nome} value={c.nome}>{c.icone} {c.nome}</option>
              ))}
            </select>
          </div>

          {/* Seed */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Seed
            </label>
            <input
              type="number"
              min={1}
              max={16}
              value={form.seed}
              onChange={e => onChange({ ...form, seed: e.target.value })}
              placeholder="—"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid rgba(10,15,11,0.15)', fontSize: 14,
                color: '#0A0F0B', background: '#fff', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Universidade */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Universidade
            </label>
            <input
              type="text"
              value={form.universidade}
              onChange={e => onChange({ ...form, universidade: e.target.value })}
              placeholder="Nome da universidade"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid rgba(10,15,11,0.15)', fontSize: 14,
                color: '#0A0F0B', background: '#fff', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: '#fef2f2', border: '1px solid #fecaca',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertCircle size={14} color="#ef4444" />
            <span style={{ fontSize: 13, color: '#dc2626' }}>{saveError}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(10,15,11,0.15)',
              background: '#fff', color: '#0A0F0B', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', opacity: saving ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#0A0F0B', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CompeticaoClient({ atleticas, inscricoes, modalidades }: Props) {
  const router = useRouter()

  // Tab
  const [tab, setTab] = useState<'atleticas' | 'conferencias'>('atleticas')

  // Filters
  const [query, setQuery] = useState('')
  const [filterDiv, setFilterDiv] = useState('')
  const [filterConf, setFilterConf] = useState('')

  // Row expansion
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ divisao: '', conferencia: '', seed: '', universidade: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Cabeça de chave optimistic overrides
  const [ckOverride, setCkOverride] = useState<Record<string, 1 | 2 | null>>({})
  const [ckLoading, setCkLoading] = useState<Record<string, boolean>>({})

  // ── Derived ──────────────────────────────────────────────────────────────

  const editingAtletica = editingId ? atleticas.find(a => a.id === editingId) ?? null : null

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return atleticas.filter(a => {
      if (q && !a.nome.toLowerCase().includes(q) && !(a.universidade ?? '').toLowerCase().includes(q)) return false
      if (filterDiv) {
        if (filterDiv === '__sem__') { if (a.divisao) return false }
        else { if (a.divisao !== filterDiv) return false }
      }
      if (filterConf && a.conferencia !== filterConf) return false
      return true
    })
  }, [atleticas, query, filterDiv, filterConf])

  const stats = useMemo(() => ({
    total: atleticas.length,
    div1: atleticas.filter(a => a.divisao === '1ª Divisão').length,
    div2: atleticas.filter(a => a.divisao === '2ª Divisão').length,
    super8: atleticas.filter(a => a.divisao === 'Super 08').length,
    semDiv: atleticas.filter(a => !a.divisao).length,
  }), [atleticas])

  const openEditModal = (a: Atletica) => {
    setEditingId(a.id)
    setEditForm({
      divisao: a.divisao ?? '',
      conferencia: a.conferencia ?? '',
      seed: a.seed != null ? String(a.seed) : '',
      universidade: a.universidade ?? '',
    })
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    setSaveError(null)
    const seedNum = editForm.seed.trim() !== '' ? parseInt(editForm.seed, 10) : null
    const result = await updateAtletica(editingId, {
      divisao: editForm.divisao || null,
      conferencia: editForm.conferencia || null,
      seed: seedNum,
      universidade: editForm.universidade.trim() || null,
    })
    setSaving(false)
    if (result.ok) {
      setEditingId(null)
      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setSaveError(result.error ?? 'Erro ao salvar.')
    }
  }

  const handleCkToggle = async (inscricao: NormalizedInscricao, val: 1 | 2 | null) => {
    const id = inscricao.id
    // If clicking the currently active value, clear it; otherwise set to val
    const current: 1 | 2 | null = id in ckOverride ? ckOverride[id] : inscricao.cabeca_chave
    const next: 1 | 2 | null = val === null ? null : current === val ? null : val
    setCkOverride(prev => ({ ...prev, [id]: next }))
    setCkLoading(prev => ({ ...prev, [id]: true }))
    await updateInscricao(id, { cabeca_chave: next })
    setCkLoading(prev => ({ ...prev, [id]: false }))
    router.refresh()
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const DivPill = ({ nome }: { nome: string | null }) => {
    if (!nome) return <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 6,
        fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
        background: divCor(nome) + '22',
        color: divCor(nome),
        border: `1px solid ${divCor(nome)}44`,
      }}>
        {nome}
      </span>
    )
  }

  const ConfPill = ({ nome }: { nome: string | null }) => {
    if (!nome) return <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
    const c = CONF_MAP.get(nome)
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 6,
        fontSize: 11, fontWeight: 600,
        background: confCor(nome) + '22',
        color: confCor(nome),
        border: `1px solid ${confCor(nome)}44`,
      }}>
        {c?.icone} {nome}
      </span>
    )
  }

  const SeedBadge = ({ seed, divisao }: { seed: number | null; divisao: string | null }) => {
    const color = divCor(divisao)
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 6,
        background: color + '1a',
        color: color,
        fontSize: 12, fontWeight: 700,
        border: `1px solid ${color}33`,
        flexShrink: 0,
      }}>
        {seed ?? '—'}
      </span>
    )
  }

  const renderInscricoesList = (atletica: Atletica) => {
    const mine = inscricoes.filter(i => i.equipe_id === atletica.id)
    if (mine.length === 0) {
      return (
        <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 13 }}>
          Nenhuma inscrição cadastrada.
        </div>
      )
    }

    const groups = new Map<string, NormalizedInscricao[]>()
    for (const insc of mine) {
      const key = insc.modalidade_nome
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(insc)
    }

    return (
      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Array.from(groups.entries()).map(([modNome, inscs]) => (
          <div key={modNome}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {inscs[0].modalidade_icone} {modNome}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {inscs.map(insc => {
                const ckVal = insc.id in ckOverride ? ckOverride[insc.id] : insc.cabeca_chave
                const loading = ckLoading[insc.id] ?? false
                return (
                  <div key={insc.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 10,
                    border: '1px solid rgba(10,15,11,0.10)',
                    background: '#f9fafb', fontSize: 13,
                  }}>
                    <span style={{ color: '#374151' }}>
                      {insc.categoria}
                    </span>
                    {insc.divisao && (
                      <span style={{ fontSize: 11, color: divCor(insc.divisao) }}>
                        {insc.divisao}
                      </span>
                    )}
                    {/* CK toggle */}
                    <div style={{ display: 'flex', gap: 2, marginLeft: 4, opacity: loading ? 0.6 : 1 }}>
                      <button
                        title="Sem cabeça de chave"
                        onClick={() => handleCkToggle(insc, null)}
                        disabled={loading}
                        style={{
                          padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(10,15,11,0.12)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: ckVal == null ? '#0A0F0B' : '#fff',
                          color: ckVal == null ? '#fff' : '#6b7280',
                        }}
                      >
                        —
                      </button>
                      <button
                        title="1ª Cabeça de chave"
                        onClick={() => handleCkToggle(insc, 1)}
                        disabled={loading}
                        style={{
                          padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(10,15,11,0.12)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: ckVal === 1 ? '#A67D14' : '#fff',
                          color: ckVal === 1 ? '#fff' : '#6b7280',
                        }}
                      >
                        1ª
                      </button>
                      <button
                        title="2ª Cabeça de chave"
                        onClick={() => handleCkToggle(insc, 2)}
                        disabled={loading}
                        style={{
                          padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(10,15,11,0.12)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: ckVal === 2 ? '#2e6b42' : '#fff',
                          color: ckVal === 2 ? '#fff' : '#6b7280',
                        }}
                      >
                        2ª
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Tab: Atléticas ────────────────────────────────────────────────────────

  const renderAtleticasTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { label: 'Total', value: stats.total, color: '#0A0F0B' },
          { label: '1ª Div', value: stats.div1, color: DIVISAO_CORES['1ª Divisão'] },
          { label: '2ª Div', value: stats.div2, color: DIVISAO_CORES['2ª Divisão'] },
          { label: 'Super 08', value: stats.super8, color: DIVISAO_CORES['Super 08'] },
          { label: 'Sem divisão', value: stats.semDiv, color: '#9ca3af' },
        ].map(s => (
          <span key={s.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: s.color + '14',
            border: `1px solid ${s.color}30`,
            fontSize: 12, fontWeight: 600, color: s.color,
          }}>
            {s.label}: <strong>{s.value}</strong>
          </span>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar atlética ou universidade..."
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              borderRadius: 8, border: '1px solid rgba(10,15,11,0.12)',
              fontSize: 13, color: '#0A0F0B', background: '#fff', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Divisão filter */}
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(10,15,11,0.12)',
            fontSize: 13, color: '#0A0F0B', background: '#fff', outline: 'none',
          }}
        >
          <option value="">Todas divisões</option>
          <option value="1ª Divisão">1ª Divisão</option>
          <option value="2ª Divisão">2ª Divisão</option>
          <option value="Super 08">Super 08</option>
          <option value="__sem__">Sem divisão</option>
        </select>

        {/* Conferência filter */}
        <select
          value={filterConf}
          onChange={e => setFilterConf(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(10,15,11,0.12)',
            fontSize: 13, color: '#0A0F0B', background: '#fff', outline: 'none',
          }}
        >
          <option value="">Todas conferências</option>
          {CONFERENCIAS.map(c => (
            <option key={c.nome} value={c.nome}>{c.icone} {c.nome}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid rgba(10,15,11,0.08)',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 140px 160px 80px',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(10,15,11,0.07)',
          background: '#f9fafb',
        }}>
          {['#', 'Atlética', 'Divisão', 'Conferência', 'Ações'].map((h, i) => (
            <span key={h} style={{
              fontSize: 11, fontWeight: 700, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              textAlign: i === 4 ? 'right' : 'left',
            }}>
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Nenhuma atlética encontrada.
          </div>
        )}

        {filtered.map((atletica, idx) => {
          const isExpanded = expandedId === atletica.id
          return (
            <div key={atletica.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(10,15,11,0.06)' : 'none' }}>
              {/* Main row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 140px 160px 80px',
                  padding: '10px 16px',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isExpanded ? 'rgba(10,15,11,0.02)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onClick={() => setExpandedId(isExpanded ? null : atletica.id)}
              >
                {/* Seed */}
                <div>
                  <SeedBadge seed={atletica.seed} divisao={atletica.divisao} />
                </div>

                {/* Nome + uni */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {isExpanded
                    ? <ChevronDown size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
                    : <ChevronRight size={14} color="#c4c9c5" style={{ flexShrink: 0 }} />
                  }
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0F0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {atletica.nome}
                    </div>
                    {atletica.universidade && (
                      <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {atletica.universidade}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divisão */}
                <div><DivPill nome={atletica.divisao} /></div>

                {/* Conferência */}
                <div><ConfPill nome={atletica.conferencia} /></div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openEditModal(atletica)}
                    title="Editar"
                    style={{
                      background: 'none', border: '1px solid rgba(10,15,11,0.12)',
                      borderRadius: 6, padding: 6, cursor: 'pointer',
                      display: 'flex', color: '#6b7280',
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <Link
                    href={`/atleticas/${atletica.slug}`}
                    target="_blank"
                    title="Ver página"
                    style={{
                      background: 'none', border: '1px solid rgba(10,15,11,0.12)',
                      borderRadius: 6, padding: 6, cursor: 'pointer',
                      display: 'flex', color: '#6b7280', textDecoration: 'none',
                    }}
                  >
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Expanded inscricoes */}
              {isExpanded && (
                <div style={{
                  borderTop: '1px solid rgba(10,15,11,0.06)',
                  background: '#fafbfa',
                }}>
                  {renderInscricoesList(atletica)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Tab: Conferências ─────────────────────────────────────────────────────

  const renderConferenciasTab = () => {
    const vagasTotal = CONFERENCIAS.reduce((sum, c) => {
      const count = atleticas.filter(a => a.conferencia === c.nome).length
      return sum + Math.max(0, 8 - count)
    }, 0)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header stat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} color="#A67D14" />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0A0F0B' }}>
            {vagasTotal} vagas abertas no total
          </span>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {CONFERENCIAS.map(conf => {
            const teamsInConf = atleticas
              .filter(a => a.conferencia === conf.nome)
              .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
            const vagas = 8 - teamsInConf.length
            const slots: (Atletica | null)[] = [
              ...teamsInConf,
              ...Array(vagas).fill(null),
            ]

            return (
              <div key={conf.nome} style={{
                background: '#fff', borderRadius: 16, padding: 16,
                border: `1px solid ${conf.cor}3d`,
                boxShadow: '0 1px 4px rgba(10,15,11,0.05)',
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{conf.icone}</span>
                    <h3 style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 15, fontWeight: 700, color: '#0A0F0B', margin: 0,
                    }}>
                      {conf.nome}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: teamsInConf.length < 8 ? conf.cor : '#22c55e',
                  }}>
                    {teamsInConf.length}/8
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
                  {conf.vibe}
                </div>

                {/* Team slots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {slots.map((team, i) =>
                    team ? (
                      <div key={team.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 8px', borderRadius: 8,
                        background: 'rgba(10,15,11,0.02)',
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 4,
                          background: conf.cor + '22', color: conf.cor,
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {team.seed ?? i + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0F0B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {team.nome}
                        </span>
                        <button
                          onClick={() => openEditModal(team)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9ca3af', padding: 2, display: 'flex',
                          }}
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    ) : (
                      <div key={`empty-${i}`} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 8px', borderRadius: 8,
                        border: '1px dashed rgba(10,15,11,0.12)',
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 4,
                          background: 'rgba(10,15,11,0.04)',
                          fontSize: 10, fontWeight: 700, color: '#d1d5db',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {teamsInConf.length + i + 1}
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                          Vaga aberta
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f4' }}>
      {/* Page header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: '#fff',
        borderBottom: '1px solid rgba(10,15,11,0.08)',
        padding: '16px 24px 0',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 12 }}>
            <h1 style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 28, fontWeight: 700, color: '#0A0F0B',
              margin: '0 0 2px',
            }}>
              Competição · Gestão
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Atléticas, inscrições e cabeças de chave
            </p>
          </div>

          {/* Success banner */}
          {saveSuccess && (
            <div style={{
              marginBottom: 8, padding: '8px 12px', borderRadius: 8,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Crown size={13} /> Salvo com sucesso.
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {([
              { key: 'atleticas', label: `Atléticas (${atleticas.length})` },
              { key: 'conferencias', label: 'Conferências (8)' },
            ] as { key: 'atleticas' | 'conferencias'; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 18px',
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? '#0A0F0B' : '#9ca3af',
                  borderBottom: tab === t.key ? '2px solid #0A0F0B' : '2px solid transparent',
                  transition: 'all 0.15s',
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px' }}>
        {tab === 'atleticas' ? renderAtleticasTab() : renderConferenciasTab()}
      </div>

      {/* Edit Modal */}
      {editingId && editingAtletica && (
        <EditModal
          atletica={editingAtletica}
          form={editForm}
          saving={saving}
          saveError={saveError}
          onClose={() => { setEditingId(null); setSaveError(null) }}
          onChange={setEditForm}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
