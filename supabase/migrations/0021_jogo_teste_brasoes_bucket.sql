-- 0021: jogo de teste + bucket de brasões de atléticas

-- ── 1) Campo "teste" em jogos ─────────────────────────────────────────────────
ALTER TABLE jogos
  ADD COLUMN IF NOT EXISTS teste BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN jogos.teste IS 'Jogo de teste — usado durante ensaios do placar ao vivo. Não exibido em resultados públicos.';

-- ── 2) Bucket Supabase Storage para brasões ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brasoes',
  'brasoes',
  true,
  524288,  -- 512 KB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública
CREATE POLICY "brasoes_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brasoes');

-- Upload autenticado
CREATE POLICY "brasoes_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brasoes');

-- Update autenticado
CREATE POLICY "brasoes_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'brasoes');

-- Delete autenticado
CREATE POLICY "brasoes_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'brasoes');
