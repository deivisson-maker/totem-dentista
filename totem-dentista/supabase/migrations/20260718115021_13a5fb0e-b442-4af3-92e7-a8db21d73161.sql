ALTER TABLE public.prize_config
ADD COLUMN IF NOT EXISTS min_note_value numeric NOT NULL DEFAULT 400;

-- Garante permissões de leitura e escrita necessárias.
GRANT SELECT ON public.prize_config TO anon, authenticated;
GRANT ALL ON public.prize_config TO service_role;