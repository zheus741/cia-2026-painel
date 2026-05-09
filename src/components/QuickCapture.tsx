'use client'

import {
  useState, useRef, useEffect, useCallback,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { createConteudoCaptura } from '@/app/actions/captura'
import {
  Camera, Video, ImageIcon, X, Send, Loader2,
  CheckCircle2, AlertCircle, ChevronDown,
} from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { value: 'story_rapido',    label: '⚡ Story rápido' },
  { value: 'reels',           label: '🎬 Reels' },
  { value: 'card_feed',       label: '📷 Card feed' },
  { value: 'cobertura_ao_vivo', label: '🔴 Ao vivo' },
  { value: 'repost',          label: '🔁 Repost' },
  { value: 'story_editado',   label: '✨ Story editado' },
] as const

const BUCKET = 'capturas'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function smartTitle(tipo: string): string {
  const hora = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
  const labels: Record<string, string> = {
    story_rapido:     'Story',
    reels:            'Reels',
    card_feed:        'Card',
    cobertura_ao_vivo:'Live',
    repost:           'Repost',
    story_editado:    'Story',
  }
  return `${labels[tipo] ?? 'Captura'} ${hora}`
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = 'idle' | 'choose' | 'preview' | 'uploading' | 'done' | 'error'

export function QuickCapture() {
  const [step, setStep]           = useState<Step>('idle')
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [tipo, setTipo]           = useState<string>('story_rapido')
  const [titulo, setTitulo]       = useState('')
  const [progress, setProgress]   = useState(0)
  const [errorMsg, setErrorMsg]   = useState('')
  const [userId, setUserId]       = useState<string | null>(null)

  const photoInputRef  = useRef<HTMLInputElement>(null)
  const videoInputRef  = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const supabase       = createClient()

  // Pega user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Listener pra atalhos externos (ex: card "Captura nova" na home)
  useEffect(() => {
    const open = () => setStep('choose')
    window.addEventListener('cia:open-capture', open)
    return () => window.removeEventListener('cia:open-capture', open)
  }, [])

  // Gera preview quando arquivo muda
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    setTitulo(smartTitle(tipo))
    return () => URL.revokeObjectURL(url)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])  // `tipo` omitido intencionalmente — só aplica título default na seleção do arquivo

  // Atualiza título quando tipo muda
  useEffect(() => {
    if (file) setTitulo(smartTitle(tipo))
  }, [tipo, file])

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
    setFile(f)
    setStep('preview')
  }

  function handleClose() {
    setStep('idle')
    setFile(null)
    setPreview(null)
    setTipo('story_rapido')
    setTitulo('')
    setProgress(0)
    setErrorMsg('')
  }

  const handleSubmit = useCallback(async () => {
    if (!file || !userId) return
    setStep('uploading')
    setProgress(10)

    try {
      const ext  = file.name.split('.').pop() ?? 'bin'
      const path = `${userId}/${Date.now()}.${ext}`
      const midiaTipo: 'foto' | 'video' = file.type.startsWith('video') ? 'video' : 'foto'

      // Upload direto do cliente para o Storage
      setProgress(30)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, cacheControl: '31536000' })

      if (uploadError) throw new Error(uploadError.message)
      setProgress(70)

      // Pega URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(uploadData.path)

      setProgress(85)

      // Cria conteudo via server action
      const result = await createConteudoCaptura({
        midiaDraftUrl:  publicUrl,
        midiaDraftTipo: midiaTipo,
        tipo,
        titulo: titulo.trim() || smartTitle(tipo),
      })
      if (!result.ok) throw new Error(result.error ?? 'Erro desconhecido')

      setProgress(100)
      setStep('done')
      setTimeout(handleClose, 2200)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setStep('error')
    }
  }, [file, userId, tipo, titulo])

  const isOpen = step !== 'idle'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── FAB ── */}
      <button
        onClick={() => setStep('choose')}
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-95"
        style={{
          background:    'linear-gradient(135deg, #2e6b42 0%, #1a4a2e 100%)',
          boxShadow:     '0 4px 20px rgba(46,107,66,0.45)',
          display:       step === 'idle' ? 'flex' : 'none',
        }}
        aria-label="Captura rápida"
        title="Captura rápida"
      >
        <Camera className="h-6 w-6 text-white" />
      </button>

      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{
          opacity:       isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-hidden
      />

      {/* ── Bottom Sheet ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl transition-transform duration-300 ease-out"
        style={{
          background:    'var(--color-surface, #0e1a10)',
          border:        '1px solid rgba(46,107,66,0.20)',
          borderBottom:  'none',
          maxHeight:     '92dvh',
          transform:     isOpen ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[rgba(255,255,255,0.15)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6ab87e' }}>
              Captura rápida
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {step === 'choose'   && 'Escolha a fonte de mídia'}
              {step === 'preview'  && `${file?.name} · ${formatBytes(file?.size ?? 0)}`}
              {step === 'uploading'&& 'Enviando para o kanban…'}
              {step === 'done'     && 'Enviado!'}
              {step === 'error'    && 'Algo deu errado'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 pt-1">

          {/* ── Step: choose ── */}
          {step === 'choose' && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Camera,    label: 'Foto',    ref: photoInputRef,   accept: 'image/*',  capture: 'environment' as const },
                { icon: Video,     label: 'Vídeo',   ref: videoInputRef,   accept: 'video/*',  capture: 'environment' as const },
                { icon: ImageIcon, label: 'Galeria', ref: galleryInputRef, accept: 'image/*,video/*', capture: undefined },
              ].map(({ icon: Icon, label, ref, accept, capture }) => (
                <button
                  key={label}
                  onClick={() => ref.current?.click()}
                  className="flex flex-col items-center gap-2.5 rounded-2xl py-6 transition-all active:scale-95"
                  style={{ background: 'rgba(46,107,66,0.12)', border: '1px solid rgba(46,107,66,0.20)' }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(46,107,66,0.20)' }}
                  >
                    <Icon className="h-6 w-6" style={{ color: '#6ab87e' }} />
                  </div>
                  <span className="text-xs font-semibold text-white/80">{label}</span>
                </button>
              ))}

              {/* Hidden file inputs */}
              <input ref={photoInputRef}   type="file" accept="image/*"          capture="environment" className="sr-only" onChange={handleFileSelected} />
              <input ref={videoInputRef}   type="file" accept="video/*"          capture="environment" className="sr-only" onChange={handleFileSelected} />
              <input ref={galleryInputRef} type="file" accept="image/*,video/*"  className="sr-only"                      onChange={handleFileSelected} />
            </div>
          )}

          {/* ── Step: preview + form ── */}
          {step === 'preview' && file && preview && (
            <div className="flex flex-col gap-4 pt-1">
              {/* Preview */}
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.3)', maxHeight: 260 }}
              >
                {file.type.startsWith('video') ? (
                  <video
                    src={preview}
                    controls
                    playsInline
                    className="max-h-64 w-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-64 w-full object-contain"
                  />
                )}
                <button
                  onClick={() => { setFile(null); setStep('choose') }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>

              {/* Tipo */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Tipo de conteúdo
                </label>
                <div className="relative">
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full appearance-none rounded-xl px-3 py-2.5 pr-8 text-sm font-medium text-white outline-none"
                    style={{
                      background:  'rgba(46,107,66,0.12)',
                      border:      '1px solid rgba(46,107,66,0.25)',
                    }}
                  >
                    {TIPO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} style={{ background: '#0e1a10' }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Título <span className="normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={120}
                  placeholder="Ex: Story porta principal CEMEA 14h"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25"
                  style={{
                    background: 'rgba(46,107,66,0.10)',
                    border:     '1px solid rgba(46,107,66,0.20)',
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #2e6b42 0%, #1a4a2e 100%)',
                  boxShadow:  '0 4px 16px rgba(46,107,66,0.35)',
                }}
              >
                <Send className="h-4 w-4" />
                Enviar para o kanban
              </button>
            </div>
          )}

          {/* ── Step: uploading ── */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#6ab87e' }} />
              <div className="w-full">
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ background: 'rgba(46,107,66,0.15)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width:      `${progress}%`,
                      background: 'linear-gradient(90deg, #2e6b42, #6ab87e)',
                    }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-white/40">{progress}%</p>
              </div>
            </div>
          )}

          {/* ── Step: done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <CheckCircle2 className="h-14 w-14" style={{ color: '#6ab87e' }} />
              <p className="text-base font-bold text-white">Rascunho criado!</p>
              <p className="text-center text-xs text-white/50">
                Aparece no kanban como{' '}
                <span className="font-semibold text-white/70">Rascunho</span>.
                O editor pode pegar de lá.
              </p>
            </div>
          )}

          {/* ── Step: error ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <div className="text-center">
                <p className="font-semibold text-white">Erro no envio</p>
                <p className="mt-1 text-xs text-white/50">{errorMsg}</p>
              </div>
              <button
                onClick={() => setStep('preview')}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                Tentar novamente
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
