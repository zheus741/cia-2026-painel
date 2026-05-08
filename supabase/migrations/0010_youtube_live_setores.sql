-- 0010: youtube_live flag on setores

ALTER TABLE setores ADD COLUMN IF NOT EXISTS tem_youtube_live BOOLEAN DEFAULT FALSE;
