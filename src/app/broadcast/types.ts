export interface BroadcastEstado {
  id: string
  mosca_on: boolean
  ao_vivo: boolean
  gc_on: boolean
  gc_tipo: string | null
  gc_titulo: string | null
  gc_subtitulo: string | null
  gc_detalhe: string | null
  np_on: boolean
  np_musica: string | null
  np_artista: string | null
  patroc_on: boolean
  patroc_id: string | null
  patroc_modo: string | null
  placa_on: boolean
  placa_tipo: string | null
  placa_payload: PlacaPayload | null
  crawl_on: boolean
  crawl_texto: string | null
  updated_at?: string
}

export interface PlacaPayload {
  titulo?: string
  linha1?: string
  linha2?: string
  rodape?: string
}

export interface PatrocinadorRef {
  id: string
  nome: string
  logo_url: string | null
  cota: string | null
  cor_marca: string | null
}

export const ESTADO_INICIAL: BroadcastEstado = {
  id: 'palco-principal',
  mosca_on: true, ao_vivo: false,
  gc_on: false, gc_tipo: null, gc_titulo: null, gc_subtitulo: null, gc_detalhe: null,
  np_on: false, np_musica: null, np_artista: null,
  patroc_on: false, patroc_id: null, patroc_modo: 'apresenta',
  placa_on: false, placa_tipo: null, placa_payload: null,
  crawl_on: false, crawl_texto: null,
}
