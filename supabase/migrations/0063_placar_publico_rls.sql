-- ════════════════════════════════════════════════════════════════════════════
-- 0063 · Placar público — leitura anônima do necessário pro /tv/placar
-- ════════════════════════════════════════════════════════════════════════════
-- Permite que o PÚBLICO (sem login) acompanhe o placar ao vivo. Adiciona
-- policies SELECT para o role `anon` APENAS nas tabelas que o placar mostra.
--
-- SEGURANÇA: exposto = só dados de competição já públicos no evento (placar,
-- nomes de times, modalidades, locais, programação). NÃO exposto: profiles,
-- turnos, conteudos, patrocinadores, escala, etc — esses continuam só
-- `authenticated`.
--
-- O realtime do Supabase respeita RLS — com a policy anon, o público recebe
-- as atualizações de placar em tempo real.
--
-- Idempotente (drop+create de cada policy).
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array[
    'jogos',         -- placar, status, equipes, fase
    'equipes',       -- nomes, cores, universidade (joins do placar)
    'modalidades',   -- nome + ícone do esporte
    'setores',       -- local/quadra do jogo
    'dias_evento',   -- mapeamento de dias
    'shows'          -- ticker "no ar agora" do lineup
  ]
  loop
    execute format('drop policy if exists "%s: ler publico" on %I;', t, t);
    execute format('create policy "%s: ler publico" on %I for select to anon using (true);', t, t);
  end loop;
end $$;
