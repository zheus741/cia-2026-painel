-- ════════════════════════════════════════════════════════════════════════════
-- 0071 · Conteúdo — responsável Influencer
-- ════════════════════════════════════════════════════════════════════════════
-- 4º responsável no card do kanban: quem pega o conteúdo com o creator/influencer.
-- ════════════════════════════════════════════════════════════════════════════

alter table conteudos
  add column if not exists responsavel_influencer_id uuid references profiles(id) on delete set null;

comment on column conteudos.responsavel_influencer_id is
  'Responsável por captar o conteúdo com o creator/influencer.';
