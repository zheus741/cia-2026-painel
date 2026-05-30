-- ════════════════════════════════════════════════════════════════════════════
-- 0067 · Ordem manual dos cards no kanban
-- ════════════════════════════════════════════════════════════════════════════
-- Permite reordenar os cards dentro de cada coluna (status) arrastando, com a
-- ordem salva e compartilhada por todo o time. `ordem` é a posição dentro da
-- coluna (0,1,2…). Null = nunca reordenada → cai pra ordem cronológica.
--
-- Aditivo e seguro: coluna nullable, sem backfill (colunas frescas seguem
-- cronológicas até a primeira reordenação).
-- ════════════════════════════════════════════════════════════════════════════

alter table conteudos add column if not exists ordem real;

comment on column conteudos.ordem is
  'Posição manual do card dentro da coluna (status) do kanban. Null = ordem cronológica.';

create index if not exists idx_conteudos_ordem on conteudos (status, ordem asc nulls last);
