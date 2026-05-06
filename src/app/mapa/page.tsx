import { createClient } from '@/lib/supabase/server'
import { MapPin, AlertCircle } from 'lucide-react'
import type { SetorPin } from './MapaClient'
import { MapaLoader } from './MapaLoader'

export default async function MapaPage() {
  const supabase = await createClient()

  const { data: setores } = await supabase
    .from('setores')
    .select('id, nome, tipo, lat, lng, cor_hex, endereco, capacidade_pessoas')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('nome')

  const semCoords = await supabase
    .from('setores')
    .select('id', { count: 'exact', head: true })
    .is('lat', null)

  const pins: SetorPin[] = (setores ?? []).map((s) => ({
    id: s.id,
    nome: s.nome,
    tipo: s.tipo,
    lat: s.lat as number,
    lng: s.lng as number,
    cor_hex: s.cor_hex,
    endereco: s.endereco,
    capacidade_pessoas: s.capacidade_pessoas,
  }))

  const tipoColors: Record<string, string> = {
    esportivo: '#4a8a5c',
    palco: '#c8973a',
    festa: '#ec4899',
    apoio: '#64748b',
    externo: '#3b82f6',
  }

  const tipoGroups = pins.reduce<Record<string, SetorPin[]>>((acc, s) => {
    if (!acc[s.tipo]) acc[s.tipo] = []
    acc[s.tipo].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">CIA 2026 · Uberaba/MG</p>
        <h1
          className="mt-1 text-2xl font-bold cia-gold-text"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Mapa do Evento
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Praças esportivas, palcos e áreas de apoio · 04–07 de junho
        </p>
      </div>

      {/* Aviso sem coordenadas */}
      {(semCoords.count ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--gold-dim)]/40 bg-[var(--gold-dim)]/10 px-4 py-3 text-sm text-[var(--gold)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {semCoords.count} setor(es) sem coordenadas — adicione lat/lng em{' '}
            <a href="/admin/setores" className="underline underline-offset-2 hover:text-[var(--gold-bright)]">
              /admin/setores
            </a>{' '}
            para aparecerem no mapa.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        {/* Mapa */}
        <div className="cia-glass rounded-xl overflow-hidden" style={{ minHeight: 520 }}>
          {pins.length > 0 ? (
            <MapaLoader setores={pins} height="520px" />
          ) : (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
              <MapPin className="h-10 w-10 text-[var(--muted-foreground)]/40" />
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhum setor com coordenadas cadastradas.
              </p>
              <p className="text-xs text-[var(--muted-foreground)]/60">
                Execute a migration 0003 ou edite os setores em /admin/setores.
              </p>
            </div>
          )}
        </div>

        {/* Legenda lateral */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            Legenda
          </p>
          {Object.entries(tipoGroups).map(([tipo, items]) => (
            <div key={tipo} className="rounded-lg border border-[var(--border)] bg-[var(--card)]/60 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_6px_currentColor]"
                  style={{ background: tipoColors[tipo] ?? '#4a8a5c', color: tipoColors[tipo] ?? '#4a8a5c' }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {tipo === 'esportivo' ? 'Praças Esportivas'
                    : tipo === 'palco' ? 'Palcos'
                    : tipo === 'festa' ? 'Festas'
                    : tipo === 'apoio' ? 'Apoio'
                    : 'Externos'}
                </span>
              </div>
              <ul className="space-y-1">
                {items.map((s) => (
                  <li key={s.id} className="flex items-start gap-2 text-xs text-[var(--foreground)]">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
                    <span>{s.nome}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="cia-gold-rule mt-4" />
          <p className="text-[10px] text-[var(--muted-foreground)]/60 leading-relaxed">
            Coordenadas aproximadas. Edite em /admin/setores para ajustar a posição exata no mapa.
          </p>
        </div>
      </div>
    </div>
  )
}
