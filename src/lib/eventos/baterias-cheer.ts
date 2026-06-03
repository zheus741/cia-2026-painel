// ─────────────────────────────────────────────────────────────────────────────
// Cronograma do Desafio de Baterias + Torneio de Cheerleading (CIA 2026).
// Fonte: planilhas oficiais ("BATERIAS CIA 2026 - HORÁRIOS" + "CRONOGRAMA cheer").
// Read-only — alimenta as páginas /esportivo/baterias e /esportivo/cheer.
// ─────────────────────────────────────────────────────────────────────────────

export interface BateriaItem {
  hora: string
  nome?: string        // nome da bateria (ausente em intervalo)
  intervalo?: boolean
}
export interface BateriaDivisao {
  divisao: string
  diaLabel: string     // "Quinta · 04/06"
  data: string         // "2026-06-04"
  itens: BateriaItem[]
}

export const BATERIAS: BateriaDivisao[] = [
  {
    divisao: '3ª Divisão', diaLabel: 'Quinta · 04/06', data: '2026-06-04',
    itens: [
      { hora: '12:25', nome: 'Curtisona' },
      { hora: '12:50', nome: 'Sedentária' },
      { hora: '13:15', nome: 'Taladentro' },
      { hora: '13:40', nome: 'Transtorna' },
      { hora: '14:05', nome: 'Puteria Campinas' },
      { hora: '14:30', intervalo: true },
      { hora: '15:20', nome: 'Toro Loko' },
      { hora: '15:45', nome: 'Laferia' },
      { hora: '16:10', nome: 'Intravenosa' },
      { hora: '16:35', nome: 'Cachorrada' },
      { hora: '17:00', nome: 'Besouteria' },
      { hora: '17:15', intervalo: true },
      { hora: '17:50', nome: 'Puteria BH' },
      { hora: '18:15', nome: 'Invasora' },
      { hora: '18:40', nome: 'Batucarara' },
      { hora: '19:05', nome: 'Enigmática' },
      { hora: '19:30', nome: 'Amedronta' },
      { hora: '19:55', nome: 'Malandragem' },
    ],
  },
  {
    divisao: '2ª Divisão', diaLabel: 'Sexta · 05/06', data: '2026-06-05',
    itens: [
      { hora: '12:00', nome: 'Logaritma' },
      { hora: '12:30', nome: 'Incendiária' },
      { hora: '13:00', nome: 'Doroteia' },
      { hora: '13:30', nome: 'Danada' },
      { hora: '14:00', intervalo: true },
      { hora: '15:00', nome: 'Sapateria' },
      { hora: '15:30', nome: 'Charanga Primatas' },
      { hora: '16:00', nome: 'Dentadura' },
      { hora: '16:30', nome: 'Filormônica' },
      { hora: '17:00', nome: 'Psicose' },
      { hora: '17:30', intervalo: true },
      { hora: '18:00', nome: 'Charanga Pandemia' },
      { hora: '18:30', nome: 'Integrada' },
      { hora: '19:00', nome: 'Estouro' },
      { hora: '19:30', nome: 'Bateruja' },
    ],
  },
  {
    divisao: '1ª Divisão', diaLabel: 'Sábado · 06/06', data: '2026-06-06',
    itens: [
      { hora: '13:00', nome: 'Medusa' },
      { hora: '13:40', nome: 'Engrenada' },
      { hora: '14:20', nome: 'Cachacina' },
      { hora: '15:00', nome: 'Mercenária' },
      { hora: '15:40', nome: 'Computaria' },
      { hora: '16:20', nome: 'Charanga' },
      { hora: '16:40', intervalo: true },
      { hora: '17:20', nome: 'Predadora' },
      { hora: '18:00', nome: 'Meritíssima' },
      { hora: '18:40', nome: 'Fumarato' },
      { hora: '19:20', nome: 'Apucalipse' },
      { hora: '20:00', nome: 'Artilharia' },
    ],
  },
]

// ── Cheerleading — Sábado 06/06 ──────────────────────────────────────────────

export interface CheerItem {
  ordem?: number
  hora: string
  equipe?: string
  atletica?: string
  categoria?: string
  marco?: string       // BREAK / RECURSOS / PREMIAÇÃO / ENCERRAMENTO
}

export const CHEER_DATA_LABEL = 'Sábado · 06/06'
export const CHEER_INFO = [
  'Abertura dos portões 11:00',
  'Apresentador entra 11:50',
  'Recursos 16:05 – 16:20',
  'Premiação Bloco 1 às 16:30',
  'Dúvidas com os juízes após a premiação',
  'Encerramento às 17:00',
]

export const CHEER: CheerItem[] = [
  { ordem: 1, hora: '12:32', equipe: 'Arlekings Cheerleaders', atletica: 'Artes UFU', categoria: 'Performance Cheer' },
  { ordem: 2, hora: '12:40', equipe: 'Sexylions', atletica: 'Eng UFU', categoria: 'Performance Cheer' },
  { ordem: 3, hora: '12:48', equipe: 'Panthers Cheerleading', atletica: 'Humanas UFU', categoria: 'Performance Cheer' },
  { ordem: 4, hora: '12:56', equipe: 'Vipers Cheers', atletica: 'Soberana UFTM', categoria: 'Coed 1' },
  { ordem: 5, hora: '13:04', equipe: 'Bullcheers', atletica: 'ECAD', categoria: 'Coed 1' },
  { hora: '13:12', marco: 'Break' },
  { ordem: 6, hora: '13:20', equipe: 'Lex Cheer', atletica: 'Direito UFMG', categoria: 'Coed 2 NT' },
  { ordem: 7, hora: '13:28', equipe: 'Law Cheers', atletica: 'Direito PUC Minas', categoria: 'Coed 2 NT' },
  { ordem: 8, hora: '13:36', equipe: 'Grifo Cheer', atletica: 'Grifo UFMG', categoria: 'Coed 2 NT' },
  { ordem: 9, hora: '13:44', equipe: 'Bearleaders', atletica: 'Unifenas BH', categoria: 'Coed 2 NT' },
  { ordem: 10, hora: '13:52', equipe: 'Starfish', atletica: 'LAU', categoria: 'Coed 2 NT' },
  { ordem: 11, hora: '14:00', equipe: 'Gnocheers', atletica: 'Med PUC', categoria: 'Coed 2 NT' },
  { ordem: 12, hora: '14:08', equipe: 'Olympus Minerva', atletica: 'Face UFMG', categoria: 'Coed 2 NT' },
  { ordem: 13, hora: '14:16', equipe: 'Blue Hydras', atletica: 'Liga CEM', categoria: 'Coed 2 NT' },
  { ordem: 14, hora: '14:24', equipe: 'Cheer Fusion', atletica: 'Saúde UNB Alucinada', categoria: 'Coed 2 NT' },
  { hora: '14:32', marco: 'Break' },
  { ordem: 15, hora: '14:40', equipe: 'La Loba Cheers', atletica: 'Direito UFU', categoria: 'Coed 2.1' },
  { ordem: 16, hora: '14:48', equipe: 'Cheer UCB', atletica: 'UCB', categoria: 'Coed 2.1' },
  { ordem: 17, hora: '14:56', equipe: "Hopper's Cheers", atletica: 'Aplicada UFU', categoria: 'Coed 2.1' },
  { ordem: 18, hora: '15:04', equipe: 'Mancha Cheers', atletica: 'Medicina Uniube', categoria: 'Coed 2.1' },
  { ordem: 19, hora: '15:12', equipe: 'Panthers Cheerleading', atletica: 'Humanas UFU', categoria: 'Coed 2.1' },
  { ordem: 20, hora: '15:20', equipe: 'Arlekings Cheerleaders', atletica: 'Artes UFU', categoria: 'Coed 2.1' },
  { ordem: 21, hora: '15:28', equipe: 'Bluebeasts', atletica: 'Agrárias', categoria: 'Coed 2.1' },
  { ordem: 22, hora: '15:36', equipe: 'Wolves', atletica: 'Computação UFU', categoria: 'Coed 2.1' },
  { hora: '15:44', marco: 'Break' },
  { ordem: 23, hora: '15:52', equipe: 'Sexylions', atletica: 'Eng UFU', categoria: 'Coed 3 NT' },
  { hora: '16:05', marco: 'Recursos (até 16:20)' },
  { hora: '16:30', marco: 'Premiação do Bloco 1' },
  { hora: '17:00', marco: 'Encerramento' },
]
