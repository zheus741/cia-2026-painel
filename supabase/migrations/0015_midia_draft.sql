-- 0015: campo de mídia draft em conteudos (para quick capture mobile)

ALTER TABLE conteudos
  ADD COLUMN IF NOT EXISTS midia_draft_url TEXT,
  ADD COLUMN IF NOT EXISTS midia_draft_tipo TEXT CHECK (midia_draft_tipo IN ('foto', 'video'));

-- índice para filtrar conteúdos com mídia pendente de edição
CREATE INDEX IF NOT EXISTS idx_conteudos_midia_draft
  ON conteudos(midia_draft_url)
  WHERE midia_draft_url IS NOT NULL;
