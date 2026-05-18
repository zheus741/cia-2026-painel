-- 0028: garante que o usuário admin tenha role correto.
--
-- A migration 0004 usou email 'matheus@exp.rec.br' mas o auth pode ter sido
-- criado com o Gmail pessoal. Esse script promove QUALQUER dos dois para admin.
-- É idempotente — pode rodar mais de uma vez sem problema.

update profiles
set
  role = 'admin',
  nome = coalesce(nullif(nome, split_part(email, '@', 1)), 'Zheus')
where id in (
  select id from auth.users
  where email in (
    'matheus@exp.rec.br',
    'matheuschristovam65@gmail.com'
  )
);

-- Verificação pós-migração (descomente para conferir no SQL editor):
-- SELECT p.id, u.email, p.role, p.nome
-- FROM profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE u.email IN ('matheus@exp.rec.br', 'matheuschristovam65@gmail.com');
