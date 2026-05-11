export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-[var(--muted)]/40 animate-pulse" />
          <div className="h-7 w-40 rounded bg-[var(--muted)]/60 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-[var(--muted)]/40 animate-pulse" />
        </div>
      </div>

      {/* Mapa placeholder */}
      <div className="relative flex-1 overflow-hidden bg-[var(--muted)]/10">
        <div
          className="absolute inset-0 cia-dot-grid opacity-30 animate-pulse"
        />
        {/* loading marker */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-[var(--green-dim)] border-t-transparent animate-spin" />
            <div className="h-3 w-32 rounded bg-[var(--muted)]/50 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
