-- Allow generic people in turnos before all team members have accounts.
-- Coordinators can plan the scale with placeholder names ("Fotógrafo 1"),
-- then link real profiles as people join.

alter table turnos
  alter column user_id drop not null,
  add column nome_pessoa text;

-- At least one identifier must exist
alter table turnos
  add constraint turnos_has_person
  check (user_id is not null or (nome_pessoa is not null and nome_pessoa <> ''));
