-- 0013: log de exports diários automáticos

CREATE TABLE IF NOT EXISTS daily_exports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_path TEXT NOT NULL,          -- ex: backups/cia2026-2026-06-04.json
  size_bytes   INTEGER,
  totals       JSONB,                  -- { conteudos, turnos, checklist_itens, ... }
  status       TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'erro')),
  error_msg    TEXT,
  triggered_by TEXT DEFAULT 'cron'    -- 'cron' | 'manual'
);

-- Apenas admin/coord lê o log
ALTER TABLE daily_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exports_read_coord" ON daily_exports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'coordenacao')
    )
  );

-- índice para paginação do histórico
CREATE INDEX IF NOT EXISTS idx_daily_exports_at ON daily_exports(exported_at DESC);
