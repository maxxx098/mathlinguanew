
CREATE TABLE public.user_lives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lives INTEGER NOT NULL DEFAULT 5,
  last_lost_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lives_select" ON public.user_lives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lives_insert" ON public.user_lives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lives_update" ON public.user_lives FOR UPDATE USING (auth.uid() = user_id);
