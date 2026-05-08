-- 0011: índices de performance para hot paths do D-Day

-- ── turnos ────────────────────────────────────────────────────────────────────
-- funcao: muito consultado em EscalaAVGrid (filter by foto/video) e no coverage map
CREATE INDEX IF NOT EXISTS idx_turnos_funcao    ON turnos(funcao);
-- setor_id: usado no coverage map da timeline e na EscalaAVGrid
CREATE INDEX IF NOT EXISTS idx_turnos_setor     ON turnos(setor_id);
-- parceiro_id: adicionado em 0009, nunca indexado
CREATE INDEX IF NOT EXISTS idx_turnos_parceiro  ON turnos(parceiro_id);
-- composto dia+funcao: query mais comum na EscalaAVGrid e no coverage map
CREATE INDEX IF NOT EXISTS idx_turnos_dia_funcao ON turnos(dia_id, funcao);
-- status_escala: adicionado em 0009, usado no War Room
CREATE INDEX IF NOT EXISTS idx_turnos_status    ON turnos(status_escala);

-- ── notificacoes ──────────────────────────────────────────────────────────────
-- user_id: toda query filtra por usuário autenticado
CREATE INDEX IF NOT EXISTS idx_notif_user       ON notificacoes(user_id);
-- lida: para badge de não-lidas
CREATE INDEX IF NOT EXISTS idx_notif_lida       ON notificacoes(lida) WHERE lida = FALSE;
-- composto user+lida: query mais comum
CREATE INDEX IF NOT EXISTS idx_notif_user_lida  ON notificacoes(user_id, lida);
-- created_at: ordenação padrão
CREATE INDEX IF NOT EXISTS idx_notif_created    ON notificacoes(created_at DESC);

-- ── conteudos ─────────────────────────────────────────────────────────────────
-- festa_id: faltava (jogo e show já existiam)
CREATE INDEX IF NOT EXISTS idx_conteudos_festa  ON conteudos(festa_id);
-- setor_id: filtro de conteúdos por praça
CREATE INDEX IF NOT EXISTS idx_conteudos_setor  ON conteudos(setor_id);
-- criado_por: para "meus conteúdos"
CREATE INDEX IF NOT EXISTS idx_conteudos_criador ON conteudos(criado_por);
-- composto status+dia: query mais comum no kanban (todos os conteúdos de um dia por status)
CREATE INDEX IF NOT EXISTS idx_conteudos_dia_status ON conteudos(dia_id, status);

-- ── profiles ──────────────────────────────────────────────────────────────────
-- parceiro_id: adicionado em 0009, nunca indexado; usado no EscalaAVGrid
CREATE INDEX IF NOT EXISTS idx_profiles_parceiro ON profiles(parceiro_id);

-- ── checklist_itens ───────────────────────────────────────────────────────────
-- composto instancia+status: query mais comum no checklist em campo
CREATE INDEX IF NOT EXISTS idx_ck_itens_inst_status ON checklist_itens(instancia_id, status);
