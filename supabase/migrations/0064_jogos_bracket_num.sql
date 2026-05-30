-- ════════════════════════════════════════════════════════════════════════════
-- 0064 · Âncora estrutural da chave — jogos.bracket_num
-- ════════════════════════════════════════════════════════════════════════════
-- PROBLEMA: a propagação de vencedor e a renderização da chave associavam
-- jogo↔posição-da-chave por NOME das equipes. Quando a fase seguinte (quartas,
-- semis) está vazia ("A definir"), não há nome pra ancorar → a propagação não
-- consegue identificar (nem criar) o jogo de destino.
--
-- SOLUÇÃO: `bracket_num` guarda o número oficial do jogo na estrutura do
-- bracket-builder (JOGO 1..N — ver buildGames()). É uma âncora estável,
-- imune a nomes vazios. A propagação passa a:
--   1. achar o jogo-destino por (modalidade, categoria, divisao, bracket_num)
--   2. CRIAR a linha da fase seguinte com esse bracket_num se ela não existir
--
-- Aditivo e seguro: coluna nullable, jogos legados ficam com NULL até serem
-- sincronizados (ação "Sincronizar chave") ou recebidos por propagação.
--
-- O índice único parcial impede que duas propagações concorrentes criem duas
-- linhas pro mesmo slot da chave (ex: dois feeders da mesma quarta encerrando
-- quase ao mesmo tempo).
-- ════════════════════════════════════════════════════════════════════════════

alter table jogos add column if not exists bracket_num smallint;

comment on column jogos.bracket_num is
  'Número do jogo na estrutura do bracket (JOGO N — ver buildGames). Âncora estável p/ propagação e renderização da chave, independente de nomes.';

-- Uma chave (modalidade+categoria+divisao) não pode ter dois jogos no mesmo
-- slot estrutural. WHERE bracket_num is not null → não afeta jogos legados/grupo.
create unique index if not exists uniq_jogos_bracket_slot
  on jogos (modalidade_id, categoria, divisao, bracket_num)
  where bracket_num is not null;
