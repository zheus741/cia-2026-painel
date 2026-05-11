export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden cia-bg">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-6">
        <div className="h-6 w-32 rounded bg-[var(--muted)]/50 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
          <div className="h-8 w-16 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Hero */}
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-[var(--muted)]/50 animate-pulse" />
          <div className="space-y-3 flex-1">
            <div className="h-3 w-24 rounded bg-[var(--muted)]/40 animate-pulse" />
            <div className="h-8 w-72 rounded bg-[var(--muted)]/60 animate-pulse" />
            <div className="h-4 w-48 rounded bg-[var(--muted)]/40 animate-pulse" />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border)] p-5 space-y-3"
              style={{ background: 'var(--card)' }}
            >
              <div className="h-3 w-16 rounded bg-[var(--muted)]/40 animate-pulse" />
              <div className="h-9 w-20 rounded bg-[var(--muted)]/60 animate-pulse" />
              <div className="h-3 w-24 rounded bg-[var(--muted)]/30 animate-pulse" />
            </div>
          ))}
        </div>

        {/* 2-col content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {[1, 2].map(col => (
            <div key={col} className="space-y-3">
              <div className="h-5 w-40 rounded bg-[var(--muted)]/50 animate-pulse" />
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--border)] p-4"
                  style={{ background: 'var(--card)' }}
                >
                  <div className="h-3 w-2/3 rounded bg-[var(--muted)]/50 animate-pulse mb-2" />
                  <div className="h-3 w-1/2 rounded bg-[var(--muted)]/30 animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
