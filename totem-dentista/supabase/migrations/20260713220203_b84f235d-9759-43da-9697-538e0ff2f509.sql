CREATE TABLE public.prize_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  prizes jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prize_config TO anon, authenticated;
GRANT ALL ON public.prize_config TO service_role;
ALTER TABLE public.prize_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prize config"
  ON public.prize_config FOR SELECT
  USING (true);
-- Writes only via service_role (server functions); no anon/auth policies for insert/update/delete.