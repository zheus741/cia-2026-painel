-- 0014: comentários em turnos

CREATE TABLE IF NOT EXISTS comentarios_turno (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id   UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  texto      TEXT NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coment_turno    ON comentarios_turno(turno_id);
CREATE INDEX IF NOT EXISTS idx_coment_user     ON comentarios_turno(user_id);
CREATE INDEX IF NOT EXISTS idx_coment_created  ON comentarios_turno(turno_id, created_at);

ALTER TABLE comentarios_turno ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado lê (todos os membros do evento precisam ver)
CREATE POLICY "coment_turno_read" ON comentarios_turno
  FOR SELECT TO authenticated USING (true);

-- Qualquer autenticado insere
CREATE POLICY "coment_turno_insert" ON comentarios_turno
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Dono do comentário ou coord/admin podem deletar
CREATE POLICY "coment_turno_delete" ON comentarios_turno
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'coordenacao')
    )
  );

-- Habilita realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE comentarios_turno;
