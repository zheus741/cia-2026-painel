export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden cia-bg">
      {/* Hero */}
      <div className="shrink-0 px-8 py-8 space-y-3">
        <div className="h-3 w-32 rounded bg-[var(--muted)]/40 animate-pulse" />
        <div className="h-10 w-96 rounded bg-[var(--muted)]/60 animate-pulse" />
        <div className="h-4 w-64 rounded bg-[var(--muted)]/30 animate-pulse" />
      </div>

      {/* Pipeline metrics row */}
      <div className="px-8 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border)] p-6 space-y-4"
              style={{ background: 'var(--card)', animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-[var(--muted)]/40 animate-pulse" />
                <div className="h-5 w-12 rounded-full bg-[var(--muted)]/30 animate-pulse" />
              </div>
              <div className="h-10 w-20 rounded bg-[var(--muted)]/60 animate-pulse" />
              <div className="h-2 w-full rounded-full bg-[var(--muted)]/30 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-[var(--muted)]/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Cards row */}
      <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border)] p-6 space-y-3"
            style={{ background: 'var(--card)' }}
          >
            <div className="h-4 w-32 rounded bg-[var(--muted)]/50 animate-pulse" />
            <div className="h-3 w-full rounded bg-[var(--muted)]/30 animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-[var(--muted)]/30 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-[var(--muted)]/30 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
