-- ════════════════════════════════════════════════════════════════════════════
-- 0069 · Placar — marca de início ao vivo + sets detalhados
-- ════════════════════════════════════════════════════════════════════════════
-- ao_vivo_em: timestamp de quando o jogo entrou AO VIVO (1ª vez). Comparado com
--   `inicio` (horário agendado) → TAG de Atrasado / Antecipado pra controle da
--   Coordenação Esportiva.
--
-- sets: detalhe dos sets do vôlei/peteca no "lançar resultado direto" —
--   [{ "a": 25, "b": 20 }, { "a": 25, "b": 23 }, ...]. placar_a/placar_b passam
--   a guardar os SETS ganhos; os pontos de cada set ficam aqui pra exibição.
--
-- Aditivo e seguro: colunas nullable.
-- ════════════════════════════════════════════════════════════════════════════

alter table jogos add column if not exists ao_vivo_em timestamptz;
alter table jogos add column if not exists sets       jsonb;

comment on column jogos.ao_vivo_em is
  'Quando o jogo entrou AO VIVO (1ª vez). vs inicio → tag atraso/antecipação.';
comment on column jogos.sets is
  'Pontos por set (vôlei/peteca): [{a,b}, ...]. placar_a/b guardam os sets ganhos.';
