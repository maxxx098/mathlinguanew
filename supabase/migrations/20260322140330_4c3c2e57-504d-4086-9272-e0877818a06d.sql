
DROP POLICY IF EXISTS "roles_insert_learner_only" ON public.user_roles;

CREATE POLICY "roles_insert_learner_or_teacher"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND role IN ('learner'::app_role, 'teacher'::app_role)
);
