export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-4 space-y-2">
        <div className="h-3 w-16 rounded bg-[var(--muted)]/40 animate-pulse" />
        <div className="h-7 w-56 rounded bg-[var(--muted)]/60 animate-pulse" />
        <div className="h-3 w-72 rounded bg-[var(--muted)]/30 animate-pulse" />
      </div>

      {/* Tabs por dia */}
      <div className="shrink-0 flex gap-2 border-b border-[var(--border)] px-6 py-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-7 w-20 rounded-full bg-[var(--muted)]/40 animate-pulse" />
        ))}
      </div>

      {/* Grid de slots */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4 space-y-3"
              style={{
                background:     'var(--card)',
                animationDelay: `${i * 40}ms`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-[var(--muted)]/50 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-[var(--muted)]/30 animate-pulse" />
              </div>
              <div className="h-6 w-32 rounded bg-[var(--muted)]/60 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-[var(--muted)]/40 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-[var(--muted)]/30 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
