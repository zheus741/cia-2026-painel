'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Mail, Phone, Crown, PowerOff, Upload, Loader2 } from 'lucide-react'
import { uploadLogoPatrocinador } from './actions'

interface Patrocinador {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  cor_marca: string | null
  cota: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  ativo: boolean
}

const COTA_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  Master: { bg: 'rgba(212,175,55,0.12)',  text: '#A67D14', border: 'rgba(212,175,55,0.35)' },
  Ouro:   { bg: 'rgba(212,175,55,0.10)',  text: '#A67D14', border: 'rgba(212,175,55,0.28)' },
  Prata:  { bg: 'rgba(148,163,184,0.12)', text: '#64748b', border: 'rgba(148,163,184,0.30)' },
  Apoio:  { bg: 'rgba(46,107,66,0.10)',   text: '#2e6b42', border: 'rgba(46,107,66,0.25)'  },
}

export function PatrocinadorCard({
  p, onEdit, onDelete,
}: {
  p: Patrocinador
  onEdit:   () => void
  onDelete: () => void
}) {
  const router      = useRouter()
  const fileRef     = useRef<HTMLInputElement>(null)
  const [pending, startUpload] = useTransition()
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const cotaCfg = p.cota ? COTA_COLOR[p.cota] : null
  const cor     = p.cor_marca || 'var(--border)'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    setUploadErr(null)
    startUpload(async () => {
      const res = await uploadLogoPatrocinador(p.id, fd)
      if (!res.ok) setUploadErr(res.error ?? 'Erro ao fazer upload.')
      else router.refresh()
    })
    // Reset para poder re-selecionar o mesmo arquivo
    e.target.value = ''
  }

  return (
    <article
      className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-[var(--card)] p-4 transition-all ${
        !p.ativo ? 'opacity-60' : ''
      }`}
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Color stripe top */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: cor }} />

      {/* Header: logo + nome + cota */}
      <div className="flex items-start gap-3 pt-1">

        {/* ── Logo — clicável para upload ─────────────────────────────── */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          title="Clique para trocar a logo"
          aria-label="Trocar logo"
          className="group relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border)' }}
        >
          {pending ? (
            /* Loading */
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          ) : p.logo_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.logo_url}
                alt={p.nome}
                className="h-full w-full object-contain p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              {/* Overlay hover */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Upload className="h-4 w-4 text-white" />
              </span>
            </>
          ) : (
            <>
              {/* Iniciais */}
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: cor }}>
                {p.nome.slice(0, 2)}
              </span>
              {/* Overlay hover */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Upload className="h-4 w-4 text-white" />
              </span>
            </>
          )}
        </button>

        {/* Input de arquivo — oculto */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Nome + cota */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-[var(--foreground)] leading-tight">
            {p.nome}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {cotaCfg && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: cotaCfg.bg, color: cotaCfg.text, border: `1px solid ${cotaCfg.border}` }}
              >
                <Crown className="h-2.5 w-2.5" />
                {p.cota}
              </span>
            )}
            {!p.ativo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                <PowerOff className="h-2.5 w-2.5" />
                Inativo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Erro de upload */}
      {uploadErr && (
        <p className="rounded-lg bg-[var(--destructive)]/10 px-2.5 py-1.5 text-[11px] text-[var(--destructive)]">
          {uploadErr}
        </p>
      )}

      {/* Contato */}
      {(p.contato_nome || p.contato_email || p.contato_telefone) && (
        <div className="space-y-1 text-[11px] text-[var(--muted-foreground)]">
          {p.contato_nome && (
            <p className="font-medium text-[var(--foreground)]/80">{p.contato_nome}</p>
          )}
          {p.contato_email && (
            <a
              href={`mailto:${p.contato_email}`}
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--green-bright)]"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.contato_email}</span>
            </a>
          )}
          {p.contato_telefone && (() => {
            const tel = p.contato_telefone.replace(/\D/g, '')
            const Wrapper = tel.length >= 8 ? 'a' : 'span'
            const wrapperProps = tel.length >= 8 ? { href: `tel:${tel}` } : {}
            return (
              <Wrapper
                {...wrapperProps}
                className="flex items-center gap-1.5 transition-colors hover:text-[var(--green-bright)]"
              >
                <Phone className="h-3 w-3 shrink-0" />
                <span>{p.contato_telefone}</span>
              </Wrapper>
            )
          })()}
        </div>
      )}

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
