-- 0018: limpeza dos dados de teste pré-existentes
-- Remove:
--   • 287 jogos de teste do 0008_test_data
--   • 32 atléticas fake (formato 'AA *') do 0008_test_data
--   • 12 modalidades duplicadas que separavam por naipe no nome em vez de usar categoria
-- Preserva:
--   • As 84 atléticas reais seedadas no 0017 (do XLSX)
--   • As 18 modalidades canônicas (12 originais do 0005 + 6 novas do 0017)
--   • Audit logs intactos

BEGIN;

-- ── 1) Apaga todos os jogos de teste ─────────────────────────────────────────
-- Os jogos cadastrados hoje são test_data (referenciam nome em texto, não FK).
-- Limpamos tudo pra começar do zero com jogos reais do chaveamento.
DELETE FROM jogos;

-- ── 2) Apaga atléticas fake ('AA *') do 0008_test_data ───────────────────────
DELETE FROM equipes
WHERE tipo = 'atletica'
  AND nome LIKE 'AA %';

-- ── 3) Apaga modalidades duplicadas (separavam naipe no nome) ────────────────
-- O schema correto usa modalidade gênero-neutra + categoria (M/F) em jogos.
DELETE FROM modalidades
WHERE slug IN (
  'futsal-masculino',
  'futsal-feminino',
  'volei-masculino',
  'volei-feminino',
  'volei-de-praia-masc',
  'volei-de-praia-fem',
  'basquete-masculino',
  'basquete-feminino',
  'handebol-masculino',
  'handebol-feminino',
  'futebol-de-campo',        -- duplicata: 'futebol' já existe como canônica
  'futebol-7-masculino'      -- duplicata: 'fut-7' já existe como canônica
);

COMMIT;

-- ── Verificação pós-cleanup ──────────────────────────────────────────────────
-- SELECT count(*) FROM jogos;                              -- esperado: 0
-- SELECT count(*) FROM equipes WHERE tipo='atletica';      -- esperado: 84
-- SELECT count(*) FROM modalidades;                        -- esperado: 18
