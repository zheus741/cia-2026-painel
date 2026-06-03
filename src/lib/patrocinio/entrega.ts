// ─────────────────────────────────────────────────────────────────────────────
// Fonte ÚNICA da métrica de entrega de patrocínio.
//
// "% entregue" = unidades entregues ÷ unidades contratadas (meta), medido pela
// tabela `escopo_itens` (status='entregue' × quantidade_prevista). Esta é a
// semântica correta — entrega contra a meta contratada — e o que o Dossiê já
// usava. Home, TV e Fichário consomem este mesmo cálculo para nunca divergir.
// ─────────────────────────────────────────────────────────────────────────────

export interface EscopoItemLite {
  patrocinador_id: string
  quantidade_prevista: number | null
  status: string | null
}

export interface EntregaStats {
  total: number      // unidades contratadas (Σ quantidade_prevista)
  entregues: number  // unidades entregues (Σ quantidade_prevista onde status='entregue')
  pct: number        // 0–100
}

export function computeEntrega(itens: EscopoItemLite[]): EntregaStats {
  let total = 0, entregues = 0
  for (const e of itens) {
    const q = e.quantidade_prevista ?? 1
    total += q
    if (e.status === 'entregue') entregues += q
  }
  return { total, entregues, pct: total > 0 ? Math.round((entregues / total) * 100) : 0 }
}

/** Mapa patrocinador_id → EntregaStats. */
export function entregaPorPatrocinador(itens: EscopoItemLite[]): Map<string, EntregaStats> {
  const byId = new Map<string, EscopoItemLite[]>()
  for (const e of itens) {
    const arr = byId.get(e.patrocinador_id)
    if (arr) arr.push(e); else byId.set(e.patrocinador_id, [e])
  }
  const out = new Map<string, EntregaStats>()
  for (const [id, list] of byId) out.set(id, computeEntrega(list))
  return out
}
