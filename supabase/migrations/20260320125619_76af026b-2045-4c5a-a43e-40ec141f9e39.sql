-- Badges table
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone in authenticated can see badges (public achievement)
CREATE POLICY "badges_select" ON public.user_badges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "badges_insert" ON public.user_badges
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

-- Function to auto-award badges when progress changes
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _completed_count int;
  _perfect_count int;
BEGIN
  IF NEW.completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.completed IS TRUE THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO _completed_count
  FROM user_progress WHERE user_id = NEW.user_id AND completed = true;

  -- First Steps: complete first level
  IF _completed_count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (NEW.user_id, 'first_steps') ON CONFLICT DO NOTHING;
  END IF;

  -- Rising Star: 5 levels
  IF _completed_count >= 5 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (NEW.user_id, 'rising_star') ON CONFLICT DO NOTHING;
  END IF;

  -- Algebra Pro: 10 levels
  IF _completed_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (NEW.user_id, 'algebra_pro') ON CONFLICT DO NOTHING;
  END IF;

  -- Master Mind: all 20 levels
  IF _completed_count >= 20 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (NEW.user_id, 'master_mind') ON CONFLICT DO NOTHING;
  END IF;

  -- Perfect Score badge
  IF NEW.score = NEW.total_questions THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (NEW.user_id, 'perfect_score') ON CONFLICT DO NOTHING;
  END IF;

  -- Check for 3 perfect scores
  SELECT COUNT(*) INTO _perfect_count
  FROM user_progress WHERE user_id = NEW.user_id AND completed = true AND score = total_questions;
  IF _perfect_count >= 3 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (NEW.user_id, 'perfectionist') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_badges
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();