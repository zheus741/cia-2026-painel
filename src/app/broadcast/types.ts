// Config do programa (termômetro / YouTube / ao vivo)
export interface ProgramaConfig {
  id: string
  ao_vivo: boolean
  youtube_url: string | null
  youtube_video_id: string | null
  programa_titulo: string | null
  updated_at?: string
}

export const PROGRAMA_INICIAL: ProgramaConfig = {
  id: 'palco-principal',
  ao_vivo: false,
  youtube_url: null,
  youtube_video_id: null,
  programa_titulo: null,
}

export interface VT {
  id: string
  nome: string
  descricao: string | null
  duracao_seg: number
  patroc_id: string | null
  ordem: number
}

export interface GradeItem {
  id: string
  ordem: number
  tipo: string
  titulo: string
  duracao_seg: number
  horario: string | null      // 'HH:MM' previsto
  responsavel: string | null
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

export interface EquipeItem {
  id: string
  funcao: string
  nome: string
  contato: string | null
  ordem: number
}

export interface PatrocinadorRef {
  id: string
  nome: string
  logo_url: string | null
  cota: string | null
  cor_marca: string | null
}

export const GRADE_TIPOS: { value: string; label: string; cor: string }[] = [
  { value: 'vinheta',      label: 'Vinheta',      cor: '#B8A4E8' },
  { value: 'vt',           label: 'VT',           cor: '#5C68E8' },
  { value: 'atracao',      label: 'Atração',      cor: '#4aa06a' },
  { value: 'fala',         label: 'Fala / Host',  cor: '#D4B36A' },
  { value: 'bumper',       label: 'Bumper',       cor: '#69C9D0' },
  { value: 'intervalo',    label: 'Intervalo',    cor: '#D8845F' },
  { value: 'placa',        label: 'Placa',        cor: '#F0D04A' },
  { value: 'encerramento', label: 'Encerramento', cor: '#EF4444' },
]

/** Extrai o ID do vídeo de uma URL do YouTube (watch, youtu.be, live). */
export function parseYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/)
  return m ? m[1] : (/^[\w-]{11}$/.test(url.trim()) ? url.trim() : null)
}
