import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ExternalLink, TrendingUp } from 'lucide-react'

const CANAL_META: Record<string, { label: string; emoji: string; cor: string }> = {
  instagram_stories: { label: 'IG Stories',  emoji: '📱', cor: 'border-pink-700/30 bg-pink-900/10 text-pink-300' },
  instagram_reels:   { label: 'IG Reels',    emoji: '🎬', cor: 'border-purple-700/30 bg-purple-900/10 text-purple-300' },
  instagram_feed:    { label: 'IG Feed',     emoji: '🖼️', cor: 'border-blue-700/30 bg-blue-900/10 text-blue-300' },
  tiktok:            { label: 'TikTok',      emoji: '🎵', cor: 'border-red-700/30 bg-red-900/10 text-red-300' },
  youtube:           { label: 'YouTube',     emoji: '▶️', cor: 'border-red-700/30 bg-red-900/10 text-red-300' },
  youtube_shorts:    { label: 'YT Shorts',   emoji: '⚡', cor: 'border-orange-700/30 bg-orange-900/10 text-orange-300' },
  twitter_x:         { label: 'Twitter/X',   emoji: '𝕏', cor: 'border-slate-700/30 bg-slate-900/10 text-slate-300' },
  facebook:          { label: 'Facebook',    emoji: '👥', cor: 'border-blue-700/30 bg-blue-900/10 text-blue-300' },
  whatsapp_status:   { label: 'WA Status',   emoji: '💬', cor: 'border-green-700/30 bg-green-900/10 text-[var(--green-bright)]' },
  outro:             { label: 'Outro',       emoji: '🔗', cor: 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]' },
}

const TIPO_LABEL: Record<string, string> = {
  story_rapido: 'Story rápido', story_editado: 'Story editado', reels: 'Reels',
  card_feed: 'Card feed', card_patrocinado: 'Card patrocinado', texto_legenda: 'Legenda',
  repost: 'Repost', cobertura_ao_vivo: 'Ao vivo',
}

export default async function RedesPage() {
  const supabase = await createClient()

  const { data: publicados } = await supabase
    .from('conteudos')
    .select(`
      id, titulo, tipo, canal_publicacao, link_publicado, publicado_em,
      dia:dias_evento(nome_dia),
      patrocinador:patrocinadores(nome)
    `)
    .eq('status', 'publicado')
    .order('publicado_em', { ascending: false })

  const rows = (publicados ?? []).map((c) => ({
    ...c,
    dia: c.dia as unknown as { nome_dia: string } | null,
    patrocinador: c.patrocinador as unknown as { nome: string } | null,
  }))

  // Agrupar por canal
  const porCanal = rows.reduce<Record<string, typeof rows>>((acc, c) => {
    const key = c.canal_publicacao ?? 'outro'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  // Ordenar canais por quantidade (maior primeiro)
  const canaisOrdenados = Object.entries(porCanal).sort((a, b) => b[1].length - a[1].length)

  const total = rows.length
  const comLink = rows.filter((r) => r.link_publicado).length

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Publicados</p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          Redes Sociais
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {total} conteúdo{total !== 1 ? 's' : ''} publicado{total !== 1 ? 's' : ''} · {comLink} com link registrado
        </p>
      </div>

      {/* ── Resumo por canal ─────────────────────────────────── */}
      {canaisOrdenados.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {canaisOrdenados.map(([canal, items]) => {
            const meta = CANAL_META[canal] ?? CANAL_META.outro
            return (
              <div
                key={canal}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${meta.cor}`}
              >
                <span className="text-2xl">{meta.emoji}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider">{meta.label}</p>
                  <p className="text-2xl font-bold tabular-nums">{items.length}</p>
                </div>
                <TrendingUp className="ml-auto h-4 w-4 opacity-40" />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Lista por canal ──────────────────────────────────── */}
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum conteúdo publicado ainda.</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]/60">
            Avance cards para "Publicado" em{' '}
            <Link href="/conteudos" className="underline hover:text-[var(--accent)]">/conteudos</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {canaisOrdenados.map(([canal, items]) => {
            const meta = CANAL_META[canal] ?? CANAL_META.outro
            return (
              <section key={canal}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">{meta.emoji}</span>
                  <h2 className="text-sm font-bold">{meta.label}</h2>
                  <span className="text-xs text-[var(--muted-foreground)]">({items.length})</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/60 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.titulo}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                          {c.tipo ? (TIPO_LABEL[c.tipo] ?? c.tipo) : '—'}
                          {c.dia ? ` · ${c.dia.nome_dia}` : ''}
                          {c.patrocinador ? ` · ${c.patrocinador.nome}` : ''}
                          {c.publicado_em ? ` · ${new Date(c.publicado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>
                      {c.link_publicado ? (
                        <a
                          href={c.link_publicado}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver post
                        </a>
                      ) : (
                        <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]/50">sem link</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
