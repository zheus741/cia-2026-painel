/**
 * Agregação de "movimento" por praça esportiva.
 *
 * Pra cada setor (tipo='esportivo') consolida:
 * - Total de jogos / encerrados / ao vivo / agendados
 * - Modalidades distintas com count
 * - Atléticas distintas com count de jogos
 * - Range temporal (primeiro→último jogo)
 *
 * Reusável em /esportivo (Hub) e em / (home Coord/Admin).
 */

export interface PracaModalidade {
  nome: string
  icone: string | null
  count: number
}

export interface PracaAtletica {
  id: string
  nome: string
  slug: string
  cor: string | null
  jogos: number
}

export interface PracaStats {
  id: string
  nome: string
  cor: string | null
  totalJogos: number
  encerrados: number
  aoVivo: number
  agendados: number
  modalidades: PracaModalidade[]
  atleticas:   PracaAtletica[]
  primeiroJogo: string | null
  ultimoJogo:   string | null
}

// ── Inputs ───────────────────────────────────────────────────────────────────

interface JogoInput {
  setor_id:       string | null
  status:         string | null
  inicio:         string | null
  equipe_a_id:    string | null
  equipe_b_id:    string | null
  modalidades:    { nome: string; icone: string | null } | { nome: string; icone: string | null }[] | null
}

interface SetorInput {
  id:       string
  nome:     string
  cor_hex:  string | null
}

interface AtleticaInput {
  id:            string
  nome:          string
  slug:          string
  cor_primaria:  string | null
}

// ── Agregação ───────────────────────────────────────────────────────────────

export function aggregatePracas(
  setores:   SetorInput[],
  jogos:     JogoInput[],
  atleticas: AtleticaInput[],
): PracaStats[] {
  const atleticaById = new Map(atleticas.map(a => [a.id, a]))

  return setores.map(s => {
    const jogosDaPraca = jogos.filter(j => j.setor_id === s.id)
    let encerrados = 0, aoVivo = 0, agendados = 0
    const modMap = new Map<string, PracaModalidade>()
    const atlMap = new Map<string, PracaAtletica>()
    let primeiroJogo: string | null = null
    let ultimoJogo:   string | null = null

    for (const j of jogosDaPraca) {
      if      (j.status === 'encerrado') encerrados++
      else if (j.status === 'ao_vivo')   aoVivo++
      else if (j.status === 'agendado')  agendados++

      // Modalidade
      const mod = Array.isArray(j.modalidades) ? j.modalidades[0] : j.modalidades
      if (mod) {
        const cur = modMap.get(mod.nome) ?? { nome: mod.nome, icone: mod.icone, count: 0 }
        cur.count++
        modMap.set(mod.nome, cur)
      }

      // Atléticas
      for (const eqId of [j.equipe_a_id, j.equipe_b_id]) {
        if (!eqId) continue
        const a = atleticaById.get(eqId)
        if (!a) continue
        const cur = atlMap.get(a.id) ?? { id: a.id, nome: a.nome, slug: a.slug, cor: a.cor_primaria, jogos: 0 }
        cur.jogos++
        atlMap.set(a.id, cur)
      }

      // Range temporal
      if (j.inicio) {
        if (!primeiroJogo || j.inicio < primeiroJogo) primeiroJogo = j.inicio
        if (!ultimoJogo   || j.inicio > ultimoJogo)   ultimoJogo   = j.inicio
      }
    }

    return {
      id:           s.id,
      nome:         s.nome,
      cor:          s.cor_hex,
      totalJogos:   jogosDaPraca.length,
      encerrados, aoVivo, agendados,
      modalidades:  [...modMap.values()].sort((a, b) => b.count - a.count),
      atleticas:    [...atlMap.values()].sort((a, b) => b.jogos - a.jogos),
      primeiroJogo, ultimoJogo,
    }
  })
  .sort((a, b) => b.totalJogos - a.totalJogos || a.nome.localeCompare(b.nome, 'pt-BR'))
  .filter(p => p.totalJogos > 0)
}
