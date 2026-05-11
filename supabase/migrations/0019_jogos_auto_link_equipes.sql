-- 0019: Auto-link de jogos a atléticas via match fuzzy de nome
--
-- Quando um jogo é inserido/atualizado com equipe_a_nome (free text), tenta
-- resolver o equipe_a_id automaticamente buscando em equipes (tipo='atletica').
-- Estratégia:
--   1. Match direto (nome normalizado, sem acento, upper)
--   2. Match por slug
--   3. Expansão de abreviações comuns (ENG → ENGENHARIA, MED → MEDICINA, etc.)
-- Se nenhum match: equipe_a_id fica NULL → aparece em /admin/competicao "sem vínculo".

BEGIN;

-- ── Slugify (string → slug-format) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.slugify(input text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        translate(coalesce(input, ''),
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
        ),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  )
$$;

-- ── Normaliza nome de equipe (remove "AA " prefix, acentos, upper, trim) ─────
CREATE OR REPLACE FUNCTION public.normalize_team_name(name text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(
    trim(
      translate(
        regexp_replace(coalesce(name, ''), '^(AA|A\.A\.|ATL\.?|ATLETICA)\s+', '', 'i'),
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
      )
    )
  )
$$;

-- ── Expande abreviações comuns (abbrev → full) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.expand_team_abbrev(name text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE out_name text := name;
BEGIN
  out_name := regexp_replace(out_name, '^ENG\s+',     'ENGENHARIA ',           'i');
  out_name := regexp_replace(out_name, '^MED\s+',     'MEDICINA ',             'i');
  out_name := regexp_replace(out_name, '^DIR\s+',     'DIREITO ',              'i');
  out_name := regexp_replace(out_name, '^ADM\s+',     'ADMINISTRACAO ',        'i');
  out_name := regexp_replace(out_name, '^ECO\s+',     'ECONOMIA ',             'i');
  out_name := regexp_replace(out_name, '^ARQ\s+',     'ARQUITETURA ',          'i');
  out_name := regexp_replace(out_name, '^PSI\s+',     'PSICOLOGIA ',           'i');
  out_name := regexp_replace(out_name, '^FISIO\s+',   'FISIOTERAPIA ',         'i');
  out_name := regexp_replace(out_name, '^ODONTO\s+',  'ODONTOLOGIA ',          'i');
  out_name := regexp_replace(out_name, '^VET\s+',     'VETERINARIA ',          'i');
  out_name := regexp_replace(out_name, '^AGRO\s+',    'AGRONOMIA ',            'i');
  out_name := regexp_replace(out_name, '^ENF\s+',     'ENFERMAGEM ',           'i');
  out_name := regexp_replace(out_name, '^FARM\s+',    'FARMACIA ',             'i');
  out_name := regexp_replace(out_name, '^NUTRI\s+',   'NUTRICAO ',             'i');
  out_name := regexp_replace(out_name, '^EDF\s+',     'EDUCACAO FISICA ',      'i');
  out_name := regexp_replace(out_name, '^EF\s+',      'EDUCACAO FISICA ',      'i');
  out_name := regexp_replace(out_name, '^SI\s+',      'SISTEMAS DE INFORMACAO ','i');
  out_name := regexp_replace(out_name, '^CC\s+',      'CIENCIAS CONTABEIS ',   'i');
  out_name := regexp_replace(out_name, '^BIO\s+',     'CIENCIAS BIOLOGICAS ',  'i');
  out_name := regexp_replace(out_name, '^COMP\s+',    'COMPUTACAO ',           'i');
  RETURN out_name;
END;
$$;

-- ── Contrai abreviações (full → abbrev) — caso storage use forma curta ───────
CREATE OR REPLACE FUNCTION public.contract_team_full(name text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE out_name text := name;
BEGIN
  out_name := regexp_replace(out_name, '^ENGENHARIA\s+',            'ENG ',    'i');
  out_name := regexp_replace(out_name, '^MEDICINA\s+',              'MED ',    'i');
  out_name := regexp_replace(out_name, '^DIREITO\s+',               'DIR ',    'i');
  out_name := regexp_replace(out_name, '^ADMINISTRACAO\s+',         'ADM ',    'i');
  out_name := regexp_replace(out_name, '^ECONOMIA\s+',              'ECO ',    'i');
  out_name := regexp_replace(out_name, '^ARQUITETURA\s+',           'ARQ ',    'i');
  out_name := regexp_replace(out_name, '^PSICOLOGIA\s+',            'PSI ',    'i');
  out_name := regexp_replace(out_name, '^FISIOTERAPIA\s+',          'FISIO ',  'i');
  out_name := regexp_replace(out_name, '^ODONTOLOGIA\s+',           'ODONTO ', 'i');
  out_name := regexp_replace(out_name, '^VETERINARIA\s+',           'VET ',    'i');
  out_name := regexp_replace(out_name, '^AGRONOMIA\s+',             'AGRO ',   'i');
  out_name := regexp_replace(out_name, '^ENFERMAGEM\s+',            'ENF ',    'i');
  out_name := regexp_replace(out_name, '^FARMACIA\s+',              'FARM ',   'i');
  out_name := regexp_replace(out_name, '^NUTRICAO\s+',              'NUTRI ',  'i');
  out_name := regexp_replace(out_name, '^EDUCACAO FISICA\s+',       'EDF ',    'i');
  out_name := regexp_replace(out_name, '^COMPUTACAO\s+',            'COMP ',   'i');
  RETURN out_name;
END;
$$;

-- ── Find atlética por nome (com fallbacks) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_atletica_by_name(team_name text) RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE
  found_id uuid;
  normalized text;
  expanded text;
  contracted text;
  slug_in text;
BEGIN
  IF team_name IS NULL OR trim(team_name) = '' THEN RETURN NULL; END IF;

  normalized := public.normalize_team_name(team_name);
  slug_in    := public.slugify(team_name);

  -- 1. Match direto (nome normalizado)
  SELECT id INTO found_id FROM equipes
  WHERE tipo = 'atletica' AND public.normalize_team_name(nome) = normalized
  LIMIT 1;
  IF found_id IS NOT NULL THEN RETURN found_id; END IF;

  -- 2. Match por slug
  SELECT id INTO found_id FROM equipes
  WHERE tipo = 'atletica' AND slug = slug_in
  LIMIT 1;
  IF found_id IS NOT NULL THEN RETURN found_id; END IF;

  -- 3. Match com abreviação expandida (abbrev → full)
  expanded := public.expand_team_abbrev(normalized);
  IF expanded <> normalized THEN
    SELECT id INTO found_id FROM equipes
    WHERE tipo = 'atletica' AND public.normalize_team_name(nome) = expanded
    LIMIT 1;
    IF found_id IS NOT NULL THEN RETURN found_id; END IF;
  END IF;

  -- 4. Match com forma contraída (full → abbrev) — storage usa forma curta
  contracted := public.contract_team_full(normalized);
  IF contracted <> normalized THEN
    SELECT id INTO found_id FROM equipes
    WHERE tipo = 'atletica' AND public.normalize_team_name(nome) = contracted
    LIMIT 1;
    IF found_id IS NOT NULL THEN RETURN found_id; END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- ── Trigger function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.jogos_auto_link_equipes() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Equipe A
  IF (TG_OP = 'INSERT' AND NEW.equipe_a_id IS NULL AND NEW.equipe_a_nome IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.equipe_a_nome IS DISTINCT FROM OLD.equipe_a_nome) THEN
    NEW.equipe_a_id := public.find_atletica_by_name(NEW.equipe_a_nome);
  END IF;

  -- Equipe B
  IF (TG_OP = 'INSERT' AND NEW.equipe_b_id IS NULL AND NEW.equipe_b_nome IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.equipe_b_nome IS DISTINCT FROM OLD.equipe_b_nome) THEN
    NEW.equipe_b_id := public.find_atletica_by_name(NEW.equipe_b_nome);
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger ──────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS jogos_auto_link ON jogos;
CREATE TRIGGER jogos_auto_link
BEFORE INSERT OR UPDATE OF equipe_a_nome, equipe_b_nome ON jogos
FOR EACH ROW EXECUTE FUNCTION public.jogos_auto_link_equipes();

-- ── Backfill (jogos table currently empty mas idempotente) ───────────────────
UPDATE jogos SET
  equipe_a_id = COALESCE(equipe_a_id, public.find_atletica_by_name(equipe_a_nome)),
  equipe_b_id = COALESCE(equipe_b_id, public.find_atletica_by_name(equipe_b_nome))
WHERE
  (equipe_a_id IS NULL AND equipe_a_nome IS NOT NULL) OR
  (equipe_b_id IS NULL AND equipe_b_nome IS NOT NULL);

COMMIT;

-- ── Verificação pós-migration ────────────────────────────────────────────────
-- SELECT
--   count(*) FILTER (WHERE equipe_a_id IS NULL AND equipe_a_nome IS NOT NULL) AS unmatched_a,
--   count(*) FILTER (WHERE equipe_b_id IS NULL AND equipe_b_nome IS NOT NULL) AS unmatched_b
-- FROM jogos;
