-- 0016: estrutura de competição (divisões, conferências, inscrições, cabeças de chave, auditoria)
-- Suporta:
--   • 1ª Divisão (16 atléticas), 2ª Divisão (16), Super 08 (8 conferências × 8 atléticas)
--   • Inscrições por modalidade × categoria (M/F/COED)
--   • Cabeça de chave 1 ou 2 por modalidade dentro da divisão/conferência
--   • Auditoria específica de equipes e inscrições (preenchida pela camada de app)

-- ── 1) Equipes: conferência + seed ────────────────────────────────────────────
ALTER TABLE equipes
  ADD COLUMN IF NOT EXISTS conferencia TEXT,
  ADD COLUMN IF NOT EXISTS seed        INTEGER;

CREATE INDEX IF NOT EXISTS idx_equipes_conferencia ON equipes(conferencia);
CREATE INDEX IF NOT EXISTS idx_equipes_divisao_seed ON equipes(divisao, seed);

COMMENT ON COLUMN equipes.conferencia IS 'Nome da conferência (ALLURA, KAZURA, etc.) — apenas para atléticas do Super 08';
COMMENT ON COLUMN equipes.seed         IS 'Posição/cabeça de chave dentro da divisão ou conferência (1 a N)';

-- ── 2) Inscrições: equipe × modalidade × categoria ────────────────────────────
CREATE TABLE IF NOT EXISTS inscricoes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edicao_id     UUID NOT NULL REFERENCES edicoes(id)     ON DELETE CASCADE,
  equipe_id     UUID NOT NULL REFERENCES equipes(id)     ON DELETE CASCADE,
  modalidade_id UUID NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  categoria     TEXT NOT NULL,                       -- 'M' | 'F' | 'COED'
  divisao       TEXT NOT NULL,                       -- snapshot da divisão da equipe no momento da inscrição
  conferencia   TEXT,                                -- snapshot (null em 1ª/2ª divisão)
  cabeca_chave  SMALLINT CHECK (cabeca_chave IS NULL OR cabeca_chave IN (1, 2)),
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (equipe_id, modalidade_id, categoria)
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_equipe       ON inscricoes(equipe_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_modalidade   ON inscricoes(modalidade_id, categoria);
CREATE INDEX IF NOT EXISTS idx_inscricoes_divisao      ON inscricoes(divisao, conferencia);
CREATE INDEX IF NOT EXISTS idx_inscricoes_cabeca_chave ON inscricoes(modalidade_id, categoria, divisao, conferencia) WHERE cabeca_chave IS NOT NULL;

COMMENT ON TABLE  inscricoes IS 'Mapeia quais modalidades cada atlética disputa, incluindo cabeça de chave (1º ou 2º) quando definido.';
COMMENT ON COLUMN inscricoes.cabeca_chave IS 'NULL = atlética inscrita mas não é cabeça de chave. 1 ou 2 = posição de seed naquela modalidade/categoria/divisão.';

-- ── 3) Auditoria de equipes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipes_audit (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipe_id       UUID NOT NULL,                     -- sem FK (preserva histórico se equipe for deletada)
  equipe_nome     TEXT NOT NULL,                     -- snapshot
  acao            TEXT NOT NULL CHECK (acao IN ('create', 'update', 'delete')),
  campo_alterado  TEXT,                              -- ex: 'divisao', 'conferencia', 'seed', 'nome' (NULL em create/delete)
  valor_antigo    JSONB,
  valor_novo      JSONB,
  autor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  autor_nome      TEXT NOT NULL,                     -- snapshot do nome (sobrevive a delete de profile)
  motivo          TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipes_audit_equipe ON equipes_audit(equipe_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_equipes_audit_data   ON equipes_audit(criado_em DESC);

COMMENT ON TABLE equipes_audit IS 'Log de mudanças em equipes. Preenchido pela camada de app (server actions), não por trigger.';

-- ── 4) Auditoria de inscrições ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inscricoes_audit (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscricao_id     UUID NOT NULL,
  equipe_id        UUID NOT NULL,
  equipe_nome      TEXT NOT NULL,
  modalidade_nome  TEXT NOT NULL,
  categoria        TEXT NOT NULL,
  divisao          TEXT NOT NULL,
  conferencia      TEXT,
  acao             TEXT NOT NULL CHECK (acao IN ('create', 'update', 'delete')),
  campo_alterado   TEXT,                             -- ex: 'cabeca_chave', 'divisao' (NULL em create/delete)
  valor_antigo     JSONB,
  valor_novo       JSONB,
  autor_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  autor_nome       TEXT NOT NULL,
  motivo           TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_audit_inscricao ON inscricoes_audit(inscricao_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_inscricoes_audit_equipe    ON inscricoes_audit(equipe_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_inscricoes_audit_data      ON inscricoes_audit(criado_em DESC);

COMMENT ON TABLE inscricoes_audit IS 'Log de mudanças em inscrições. Preenchido pela camada de app.';

-- ── 5) Trigger para atualizar atualizado_em em inscricoes ─────────────────────
CREATE OR REPLACE FUNCTION inscricoes_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inscricoes_touch_updated_at ON inscricoes;
CREATE TRIGGER trg_inscricoes_touch_updated_at
  BEFORE UPDATE ON inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION inscricoes_touch_updated_at();

-- ── 6) RLS — leitura ampla, escrita só admin/coordenação ──────────────────────
ALTER TABLE inscricoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes_audit    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscricoes_audit ENABLE ROW LEVEL SECURITY;

-- Inscrições: qualquer usuário autenticado lê; só admin/coordenação escreve
DROP POLICY IF EXISTS inscricoes_select ON inscricoes;
CREATE POLICY inscricoes_select ON inscricoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS inscricoes_write ON inscricoes;
CREATE POLICY inscricoes_write ON inscricoes FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','coordenacao'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','coordenacao'))
  );

-- Audit logs: leitura admin/coord, escrita só pelo backend (service role)
DROP POLICY IF EXISTS equipes_audit_select ON equipes_audit;
CREATE POLICY equipes_audit_select ON equipes_audit FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','coordenacao'))
);

DROP POLICY IF EXISTS inscricoes_audit_select ON inscricoes_audit;
CREATE POLICY inscricoes_audit_select ON inscricoes_audit FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','coordenacao'))
);
