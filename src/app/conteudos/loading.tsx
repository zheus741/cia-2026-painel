/**
 * Skeleton do Kanban — aparece em 0ms enquanto o SSR busca os dados.
 * Sem isso o usuário ficava 1-2s vendo a página anterior congelada.
 */
export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sub-header skeleton */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-4 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--muted)]/50 animate-pulse" />
          <div className="h-7 w-64 rounded bg-[var(--muted)]/60 animate-pulse" />
          <div className="h-3 w-80 rounded bg-[var(--muted)]/40 animate-pulse" />
        </div>
        <div className="h-7 w-24 rounded-full bg-[var(--muted)]/40 animate-pulse" />
      </div>

      {/* Filter bar skeleton */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-3 flex items-center gap-3">
        <div className="h-8 w-60 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
        <div className="h-8 w-32 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
        <div className="h-8 w-32 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
        <div className="h-8 w-32 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
      </div>

      {/* 4 colunas do board */}
      <div className="min-h-0 flex-1 overflow-x-auto p-4">
        <div className="flex h-full gap-4 min-w-fit">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-72 shrink-0 space-y-3">
              {/* Header coluna */}
              <div className="flex items-center gap-2 px-1">
                <div className="h-2 w-2 rounded-full bg-[var(--muted)]/60 animate-pulse" />
                <div className="h-4 w-24 rounded bg-[var(--muted)]/50 animate-pulse" />
                <div className="ml-auto h-4 w-6 rounded bg-[var(--muted)]/40 animate-pulse" />
              </div>
              {/* Cards skeleton */}
              {Array.from({ length: 3 + (i % 2) }).map((_, j) => (
                <div
                  key={j}
                  className="rounded-xl border border-[var(--border)] p-3 space-y-2"
                  style={{
                    background:        'var(--card)',
                    animationDelay:    `${j * 80}ms`,
                  }}
                >
                  <div className="h-3 w-3/4 rounded bg-[var(--muted)]/50 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-[var(--muted)]/40 animate-pulse" />
                  <div className="flex gap-1 pt-1">
                    <div className="h-4 w-12 rounded-full bg-[var(--muted)]/30 animate-pulse" />
                    <div className="h-4 w-16 rounded-full bg-[var(--muted)]/30 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
