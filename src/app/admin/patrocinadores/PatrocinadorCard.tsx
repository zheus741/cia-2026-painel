'use client'

import { Pencil, Trash2, Mail, Phone, Crown, PowerOff } from 'lucide-react'

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

const COTA_COLOR: Record<string, { bg: string; text: string; border: string; icon: typeof Crown }> = {
  Master: { bg: 'rgba(212,175,55,0.12)',  text: '#A67D14', border: 'rgba(212,175,55,0.35)', icon: Crown },
  Ouro:   { bg: 'rgba(212,175,55,0.10)',  text: '#A67D14', border: 'rgba(212,175,55,0.28)', icon: Crown },
  Prata:  { bg: 'rgba(148,163,184,0.12)', text: '#64748b', border: 'rgba(148,163,184,0.30)', icon: Crown },
  Apoio:  { bg: 'rgba(46,107,66,0.10)',   text: '#2e6b42', border: 'rgba(46,107,66,0.25)',  icon: Crown },
}

export function PatrocinadorCard({
  p, onEdit, onDelete,
}: {
  p: Patrocinador
  onEdit:   () => void
  onDelete: () => void
}) {
  const cotaCfg = p.cota ? COTA_COLOR[p.cota] : null
  const cor = p.cor_marca || 'var(--border)'

  return (
    <article className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-[var(--card)] p-4 transition-all ${
      !p.ativo ? 'opacity-60' : ''
    }`}
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Color stripe top — cor da marca */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: cor }}
      />

      {/* Header: logo + nome + cota */}
      <div className="flex items-start gap-3 pt-1">
        {/* Logo ou avatar fallback */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: 'var(--border)' }}
        >
          {p.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.logo_url}
              alt={p.nome}
              width={48}
              height={48}
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                // Fallback silencioso: esconde a imagem se a URL falhar
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: cor }}
            >
              {p.nome.slice(0, 2)}
            </span>
          )}
        </div>

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
                <cotaCfg.icon className="h-2.5 w-2.5" />
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
            // Se sobrou só lixo (sem dígitos), mostra como span sem link
            const Wrapper = tel.length >= 8 ? 'a' : 'span'
            const wrapperProps = tel.length >= 8
              ? { href: `tel:${tel}` }
              : {}
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
