-- 0020: habilita realtime para a tabela jogos
--
-- Permite que o /placar veja updates de outros operadores ao vivo,
-- o /esportivo recalcule classificações na hora, e a wiki da atlética
-- atualize forma/pontos sem reload.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'jogos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE jogos';
  END IF;
END $$;

-- Garante que a replica_identity é FULL para que UPDATEs incluam o estado anterior.
-- Importante quando o cliente quer detectar mudanças específicas (ex: status 'agendado' → 'ao_vivo').
ALTER TABLE jogos REPLICA IDENTITY FULL;
