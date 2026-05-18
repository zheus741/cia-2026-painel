-- 0029: corrige FK checklist_instancias.patrocinador_id para ON DELETE CASCADE
--
-- Antes: `references patrocinadores(id)` — sem cascade.
-- Tentativa de DELETE em patrocinadores com checklist vinculado levantava:
--   "update or delete on table "patrocinadores" violates foreign key constraint
--    "checklist_instancias_patrocinador_id_fkey""
-- Agora: ao excluir um patrocinador, as instâncias de ativação vinculadas
-- (e seus checklist_itens, por cascade já existente) são removidas junto.

ALTER TABLE checklist_instancias
  DROP CONSTRAINT checklist_instancias_patrocinador_id_fkey;

ALTER TABLE checklist_instancias
  ADD CONSTRAINT checklist_instancias_patrocinador_id_fkey
    FOREIGN KEY (patrocinador_id)
    REFERENCES patrocinadores(id)
    ON DELETE CASCADE;
