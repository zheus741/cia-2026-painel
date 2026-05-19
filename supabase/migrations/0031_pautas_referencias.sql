-- 0031: adiciona campo referencias a pautas
-- Array de texto para links, posts, inspirações vinculados à ideia de pauta.
-- Operadores e membros da equipe podem colar URLs de redes sociais, artigos, etc.

ALTER TABLE pautas
  ADD COLUMN IF NOT EXISTS referencias text[] NOT NULL DEFAULT '{}';
