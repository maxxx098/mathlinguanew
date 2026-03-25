
-- Community posts table
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- Community post hearts
CREATE TABLE public.community_post_hearts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.community_post_hearts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hearts_select" ON public.community_post_hearts FOR SELECT TO authenticated USING (true);
CREATE POLICY "hearts_insert" ON public.community_post_hearts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hearts_delete" ON public.community_post_hearts FOR DELETE USING (auth.uid() = user_id);

-- Community post replies
CREATE TABLE public.community_post_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_post_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "replies_select" ON public.community_post_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "replies_insert" ON public.community_post_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "replies_delete" ON public.community_post_replies FOR DELETE USING (auth.uid() = user_id);
