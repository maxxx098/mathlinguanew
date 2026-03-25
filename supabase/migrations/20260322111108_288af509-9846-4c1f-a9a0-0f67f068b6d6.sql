
-- Fix 1: Restrict role self-assignment to 'learner' only
DROP POLICY IF EXISTS "roles_insert" ON public.user_roles;
CREATE POLICY "roles_insert_learner_only"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'learner');

-- Fix 2: Restrict class_feed insert to authenticated users only (SECURITY DEFINER triggers bypass RLS)
DROP POLICY IF EXISTS "feed_insert" ON public.class_feed;
CREATE POLICY "feed_insert_authenticated"
  ON public.class_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
