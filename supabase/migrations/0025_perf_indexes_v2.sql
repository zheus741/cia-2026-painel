-- Índice composto para o ORDER BY do kanban de conteúdos.
-- A query ordena por (dia_id, horario_previsto, prioridade) — sem índice composto
-- o Postgres faz sort em memória em cada request. Com ele, a ordem sai direto
-- do índice (index scan + no sort step).
create index if not exists idx_conteudos_kanban_order
  on conteudos (dia_id asc nulls last, horario_previsto asc nulls last, prioridade asc);

create index if not exists idx_jogos_modalidade_inicio
  on jogos (modalidade_id, inicio asc);
