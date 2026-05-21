-- Adiciona valores que estavam faltando no enum funcao_equipe
ALTER TYPE public.funcao_equipe ADD VALUE IF NOT EXISTS 'storymaker';
ALTER TYPE public.funcao_equipe ADD VALUE IF NOT EXISTS 'lider_cobertura';
