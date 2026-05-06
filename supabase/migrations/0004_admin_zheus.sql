-- Promover Zheus a admin após primeiro login
-- Execute no SQL Editor do Supabase depois que matheus@exp.rec.br fizer login pelo menos uma vez
-- (o trigger on_auth_user_created já cria o perfil — este script apenas eleva o role)

update profiles
set
  role  = 'admin',
  nome  = 'Zheus'
where id = (
  select id from auth.users where email = 'matheus@exp.rec.br' limit 1
);
