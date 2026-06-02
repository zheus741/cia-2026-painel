-- ════════════════════════════════════════════════════════════════════════════
-- 0075 · RLS — operador_esportivo pode escrever no placar ao vivo
-- ════════════════════════════════════════════════════════════════════════════
-- Libera o OPERADOR ESPORTIVO para mexer no placar ao vivo (lançar/editar
-- placar, marcar ao vivo, encerrar, eventos: gols/cartões/sets).
--
-- Atualiza is_sport_editor() para incluir 'operador_esportivo' — superset,
-- não remove acesso de ninguém. As policies de jogos/eventos_jogo/chave_config
-- (migration 0065) usam essa função, então passam a valer automaticamente.
--
-- Casa com as camadas de app: requireSportEditor (actions-helper) e
-- CAN_EDIT_ROLES (placar/page) também passam a incluir operador_esportivo.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function is_sport_editor()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    auth_role() in ('admin', 'coordenacao', 'coordenador_esportivo', 'operador_esportivo'),
    false
  );
$$;
