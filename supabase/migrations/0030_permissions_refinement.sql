-- 0030: refinamento de permissões — CIA 2026
--
-- 1. Adiciona roles coordenador_esportivo e operador_esportivo ao enum role_user
-- 2. Adiciona colunas aprovado/aprovado_em/aprovado_por ao profiles (fluxo de aprovação)
-- 3. Restringe criação de conteúdos (kanban) a lider_area+
--    Antes: qualquer autenticado criava → operadores podiam abrir cards no kanban
--    Depois: apenas lider_area, coordenacao ou admin podem criar
-- 4. Atualiza trigger handle_new_user para setar aprovado=false em novos signups

-- ── 1. Enum roles esportivos ──────────────────────────────────────────────────
DO $$
BEGIN
  ALTER TYPE role_user ADD VALUE 'coordenador_esportivo';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE role_user ADD VALUE 'operador_esportivo';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Colunas de aprovação em profiles ──────────────────────────────────────
-- DEFAULT true para grandfathering de usuários já existentes.
-- Novos usuários entram com aprovado=false (trigger abaixo).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  aprovado        boolean NOT NULL DEFAULT true;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  aprovado_em     timestamptz;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  aprovado_por    uuid REFERENCES profiles(id);

-- Garantir que novos signups entrem como não aprovados
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, nome, role, aprovado)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', SPLIT_PART(NEW.email, '@', 1)),
    'operador',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Kanban (conteudos): restringir INSERT a lider_area+ ───────────────────
-- Remove a policy "criar autenticado" que deixava qualquer operador criar cards.
-- Operadores ficam apenas com leitura + edição de pautas.

DROP POLICY IF EXISTS "conteudos: criar autenticado" ON conteudos;

DO $$
BEGIN
  CREATE POLICY "conteudos: criar lider+"
    ON conteudos FOR INSERT
    TO authenticated
    WITH CHECK (is_lider_or_above());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Verificação pós-migração ─────────────────────────────────────────────────
-- SELECT enumlabel FROM pg_enum
--   JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--   WHERE pg_type.typname = 'role_user'
--   ORDER BY enumsortorder;
--
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'profiles'
--   AND column_name IN ('aprovado', 'aprovado_em', 'aprovado_por');
--
-- SELECT policyname, cmd, qual FROM pg_policies
--   WHERE tablename = 'conteudos';
