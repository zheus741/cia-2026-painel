import { PageHeader } from '@/components/page-header'
import { BATERIAS } from '@/lib/eventos/baterias-cheer'
import { Drum, Coffee } from 'lucide-react'

export const metadata = { title: 'Desafio de Baterias · CIA 2026' }

export default function BateriasPage() {
  const totalBaterias = BATERIAS.reduce((s, d) => s + d.itens.filter(i => !i.intervalo).length, 0)

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-10">
      <PageHeader
        eyebrow="Esportivo · Cultural"
        title="🥁 Desafio de Baterias"
        subtitle={`${totalBaterias} baterias · 3 divisões · 04–06 de junho`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {BATERIAS.map(div => {
          const primeira = div.itens.find(i => !i.intervalo)?.hora
          const ultima = [...div.itens].reverse().find(i => !i.intervalo)?.hora
          const n = div.itens.filter(i => !i.intervalo).length
          return (
            <section
              key={div.divisao}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            >
              {/* Header da divisão */}
              <div className="border-b border-[var(--border)] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Drum className="h-4 w-4 text-[var(--gold)]" />
                  <h2 className="text-base font-extrabold tracking-tight text-[var(--foreground)]">
                    {div.divisao}
                  </h2>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="font-semibold text-[var(--green-bright)]">{div.diaLabel}</span>
                  <span className="text-[var(--border)]">·</span>
                  <span className="tabular-nums">{primeira}–{ultima}</span>
                  <span className="text-[var(--border)]">·</span>
                  <span>{n} baterias</span>
                </div>
              </div>

              {/* Linha do tempo */}
              <ol className="divide-y divide-dashed divide-[var(--border)]">
                {div.itens.map((item, i) =>
                  item.intervalo ? (
                    <li key={i} className="flex items-center gap-3 bg-[var(--muted)]/20 px-5 py-2">
                      <Coffee className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Intervalo
                      </span>
                      <span className="ml-auto font-mono text-xs text-[var(--muted-foreground)]">{item.hora}</span>
                    </li>
                  ) : (
                    <li key={i} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--muted)]/20">
                      <span className="w-12 shrink-0 font-mono text-[13px] font-bold tabular-nums text-[var(--gold)]">
                        {item.hora}
                      </span>
                      <span className="text-sm font-semibold text-[var(--foreground)]">{item.nome}</span>
                    </li>
                  ),
                )}
              </ol>
            </section>
          )
        })}
      </div>

      <p className="text-center text-xs text-[var(--muted-foreground)]/60">
        Cronograma oficial · sujeito a ajustes pela produção.
      </p>
    </div>
  )
}
