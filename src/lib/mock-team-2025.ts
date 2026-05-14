/**
 * Equipe CIA 2025 — dados de referência da edição anterior.
 *
 * Uso: VISUALIZAÇÃO QUANTITATIVA somente. Não são profiles reais no banco;
 * servem pra dimensionar UI ("quantos cards aparecem na escala com ~30 pessoas").
 *
 * Quando os usuários reais forem cadastrados, este array pode ser removido.
 */

export interface MockMember {
  nome:        string
  funcao:      'foto' | 'video' | 'editor' | 'design' | 'coordenacao' | 'storymaker' | 'lider_cobertura'
  horario:     string         // ex: '08h-20h', '20h-08h'
  turno:       'Diurno' | 'Noturno' | 'Misto'
  descricao?:  string
}

/** Mapeamento das funções do CSV → vocabulário CIA 2026 */
export const MOCK_TEAM_2025: MockMember[] = [
  // ── Design ────────────────────────────────────────────────────────────────
  { nome: 'Guilherme Luiz da Costa',                  funcao: 'design',      horario: '08h-20h', turno: 'Diurno',  descricao: 'Designer Arena' },
  { nome: 'Ana Bárbara Santos Bertulucci Gomides',    funcao: 'design',      horario: '08h-20h', turno: 'Diurno',  descricao: 'Designer Esportivo' },
  { nome: 'Wendel Nunes Assis',                       funcao: 'design',      horario: '20h-08h', turno: 'Noturno', descricao: 'Designer Noturno' },
  { nome: 'Matheus Miguel Tomé Pires',                funcao: 'design',      horario: '08h-20h', turno: 'Diurno',  descricao: 'Designer Jogo Rápido' },

  // ── Editor ────────────────────────────────────────────────────────────────
  { nome: 'João Marcos de Souza',                     funcao: 'editor',      horario: '08h-20h', turno: 'Diurno',  descricao: 'Editor de Vídeo' },

  // ── Storymaker ────────────────────────────────────────────────────────────
  { nome: 'Marcelo Pimentel de Souza Filho',          funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Captação vídeo esportivo' },
  { nome: 'Carlos César da Silva Júnior',             funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Captação vídeo artístico (manhã)' },
  { nome: 'Luan Gabriel da Costa Pimenta',            funcao: 'storymaker',  horario: '14h-02h', turno: 'Misto',   descricao: 'Captação Jogo Rápido + tarde público' },
  { nome: 'Isabelli Bianqueti Soalheiro',             funcao: 'storymaker',  horario: '20h-08h', turno: 'Noturno', descricao: 'Captação artístico eletrônico' },
  { nome: 'Rafael Francisco Zanerato Galban',         funcao: 'storymaker',  horario: '20h-08h', turno: 'Noturno', descricao: 'Captação artístico principal' },
  { nome: 'Felipe Ferreira Bianco',                   funcao: 'storymaker',  horario: '20h-08h', turno: 'Noturno', descricao: 'Captação humanizados' },

  // ── Foto/Vídeo (supervisão) ───────────────────────────────────────────────
  { nome: 'João Lucas Araújo Pelegrini',              funcao: 'lider_cobertura', horario: '15h-08h', turno: 'Misto', descricao: 'Supervisão equipe foto e vídeo' },

  // ── Coordenação ───────────────────────────────────────────────────────────
  { nome: 'Camila Luna Ferreira Romualdo',            funcao: 'coordenacao', horario: 'a definir', turno: 'Misto', descricao: 'Supervisão equipe' },
  { nome: 'Matheus Christovam Barato',                funcao: 'coordenacao', horario: 'a definir', turno: 'Misto', descricao: 'Supervisão equipe' },

  // ── Operações (mapeado pra coordenacao) ───────────────────────────────────
  { nome: 'Luiza Sukevicius',                         funcao: 'coordenacao', horario: '13h-01h', turno: 'Misto',   descricao: 'Atendimento Sac Instagram' },
  { nome: 'Flávia Carolina Ribeiro Damião',           funcao: 'coordenacao', horario: '08h-20h', turno: 'Diurno',  descricao: 'Tráfego' },
  { nome: 'Isadora Castro',                           funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Social Media Diurno' },
  { nome: 'Yasmim Leal Aparecido',                    funcao: 'storymaker',  horario: '20h-08h', turno: 'Noturno', descricao: 'Social Media Noturno' },

  // ── Ativações + Patrocínio (mapeado pra coordenacao) ──────────────────────
  { nome: 'José Ricardo Pereira Júnior',              funcao: 'coordenacao', horario: '20h-08h', turno: 'Noturno', descricao: 'Ativações' },
  { nome: 'Pedro Henrique Machado Pereira Lima',      funcao: 'coordenacao', horario: '13h-01h', turno: 'Misto',   descricao: 'Ativações' },
  { nome: 'Stephanie Camila de Souza Rosa',           funcao: 'coordenacao', horario: '13h-01h', turno: 'Misto',   descricao: 'Ativações' },
  { nome: 'Marcella Oliveira Reis',                   funcao: 'coordenacao', horario: '15h-03h', turno: 'Misto',   descricao: 'Atendimento Influencers' },
  { nome: 'Jordana Moreira',                          funcao: 'coordenacao', horario: '08h-03h', turno: 'Misto',   descricao: 'Acompanhamento Marcas' },

  // ── Jogo Rápido (transmissão própria) ─────────────────────────────────────
  { nome: 'Carlos Eduardo Conceição Soares dos Reis', funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Apresentação Jogo Rápido' },
  { nome: 'Bruna Garcia Villela de Castro',           funcao: 'lider_cobertura', horario: '08h-20h', turno: 'Diurno', descricao: 'Editora-chefe Jogo Rápido' },
  { nome: 'Sofia Parreira Volpi Silva',               funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Captação Jogo Rápido' },
  { nome: 'Gabriel Augusto Albino Silva',             funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Captação Jogo Rápido' },
  { nome: 'Fernanda Scarlise',                        funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Social Media Jogo Rápido' },
  { nome: 'Laura',                                    funcao: 'storymaker',  horario: '08h-20h', turno: 'Diurno',  descricao: 'Captação + logística Jogo Rápido' },

  // ── Transmissão Ao Vivo ───────────────────────────────────────────────────
  { nome: 'Marcus',                                   funcao: 'storymaker',  horario: 'a definir', turno: 'Noturno', descricao: 'Apresentador transmissão' },
  { nome: 'Ana Lara',                                 funcao: 'storymaker',  horario: 'a definir', turno: 'Noturno', descricao: 'Repórter transmissão' },
]

/** Conta por função pra estatísticas rápidas */
export function contarPorFuncao() {
  return MOCK_TEAM_2025.reduce<Record<string, number>>((acc, m) => {
    acc[m.funcao] = (acc[m.funcao] ?? 0) + 1
    return acc
  }, {})
}
