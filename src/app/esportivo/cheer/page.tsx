import { PageHeader } from '@/components/page-header'
import { CHEER, CHEER_DATA_LABEL, CHEER_INFO } from '@/lib/eventos/baterias-cheer'
import { Megaphone, Info, Flag } from 'lucide-react'

export const metadata = { title: 'Torneio de Cheerleading · CIA 2026' }

// Cor por categoria
const CAT_COR: Record<string, string> = {
  'Performance Cheer': '#E8B82F',
  'Coed 1':            '#4aa06a',
  'Coed 2 NT':         '#5C68E8',
  'Coed 2.1':          '#B8A4E8',
  'Coed 3 NT':         '#D8845F',
}

export default function CheerPage() {
  const apresentacoes = CHEER.filter(c => c.ordem).length

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-10">
      <PageHeader
        eyebrow="Esportivo · Cultural"
        title="📣 Torneio de Cheerleading"
        subtitle={`${apresentacoes} apresentações · ${CHEER_DATA_LABEL} · Bloco 1`}
      />

      {/* Info do dia */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--gold)]">
          <Info className="h-3.5 w-3.5" /> Informações do dia
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
          {CHEER_INFO.map((info, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[var(--green-bright)]" />
              {info}
            </span>
          ))}
        </div>
      </div>

      {/* Linha do tempo */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
          <Megaphone className="h-4 w-4 text-[var(--gold)]" />
          <h2 className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">Ordem de apresentação</h2>
        </div>

        <ol className="divide-y divide-dashed divide-[var(--border)]">
          {CHEER.map((c, i) =>
            c.marco ? (
              <li key={i} className="flex items-center gap-3 bg-[var(--muted)]/20 px-5 py-2">
                <Flag className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {c.marco}
                </span>
                <span className="ml-auto font-mono text-xs text-[var(--muted-foreground)]">{c.hora}</span>
              </li>
            ) : (
              <li key={i} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--muted)]/20">
                <span className="w-6 shrink-0 text-center text-[11px] font-bold tabular-nums text-[var(--muted-foreground)]/60">
                  {c.ordem}
                </span>
                <span className="w-12 shrink-0 font-mono text-[13px] font-bold tabular-nums text-[var(--gold)]">
                  {c.hora}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--foreground)]">{c.equipe}</div>
                  <div className="truncate text-xs text-[var(--muted-foreground)]">{c.atletica}</div>
                </div>
                {c.categoria && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{
                      color: CAT_COR[c.categoria] ?? 'var(--muted-foreground)',
                      background: `${CAT_COR[c.categoria] ?? '#888'}1a`,
                    }}
                  >
                    {c.categoria}
                  </span>
                )}
              </li>
            ),
          )}
        </ol>
      </section>

      <p className="text-center text-xs text-[var(--muted-foreground)]/60">
        Cronograma provisório · cada apresentação ~8 min (aquecimento → palco). Sujeito a ajustes.
      </p>
    </div>
  )
}
