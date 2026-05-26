-- ============================================================
-- Chaveamento oficial CIA 2026
-- Gerado de: nixage75_chaveamento_cia.sql (MySQL dump)
-- Total: 110 chaves
-- ============================================================

-- Limpa configs anteriores (substitui 100% pelo oficial)
TRUNCATE TABLE chave_config;

-- Basquete Feminino · Feminino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '1ª Divisão', 16, ARRAY['HUMANAS UFU', 'MEDICINA UFMG', 'ENGENHARIA UFU', 'MED UFTM', 'EDUCA UNIUBE', 'ITA', 'DIREITO UFU', 'MONETÁRIA UFU', 'MED UFU', 'SAÚDE E ESPORTE', 'MED UNIUBE', 'UNIFEI', 'EEFFTO UFMG', 'ENG UFTM', 'GLORIOSA UFTM', 'ENG UFMG']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '1ª Divisão', 16, ARRAY['ENG UFMG', 'ITA', 'EDUCA UNIUBE', 'UNIFEI', 'MED UFU', 'MED UNIUBE', 'SAÚDE E ESPORTE', 'MEDICINA UFMG', 'HUMANAS UFU', 'DIREITO UFU', 'GLORIOSA UFTM', 'MED UFTM', 'ENG UFTM', 'ENGENHARIA UFU', 'EEFFTO UFMG', 'MONETÁRIA UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '1ª Divisão', 16, ARRAY['EDUCA UNIUBE', 'UNIFEI', 'MEDICINA UFMG', 'MED UFU', 'ENGENHARIA UFU', 'MED UNIUBE', 'ITA', 'MED UFTM', 'MONETÁRIA UFU', 'ENG UFTM', 'GLORIOSA UFTM', 'ENG UFMG', 'DIREITO UFU', 'SAÚDE E ESPORTE', 'HUMANAS UFU', 'EEFFTO UFMG']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '1ª Divisão', 16, ARRAY['ENGENHARIA UFU', 'ENG UFMG', 'EDUCA UNIUBE', 'MONETÁRIA UFU', 'DIREITO UFU', 'MED UFTM', 'UNIFEI', 'ENG UFTM', 'HUMANAS UFU', 'ITA', 'SAÚDE E ESPORTE', 'GLORIOSA UFTM', 'MED UFU', 'MEDICINA UFMG', 'EEFFTO UFMG', 'MED UNIUBE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '1ª Divisão', 16, ARRAY['ENGENHARIA UFU', 'MONETÁRIA UFU', 'EDUCA UNIUBE', 'ENG UFMG', 'MEDICINA UFMG', 'ITA', 'DIREITO UFU', 'GLORIOSA UFTM', 'EEFFTO UFMG', 'SAÚDE E ESPORTE', 'HUMANAS UFU', 'MED UFTM', 'MED UFU', 'UNIFEI', 'ENG UFTM', 'MED UNIUBE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Futebol de Campo · Masculino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol de Campo' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol de Campo' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '1ª Divisão', 16, ARRAY['EDUCA UNIUBE', 'MED UNIUBE', 'UNIFEI', 'MED UFTM', 'ENGENHARIA UFU', 'HUMANAS UFU', 'EEFFTO UFMG', 'MONETÁRIA UFU', 'ENG UFMG', 'ITA', 'DIREITO UFU', 'GLORIOSA UFTM', 'MED UFU', 'ENG UFTM', 'SAÚDE E ESPORTE', 'MEDICINA UFMG']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol de Campo';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '2ª Divisão', 16, ARRAY['LAUCB', 'LAUNAERP', 'DIREITO UFMG', 'CAAP UFABC', 'MED UNIFENAS', 'FACE UFMG', 'DIREITO USP', 'LAU UNIPAM', 'DIREITO PUC', 'FAEFI UFU', 'AGRÁRIAS UFU', 'ENG PUC', 'BRUTUS UFSJ', 'UNIFRAN', 'UNICAMP LIMEIRA', 'UEMG FRUTAL']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'RANACH', 5, ARRAY['COMP UFU', 'FISIO UNIUBE', 'BIOEXATAS', 'ENG UNIUBE', 'IFTM']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '1ª Divisão', 16, ARRAY['MEDICINA UFMG', 'HUMANAS UFU', 'MED UFU', 'MED UFTM', 'ITA', 'EDUCA UNIUBE', 'EEFFTO UFMG', 'ENG UFTM', 'DIREITO UFU', 'SAÚDE E ESPORTE', 'ENG UFMG', 'GLORIOSA UFTM', 'UNIFEI', 'MED UNIUBE', 'MONETÁRIA UFU', 'ENGENHARIA UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '1ª Divisão', 15, ARRAY['ENGENHARIA UFU', 'MEDICINA UFMG', 'MED UNIUBE', 'ENG UFMG', 'MED UFTM', 'DIREITO UFU', 'MED UFU', 'EDUCA UNIUBE', 'UNIFEI', 'SAÚDE E ESPORTE', 'GLORIOSA UFTM', 'HUMANAS UFU', 'ENG UFTM', 'MONETÁRIA UFU', 'EEFFTO UFMG']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '1ª Divisão', 16, ARRAY['ENG UFMG', 'MONETÁRIA UFU', 'MED UFTM', 'ENGENHARIA UFU', 'MED UFU', 'GLORIOSA UFTM', 'EDUCA UNIUBE', 'ENG UFTM', 'SAÚDE E ESPORTE', 'UNIFEI', 'HUMANAS UFU', 'MED UNIUBE', 'DIREITO UFU', 'MEDICINA UFMG', 'EEFFTO UFMG', 'ITA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '2ª Divisão', 16, ARRAY['LAUCB', 'ENG PUC', 'CAAP UFABC', 'DIREITO UFMG', 'DIREITO USP', 'DIREITO PUC', 'LAUNAERP', 'FAEFI UFU', 'AGRÁRIAS UFU', 'UNIFRAN', 'BRUTUS UFSJ', 'LAU UNIPAM', 'UNICAMP LIMEIRA', 'FACE UFMG', 'UEMG FRUTAL', 'MED UNIFENAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '1ª Divisão', 16, ARRAY['MED UFU', 'ENG UFTM', 'DIREITO UFU', 'ENG UFMG', 'SAÚDE E ESPORTE', 'ITA', 'MEDICINA UFMG', 'GLORIOSA UFTM', 'HUMANAS UFU', 'ENGENHARIA UFU', 'MED UFTM', 'MED UNIUBE', 'EEFFTO UFMG', 'UNIFEI', 'MONETÁRIA UFU', 'EDUCA UNIUBE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Basquete Feminino · Feminino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'RANACH', 2, ARRAY['BIOLÓGICAS', 'COMP UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · 1ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '1ª Divisão', 16, ARRAY['MONETÁRIA UFU', 'ENG UFMG', 'EDUCA UNIUBE', 'MEDICINA UFMG', 'MED UNIUBE', 'MED UFU', 'ENGENHARIA UFU', 'UNIFEI', 'EEFFTO UFMG', 'HUMANAS UFU', 'DIREITO UFU', 'GLORIOSA UFTM', 'MED UFTM', 'ITA', 'ENG UFTM', 'SAÚDE E ESPORTE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Basquete Feminino · Feminino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '2ª Divisão', 15, ARRAY['MED UNIFENAS', 'CAAP UFABC', 'DIREITO PUC', 'FACE UFMG', 'BRUTUS UFSJ', 'LAU UNIPAM', 'UNICAMP LIMEIRA', 'LAUNAERP', 'LAUCB', 'FAEFI UFU', 'DIREITO USP', 'ENG PUC', 'DIREITO UFMG', 'UNIFRAN', 'AGRÁRIAS UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '2ª Divisão', 14, ARRAY['DIREITO UFMG', 'LAUNAERP', 'LAUCB', 'MED UNIFENAS', 'UNICAMP LIMEIRA', 'DIREITO USP', 'LAU UNIPAM', 'FAEFI UFU', 'UNIFRAN', 'FACE UFMG', 'AGRÁRIAS UFU', 'CAAP UFABC', 'BRUTUS UFSJ', 'DIREITO PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '2ª Divisão', 16, ARRAY['ENG PUC', 'LAUNAERP', 'CAAP UFABC', 'MED UNIFENAS', 'DIREITO PUC', 'DIREITO UFMG', 'DIREITO USP', 'FAEFI UFU', 'LAU UNIPAM', 'BRUTUS UFSJ', 'UNIFRAN', 'FACE UFMG', 'UNICAMP LIMEIRA', 'UEMG FRUTAL', 'AGRÁRIAS UFU', 'LAUCB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '2ª Divisão', 15, ARRAY['ENG PUC', 'MED UNIFENAS', 'LAUCB', 'DIREITO USP', 'AGRÁRIAS UFU', 'LAUNAERP', 'LAU UNIPAM', 'CAAP UFABC', 'DIREITO UFMG', 'FAEFI UFU', 'BRUTUS UFSJ', 'DIREITO PUC', 'FACE UFMG', 'UNIFRAN', 'UNICAMP LIMEIRA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '2ª Divisão', 15, ARRAY['MED UNIFENAS', 'LAUCB', 'LAUNAERP', 'DIREITO UFMG', 'BRUTUS UFSJ', 'FAEFI UFU', 'DIREITO PUC', 'DIREITO USP', 'CAAP UFABC', 'UNIFRAN', 'LAU UNIPAM', 'UNICAMP LIMEIRA', 'AGRÁRIAS UFU', 'FACE UFMG', 'ENG PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '2ª Divisão', 16, ARRAY['ENG PUC', 'LAUCB', 'DIREITO UFMG', 'DIREITO USP', 'FACE UFMG', 'CAAP UFABC', 'BRUTUS UFSJ', 'AGRÁRIAS UFU', 'DIREITO PUC', 'UEMG FRUTAL', 'LAU UNIPAM', 'LAUNAERP', 'UNICAMP LIMEIRA', 'MED UNIFENAS', 'FAEFI UFU', 'UNIFRAN']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Futebol de Campo · Masculino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol de Campo' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol de Campo' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '2ª Divisão', 15, ARRAY['LAUCB', 'ENG PUC', 'DIREITO UFMG', 'LAUNAERP', 'DIREITO USP', 'FACE UFMG', 'AGRÁRIAS UFU', 'BRUTUS UFSJ', 'UNIFRAN', 'LAU UNIPAM', 'UNICAMP LIMEIRA', 'CAAP UFABC', 'DIREITO PUC', 'FAEFI UFU', 'MED UNIFENAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol de Campo';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', '2ª Divisão', 16, ARRAY['LAUCB', 'LAUNAERP', 'DIREITO UFMG', 'MED UNIFENAS', 'LAU UNIPAM', 'FAEFI UFU', 'ENG PUC', 'AGRÁRIAS UFU', 'UNICAMP LIMEIRA', 'BRUTUS UFSJ', 'DIREITO USP', 'UEMG FRUTAL', 'CAAP UFABC', 'FACE UFMG', 'UNIFRAN', 'DIREITO PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · 2ª Divisão
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', '2ª Divisão', 16, ARRAY['LAUNAERP', 'LAUCB', 'ENG PUC', 'CAAP UFABC', 'LAU UNIPAM', 'DIREITO UFMG', 'UEMG FRUTAL', 'UNIFRAN', 'UNICAMP LIMEIRA', 'FACE UFMG', 'BRUTUS UFSJ', 'AGRÁRIAS UFU', 'MED UNIFENAS', 'DIREITO USP', 'DIREITO PUC', 'FAEFI UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Basquete Masculino · Masculino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'RANACH', 4, ARRAY['COMP UFU', 'IFTM', 'BIOLÓGICAS', 'BIOEXATAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'RANACH', 3, ARRAY['BIOEXATAS', 'COMP UFU', 'IFTM']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'RANACH', 3, ARRAY['COMP UFU', 'BIOLÓGICAS', 'IFTM']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'RANACH', 3, ARRAY['FISIO UNIUBE', 'COMP UFU', 'BIOLÓGICAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'RANACH', 3, ARRAY['COMP UFU', 'BIOLÓGICAS', 'FISIO UNIUBE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Basquete Feminino · Feminino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'URAH', 3, ARRAY['DIREITO UNIUBE', 'ODONTO UFU', 'ARTES UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'URAH', 2, ARRAY['DIREITO UNIUBE', 'ARTES UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'RANACH', 5, ARRAY['IFTM', 'COMP UFU', 'FISIO UNIUBE', 'APLICADA UFU', 'BIOLÓGICAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'RANACH', 7, ARRAY['COMP UFU', 'BIOEXATAS', 'IFTM', 'BIOLÓGICAS', 'ENG UNIUBE', 'FISIO UNIUBE', 'APLICADA UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'URAH', 4, ARRAY['MIASMA', 'ODONTO UNIUBE', 'ODONTO UFU', 'DIREITO UNIUBE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'URAH', 5, ARRAY['ZEBUZERA', 'ODONTO UFU', 'DIREITO UNIUBE', 'MIASMA', 'ARTES UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'URAH', 6, ARRAY['DIREITO UNIUBE', 'ODONTO UFU', 'MIASMA', 'ZEBUZERA', 'ARTES UFU', 'ODONTO UNIUBE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'URAH', 5, ARRAY['ODONTO UFU', 'DIREITO UNIUBE', 'ZEBUZERA', 'MIASMA', 'ARTES UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'URAH', 2, ARRAY['ARTES UFU', 'DIREITO UNIUBE']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'URAH', 6, ARRAY['DIREITO UNIUBE', 'ARTES UFU', 'ZEBUZERA', 'ODONTO UFU', 'ODONTO UNIUBE', 'MIASMA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'URAH', 6, ARRAY['DIREITO UNIUBE', 'ARTES UFU', 'ODONTO UFU', 'ODONTO UNIUBE', 'MIASMA', 'ZEBUZERA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'URAH', 6, ARRAY['ODONTO UFU', 'ODONTO UNIUBE', 'ARTES UFU', 'DIREITO UNIUBE', 'MIASMA', 'ZEBUZERA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · URAH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'URAH', 6, ARRAY['MIASMA', 'ODONTO UNIUBE', 'ZEBUZERA', 'ARTES UFU', 'DIREITO UNIUBE', 'ODONTO UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Basquete Feminino · Feminino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ELDORADO', 4, ARRAY['ARARAS', 'PUC POÇOS', 'LOBO DA SERRA', 'IF SUL DE MINAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ELDORADO', 4, ARRAY['LEAPUC', 'ARARAS', 'IF SUL DE MINAS', 'LOBO DA SERRA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ELDORADO', 3, ARRAY['PUC POÇOS', 'LEAPUC', 'ARARAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ELDORADO', 5, ARRAY['ARARAS', 'PUC POÇOS', 'LEAPUC', 'IF SUL DE MINAS', 'LOBO DA SERRA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ELDORADO', 6, ARRAY['PUC POÇOS', 'ARARAS', 'LOBO DA SERRA', 'VIRA LATA UFV', 'IF SUL DE MINAS', 'LEAPUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ELDORADO', 5, ARRAY['ARARAS', 'PUC POÇOS', 'LOBO DA SERRA', 'LEAPUC', 'IF SUL DE MINAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ELDORADO', 4, ARRAY['ARARAS', 'VIRA LATA UFV', 'IF SUL DE MINAS', 'LOBO DA SERRA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ELDORADO', 5, ARRAY['ARARAS', 'IF SUL DE MINAS', 'PUC POÇOS', 'LEAPUC', 'LOBO DA SERRA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ELDORADO', 4, ARRAY['ARARAS', 'LEAPUC', 'PUC POÇOS', 'LOBO DA SERRA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ELDORADO', 5, ARRAY['ARARAS', 'VIRA LATA UFV', 'LEAPUC', 'PUC POÇOS', 'LOBO DA SERRA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · ELDORADO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ELDORADO', 5, ARRAY['LEAPUC', 'LOBO DA SERRA', 'VIRA LATA UFV', 'ARARAS', 'PUC POÇOS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Basquete Feminino · Feminino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ESPETÁCULO', 6, ARRAY['XARADA UFLA', 'XV DE SETEMBRO', 'FEA USP', 'FILUS', 'FACECA', 'X DE OUTUBRO']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ESPETÁCULO', 7, ARRAY['XV DE SETEMBRO', 'FEA USP', 'XARADA UFLA', 'X DE OUTUBRO', 'VIKINGS', 'FACECA', 'FILUS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ESPETÁCULO', 7, ARRAY['XV DE SETEMBRO', 'FILUS', 'XARADA UFLA', 'VIKINGS', 'X DE OUTUBRO', 'FEA USP', 'FACECA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ESPETÁCULO', 6, ARRAY['XARADA UFLA', 'FACECA', 'FILUS', 'FEA USP', 'X DE OUTUBRO', 'XV DE SETEMBRO']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ESPETÁCULO', 6, ARRAY['XARADA UFLA', 'FACECA', 'FEA USP', 'FILUS', 'XV DE SETEMBRO', 'X DE OUTUBRO']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ESPETÁCULO', 6, ARRAY['FILUS', 'XV DE SETEMBRO', 'XARADA UFLA', 'X DE OUTUBRO', 'FEA USP', 'FACECA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ESPETÁCULO', 6, ARRAY['FACECA', 'XV DE SETEMBRO', 'X DE OUTUBRO', 'XARADA UFLA', 'FEA USP', 'FILUS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ESPETÁCULO', 6, ARRAY['XV DE SETEMBRO', 'FACECA', 'FEA USP', 'X DE OUTUBRO', 'XARADA UFLA', 'FILUS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ESPETÁCULO', 7, ARRAY['XV DE SETEMBRO', 'FACECA', 'FEA USP', 'FILUS', 'VIKINGS', 'XARADA UFLA', 'X DE OUTUBRO']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ESPETÁCULO', 7, ARRAY['FACECA', 'XV DE SETEMBRO', 'XARADA UFLA', 'VIKINGS', 'X DE OUTUBRO', 'FILUS', 'FEA USP']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Basquete Feminino · Feminino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'CYBERCITY', 4, ARRAY['DIREITO UNB', 'ECONOMIA UNICAMP', 'ECAD', 'MED PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'CYBERCITY', 5, ARRAY['ECONOMIA UNICAMP', 'MED PUC', 'DIREITO FDF', 'DIREITO UNB', 'ECAD']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Basquete Feminino · Feminino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'KAZURA', 5, ARRAY['UNIFESP', 'TENEBROSA', 'ORIGINAL UFV', 'FACEF', 'LAU UFLA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'KAZURA', 6, ARRAY['LAU UFLA', 'TENEBROSA', 'LAUFMT', 'ORIGINAL UFV', 'UNIFESP', 'FACEF']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'KAZURA', 5, ARRAY['TENEBROSA', 'LAU UFLA', 'UNIFESP', 'ORIGINAL UFV', 'FACEF']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'KAZURA', 5, ARRAY['LAU UFLA', 'ORIGINAL UFV', 'FACEF', 'UNIFESP', 'TENEBROSA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'KAZURA', 5, ARRAY['ORIGINAL UFV', 'UNIFESP', 'FACEF', 'LAU UFLA', 'TENEBROSA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'KAZURA', 5, ARRAY['UNIFESP', 'ORIGINAL UFV', 'LAU UFLA', 'FACEF', 'TENEBROSA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'KAZURA', 6, ARRAY['UNIFESP', 'ORIGINAL UFV', 'TENEBROSA', 'FACEF', 'LAU UFLA', 'LAUFMT']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'KAZURA', 6, ARRAY['ORIGINAL UFV', 'LAU UFLA', 'FACEF', 'TENEBROSA', 'UNIFESP', 'LAUFMT']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'KAZURA', 6, ARRAY['LAUFMT', 'UNIFESP', 'ORIGINAL UFV', 'TENEBROSA', 'FACEF', 'LAU UFLA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'KAZURA', 6, ARRAY['LAU UFLA', 'UNIFESP', 'ORIGINAL UFV', 'FACEF', 'LAUFMT', 'TENEBROSA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · KAZURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'KAZURA', 6, ARRAY['LAUFMT', 'LAU UFLA', 'UNIFESP', 'ORIGINAL UFV', 'TENEBROSA', 'FACEF']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Basquete Feminino · Feminino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ALLURA', 4, ARRAY['URSÃO', 'FZEA', 'TOURO PUC', 'FAFICH UFMG']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ALLURA', 5, ARRAY['TOURO PUC', 'FZEA', 'FAFICH UFMG', 'GUAXINIM', 'URSÃO']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ALLURA', 6, ARRAY['URSÃO', 'FAFICH UFMG', 'FZEA', 'ALFA PUC', 'TOURO PUC', 'GUAXINIM']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ALLURA', 6, ARRAY['FAFICH UFMG', 'TOURO PUC', 'URSÃO', 'GUAXINIM', 'ALFA PUC', 'FZEA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ALLURA', 7, ARRAY['TOURO PUC', 'VISIONÁRIA', 'URSÃO', 'FZEA', 'GUAXINIM', 'ALFA PUC', 'FAFICH UFMG']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ALLURA', 6, ARRAY['FAFICH UFMG', 'ALFA PUC', 'URSÃO', 'TOURO PUC', 'GUAXINIM', 'FZEA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ALLURA', 5, ARRAY['TOURO PUC', 'FAFICH UFMG', 'GUAXINIM', 'FZEA', 'URSÃO']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ALLURA', 6, ARRAY['TOURO PUC', 'GUAXINIM', 'FAFICH UFMG', 'URSÃO', 'FZEA', 'ALFA PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ALLURA', 7, ARRAY['TOURO PUC', 'FAFICH UFMG', 'VISIONÁRIA', 'GUAXINIM', 'URSÃO', 'FZEA', 'ALFA PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ALLURA', 7, ARRAY['FZEA', 'TOURO PUC', 'FAFICH UFMG', 'GUAXINIM', 'URSÃO', 'ALFA PUC', 'VISIONÁRIA']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · ALLURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ALLURA', 7, ARRAY['TOURO PUC', 'FZEA', 'GUAXINIM', 'VISIONÁRIA', 'URSÃO', 'FAFICH UFMG', 'ALFA PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'CYBERCITY', 7, ARRAY['DIREITO FDF', 'MED PUC', 'ECAD', 'MED FACEF', 'MED 7 LAGOAS', 'ECONOMIA UNICAMP', 'DIREITO UNB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'CYBERCITY', 4, ARRAY['ECONOMIA UNICAMP', 'ECAD', 'MED PUC', 'MED 7 LAGOAS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'CYBERCITY', 7, ARRAY['MED FACEF', 'ECONOMIA UNICAMP', 'DIREITO UNB', 'DIREITO FDF', 'ECAD', 'MED 7 LAGOAS', 'MED PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'CYBERCITY', 6, ARRAY['MED FACEF', 'ECONOMIA UNICAMP', 'MED 7 LAGOAS', 'DIREITO FDF', 'MED PUC', 'DIREITO UNB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'CYBERCITY', 6, ARRAY['ECONOMIA UNICAMP', 'DIREITO UNB', 'ECAD', 'MED PUC', 'MED 7 LAGOAS', 'DIREITO FDF']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'CYBERCITY', 7, ARRAY['MED FACEF', 'MED PUC', 'DIREITO FDF', 'DIREITO UNB', 'MED 7 LAGOAS', 'ECONOMIA UNICAMP', 'ECAD']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'CYBERCITY', 7, ARRAY['MED FACEF', 'MED 7 LAGOAS', 'MED PUC', 'ECONOMIA UNICAMP', 'DIREITO UNB', 'ECAD', 'DIREITO FDF']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'CYBERCITY', 6, ARRAY['MED FACEF', 'ECAD', 'MED PUC', 'DIREITO FDF', 'MED 7 LAGOAS', 'ECONOMIA UNICAMP']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · CYBERCITY
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'CYBERCITY', 7, ARRAY['ECONOMIA UNICAMP', 'DIREITO FDF', 'MED 7 LAGOAS', 'ECAD', 'DIREITO UNB', 'MED PUC', 'MED FACEF']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Futsal Masculino · Masculino · ESPETÁCULO
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ESPETÁCULO', 7, ARRAY['FACECA', 'XV DE SETEMBRO', 'FEA USP', 'XARADA UFLA', 'X DE OUTUBRO', 'FILUS', 'VIKINGS']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Basquete Feminino · Feminino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ATHEMPURA', 3, ARRAY['LEP', 'CHEFÕES', 'MAQUINADA UNB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Feminino';
  END IF;
END $$;

-- Basquete Masculino · Masculino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Basquete Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Basquete Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ATHEMPURA', 5, ARRAY['CHEFÕES', 'LAAUUFJ RAIVOSA', 'LEP', 'LIGA CEM', 'MAQUINADA UNB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Basquete Masculino';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ATHEMPURA', 6, ARRAY['LEP', 'CHEFÕES', 'LIGA CEM', 'AJAC PUC', 'LAAUUFJ RAIVOSA', 'MAQUINADA UNB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Futsal Feminino · Feminino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ATHEMPURA', 6, ARRAY['AJAC PUC', 'MAQUINADA UNB', 'LEP', 'LIGA CEM', 'LAAUUFJ RAIVOSA', 'CHEFÕES']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Feminino';
  END IF;
END $$;

-- Futsal Masculino · Masculino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futsal Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futsal Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ATHEMPURA', 6, ARRAY['MAQUINADA UNB', 'LEP', 'LIGA CEM', 'LAAUUFJ RAIVOSA', 'AJAC PUC', 'CHEFÕES']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futsal Masculino';
  END IF;
END $$;

-- Handebol Feminino · Feminino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ATHEMPURA', 5, ARRAY['CHEFÕES', 'LEP', 'MAQUINADA UNB', 'AJAC PUC', 'LIGA CEM']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Feminino';
  END IF;
END $$;

-- Handebol Masculino · Masculino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Handebol Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Handebol Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ATHEMPURA', 6, ARRAY['CHEFÕES', 'LAAUUFJ RAIVOSA', 'MAQUINADA UNB', 'LIGA CEM', 'AJAC PUC', 'LEP']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Handebol Masculino';
  END IF;
END $$;

-- Vôlei Feminino · Feminino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Feminino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Feminino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ATHEMPURA', 6, ARRAY['LEP', 'LIGA CEM', 'AJAC PUC', 'MAQUINADA UNB', 'LAAUUFJ RAIVOSA', 'CHEFÕES']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Feminino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ATHEMPURA', 6, ARRAY['LEP', 'LAAUUFJ RAIVOSA', 'CHEFÕES', 'LIGA CEM', 'AJAC PUC', 'MAQUINADA UNB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;

-- Vôlei de Praia Fem. · Feminino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Fem.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Fem.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Feminino', 'ATHEMPURA', 6, ARRAY['LEP', 'CHEFÕES', 'LAAUUFJ RAIVOSA', 'AJAC PUC', 'LIGA CEM', 'MAQUINADA UNB']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Fem.';
  END IF;
END $$;

-- Vôlei de Praia Masc. · Masculino · ATHEMPURA
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei de Praia Masc.' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei de Praia Masc.' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'ATHEMPURA', 6, ARRAY['LEP', 'LIGA CEM', 'MAQUINADA UNB', 'LAAUUFJ RAIVOSA', 'CHEFÕES', 'AJAC PUC']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei de Praia Masc.';
  END IF;
END $$;

-- Futebol 7 Masculino · Masculino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Futebol 7 Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Futebol 7 Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'RANACH', 4, ARRAY['ENG UNIUBE', 'FISIO UNIUBE', 'COMP UFU', 'IFTM']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Futebol 7 Masculino';
  END IF;
END $$;

-- Vôlei Masculino · Masculino · RANACH
DO $$
DECLARE _mod UUID; _eid UUID;
BEGIN
  SELECT id INTO _eid FROM edicoes WHERE ativa = true LIMIT 1;
  SELECT id INTO _mod FROM modalidades WHERE edicao_id = _eid AND nome = 'Vôlei Masculino' LIMIT 1;
  IF _mod IS NULL THEN
    SELECT id INTO _mod FROM modalidades WHERE nome = 'Vôlei Masculino' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF _mod IS NOT NULL THEN
    INSERT INTO chave_config(modalidade_id, categoria, divisao, num_teams, seeds)
    VALUES (_mod, 'Masculino', 'RANACH', 6, ARRAY['COMP UFU', 'FISIO UNIUBE', 'IFTM', 'BIOLÓGICAS', 'ENG UNIUBE', 'APLICADA UFU']::text[]);
  ELSE
    RAISE NOTICE 'Modalidade nao encontrada: Vôlei Masculino';
  END IF;
END $$;
