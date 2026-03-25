CREATE POLICY "teacher_can_remove_members"
ON public.class_members
FOR DELETE
TO authenticated
USING (
  is_class_teacher(auth.uid(), class_id)
);