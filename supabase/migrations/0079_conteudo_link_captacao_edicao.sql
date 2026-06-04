-- Links de entrega (Drive etc) para captação e edição — espelham link_design.
-- Cada responsável cola o link da sua entrega; fica clicável no kanban e perfil.
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS link_captacao text;
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS link_edicao text;

COMMENT ON COLUMN conteudos.link_captacao IS 'Link de entrega da captação (Drive etc).';
COMMENT ON COLUMN conteudos.link_edicao IS 'Link de entrega da edição (Drive etc).';
