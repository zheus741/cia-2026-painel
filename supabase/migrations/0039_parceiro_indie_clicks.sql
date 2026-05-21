-- Adiciona Indie Clicks como empresa de cobertura fotográfica
INSERT INTO public.parceiros (nome, tipo, cor_hex)
VALUES ('Indie Clicks', 'foto', '#f59e0b')
ON CONFLICT DO NOTHING;
