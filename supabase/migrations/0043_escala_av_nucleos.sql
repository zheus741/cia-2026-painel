-- ── Escala foto/vídeo reformulada: núcleos, parceiros e sem horário ─────────
-- Núcleo esportivo  → setores tipo 'esportivo' (alimentado pela planilha de jogos)
-- Núcleo festivo    → 7 setores fixos do evento

-- ── 1) Coluna núcleo em setores ──────────────────────────────────────────────
ALTER TABLE public.setores
  ADD COLUMN IF NOT EXISTS nucleo text CHECK (nucleo IN ('esportivo', 'festivo'));

-- Todo setor esportivo entra no núcleo esportivo
UPDATE public.setores SET nucleo = 'esportivo' WHERE tipo = 'esportivo';

-- ── 2) Setores festivos — renomeia palcos existentes + cria os que faltam ────
UPDATE public.setores SET nome = 'PALCO PRINCIPAL',  nucleo = 'festivo' WHERE nome ILIKE 'palco principal%';
UPDATE public.setores SET nome = 'PALCO ELETRONICO', nucleo = 'festivo' WHERE nome ILIKE 'palco eletr%';
UPDATE public.setores SET nome = 'PALCO 360',        nucleo = 'festivo' WHERE nome ILIKE 'palco 360%';

-- Cria os festivos sem correspondência clara (idempotente)
INSERT INTO public.setores (edicao_id, nome, tipo, nucleo)
SELECT ed.id, v.nome, 'festa'::tipo_setor, 'festivo'
FROM (
  SELECT edicao_id AS id FROM public.setores
  GROUP BY edicao_id ORDER BY count(*) DESC LIMIT 1
) ed
CROSS JOIN (VALUES
  ('PUBLICO NOTURNO'),
  ('INSTITUCIONAL'),
  ('PUBLICO ARENA'),
  ('CIA CLUB')
) v(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM public.setores s WHERE upper(s.nome) = v.nome
);

-- ── 3) Parceiros — normaliza as 5 empresas oficiais ──────────────────────────
UPDATE public.parceiros SET nome = 'CuruClicks',   tipo = 'foto'  WHERE upper(nome) LIKE 'CURUCLICKS%';
UPDATE public.parceiros SET nome = 'Olharr',       tipo = 'foto'  WHERE upper(nome) LIKE 'OLHAR%';
UPDATE public.parceiros SET nome = 'Indie Clicks', tipo = 'foto'  WHERE upper(nome) LIKE 'INDIE%';
UPDATE public.parceiros SET nome = 'Então Toma',   tipo = 'video' WHERE upper(nome) LIKE 'ENTAO%' OR upper(nome) LIKE 'ENTÃO%';
UPDATE public.parceiros SET nome = 'NIX Vídeos',   tipo = 'video' WHERE upper(nome) LIKE 'NIX%';

-- Desativa parceiros fora da lista oficial
UPDATE public.parceiros SET ativo = false
WHERE nome NOT IN ('CuruClicks', 'Olharr', 'Indie Clicks', 'Então Toma', 'NIX Vídeos');

-- ── 4) Turno sem horário — inicio/fim opcionais ──────────────────────────────
ALTER TABLE public.turnos ALTER COLUMN inicio DROP NOT NULL;
ALTER TABLE public.turnos ALTER COLUMN fim    DROP NOT NULL;
