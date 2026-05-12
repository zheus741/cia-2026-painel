-- 0024: Pontuação real da CIA 2026 + W.O. + Super 8 playoff
--
-- Implementa as regras de Pontuação por Colocação descritas no
-- Regulamento Oficial CIA 2026 (Art. 44 da 1ª Divisão e Art. 46 das
-- Divisões de Acesso). Substitui a lógica anterior baseada em V/E/D
-- (regra Brasileirão), que não se aplica à CIA.
--
-- Mudanças:
--   1. inscricoes.cabeca_chave: permite 1-4 (regulamento exige 4 cabeças)
--   2. jogos.wo: marca jogos finalizados por W.O. (não-comparecimento)
--   3. super8_liga: nova tabela para o playoff dos campeões de conferência
--      (7 rodadas, anti-repetição de adversário e modalidade via constraints)


-- ────────────────────────────────────────────────────────────────────
-- 1) Cabeças de chave: 1-4 (Art. 70 §2 do regulamento)
--    Antes: CHECK (cabeca_chave IN (1, 2)) — restrito demais
--    Agora: CHECK (cabeca_chave BETWEEN 1 AND 4)
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE inscricoes
  DROP CONSTRAINT IF EXISTS inscricoes_cabeca_chave_check;

ALTER TABLE inscricoes
  ADD CONSTRAINT inscricoes_cabeca_chave_check
    CHECK (cabeca_chave IS NULL OR cabeca_chave BETWEEN 1 AND 4);

COMMENT ON COLUMN inscricoes.cabeca_chave IS
  'NULL = não é cabeça de chave. 1-4 = posição entre os 4 cabeças de chave da modalidade/divisão, conforme Art. 70 §2 do regulamento.';


-- ────────────────────────────────────────────────────────────────────
-- 2) jogos.wo: W.O. (não-comparecimento)
--    Conforme Art. 58-65 do regulamento. Marca qual lado declarou W.O.
--    Penalidades (−13 pts + posição vaga) são aplicadas pela camada de app
--    a partir desta flag.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE jogos
  ADD COLUMN IF NOT EXISTS wo TEXT
    CHECK (wo IS NULL OR wo IN ('a', 'b', 'duplo'));

COMMENT ON COLUMN jogos.wo IS
  'W.O. (Art. 58-65). NULL = jogo normal. ''a'' = atlética A declarou W.O. e perdeu. ''b'' = atlética B declarou. ''duplo'' = ambas (Art. 64 II).';

-- Index só pra jogos com W.O. (pequeno conjunto — usado pra apurar penalidades)
CREATE INDEX IF NOT EXISTS idx_jogos_wo
  ON jogos(edicao_id, modalidade_id) WHERE wo IS NOT NULL;


-- ────────────────────────────────────────────────────────────────────
-- 3) super8_liga: playoff dos 8 campeões de conferência
--    Pontos corridos, 7 rodadas, cada atlética joga 7 vezes.
--    Restrições (Art. 53 §3 do regulamento):
--      • Não repetir adversário durante toda a liga
--      • Não repetir modalidade (modalidade = esporte + sexo)
--      • 1 jogo por atlética por rodada
--    Implementadas como UNIQUE INDEX no banco — admin UI valida antes.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS super8_liga (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edicao_id       UUID NOT NULL REFERENCES edicoes(id)     ON DELETE CASCADE,
  rodada          SMALLINT NOT NULL CHECK (rodada BETWEEN 1 AND 7),
  atletica_a_id   UUID NOT NULL REFERENCES equipes(id),
  atletica_b_id   UUID NOT NULL REFERENCES equipes(id),
  modalidade_id   UUID NOT NULL REFERENCES modalidades(id),
  categoria       TEXT NOT NULL,                              -- 'M' | 'F'
  jogo_id         UUID UNIQUE REFERENCES jogos(id) ON DELETE SET NULL,
  posicao_a       SMALLINT CHECK (posicao_a BETWEEN 1 AND 8), -- sorteio A1..A8
  posicao_b       SMALLINT CHECK (posicao_b BETWEEN 1 AND 8),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (atletica_a_id <> atletica_b_id)
);

-- Anti-repetição de adversário: o par {A,B} = {B,A}, então usa LEAST/GREATEST
-- para normalizar a ordem antes de aplicar a unicidade.
CREATE UNIQUE INDEX IF NOT EXISTS uq_super8_par_adversarios ON super8_liga (
  edicao_id,
  LEAST   (atletica_a_id, atletica_b_id),
  GREATEST(atletica_a_id, atletica_b_id)
);

-- Anti-repetição de modalidade: cada atlética joga 1× cada modalidade+categoria
-- na liga inteira. Modalidade = esporte + sexo (Art. 53 §4).
CREATE UNIQUE INDEX IF NOT EXISTS uq_super8_atl_a_modalidade
  ON super8_liga (edicao_id, atletica_a_id, modalidade_id, categoria);
CREATE UNIQUE INDEX IF NOT EXISTS uq_super8_atl_b_modalidade
  ON super8_liga (edicao_id, atletica_b_id, modalidade_id, categoria);

-- 1 jogo por atlética por rodada
CREATE UNIQUE INDEX IF NOT EXISTS uq_super8_rodada_atl_a
  ON super8_liga (edicao_id, rodada, atletica_a_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_super8_rodada_atl_b
  ON super8_liga (edicao_id, rodada, atletica_b_id);

CREATE INDEX IF NOT EXISTS idx_super8_edicao_rodada
  ON super8_liga(edicao_id, rodada);
CREATE INDEX IF NOT EXISTS idx_super8_jogo
  ON super8_liga(jogo_id) WHERE jogo_id IS NOT NULL;

-- Trigger para atualizar `atualizado_em` em UPDATE
CREATE OR REPLACE FUNCTION super8_liga_set_atualizado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_super8_liga_atualizado ON super8_liga;
CREATE TRIGGER trg_super8_liga_atualizado
  BEFORE UPDATE ON super8_liga
  FOR EACH ROW EXECUTE FUNCTION super8_liga_set_atualizado();

COMMENT ON TABLE super8_liga IS
  'Playoff Super 8 — liga em pontos corridos entre os 8 campeões de conferência. 7 rodadas × 4 jogos = 28 partidas. Cada atlética joga 7 vezes (todos contra todos). Tabela dirigida pela Comissão Organizadora; apenas as posições A1-A8 são sorteadas. Pontuação: 13 pts por vitória, sem pontuação por derrota/empate (Art. 57).';

COMMENT ON COLUMN super8_liga.rodada IS
  'Rodada 1 a 7. Cada atlética joga exatamente 1 vez por rodada (não há folga).';
COMMENT ON COLUMN super8_liga.jogo_id IS
  'FK opcional para jogos. NULL enquanto a partida não foi criada; preenchido quando o jogo é agendado em jogos.';
COMMENT ON COLUMN super8_liga.posicao_a IS
  'Posição A1-A8 da atlética_a no sorteio do Congresso Técnico (Art. 55).';

-- RLS: leitura pública (autenticados), escrita só admin/coord
ALTER TABLE super8_liga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS super8_liga_select ON super8_liga;
CREATE POLICY super8_liga_select ON super8_liga
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS super8_liga_write ON super8_liga;
CREATE POLICY super8_liga_write ON super8_liga
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'coordenacao')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'coordenacao')
    )
  );


-- ────────────────────────────────────────────────────────────────────
-- 4) ANALYZE — atualiza estatísticas do planner com as novas colunas
-- ────────────────────────────────────────────────────────────────────

ANALYZE jogos;
ANALYZE inscricoes;
