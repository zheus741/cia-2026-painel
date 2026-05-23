-- ── Normaliza abreviações de conferência ────────────────────────────────────
-- A planilha oficial usa abreviações (CYBERC, ATHEMP, ELDORA, ESPETÁ,
-- CYBERCOTY) que viraram valores soltos em equipes.conferencia e
-- jogos.divisao. Mapeia tudo pros 8 nomes canônicos do sistema.

-- equipes.conferencia
UPDATE public.equipes SET conferencia = 'CYBER CITY'
  WHERE upper(conferencia) IN ('CYBERC','CYBERCOTY','CYBER CITY','CYBER');
UPDATE public.equipes SET conferencia = 'ATHEMPURA'
  WHERE upper(conferencia) IN ('ATHEMP','ATHEMPURA');
UPDATE public.equipes SET conferencia = 'ELDORADO'
  WHERE upper(conferencia) IN ('ELDORA','ELDORADO');
UPDATE public.equipes SET conferencia = 'ESPETÁCULO'
  WHERE upper(conferencia) IN ('ESPETA','ESPETÁ','ESPETACULO','ESPETÁCULO');
UPDATE public.equipes SET conferencia = 'ALLURA'    WHERE upper(conferencia) = 'ALLURA';
UPDATE public.equipes SET conferencia = 'KAZURA'    WHERE upper(conferencia) = 'KAZURA';
UPDATE public.equipes SET conferencia = 'URAH'      WHERE upper(conferencia) = 'URAH';
UPDATE public.equipes SET conferencia = 'RANACH'    WHERE upper(conferencia) = 'RANACH';

-- Valores que não são conferência (1ª, 2ª, 2º) — divisões coladas no
-- campo errado. Zera o campo conferencia (a divisão fica em equipes.divisao).
UPDATE public.equipes SET conferencia = NULL
  WHERE conferencia IS NOT NULL
    AND upper(conferencia) NOT IN (
      'ALLURA','KAZURA','CYBER CITY','ESPETÁCULO','ELDORADO','ATHEMPURA','URAH','RANACH'
    );

-- jogos.divisao: aplica a mesma normalização nas conferências (preserva 1ª, 2ª).
UPDATE public.jogos SET divisao = 'CYBER CITY'
  WHERE upper(divisao) IN ('CYBERC','CYBERCOTY','CYBER CITY','CYBER');
UPDATE public.jogos SET divisao = 'ATHEMPURA'
  WHERE upper(divisao) IN ('ATHEMP','ATHEMPURA');
UPDATE public.jogos SET divisao = 'ELDORADO'
  WHERE upper(divisao) IN ('ELDORA','ELDORADO');
UPDATE public.jogos SET divisao = 'ESPETÁCULO'
  WHERE upper(divisao) IN ('ESPETA','ESPETÁ','ESPETACULO','ESPETÁCULO');
