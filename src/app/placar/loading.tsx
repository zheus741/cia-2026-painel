export default function PlacarLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden cia-bg">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-6">
        <div className="space-y-2 mb-4">
          <div className="h-3 w-24 rounded bg-[var(--muted)]/40 animate-pulse" />
          <div className="h-8 w-44 rounded bg-[var(--muted)]/60 animate-pulse" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Quinta', 'Sexta', 'Sábado', 'Domingo'].map(d => (
            <div key={d} className="h-9 w-24 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Timeline cards */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--border)] p-3 flex items-center gap-3"
              style={{ background: 'var(--card)' }}
            >
              <div className="h-4 w-12 rounded bg-[var(--muted)]/40 animate-pulse" />
              <div className="hidden md:block h-3 w-40 rounded bg-[var(--muted)]/40 animate-pulse" />
              <div className="flex-1 flex justify-center gap-3">
                <div className="h-4 w-24 rounded bg-[var(--muted)]/60 animate-pulse" />
                <div className="h-4 w-10 rounded bg-[var(--muted)]/40 animate-pulse" />
                <div className="h-4 w-24 rounded bg-[var(--muted)]/60 animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-[var(--muted)]/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
