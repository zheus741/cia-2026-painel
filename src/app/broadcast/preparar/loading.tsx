export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: '#070D0A' }}>
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-6 py-4 space-y-2">
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
        <div className="h-7 w-56 rounded bg-white/15 animate-pulse" />
      </div>

      {/* Seletor de dia */}
      <div className="shrink-0 flex gap-2 border-b border-white/10 px-6 py-3">
        {['Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="h-8 w-16 rounded-lg bg-white/10 animate-pulse" />
        ))}
      </div>

      {/* Layout grade + painel de blocos */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Coluna de blocos arrastáveis */}
        <div className="w-56 shrink-0 space-y-2">
          <div className="h-3 w-24 rounded bg-white/10 animate-pulse mb-3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg border border-white/10 bg-white/5 animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>

        {/* Grade de programação */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
            <div className="h-7 w-24 rounded-lg bg-white/10 animate-pulse" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-white/10 p-3"
              style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 50}ms` }}
            >
              <div className="h-4 w-12 rounded bg-white/15 animate-pulse shrink-0" />
              <div className="h-4 w-6 rounded bg-white/10 animate-pulse shrink-0" />
              <div className="h-3 flex-1 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-16 rounded bg-white/10 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
