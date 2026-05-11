export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden cia-bg">
      {/* Header */}
      <div className="shrink-0 px-8 py-6 space-y-2">
        <div className="h-3 w-20 rounded bg-[var(--muted)]/40 animate-pulse" />
        <div className="h-8 w-56 rounded bg-[var(--muted)]/60 animate-pulse" />
        <div className="h-3 w-72 rounded bg-[var(--muted)]/30 animate-pulse" />
      </div>

      {/* Grid de atléticas */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl border border-[var(--border)] p-4 flex flex-col items-center justify-center gap-2"
              style={{ background: 'var(--card)', animationDelay: `${i * 25}ms` }}
            >
              <div className="h-16 w-16 rounded-full bg-[var(--muted)]/50 animate-pulse" />
              <div className="h-3 w-20 rounded bg-[var(--muted)]/40 animate-pulse" />
              <div className="h-2 w-14 rounded bg-[var(--muted)]/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
