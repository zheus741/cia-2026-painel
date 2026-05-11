-- 0023: otimizações de performance para o D-Day (250 acessos simultâneos)
--
-- Duas frentes:
--   1) Helpers RLS reescritos com pattern (select auth.uid()) — força o
--      Postgres a avaliar UMA vez por query (initPlan) em vez de por linha.
--      Ganho típico em listings grandes: 10-100x menos chamadas a profiles.
--   2) Índices faltantes em colunas usadas em filtros de UI (Kanban, board
--      de pautas, placar live, NotifBell).
--
-- Referência da otimização RLS:
--   https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select


-- ── 1) Helpers RLS otimizados ───────────────────────────────────────────────

create or replace function auth_role()
returns role_user
language sql
stable
as $$
  select role from profiles where id = (select auth.uid());
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select auth_role()) = 'admin', false);
$$;

create or replace function is_coord_or_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select auth_role()) in ('admin', 'coordenacao'), false);
$$;

create or replace function is_lider_or_above()
returns boolean
language sql
stable
as $$
  select coalesce((select auth_role()) in ('admin', 'coordenacao', 'lider_area'), false);
$$;


-- ── 2) Índices faltantes ────────────────────────────────────────────────────

-- Conteúdos: filtro "responsáveis" no Kanban (captação/design/edição).
-- Hoje 13 linhas; em 2.000+ o filtro vira seq scan.
create index if not exists idx_conteudos_resp_captacao on conteudos(responsavel_captacao_id);
create index if not exists idx_conteudos_resp_design   on conteudos(responsavel_design_id);
create index if not exists idx_conteudos_resp_edicao   on conteudos(responsavel_edicao_id);

-- Pautas: board agrupa por status, edicao_id é sempre filtrado, autor para "minhas".
create index if not exists idx_pautas_status        on pautas(status);
create index if not exists idx_pautas_edicao_status on pautas(edicao_id, status);
create index if not exists idx_pautas_autor         on pautas(autor_id);

-- Jogos: placar live filtra por status (ao_vivo/agendado) ordenado por inicio.
create index if not exists idx_jogos_status_inicio on jogos(status, inicio);

-- Notificações: NotifBell carrega 30 mais recentes por user_id.
-- O índice composto (user_id, created_at desc) é otimizado pra esse padrão.
create index if not exists idx_notif_user_created on notificacoes(user_id, created_at desc);


-- ── 3) Analyze para reotimização de plans ───────────────────────────────────
-- Após criar índices, recalcula estatísticas para o planner usar as novas estruturas.
analyze conteudos;
analyze pautas;
analyze jogos;
analyze notificacoes;
