-- Fix class_feed insert: triggers run as SECURITY DEFINER so auth.uid() is null
-- Allow service role / trigger inserts
DROP POLICY IF EXISTS "feed_insert" ON public.class_feed;
CREATE POLICY "feed_insert" ON public.class_feed FOR INSERT TO public
WITH CHECK (true);

-- Also fix notifications insert for triggers  
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);