-- ── Storage: bucket equipe-logos + policies de RLS ──────────────────────────
-- Permite a coord/admin subir o escudo das atléticas direto pelo painel.

INSERT INTO storage.buckets (id, name, public)
VALUES ('equipe-logos', 'equipe-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública das logos
DROP POLICY IF EXISTS "equipe_logos_public_read" ON storage.objects;
CREATE POLICY "equipe_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'equipe-logos');

-- Upload — só coord/admin
DROP POLICY IF EXISTS "equipe_logos_coord_insert" ON storage.objects;
CREATE POLICY "equipe_logos_coord_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipe-logos' AND public.is_coord_or_admin());

-- Update (upsert) — só coord/admin
DROP POLICY IF EXISTS "equipe_logos_coord_update" ON storage.objects;
CREATE POLICY "equipe_logos_coord_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'equipe-logos' AND public.is_coord_or_admin())
  WITH CHECK (bucket_id = 'equipe-logos' AND public.is_coord_or_admin());

-- Delete — só coord/admin
DROP POLICY IF EXISTS "equipe_logos_coord_delete" ON storage.objects;
CREATE POLICY "equipe_logos_coord_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'equipe-logos' AND public.is_coord_or_admin());
