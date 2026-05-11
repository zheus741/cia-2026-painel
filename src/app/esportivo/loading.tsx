export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden cia-bg">
      {/* Hero metrics */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-6">
        <div className="space-y-2 mb-4">
          <div className="h-3 w-20 rounded bg-[var(--muted)]/40 animate-pulse" />
          <div className="h-8 w-72 rounded bg-[var(--muted)]/60 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--card)' }}
            >
              <div className="h-3 w-16 rounded bg-[var(--muted)]/40 animate-pulse mb-2" />
              <div className="h-7 w-12 rounded bg-[var(--muted)]/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="shrink-0 flex gap-2 border-b border-[var(--border)] px-6 py-2">
        {['1ª Divisão', '2ª Divisão', 'Super 08'].map(s => (
          <div key={s} className="h-8 w-28 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
        ))}
      </div>

      {/* Ranking table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          className="rounded-xl border border-[var(--border)] overflow-hidden"
          style={{ background: 'var(--card)' }}
        >
          {/* table header */}
          <div className="grid grid-cols-[40px_1fr_60px_60px_60px_60px_60px] gap-3 border-b border-[var(--border)] px-4 py-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-3 rounded bg-[var(--muted)]/40 animate-pulse" />
            ))}
          </div>
          {/* rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[40px_1fr_60px_60px_60px_60px_60px] gap-3 border-b border-[var(--border)]/30 px-4 py-3 items-center"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="h-5 w-5 rounded bg-[var(--muted)]/50 animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-[var(--muted)]/40 animate-pulse" />
                <div className="h-3 w-32 rounded bg-[var(--muted)]/50 animate-pulse" />
              </div>
              {Array.from({ length: 5 }).map((_, k) => (
                <div key={k} className="h-3 rounded bg-[var(--muted)]/30 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
