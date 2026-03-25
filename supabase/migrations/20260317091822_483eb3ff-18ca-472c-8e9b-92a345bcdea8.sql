
-- 1. Create security definer function to check class membership without recursion
CREATE OR REPLACE FUNCTION public.is_class_member(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members
    WHERE user_id = _user_id AND class_id = _class_id
  )
$$;

-- 2. Create security definer function to check if user is teacher of a class
CREATE OR REPLACE FUNCTION public.is_class_teacher(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE teacher_id = _user_id AND id = _class_id
  )
$$;

-- 3. Fix class_members SELECT policy (was self-referencing causing infinite recursion)
DROP POLICY IF EXISTS "cm_select" ON public.class_members;
CREATE POLICY "cm_select" ON public.class_members
FOR SELECT USING (
  public.is_class_member(auth.uid(), class_id)
  OR public.is_class_teacher(auth.uid(), class_id)
);

-- 4. Fix classes SELECT policy (had bug: class_members.class_id = class_members.id)
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
FOR SELECT USING (
  auth.uid() = teacher_id
  OR public.is_class_member(auth.uid(), id)
);

-- 5. Fix classes INSERT policy - only teachers can create classes
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
CREATE POLICY "classes_insert" ON public.classes
FOR INSERT WITH CHECK (
  auth.uid() = teacher_id
  AND public.has_role(auth.uid(), 'teacher')
);

-- 6. Fix user_progress classmates policy (also referenced class_members causing recursion)
DROP POLICY IF EXISTS "progress_select_classmates" ON public.user_progress;
CREATE POLICY "progress_select_classmates" ON public.user_progress
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.class_members cm1
    WHERE cm1.user_id = auth.uid()
    AND public.is_class_member(user_progress.user_id, cm1.class_id)
  )
);

-- 7. Fix feed_select policy
DROP POLICY IF EXISTS "feed_select" ON public.class_feed;
CREATE POLICY "feed_select" ON public.class_feed
FOR SELECT USING (
  public.is_class_member(auth.uid(), class_id)
  OR public.is_class_teacher(auth.uid(), class_id)
);

-- 8. Fix comments_select policy
DROP POLICY IF EXISTS "comments_select" ON public.feed_comments;
CREATE POLICY "comments_select" ON public.feed_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.class_feed cf
    WHERE cf.id = feed_comments.feed_item_id
    AND (public.is_class_member(auth.uid(), cf.class_id) OR public.is_class_teacher(auth.uid(), cf.class_id))
  )
);

-- 9. Fix reactions_select policy
DROP POLICY IF EXISTS "reactions_select" ON public.feed_reactions;
CREATE POLICY "reactions_select" ON public.feed_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.class_feed cf
    WHERE cf.id = feed_reactions.feed_item_id
    AND (public.is_class_member(auth.uid(), cf.class_id) OR public.is_class_teacher(auth.uid(), cf.class_id))
  )
);
