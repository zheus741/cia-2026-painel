export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden cia-bg">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-5 space-y-2">
        <div className="h-3 w-16 rounded bg-[var(--muted)]/40 animate-pulse" />
        <div className="h-7 w-40 rounded bg-[var(--muted)]/60 animate-pulse" />
        <div className="h-3 w-72 rounded bg-[var(--muted)]/30 animate-pulse" />
      </div>

      {/* Timeline de turnos */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {[1, 2, 3, 4].map(dia => (
          <div key={dia} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-[var(--muted)]/60 animate-pulse" />
              <div className="h-4 w-32 rounded bg-[var(--muted)]/50 animate-pulse" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="ml-7 rounded-xl border border-[var(--border)] p-4 space-y-2"
                style={{ background: 'var(--card)', animationDelay: `${(dia * 2 + i) * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 rounded bg-[var(--muted)]/50 animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-[var(--muted)]/30 animate-pulse" />
                </div>
                <div className="h-3 w-2/3 rounded bg-[var(--muted)]/30 animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
