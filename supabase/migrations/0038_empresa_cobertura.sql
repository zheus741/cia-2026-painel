-- Empresa de cobertura fotográfica para operadores/líderes FV
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS empresa_cobertura text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.empresa_cobertura IS 'Empresa de cobertura (ex: Indie Clicks) — preenchida pela coordenação';
