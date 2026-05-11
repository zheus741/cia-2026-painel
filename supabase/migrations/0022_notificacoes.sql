-- 0022: tabela de notificações in-app
-- Disparo: server actions (service role) inserem notificações para o usuário alvo.
-- Leitura: usuário vê e marca como lida apenas as suas próprias.
-- Realtime: habilita INSERT para o componente NotifBell ouvir em tempo real.

CREATE TABLE IF NOT EXISTS notificacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo     TEXT NOT NULL,
  corpo      TEXT,
  tipo       TEXT,          -- 'kanban' | 'escala' | 'sistema'
  link       TEXT,          -- href opcional para navegar ao clicar
  lida       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_lida ON notificacoes(user_id, lida, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Leitura: usuário vê só as suas
CREATE POLICY "notif_select_own"
  ON notificacoes FOR SELECT
  USING (user_id = auth.uid());

-- Update (marcar como lida): só as suas
CREATE POLICY "notif_update_own"
  ON notificacoes FOR UPDATE
  USING (user_id = auth.uid());

-- Insert: apenas service role (server actions) — anon/auth não podem inserir
-- (service role bypassa RLS por padrão, então esta policy bloqueia demais)
CREATE POLICY "notif_insert_service"
  ON notificacoes FOR INSERT
  WITH CHECK (false);  -- service role bypassa, authenticated users não inserem

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Habilita replicação para que o NotifBell receba inserts em tempo real.
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
