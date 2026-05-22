-- ── Escala foto/vídeo mais robusta ──────────────────────────────────────────
-- 1) Remove o trigger notify_turno_escala: era frágil (UPPER em enum) e
--    redundante — as Server Actions já notificam via enviarNotif().
DROP TRIGGER IF EXISTS trg_notify_turno ON public.turnos;

-- 2) Permite criar turno sem colaborador atribuído (slot aberto).
--    O operador pode ser designado depois direto na linha do tempo.
ALTER TABLE public.turnos ALTER COLUMN user_id DROP NOT NULL;
