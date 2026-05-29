-- ════════════════════════════════════════════════════════════════════════════
-- 0056 · Índices faltantes em queries quentes durante o evento
-- ════════════════════════════════════════════════════════════════════════════
-- Identificados pela auditoria de banco. Tabelas pequenas hoje, mas o realtime
-- do Supabase reavalia policies a cada DML — sem índice, vira seq scan caro.
-- Todos são `if not exists` (idempotente).
-- ════════════════════════════════════════════════════════════════════════════

-- jogos: lookup por equipe (perfil da atlética + AtleticaWikiClient realtime)
create index if not exists idx_jogos_equipe_a on jogos(equipe_a_id) where equipe_a_id is not null;
create index if not exists idx_jogos_equipe_b on jogos(equipe_b_id) where equipe_b_id is not null;

-- jogos: filtro composto usado em queries de chave + classificação
create index if not exists idx_jogos_modalidade_cat_div_status
  on jogos(modalidade_id, categoria, divisao, status);

-- escopo_itens: filtros de status no patrocinadores admin
create index if not exists idx_escopo_status on escopo_itens(status);
create index if not exists idx_escopo_patrocinador_status on escopo_itens(patrocinador_id, status);

-- patrocinadores: home filtra ativo=true por edição
create index if not exists idx_patrocinadores_edicao_ativo
  on patrocinadores(edicao_id, ativo) where ativo = true;

-- profiles: ordem alfabética + filtro ativo (admin/usuarios + dropdowns)
create index if not exists idx_profiles_ativo_nome
  on profiles(ativo, nome) where ativo = true;

-- conteudos: filtros frequentes que ainda não estavam cobertos
create index if not exists idx_conteudos_setor_status
  on conteudos(setor_id, status) where setor_id is not null;
create index if not exists idx_conteudos_modalidade_status
  on conteudos(modalidade_id, status) where modalidade_id is not null;

-- turnos: já tem idx_turnos_user/dia/inicio do 0001, falta o (setor, funcao, dia)
-- pra filtro do escala-av que cruza esses três
create index if not exists idx_turnos_setor_funcao_dia
  on turnos(setor_id, funcao, dia_id) where setor_id is not null;
