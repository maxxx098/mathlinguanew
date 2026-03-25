CREATE POLICY "progress_select_teacher"
ON public.user_progress
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE c.teacher_id = auth.uid()
      AND cm.user_id = user_progress.user_id
  )
);