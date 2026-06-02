export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: '#070D0A' }}>
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
          <div className="h-7 w-44 rounded bg-white/15 animate-pulse" />
        </div>
        <div className="h-8 w-24 rounded-lg bg-white/10 animate-pulse" />
      </div>

      {/* Termômetro central */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        {/* Métricas topo */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-xl border border-white/10 p-4 space-y-2 text-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="h-3 w-16 rounded bg-white/10 animate-pulse mx-auto" />
              <div className="h-8 w-12 rounded bg-white/15 animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Barra de progresso */}
        <div className="w-full max-w-lg space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-12 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="h-4 w-full rounded-full bg-white/10 animate-pulse" />
        </div>

        {/* Lista de itens */}
        <div className="w-full max-w-lg space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 50}ms` }}
            >
              <div className="h-4 w-4 rounded bg-white/15 animate-pulse shrink-0" />
              <div className="h-3 flex-1 rounded bg-white/10 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-white/10 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
