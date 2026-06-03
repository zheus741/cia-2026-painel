-- Link de entrega do DESIGN (ex: link do Drive com a arte pronta).
-- O designer designado cola aqui; fica clicável para quem visualizar o card
-- (no kanban e no perfil "Meus Conteúdos"). Separado de `link_publicado`
-- (URL do post final) e de `midia_draft_url` (rascunho de mídia).
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS link_design text;

COMMENT ON COLUMN conteudos.link_design IS
  'Link de entrega do design (Drive etc). Preenchido pelo responsável de design.';
