-- ── Realtime: habilita as 6 tabelas que o app assina via postgres_changes ───
-- jogos          → placar, esportivo, classificação, super8, TV, nav-badges
-- eventos_jogo   → placar ao vivo
-- conteudos      → kanban, TV
-- turnos         → TV display
-- notificacoes   → NotifBell
-- comentarios_turno → comentários de turno

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'jogos', 'eventos_jogo', 'conteudos', 'turnos', 'notificacoes', 'comentarios_turno'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- REPLICA IDENTITY FULL: faz o payload.old vir completo nos eventos UPDATE,
-- pra os handlers (ex: PlacarClient) compararem campos antigos corretamente.
ALTER TABLE public.jogos        REPLICA IDENTITY FULL;
ALTER TABLE public.eventos_jogo REPLICA IDENTITY FULL;
ALTER TABLE public.conteudos    REPLICA IDENTITY FULL;
ALTER TABLE public.turnos       REPLICA IDENTITY FULL;
