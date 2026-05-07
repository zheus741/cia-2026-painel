'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  coordenacao: 'Coordenação',
  lider_area:  'Líder de área',
  operador:    'Operador',
}

const FUNCAO_LABEL: Record<string, string> = {
  foto:        '📷 Foto',
  video:       '🎬 Vídeo',
  social:      '📱 Social Media',
  reporter:    '🎤 Repórter',
  editor:      '✂️ Editor',
  drone:       '🚁 Drone',
  roaming:     '🏃 Roaming',
  coordenacao: '📋 Coordenação',
  producao:    '⚙️ Produção',
  design:      '🎨 Design',
}

interface Props {
  userId: string
  profile: {
    nome: string
    email: string
    role: string
    funcao_principal: string | null
    foto_url: string | null
    telefone: string | null
  }
}

function Iniciais({ nome }: { nome: string }) {
  const parts = nome.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}

export function ProfileClient({ userId, profile }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fotoUrl, setFotoUrl] = useState(profile.foto_url)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setErrMsg('Imagem muito grande. Máximo 5 MB.')
      setStatus('err')
      return
    }

    setUploading(true)
    setStatus('idle')
    setErrMsg('')

    try {
      const supabase = createClient()

      // Upload to Supabase Storage
      const ext   = file.name.split('.').pop() ?? 'jpg'
      const path  = `${userId}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) throw upErr

      // Get public URL (add cache-bust so the img refreshes)
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const urlWithBust = `${publicUrl}?t=${Date.now()}`

      // Update profile record
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ foto_url: urlWithBust })
        .eq('id', userId)

      if (dbErr) throw dbErr

      setFotoUrl(urlWithBust)
      setStatus('ok')
      setTimeout(() => { setStatus('idle'); router.refresh() }, 2000)
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Erro ao enviar foto.')
      setStatus('err')
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const iniciais = Iniciais({ nome: profile.nome })

  return (
    <div className="cia-fade-in mx-auto max-w-md space-y-6">

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          {/* Photo or initials */}
          <div
            className="relative h-28 w-28 rounded-full ring-2 ring-[var(--green-dim)] overflow-hidden"
            style={{ background: 'rgba(45,90,61,0.3)' }}
          >
            {fotoUrl ? (
              <Image
                src={fotoUrl}
                alt={profile.nome}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--green-bright)]"
                style={{ fontFamily: 'Orbitron, monospace' }}>
                {iniciais}
              </div>
            )}
          </div>

          {/* Upload button overlay */}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="Trocar foto"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--background)] transition-all hover:scale-110 disabled:opacity-50"
            style={{ background: 'var(--green)' }}
          >
            {uploading
              ? <Loader2 className="h-4 w-4 animate-spin text-white" />
              : <Camera className="h-4 w-4 text-white" />
            }
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />

        {/* Feedback */}
        {status === 'ok' && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--green-dim)] bg-[var(--green-dim)]/20 px-4 py-2 text-sm text-[var(--green-bright)]">
            <CheckCircle2 className="h-4 w-4" />
            Foto atualizada!
          </div>
        )}
        {status === 'err' && (
          <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-900/20 px-4 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {errMsg}
          </div>
        )}

        <p className="text-[10px] text-[var(--muted-foreground)]/60">
          JPG, PNG ou WebP · máx. 5 MB
        </p>
      </div>

      {/* Profile info */}
      <div
        className="cia-metric-card px-6 py-5 space-y-4"
        style={{ borderColor: 'rgba(74,138,92,0.2)' }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Nome</p>
          <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{profile.nome}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">E-mail</p>
          <p className="mt-1 text-sm text-[var(--foreground)]">{profile.email}</p>
        </div>

        {profile.telefone && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Telefone</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">{profile.telefone}</p>
          </div>
        )}

        <div className="flex gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Cargo</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {ROLE_LABEL[profile.role] ?? profile.role}
            </p>
          </div>
          {profile.funcao_principal && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Função</p>
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {FUNCAO_LABEL[profile.funcao_principal] ?? profile.funcao_principal}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-[var(--muted-foreground)]/50">
        Para alterar nome, cargo ou função fale com a coordenação.
      </p>
    </div>
  )
}
