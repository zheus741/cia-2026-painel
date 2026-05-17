'use client'

import { useState, useMemo, useTransition } from 'react'
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
  Plus,
  ImageIcon,
  Trash2,
  Loader2,
} from 'lucide-react'
import { updateAtletica, updateInscricao, createAtletica, createInscricao, deleteInscricaoById } from './actions'
import { CONFERENCIAS, type ConferenciaMeta } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/confirm-dialog'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Atletica {
  id: string; nome: string; slug: string
  divisao: string | null; conferencia: string | null
  seed: number | null; universidade: string | null
  logo_url: string | null
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
interface EditForm {
  nome: string; divisao: string; conferencia: string; seed: string; universidade: string; logo_url: string
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

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(10,15,11,0.15)', fontSize: 14,
  color: '#0A0F0B', background: '#fff', outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 6,
}

// ─── Logo upload helper ───────────────────────────────────────────────────────

async function handleLogoUpload(
  file: File,
  onUrl: (url: string) => void,
  setUploading: (v: boolean) => void,
) {
  if (file.size > 524288) {
    toast.error('Imagem muito grande', { description: 'Máximo 512 KB.' })
    return
  }
  setUploading(true)
  try {
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `brasao-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('brasoes').upload(path, file, { upsert: true })
    if (upErr) throw upErr
    const { data: urlData } = supabase.storage.from('brasoes').getPublicUrl(path)
    onUrl(urlData.publicUrl)
    toast.success('Brasão atualizado')
  } catch (e) {
    toast.error('Erro ao fazer upload', { description: String(e) })
  } finally {
    setUploading(false)
  }
}

// ─── Logo section (reusable) ──────────────────────────────────────────────────

interface LogoSectionProps {
  form: { logo_url: string }
  uploadingLogo: boolean
  onChange: (logo_url: string) => void
  setUploadingLogo: (v: boolean) => void
}

function LogoSection({ form, uploadingLogo, onChange, setUploadingLogo }: LogoSectionProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Brasão</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Preview */}
        <div style={{
          width: 64, height: 64, borderRadius: 12,
          border: '1px solid rgba(10,15,11,0.12)',
          background: '#f4f6f4', overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {form.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={form.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <ImageIcon size={24} color="#d1d5db" />
          }
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* File upload button */}
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid rgba(10,15,11,0.15)',
            background: '#f9fafb', cursor: 'pointer',
            fontSize: 13, fontWeight: 500,
            width: 'fit-content',
          }}>
            {uploadingLogo
              ? <Loader2 size={14} className="animate-spin" />
              : <ImageIcon size={14} />
            }
            {uploadingLogo ? 'Enviando...' : 'Escolher imagem'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleLogoUpload(f, onChange, setUploadingLogo)
              }}
            />
          </label>
          {/* URL fallback */}
          <input
            type="url"
            value={form.logo_url}
            onChange={e => onChange(e.target.value)}
            placeholder="ou cole a URL aqui..."
            style={{ ...inputStyle, fontSize: 12 }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  atletica: Atletica
  form: EditForm
  saving: boolean
  saveError: string | null
  uploadingLogo: boolean
  setUploadingLogo: (v: boolean) => void
  onClose: () => void
  onChange: (f: EditForm) => void
  onSave: () => void
}

function EditModal({ atletica, form, saving, saveError, uploadingLogo, setUploadingLogo, onClose, onChange, onSave }: EditModalProps) {
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
        maxHeight: '90vh', overflowY: 'auto',
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

        {/* Logo */}
        <LogoSection
          form={form}
          uploadingLogo={uploadingLogo}
          onChange={url => onChange({ ...form, logo_url: url })}
          setUploadingLogo={setUploadingLogo}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome da atlética</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => onChange({ ...form, nome: e.target.value })}
              placeholder={atletica.nome}
              style={inputStyle}
            />
          </div>

          {/* Divisão */}
          <div>
            <label style={labelStyle}>Divisão</label>
            <select
              value={form.divisao}
              onChange={e => onChange({ ...form, divisao: e.target.value })}
              style={{ ...inputStyle, padding: '8px 12px' }}
            >
              <option value="">Sem divisão</option>
              <option value="1ª Divisão">1ª Divisão</option>
              <option value="2ª Divisão">2ª Divisão</option>
              <option value="Super 08">Super 08</option>
            </select>
          </div>

          {/* Conferência */}
          <div>
            <label style={labelStyle}>Conferência</label>
            <select
              value={form.conferencia}
              onChange={e => onChange({ ...form, conferencia: e.target.value })}
              style={{ ...inputStyle, padding: '8px 12px' }}
            >
              <option value="">Nenhuma</option>
              {CONFERENCIAS.map(c => (
                <option key={c.nome} value={c.nome}>{c.icone} {c.nome}</option>
              ))}
            </select>
          </div>

          {/* Seed */}
          <div>
            <label style={labelStyle}>Seed</label>
            <input
              type="number"
              min={1}
              max={16}
              value={form.seed}
              onChange={e => onChange({ ...form, seed: e.target.value })}
              placeholder="—"
              style={inputStyle}
            />
          </div>

          {/* Universidade */}
          <div>
            <label style={labelStyle}>Universidade</label>
            <input
              type="text"
              value={form.universidade}
              onChange={e => onChange({ ...form, universidade: e.target.value })}
              placeholder="Nome da universidade"
              style={inputStyle}
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
            disabled={saving || uploadingLogo}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#0A0F0B', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: (saving || uploadingLogo) ? 'not-allowed' : 'pointer',
              opacity: (saving || uploadingLogo) ? 0.6 : 1,
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
  const [, startTransition] = useTransition()

  // Tabs
  const [tab, setTab] = useState<'div1' | 'div2' | 'super08' | 'conferencias'>('div1')

  // Filters (per-tab search query, reset on tab change)
  const [query, setQuery] = useState('')

  // Row expansion
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ nome: '', divisao: '', conferencia: '', seed: '', universidade: '', logo_url: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Nova atlética
  const [showNova, setShowNova] = useState(false)
  const [novaForm, setNovaForm] = useState({ nome: '', divisao: '', conferencia: '', seed: '', universidade: '', logo_url: '' })
  const [novaSaving, setNovaSaving] = useState(false)
  const [novaError, setNovaError] = useState<string | null>(null)
  const [novaUploadingLogo, setNovaUploadingLogo] = useState(false)

  // CK overrides
  const [ckOverride, setCkOverride] = useState<Record<string, 1 | 2 | null>>({})
  const [ckLoading, setCkLoading] = useState<Record<string, boolean>>({})

  // Inscription add form state (per atlética)
  const [addInscricaoId, setAddInscricaoId] = useState<string | null>(null)
  const [inscForm, setInscForm] = useState({ modalidade_id: '', categoria: '' })
  const [inscSaving, setInscSaving] = useState(false)
  const [inscError, setInscError] = useState<string | null>(null)

  // Local inscription overrides (optimistic add/remove)
  const [inscOverride, setInscOverride] = useState<{ added: NormalizedInscricao[]; deleted: Set<string> }>({ added: [], deleted: new Set() })

  // ── Derived ──────────────────────────────────────────────────────────────

  const editingAtletica = editingId ? atleticas.find(a => a.id === editingId) ?? null : null

  const counts = useMemo(() => ({
    div1:   atleticas.filter(a => a.divisao === '1ª Divisão').length,
    div2:   atleticas.filter(a => a.divisao === '2ª Divisão').length,
    super8: atleticas.filter(a => a.divisao === 'Super 08').length,
    semDiv: atleticas.filter(a => !a.divisao).length,
  }), [atleticas])

  const divisionAtleticas = useMemo(() => {
    const divMap: Record<string, string> = { div1: '1ª Divisão', div2: '2ª Divisão', super08: 'Super 08' }
    if (tab === 'conferencias') return []
    const div = divMap[tab]
    const q = query.toLowerCase()
    return atleticas.filter(a => {
      if (a.divisao !== div) return false
      if (q && !a.nome.toLowerCase().includes(q) && !(a.universidade ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [atleticas, tab, query])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const switchTab = (t: typeof tab) => {
    setTab(t)
    setExpandedId(null)
    setQuery('')
    setAddInscricaoId(null)
    setInscError(null)
  }

  const openEditModal = (a: Atletica) => {
    setEditingId(a.id)
    setEditForm({
      nome: a.nome,
      divisao: a.divisao ?? '',
      conferencia: a.conferencia ?? '',
      seed: a.seed != null ? String(a.seed) : '',
      universidade: a.universidade ?? '',
      logo_url: a.logo_url ?? '',
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
      nome: editForm.nome.trim() || undefined,
      divisao: editForm.divisao || null,
      conferencia: editForm.conferencia || null,
      seed: seedNum,
      universidade: editForm.universidade.trim() || null,
      logo_url: editForm.logo_url.trim() || null,
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
    const current: 1 | 2 | null = id in ckOverride ? ckOverride[id] : inscricao.cabeca_chave
    const next: 1 | 2 | null = val === null ? null : current === val ? null : val
    setCkOverride(prev => ({ ...prev, [id]: next }))
    setCkLoading(prev => ({ ...prev, [id]: true }))
    await updateInscricao(id, { cabeca_chave: next })
    setCkLoading(prev => ({ ...prev, [id]: false }))
    router.refresh()
  }

  const handleDeleteInscricao = async (insc: NormalizedInscricao) => {
    const ok = await confirmDialog({
      title: 'Remover inscrição?',
      description: `${insc.equipe_nome} em ${insc.modalidade_nome} (${insc.categoria}) será removida desta competição.`,
      confirmLabel: 'Remover',
      destructive: true,
    })
    if (!ok) return
    // Optimistic removal
    setInscOverride(prev => ({ ...prev, deleted: new Set([...prev.deleted, insc.id]) }))
    startTransition(async () => {
      const result = await deleteInscricaoById(insc.id)
      if (!result.ok) {
        // Revert
        setInscOverride(prev => {
          const d = new Set(prev.deleted)
          d.delete(insc.id)
          return { ...prev, deleted: d }
        })
        toast.error('Falha ao remover inscrição', {
          description: result.error ?? 'Tente novamente em alguns segundos.',
        })
      } else {
        toast.success('Inscrição removida')
        router.refresh()
      }
    })
  }

  const handleAddInscricao = async (atletica: Atletica) => {
    if (!inscForm.modalidade_id || !inscForm.categoria) {
      setInscError('Selecione modalidade e categoria.')
      return
    }
    const mod = modalidades.find(m => m.id === inscForm.modalidade_id)
    if (!mod) return

    // Optimistic add
    const tempId = `temp-${Date.now()}`
    const optimistic: NormalizedInscricao = {
      id: tempId,
      equipe_id: atletica.id,
      modalidade_id: inscForm.modalidade_id,
      categoria: inscForm.categoria,
      divisao: atletica.divisao ?? '',
      conferencia: atletica.conferencia ?? null,
      cabeca_chave: null,
      equipe_nome: atletica.nome,
      equipe_slug: atletica.slug,
      modalidade_nome: mod.nome,
      modalidade_icone: mod.icone,
      modalidade_slug: mod.slug,
    }
    setInscOverride(prev => ({ ...prev, added: [...prev.added, optimistic] }))
    setAddInscricaoId(null)
    setInscForm({ modalidade_id: '', categoria: '' })
    setInscError(null)
    setInscSaving(true)

    const result = await createInscricao({
      equipe_id: atletica.id,
      modalidade_id: inscForm.modalidade_id,
      categoria: inscForm.categoria,
      divisao: atletica.divisao ?? '',
      conferencia: atletica.conferencia ?? null,
    })
    setInscSaving(false)

    if (!result.ok) {
      // Revert optimistic
      setInscOverride(prev => ({ ...prev, added: prev.added.filter(i => i.id !== tempId) }))
      setAddInscricaoId(atletica.id)
      setInscError(result.error ?? 'Erro ao adicionar inscrição.')
    } else {
      router.refresh()
    }
  }

  const handleCriarAtletica = async () => {
    if (!novaForm.nome.trim()) { setNovaError('Nome obrigatório.'); return }
    setNovaSaving(true)
    setNovaError(null)
    const seedNum = novaForm.seed.trim() ? parseInt(novaForm.seed, 10) : null
    const result = await createAtletica({
      nome: novaForm.nome.trim(),
      divisao: novaForm.divisao || null,
      conferencia: novaForm.conferencia || null,
      seed: seedNum,
      universidade: novaForm.universidade.trim() || null,
      logo_url: novaForm.logo_url.trim() || null,
    })
    setNovaSaving(false)
    if (result.ok) {
      setShowNova(false)
      setNovaForm({ nome: '', divisao: '', conferencia: '', seed: '', universidade: '', logo_url: '' })
      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setNovaError(result.error ?? 'Erro ao criar.')
    }
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
    const mine = [
      ...inscricoes.filter(i => i.equipe_id === atletica.id && !inscOverride.deleted.has(i.id)),
      ...inscOverride.added.filter(i => i.equipe_id === atletica.id),
    ]

    const groups = new Map<string, NormalizedInscricao[]>()
    for (const insc of mine) {
      const key = insc.modalidade_nome
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(insc)
    }

    const isAdding = addInscricaoId === atletica.id

    return (
      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mine.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 13, paddingBottom: 4 }}>
            Nenhuma inscrição cadastrada.
          </div>
        )}

        {Array.from(groups.entries()).map(([modNome, inscs]) => (
          <div key={modNome}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {inscs[0].modalidade_icone} {modNome}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {inscs.map(insc => {
                const ckVal = insc.id in ckOverride ? ckOverride[insc.id] : insc.cabeca_chave
                const loading = ckLoading[insc.id] ?? false
                const isTemp = insc.id.startsWith('temp-')
                return (
                  <div key={insc.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 10,
                    border: '1px solid rgba(10,15,11,0.10)',
                    background: isTemp ? '#f0fdf4' : '#f9fafb',
                    fontSize: 13,
                    opacity: isTemp ? 0.75 : 1,
                  }}>
                    <span style={{ color: '#374151' }}>{insc.categoria}</span>
                    {insc.divisao && (
                      <span style={{ fontSize: 11, color: divCor(insc.divisao) }}>
                        {insc.divisao}
                      </span>
                    )}
                    {/* CK toggle */}
                    {!isTemp && (
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
                        >—</button>
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
                        >1ª</button>
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
                        >2ª</button>
                      </div>
                    )}
                    {/* Delete */}
                    {!isTemp && (
                      <button
                        title="Remover inscrição"
                        onClick={() => handleDeleteInscricao(insc)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#d1d5db', padding: 2, display: 'flex',
                          marginLeft: 2,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Add inscription section */}
        <div style={{ marginTop: 4 }}>
          {!isAdding ? (
            <button
              onClick={() => { setAddInscricaoId(atletica.id); setInscForm({ modalidade_id: '', categoria: '' }); setInscError(null) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                border: '1px dashed rgba(10,15,11,0.2)',
                background: 'transparent', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#6b7280',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(10,15,11,0.5)'; e.currentTarget.style.color = '#0A0F0B' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(10,15,11,0.2)'; e.currentTarget.style.color = '#6b7280' }}
            >
              <Plus size={13} />
              Adicionar inscrição
            </button>
          ) : (
            <div style={{
              padding: 14, borderRadius: 10,
              border: '1px solid rgba(10,15,11,0.10)',
              background: '#f9fafb',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Modalidade select */}
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Modalidade</label>
                  <select
                    value={inscForm.modalidade_id}
                    onChange={e => setInscForm(f => ({ ...f, modalidade_id: e.target.value }))}
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="">Selecionar...</option>
                    {modalidades.map(m => (
                      <option key={m.id} value={m.id}>{m.icone ? `${m.icone} ` : ''}{m.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Categoria select */}
                <div style={{ flex: '0 0 120px' }}>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Categoria</label>
                  <select
                    value={inscForm.categoria}
                    onChange={e => setInscForm(f => ({ ...f, categoria: e.target.value }))}
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="">Cat...</option>
                    <option value="M">M — Masculino</option>
                    <option value="F">F — Feminino</option>
                    <option value="COED">COED — Misto</option>
                  </select>
                </div>

                {/* Info: divisão e conferência */}
                <div style={{ flex: '0 0 auto', paddingBottom: 8 }}>
                  {atletica.divisao && (
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                      fontSize: 11, fontWeight: 600,
                      background: divCor(atletica.divisao) + '22',
                      color: divCor(atletica.divisao),
                      border: `1px solid ${divCor(atletica.divisao)}44`,
                      marginRight: 4,
                    }}>
                      {atletica.divisao}
                    </span>
                  )}
                  {atletica.conferencia && (
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                      fontSize: 11, fontWeight: 600,
                      background: confCor(atletica.conferencia) + '22',
                      color: confCor(atletica.conferencia),
                      border: `1px solid ${confCor(atletica.conferencia)}44`,
                    }}>
                      {CONF_MAP.get(atletica.conferencia)?.icone} {atletica.conferencia}
                    </span>
                  )}
                </div>
              </div>

              {inscError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626' }}>
                  <AlertCircle size={12} />
                  {inscError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleAddInscricao(atletica)}
                  disabled={inscSaving}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none',
                    background: '#0A0F0B', color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: inscSaving ? 'not-allowed' : 'pointer',
                    opacity: inscSaving ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {inscSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                  {inscSaving ? 'Adicionando...' : 'Adicionar'}
                </button>
                <button
                  onClick={() => { setAddInscricaoId(null); setInscError(null) }}
                  style={{
                    padding: '6px 12px', borderRadius: 7,
                    border: '1px solid rgba(10,15,11,0.15)',
                    background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Tab: Divisão (shared renderer) ────────────────────────────────────────

  const renderDivisaoTab = (divLabel: string, semDiv: number) => {
    const total = divisionAtleticas.length
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: divCor(divLabel) + '14',
            border: `1px solid ${divCor(divLabel)}30`,
            fontSize: 12, fontWeight: 600, color: divCor(divLabel),
          }}>
            {divLabel}: <strong>{total}</strong>
          </span>
          {semDiv > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: '#9ca3af14', border: '1px solid #9ca3af30',
              fontSize: 12, fontWeight: 600, color: '#9ca3af',
            }}>
              Sem divisão: <strong>{semDiv}</strong>
            </span>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 400 }}>
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

        {/* Table */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(10,15,11,0.08)',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 160px 80px',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(10,15,11,0.07)',
            background: '#f9fafb',
          }}>
            {['#', 'Atlética', 'Conferência', 'Ações'].map((h, i) => (
              <span key={h} style={{
                fontSize: 11, fontWeight: 700, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                textAlign: i === 3 ? 'right' : 'left',
              }}>
                {h}
              </span>
            ))}
          </div>

          {divisionAtleticas.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              Nenhuma atlética encontrada.
            </div>
          )}

          {divisionAtleticas.map((atletica, idx) => {
            const isExpanded = expandedId === atletica.id
            return (
              <div key={atletica.id} style={{ borderBottom: idx < divisionAtleticas.length - 1 ? '1px solid rgba(10,15,11,0.06)' : 'none' }}>
                {/* Main row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 160px 80px',
                    padding: '10px 16px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(10,15,11,0.02)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : atletica.id)}
                >
                  {/* Seed */}
                  <div><SeedBadge seed={atletica.seed} divisao={atletica.divisao} /></div>

                  {/* Nome + uni */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {isExpanded
                      ? <ChevronDown size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
                      : <ChevronRight size={14} color="#c4c9c5" style={{ flexShrink: 0 }} />
                    }
                    {/* Brasão */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                      border: '1px solid rgba(10,15,11,0.08)',
                      background: '#f4f6f4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {atletica.logo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={atletica.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <Users size={12} color="#d1d5db" />
                      }
                    </div>
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
  }

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
              ...Array(Math.max(0, vagas)).fill(null),
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

  // ── Tab config ────────────────────────────────────────────────────────────

  const TABS: { key: typeof tab; label: string }[] = [
    { key: 'div1',        label: `1ª Divisão (${counts.div1})` },
    { key: 'div2',        label: `2ª Divisão (${counts.div2})` },
    { key: 'super08',     label: `Super 08 (${counts.super8})` },
    { key: 'conferencias', label: 'Conferências (8)' },
  ]

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
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 28, fontWeight: 700, color: '#0A0F0B',
                margin: '0 0 2px',
              }}>
                Dados Esportivo
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Atléticas, brasões, inscrições e cabeças de chave
              </p>
            </div>
            <button
              onClick={() => { setShowNova(true); setNovaError(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: '#0A0F0B', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={14} />
              Nova atlética
            </button>
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
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                style={{
                  padding: '10px 18px',
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? '#0A0F0B' : '#9ca3af',
                  borderBottom: tab === t.key ? '2px solid #0A0F0B' : '2px solid transparent',
                  transition: 'all 0.15s',
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
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
        {tab === 'div1'         && renderDivisaoTab('1ª Divisão', counts.semDiv)}
        {tab === 'div2'         && renderDivisaoTab('2ª Divisão', counts.semDiv)}
        {tab === 'super08'      && renderDivisaoTab('Super 08',   counts.semDiv)}
        {tab === 'conferencias' && renderConferenciasTab()}
      </div>

      {/* Edit Modal */}
      {editingId && editingAtletica && (
        <EditModal
          atletica={editingAtletica}
          form={editForm}
          saving={saving}
          saveError={saveError}
          uploadingLogo={uploadingLogo}
          setUploadingLogo={setUploadingLogo}
          onClose={() => { setEditingId(null); setSaveError(null) }}
          onChange={setEditForm}
          onSave={handleSave}
        />
      )}

      {/* Nova atlética modal */}
      {showNova && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(10,15,11,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowNova(false) }}
        >
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(10,15,11,0.18)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 20, fontWeight: 700, color: '#0A0F0B', margin: 0 }}>
                Nova Atlética
              </h2>
              <button
                onClick={() => setShowNova(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Logo */}
            <LogoSection
              form={novaForm}
              uploadingLogo={novaUploadingLogo}
              onChange={url => setNovaForm(f => ({ ...f, logo_url: url }))}
              setUploadingLogo={setNovaUploadingLogo}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Nome */}
              <div>
                <label style={labelStyle}>
                  Nome da atlética <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={novaForm.nome}
                  onChange={e => setNovaForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="AA Engenharia"
                  style={inputStyle}
                />
              </div>
              {/* Universidade */}
              <div>
                <label style={labelStyle}>Universidade</label>
                <input
                  type="text"
                  value={novaForm.universidade}
                  onChange={e => setNovaForm(f => ({ ...f, universidade: e.target.value }))}
                  placeholder="Nome da universidade"
                  style={inputStyle}
                />
              </div>
              {/* Divisão */}
              <div>
                <label style={labelStyle}>Divisão</label>
                <select
                  value={novaForm.divisao}
                  onChange={e => setNovaForm(f => ({ ...f, divisao: e.target.value }))}
                  style={{ ...inputStyle, padding: '8px 12px' }}
                >
                  <option value="">Sem divisão</option>
                  <option value="1ª Divisão">1ª Divisão</option>
                  <option value="2ª Divisão">2ª Divisão</option>
                  <option value="Super 08">Super 08</option>
                </select>
              </div>
              {/* Conferência */}
              <div>
                <label style={labelStyle}>Conferência</label>
                <select
                  value={novaForm.conferencia}
                  onChange={e => setNovaForm(f => ({ ...f, conferencia: e.target.value }))}
                  style={{ ...inputStyle, padding: '8px 12px' }}
                >
                  <option value="">Nenhuma</option>
                  {CONFERENCIAS.map(c => (
                    <option key={c.nome} value={c.nome}>{c.icone} {c.nome}</option>
                  ))}
                </select>
              </div>
              {/* Seed */}
              <div>
                <label style={labelStyle}>Seed</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={novaForm.seed}
                  onChange={e => setNovaForm(f => ({ ...f, seed: e.target.value }))}
                  placeholder="—"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Error */}
            {novaError && (
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 8,
                background: '#fef2f2', border: '1px solid #fecaca',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertCircle size={14} color="#ef4444" />
                <span style={{ fontSize: 13, color: '#dc2626' }}>{novaError}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button
                onClick={() => setShowNova(false)}
                disabled={novaSaving}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(10,15,11,0.15)',
                  background: '#fff', color: '#0A0F0B', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', opacity: novaSaving ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarAtletica}
                disabled={novaSaving || novaUploadingLogo}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: '#0A0F0B', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: (novaSaving || novaUploadingLogo) ? 'not-allowed' : 'pointer',
                  opacity: (novaSaving || novaUploadingLogo) ? 0.6 : 1,
                }}
              >
                {novaSaving ? 'Criando...' : 'Criar atlética'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
