-- ────────────────────────────────────────────────────────────────────────────
-- 0027 — Resultados Externos (Fase B)
-- ────────────────────────────────────────────────────────────────────────────
-- Modalidades cujos resultados vêm de SISTEMA EXTERNO (não roda pela app):
--   • Judô F/M
--   • Jiu-Jitsu F/M
--   • Natação F/M
--   • Atletismo F/M
--   • Xadrez (misto)
--
-- Fluxo:
--   1. Coord anexa o PDF/XLSX oficial do resultado
--   2. Coord registra a colocação (1º, 2º, ...) de cada atlética
--   3. Sistema calcula pontos automaticamente (tabela Art. 44/46)
--   4. Pontos somam na /classificacao da atlética
-- ────────────────────────────────────────────────────────────────────────────

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. MODALIDADES (11 novas)                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO modalidades (edicao_id, nome, slug, icone, categorias, divisoes)
VALUES
  -- Lutas (categorias de peso são tratadas via observacoes/anexo)
  ('00000000-0000-0000-0000-000000000001', 'Judô Masc.',      'judo-masc',      '🥋', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Judô Fem.',       'judo-fem',       '🥋', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Jiu-Jitsu Masc.', 'jiu-jitsu-masc', '🥋', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Jiu-Jitsu Fem.',  'jiu-jitsu-fem',  '🥋', ARRAY[]::text[], ARRAY[]::text[]),
  -- Provas
  ('00000000-0000-0000-0000-000000000001', 'Atletismo Masc.', 'atletismo-masc', '🏃', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Atletismo Fem.',  'atletismo-fem',  '🏃', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Natação Masc.',   'natacao-masc',   '🏊', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Natação Fem.',    'natacao-fem',    '🏊', ARRAY[]::text[], ARRAY[]::text[]),
  -- Xadrez (misto — categoria única)
  ('00000000-0000-0000-0000-000000000001', 'Xadrez',          'xadrez',         '♟️', ARRAY[]::text[], ARRAY[]::text[])
ON CONFLICT (edicao_id, slug) DO UPDATE
  SET nome  = EXCLUDED.nome,
      icone = EXCLUDED.icone;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. TABELA: resultados_externos                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Cada linha = 1 atlética × 1 modalidade × 1 divisão, com colocação final
CREATE TABLE IF NOT EXISTS resultados_externos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id     uuid NOT NULL REFERENCES edicoes(id) ON DELETE CASCADE,
  modalidade_id uuid NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  /** Divisão: '1ª Divisão' / '2ª Divisão' / 'Super 08' / conferências */
  divisao       text NOT NULL,
  equipe_id     uuid NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  /** Posição final 1..N. 0 = não pontuou / desclassificado / W.O. */
  colocacao     int  NOT NULL CHECK (colocacao >= 0),
  /** Pontos calculados via tabela do regulamento (Art. 44/46). */
  pontos        int  NOT NULL DEFAULT 0,
  /** Texto livre — categoria de peso (judô/jiu), prova (nat/atl), observações */
  observacoes   text,
  created_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Uma atlética só pode ter 1 colocação por modalidade × divisão
  -- (categorias de peso ou provas individuais ficam em `observacoes`)
  UNIQUE (modalidade_id, divisao, equipe_id, observacoes)
);

CREATE INDEX IF NOT EXISTS idx_res_ext_edicao    ON resultados_externos (edicao_id);
CREATE INDEX IF NOT EXISTS idx_res_ext_modalidade ON resultados_externos (modalidade_id, divisao);
CREATE INDEX IF NOT EXISTS idx_res_ext_equipe    ON resultados_externos (equipe_id);

-- Trigger pra atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION trg_resultados_externos_touch() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resultados_externos_touch ON resultados_externos;
CREATE TRIGGER resultados_externos_touch
  BEFORE UPDATE ON resultados_externos
  FOR EACH ROW EXECUTE FUNCTION trg_resultados_externos_touch();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. TABELA: resultados_externos_anexos                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Arquivos PDF/XLSX anexados como fonte oficial dos resultados
CREATE TABLE IF NOT EXISTS resultados_externos_anexos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id       uuid NOT NULL REFERENCES edicoes(id) ON DELETE CASCADE,
  modalidade_id   uuid NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  divisao         text NOT NULL,
  /** Caminho no Supabase Storage bucket 'resultados-externos' */
  storage_path    text NOT NULL,
  arquivo_nome    text NOT NULL,
  /** Mime type (application/pdf, application/vnd.openxmlformats..., etc) */
  arquivo_tipo    text,
  /** Tamanho em bytes */
  arquivo_tamanho int,
  /** Texto livre — pra identificar o arquivo ("Súmula oficial", "Resultado final") */
  descricao       text,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_res_ext_anexos_mod ON resultados_externos_anexos (modalidade_id, divisao);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. STORAGE BUCKET                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Bucket pra anexos de resultados externos (PDFs, XLSX)
-- IMPORTANT: pode falhar se você não tiver permissão de criar buckets via SQL.
-- Fallback: criar manualmente no dashboard Supabase com mesmo ID.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resultados-externos',
  'resultados-externos',
  false,  -- privado, acesso via signed URL
  20971520, -- 20 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/png',
    'image/jpeg'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5. RLS — Row Level Security                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
ALTER TABLE resultados_externos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_externos_anexos ENABLE ROW LEVEL SECURITY;

-- LEITURA: qualquer usuário aprovado pode ler (read-only pra todos)
DROP POLICY IF EXISTS "res_ext_read_authorized" ON resultados_externos;
CREATE POLICY "res_ext_read_authorized" ON resultados_externos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.aprovado = true
    )
  );

DROP POLICY IF EXISTS "res_ext_anexos_read_authorized" ON resultados_externos_anexos;
CREATE POLICY "res_ext_anexos_read_authorized" ON resultados_externos_anexos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.aprovado = true
    )
  );

-- ESCRITA: somente admin/coord/coord_esportivo
DROP POLICY IF EXISTS "res_ext_write_coord" ON resultados_externos;
CREATE POLICY "res_ext_write_coord" ON resultados_externos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('admin', 'coordenador', 'coordenador_esportivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('admin', 'coordenador', 'coordenador_esportivo')
    )
  );

DROP POLICY IF EXISTS "res_ext_anexos_write_coord" ON resultados_externos_anexos;
CREATE POLICY "res_ext_anexos_write_coord" ON resultados_externos_anexos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('admin', 'coordenador', 'coordenador_esportivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('admin', 'coordenador', 'coordenador_esportivo')
    )
  );

-- Policies pro Storage bucket (acesso via signed URL pra leitura,
-- upload/delete apenas pra admin/coord)
DROP POLICY IF EXISTS "res_ext_storage_read" ON storage.objects;
CREATE POLICY "res_ext_storage_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'resultados-externos'
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.aprovado = true
    )
  );

DROP POLICY IF EXISTS "res_ext_storage_write" ON storage.objects;
CREATE POLICY "res_ext_storage_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'resultados-externos'
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('admin', 'coordenador', 'coordenador_esportivo')
    )
  );

DROP POLICY IF EXISTS "res_ext_storage_delete" ON storage.objects;
CREATE POLICY "res_ext_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'resultados-externos'
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('admin', 'coordenador', 'coordenador_esportivo')
    )
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 6. RESUMO                                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
DO $$
DECLARE
  total_mods INT;
  novas INT;
BEGIN
  SELECT COUNT(*) INTO total_mods FROM modalidades
   WHERE edicao_id = '00000000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO novas FROM modalidades
   WHERE edicao_id = '00000000-0000-0000-0000-000000000001'
     AND slug IN ('judo-masc','judo-fem','jiu-jitsu-masc','jiu-jitsu-fem',
                  'atletismo-masc','atletismo-fem','natacao-masc','natacao-fem','xadrez');
  RAISE NOTICE 'Total de modalidades: %', total_mods;
  RAISE NOTICE 'Modalidades de resultado externo cadastradas: % / 9', novas;
END $$;
