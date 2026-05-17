-- ────────────────────────────────────────────────────────────────────────────
-- 0026 — Modalidades individuais (Fase A): Tênis de Campo + Tênis de Mesa
-- ────────────────────────────────────────────────────────────────────────────
-- Adiciona modalidades que usam o mesmo sistema de eliminatória simples já
-- implementado (basquete, futsal, vôlei, etc).
--
-- O importador (/api/import-tabela) cria UMA modalidade por categoria
-- (ex: 'Basquete Feminino' + 'Basquete Masculino' são 2 registros). Seguimos
-- esse padrão pras novas pra consistência.
--
-- Peteca M/F já existe via import — apenas validamos.
-- Modalidades de provas (Atletismo, Natação), lutas (Judô, Jiu-Jitsu) e
-- Xadrez ficam pra Fase B (UI de resultados externos).
-- ────────────────────────────────────────────────────────────────────────────

-- Tênis de Campo (M/F) e Tênis de Mesa (M/F)
-- Slugs gerados via toSlug() do importador: lowercase + remove acentos + [^a-z0-9]→'-' + trim '-'
INSERT INTO modalidades (edicao_id, nome, slug, icone, categorias, divisoes)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Tênis de Campo Masc.', 'tenis-de-campo-masc', '🎾', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Tênis de Campo Fem.',  'tenis-de-campo-fem',  '🎾', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Tênis de Mesa Masc.',  'tenis-de-mesa-masc',  '🏓', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Tênis de Mesa Fem.',   'tenis-de-mesa-fem',   '🏓', ARRAY[]::text[], ARRAY[]::text[])
ON CONFLICT (edicao_id, slug) DO UPDATE
  SET nome  = EXCLUDED.nome,
      icone = EXCLUDED.icone;

-- Garante Peteca M/F (caso ainda não existam por nunca terem sido importadas)
INSERT INTO modalidades (edicao_id, nome, slug, icone, categorias, divisoes)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Peteca Masculino', 'peteca-masculino', '🏸', ARRAY[]::text[], ARRAY[]::text[]),
  ('00000000-0000-0000-0000-000000000001', 'Peteca Feminino',  'peteca-feminino',  '🏸', ARRAY[]::text[], ARRAY[]::text[])
ON CONFLICT (edicao_id, slug) DO NOTHING;

-- Resumo
DO $$
DECLARE
  total INT;
  tenis_count INT;
BEGIN
  SELECT COUNT(*) INTO total FROM modalidades
   WHERE edicao_id = '00000000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO tenis_count FROM modalidades
   WHERE edicao_id = '00000000-0000-0000-0000-000000000001'
     AND slug LIKE 'tenis-%';
  RAISE NOTICE 'Total de modalidades: %', total;
  RAISE NOTICE 'Modalidades de tênis cadastradas: %', tenis_count;
END $$;
