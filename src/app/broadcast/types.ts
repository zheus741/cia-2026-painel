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
  // Fase 2 — VT cue + segmento atual
  vt_on?: boolean
  vt_nome?: string | null
  vt_fim_ts?: string | null
  segmento_id?: string | null
  segmento_titulo?: string | null
  segmento_fim_ts?: string | null
  updated_at?: string
}

export interface VT {
  id: string
  nome: string
  descricao: string | null
  duracao_seg: number
  patroc_id: string | null
  ordem: number
}

export interface EscaletaItem {
  id: string
  ordem: number
  tipo: string
  titulo: string
  duracao_seg: number
  vt_id: string | null
  notas: string | null
  status: string
}

export interface ChecklistItem {
  id: string
  categoria: string
  texto: string
  feito: boolean
  ordem: number
}

export const ESCALETA_TIPOS: { value: string; label: string; cor: string }[] = [
  { value: 'vinheta',      label: 'Vinheta',      cor: '#B8A4E8' },
  { value: 'vt',           label: 'VT',           cor: '#5C68E8' },
  { value: 'atracao',      label: 'Atração',      cor: '#4aa06a' },
  { value: 'fala',         label: 'Fala / Host',  cor: '#D4B36A' },
  { value: 'bumper',       label: 'Bumper',       cor: '#69C9D0' },
  { value: 'intervalo',    label: 'Intervalo',    cor: '#D8845F' },
  { value: 'placa',        label: 'Placa',        cor: '#F0D04A' },
  { value: 'encerramento', label: 'Encerramento', cor: '#EF4444' },
]

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
