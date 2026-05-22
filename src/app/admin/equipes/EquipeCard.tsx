'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Users, Music, Sparkles, Building2, ImagePlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Equipe {
  id: string
  nome: string
  slug: string | null
  tipo: string
  divisao: string | null
  universidade: string | null
  logo_url: string | null
  cor_primaria: string | null
}

const TIPO_META: Record<string, { label: string; icon: typeof Users; cor: string }> = {
  atletica: { label: 'Atlética', icon: Users,     cor: '#2e6b42' },
  cheer:    { label: 'Cheer',    icon: Sparkles,  cor: '#A04A2E' },
  bateria:  { label: 'Bateria',  icon: Music,     cor: '#3D49E0' },
}

export function EquipeCard({
  e, onEdit, onDelete,
}: {
  e: Equipe
  onEdit:   () => void
  onDelete: () => void
}) {
  const tipoMeta = TIPO_META[e.tipo] ?? TIPO_META.atletica
  const TipoIcon = tipoMeta.icon
  const cor = e.cor_primaria || tipoMeta.cor

  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleLogoUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 3 MB.')
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `${e.id}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('equipe-logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('equipe-logos').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from('equipes').update({ logo_url: url }).eq('id', e.id)
      if (dbErr) throw dbErr
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar a logo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <article
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-[var(--card)] p-4 transition-all"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Color stripe lateral — cor primária da equipe */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: cor }}
      />

      <div className="flex items-start gap-3 pl-1.5">
        {/* Logo — clicável pra upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label={`Enviar logo de ${e.nome}`}
          title="Clique para enviar/trocar a logo"
          className="group/logo relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white transition-all hover:ring-2 hover:ring-[var(--green-bright)]/50"
          style={{ borderColor: 'var(--border)' }}
        >
          {e.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.logo_url}
              alt={e.nome}
              width={48}
              height={48}
              className="h-full w-full object-contain p-1"
              onError={(ev) => {
                ;(ev.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span
              className="text-[11px] font-bold uppercase tracking-wider leading-none text-center px-1"
              style={{ color: cor }}
            >
              {e.nome.split(' ').slice(0, 2).map(w => w[0]).join('')}
            </span>
          )}
          {/* Overlay de upload */}
          <span
            className={`absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity ${
              uploading ? 'opacity-100' : 'opacity-0 group-hover/logo:opacity-100'
            }`}
          >
            {uploading
              ? <Loader2 className="h-4 w-4 animate-spin text-white" />
              : <ImagePlus className="h-4 w-4 text-white" />}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoUpload}
          disabled={uploading}
        />

        {/* Nome + universidade */}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold text-[var(--foreground)] leading-tight">
            {e.nome}
          </h3>
          {e.universidade && (
            <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/60">
              <Building2 className="h-2.5 w-2.5" />
              {e.universidade}
            </p>
          )}
        </div>
      </div>

      {/* Badges: tipo + divisão */}
      <div className="flex flex-wrap items-center gap-1.5 pl-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: `${tipoMeta.cor}14`,
            color: tipoMeta.cor,
            border: `1px solid ${tipoMeta.cor}30`,
          }}
        >
          <TipoIcon className="h-2.5 w-2.5" />
          {tipoMeta.label}
        </span>
        {e.divisao && (
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--muted)]/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            {e.divisao}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="mt-auto flex justify-end gap-1 border-t border-[var(--border)]/40 pt-2">
        <button
          onClick={onEdit}
          aria-label="Editar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          aria-label="Excluir"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}
