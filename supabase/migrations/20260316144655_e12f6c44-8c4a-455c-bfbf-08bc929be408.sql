
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'learner');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'fill_blank', 'construct');

-- TIMESTAMP FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT, last_name TEXT, display_name TEXT, avatar_url TEXT,
  age_range TEXT, motivation TEXT, onboarding_completed BOOLEAN DEFAULT false,
  privacy_show_progress BOOLEAN DEFAULT true, privacy_show_stats BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL, UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "roles_insert" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CLASSES (no cross-ref policies yet)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, class_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes_insert" ON public.classes FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "classes_update" ON public.classes FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "classes_delete" ON public.classes FOR DELETE USING (auth.uid() = teacher_id);

-- CLASS MEMBERS
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (class_id, user_id)
);
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_insert" ON public.class_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cm_delete" ON public.class_members FOR DELETE USING (auth.uid() = user_id);

-- NOW add cross-ref policies
CREATE POLICY "classes_select" ON public.classes FOR SELECT USING (
  auth.uid() = teacher_id OR EXISTS (SELECT 1 FROM public.class_members WHERE class_id = id AND user_id = auth.uid())
);
CREATE POLICY "cm_select" ON public.class_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = class_members.class_id AND cm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid())
);

-- STAGES
CREATE TABLE public.stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, description TEXT, emoji TEXT DEFAULT '📘',
  order_index INT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages_select" ON public.stages FOR SELECT TO authenticated USING (true);

-- LEVELS
CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES public.stages(id) ON DELETE CASCADE NOT NULL,
  title TEXT, order_index INT NOT NULL, is_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (stage_id, order_index)
);
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels_select" ON public.levels FOR SELECT TO authenticated USING (true);

-- QUESTIONS
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL, question_type question_type NOT NULL DEFAULT 'multiple_choice',
  options JSONB, correct_answer TEXT NOT NULL, hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_select" ON public.questions FOR SELECT TO authenticated USING (true);

-- USER PROGRESS
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE NOT NULL,
  score INT DEFAULT 0, total_questions INT DEFAULT 12, completed BOOLEAN DEFAULT false,
  attempts INT DEFAULT 0, completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, level_id)
);
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_select_own" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_insert" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "progress_select_classmates" ON public.user_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_members cm1 JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = user_progress.user_id)
);
CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLASS FEED
CREATE TABLE public.class_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.class_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_select" ON public.class_feed FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_members WHERE class_id = class_feed.class_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_feed.class_id AND teacher_id = auth.uid())
);
CREATE POLICY "feed_insert" ON public.class_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FEED REACTIONS
CREATE TABLE public.feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID REFERENCES public.class_feed(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT DEFAULT 'heart', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feed_item_id, user_id)
);
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select" ON public.feed_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_feed cf JOIN public.class_members cm ON cm.class_id = cf.class_id
    WHERE cf.id = feed_reactions.feed_item_id AND cm.user_id = auth.uid())
);
CREATE POLICY "reactions_insert" ON public.feed_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON public.feed_reactions FOR DELETE USING (auth.uid() = user_id);

-- FEED COMMENTS
CREATE TABLE public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID REFERENCES public.class_feed(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.feed_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_feed cf JOIN public.class_members cm ON cm.class_id = cf.class_id
    WHERE cf.id = feed_comments.feed_item_id AND cm.user_id = auth.uid())
);
CREATE POLICY "comments_insert" ON public.feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.feed_comments FOR DELETE USING (auth.uid() = user_id);

-- ASSIGNMENTS
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, description TEXT, questions JSONB, due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_members WHERE class_id = assignments.class_id AND user_id = auth.uid())
  OR auth.uid() = teacher_id
);
CREATE POLICY "assignments_insert" ON public.assignments FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "assignments_update" ON public.assignments FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "assignments_delete" ON public.assignments FOR DELETE USING (auth.uid() = teacher_id);

-- ASSIGNMENT SUBMISSIONS
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB, score INT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_select_own" ON public.assignment_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "submissions_select_teacher" ON public.assignment_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid())
);
CREATE POLICY "submissions_insert" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DAILY CHALLENGES
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL, correct_answer TEXT NOT NULL, hint TEXT,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_select" ON public.daily_challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "challenges_insert" ON public.daily_challenges FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DAILY CHALLENGE COMPLETIONS
CREATE TABLE public.daily_challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL, is_correct BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.daily_challenge_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_select" ON public.daily_challenge_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "completions_insert" ON public.daily_challenge_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, content TEXT NOT NULL, reference_id UUID,
  read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);

-- AUTO-CREATE PROFILE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED STAGES
INSERT INTO public.stages (id, title, description, emoji, order_index) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Single Operations', 'Translate verbal phrases involving a single arithmetic operation', '➕', 1),
  ('a1000000-0000-0000-0000-000000000002', 'Combined Operations', 'Translate phrases with two or more operations combined', '🔢', 2),
  ('a1000000-0000-0000-0000-000000000003', 'Variable Expressions', 'Work with different variable representations', '🔤', 3),
  ('a1000000-0000-0000-0000-000000000004', 'Complex Phrases', 'Translate longer and more complex verbal phrases', '📝', 4),
  ('a1000000-0000-0000-0000-000000000005', 'Mastery Challenge', 'Demonstrate mastery across all translation skills', '🏆', 5);

-- SEED LEVELS
INSERT INTO public.levels (id, stage_id, title, order_index, is_review) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Level 1', 1, false),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Level 2', 2, false),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Level 3', 3, false),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Unit Review', 4, true),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Level 1', 1, false),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'Level 2', 2, false),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'Level 3', 3, false),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'Unit Review', 4, true),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'Level 1', 1, false),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'Level 2', 2, false),
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'Level 3', 3, false),
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000003', 'Unit Review', 4, true),
  ('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000004', 'Level 1', 1, false),
  ('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000004', 'Level 2', 2, false),
  ('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000004', 'Level 3', 3, false),
  ('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000004', 'Unit Review', 4, true),
  ('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000005', 'Level 1', 1, false),
  ('b1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000005', 'Level 2', 2, false),
  ('b1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000005', 'Level 3', 3, false),
  ('b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000005', 'Unit Review', 4, true);

-- SEED QUESTIONS (Stage 1, Level 1)
INSERT INTO public.questions (level_id, question_text, question_type, options, correct_answer, hint) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "the sum of a number and 5"', 'multiple_choice', '["x + 5", "x - 5", "5x", "x / 5"]', 'x + 5', '"Sum" means addition.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "a number decreased by 3"', 'multiple_choice', '["x - 3", "3 - x", "x + 3", "3x"]', 'x - 3', '"Decreased by" means subtraction.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "twice a number"', 'multiple_choice', '["2x", "x + 2", "x / 2", "x²"]', '2x', '"Twice" means multiplied by 2.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "a number divided by 4"', 'multiple_choice', '["x / 4", "4x", "4 / x", "x - 4"]', 'x / 4', '"Divided by" means the number is the dividend.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "7 more than a number"', 'multiple_choice', '["x + 7", "7x", "x - 7", "7 - x"]', 'x + 7', '"More than" means addition.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "the product of 6 and a number"', 'multiple_choice', '["6x", "6 + x", "x / 6", "x - 6"]', '6x', '"Product" means multiplication.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "a number subtracted from 10"', 'multiple_choice', '["10 - x", "x - 10", "10 + x", "10x"]', '10 - x', '"Subtracted from 10" means 10 minus the number.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "the quotient of a number and 9"', 'multiple_choice', '["x / 9", "9x", "9 / x", "x + 9"]', 'x / 9', '"Quotient" means division.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "triple a number"', 'multiple_choice', '["3x", "x + 3", "x³", "x / 3"]', '3x', '"Triple" means multiplied by 3.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "8 less than a number"', 'multiple_choice', '["x - 8", "8 - x", "x + 8", "8x"]', 'x - 8', '"Less than" means subtraction.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "the difference of a number and 2"', 'multiple_choice', '["x - 2", "2 - x", "x + 2", "2x"]', 'x - 2', '"Difference" means subtraction.'),
  ('b1000000-0000-0000-0000-000000000001', 'Translate: "half of a number"', 'multiple_choice', '["x / 2", "2x", "x - 2", "x + 2"]', 'x / 2', '"Half" means divided by 2.');

-- SEED QUESTIONS (Stage 1, Level 2)
INSERT INTO public.questions (level_id, question_text, question_type, options, correct_answer, hint) VALUES
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "a number increased by 12"', 'multiple_choice', '["n + 12", "n - 12", "12n", "n / 12"]', 'n + 12', '"Increased by" means addition.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "four times a number"', 'multiple_choice', '["4y", "y + 4", "y / 4", "y - 4"]', '4y', '"Times" means multiplication.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "a number diminished by 6"', 'multiple_choice', '["a - 6", "6 - a", "a + 6", "6a"]', 'a - 6', '"Diminished by" means subtraction.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "the ratio of a number to 5"', 'multiple_choice', '["m / 5", "5m", "m + 5", "5 / m"]', 'm / 5', '"Ratio" means division.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "15 added to a number"', 'multiple_choice', '["b + 15", "15b", "b - 15", "15 - b"]', 'b + 15', '"Added to" means addition.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "a number multiplied by 10"', 'multiple_choice', '["10k", "k + 10", "k - 10", "k / 10"]', '10k', '"Multiplied by" means multiplication.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "9 subtracted from a number"', 'multiple_choice', '["p - 9", "9 - p", "p + 9", "9p"]', 'p - 9', '"Subtracted from a number" means the number minus 9.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "one-third of a number"', 'multiple_choice', '["z / 3", "3z", "z + 3", "z - 3"]', 'z / 3', '"One-third" means divided by 3.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "five times a number"', 'multiple_choice', '["5c", "c + 5", "c / 5", "c - 5"]', '5c', '"Five times" means multiplied by 5.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "a number plus 20"', 'multiple_choice', '["d + 20", "20d", "d - 20", "20 - d"]', 'd + 20', '"Plus" means addition.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "11 taken from a number"', 'multiple_choice', '["w - 11", "11 - w", "w + 11", "11w"]', 'w - 11', '"Taken from" means subtraction.'),
  ('b1000000-0000-0000-0000-000000000002', 'Translate: "double a number"', 'multiple_choice', '["2t", "t + 2", "t²", "t / 2"]', '2t', '"Double" means multiplied by 2.');
