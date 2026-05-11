export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-4 flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--muted)]/40 animate-pulse" />
          <div className="h-7 w-48 rounded bg-[var(--muted)]/60 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-[var(--muted)]/50 animate-pulse" />
      </div>

      {/* Board 5 colunas */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex h-full gap-4">
          {['Ideia', 'Aprovada', 'Em execução', 'Entregue', 'Descartada'].map((label, i) => (
            <div key={label} className="w-64 shrink-0 space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="h-2 w-2 rounded-full bg-[var(--muted)]/60 animate-pulse" />
                <div className="h-4 w-20 rounded bg-[var(--muted)]/50 animate-pulse" />
              </div>
              {Array.from({ length: 2 + (i % 3) }).map((_, j) => (
                <div
                  key={j}
                  className="rounded-xl border border-[var(--border)] p-3 space-y-2"
                  style={{ background: 'var(--card)', animationDelay: `${j * 60}ms` }}
                >
                  <div className="h-3 w-3/4 rounded bg-[var(--muted)]/50 animate-pulse" />
                  <div className="h-3 w-full rounded bg-[var(--muted)]/30 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-[var(--muted)]/30 animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
