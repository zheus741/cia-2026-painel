export interface Quadra {
  nome: string
  modalidades: string[]
  capacidade: number | null
}

export interface Venue {
  id: number
  key: string
  nome: string
  endereco: string | null
  lat: number
  lng: number
  maps_url: string | null
  notas: string | null
  quadras: Quadra[]
  modalidades: string[]
  wifi: boolean
  apoio: boolean
  live: boolean
}
