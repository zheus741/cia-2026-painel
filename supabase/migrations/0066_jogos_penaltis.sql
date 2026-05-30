-- ════════════════════════════════════════════════════════════════════════════
-- 0066 · Desempate por pênaltis — futsal/futebol no mata-mata
-- ════════════════════════════════════════════════════════════════════════════
-- No mata-mata, futsal e futebol empatados no tempo normal vão pra disputa de
-- pênaltis. Sem registrar isso, a propagação não consegue definir quem avança
-- (determinarVencedor retorna null em empate) e a pontuação não fecha.
--
-- penaltis_a / penaltis_b guardam a contagem da disputa. O vencedor (pra chave
-- e pra pontos) é quem fez mais pênaltis quando placar_a == placar_b.
--
-- Aditivo e seguro: colunas nullable, só preenchidas quando há disputa.
-- ════════════════════════════════════════════════════════════════════════════

alter table jogos add column if not exists penaltis_a smallint;
alter table jogos add column if not exists penaltis_b smallint;

comment on column jogos.penaltis_a is
  'Pênaltis convertidos pela equipe A na disputa (futsal/futebol empatados no mata-mata). Null = sem disputa.';
comment on column jogos.penaltis_b is
  'Pênaltis convertidos pela equipe B na disputa. Vencedor do jogo empatado = maior penaltis.';
