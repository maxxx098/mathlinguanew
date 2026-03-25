
-- Fix the overly permissive notification insert policy
-- Notifications should only be insertable by authenticated users
DROP POLICY "notif_insert" ON public.notifications;
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
