CREATE OR REPLACE FUNCTION public.get_class_by_code(_class_code text)
RETURNS TABLE (
  id uuid,
  name text,
  class_code text,
  teacher_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.class_code, c.teacher_id, c.created_at
  FROM public.classes c
  WHERE upper(c.class_code) = upper(_class_code)
  LIMIT 1
$$;