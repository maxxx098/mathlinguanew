-- Function to auto-post to class_feed and create notifications when a user completes a level
CREATE OR REPLACE FUNCTION public.on_level_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _class_id uuid;
  _level_title text;
  _stage_title text;
  _display_name text;
  _completed_count int;
  _classmate record;
BEGIN
  -- Only fire on completed = true
  IF NEW.completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Skip if old row was already completed
  IF TG_OP = 'UPDATE' AND OLD.completed IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Get level and stage info
  SELECT l.title, s.title INTO _level_title, _stage_title
  FROM levels l JOIN stages s ON s.id = l.stage_id
  WHERE l.id = NEW.level_id;

  -- Get display name
  SELECT display_name INTO _display_name FROM profiles WHERE user_id = NEW.user_id;

  -- Count total completed levels (streak info)
  SELECT COUNT(*) INTO _completed_count
  FROM user_progress WHERE user_id = NEW.user_id AND completed = true;

  -- Post to all classes this user is a member of
  FOR _class_id IN
    SELECT class_id FROM class_members WHERE user_id = NEW.user_id
  LOOP
    -- Insert feed item
    INSERT INTO class_feed (class_id, user_id, action_type, content)
    VALUES (_class_id, NEW.user_id, 'level_complete',
      COALESCE(_display_name, 'A learner') || ' completed ' || COALESCE(_level_title, 'a level') || ' in ' || COALESCE(_stage_title, 'a stage') || '! 🎉');

    -- If streak milestone (every 3 completed), notify classmates
    IF _completed_count > 0 AND _completed_count % 3 = 0 THEN
      FOR _classmate IN
        SELECT cm.user_id FROM class_members cm
        WHERE cm.class_id = _class_id AND cm.user_id != NEW.user_id
        UNION
        SELECT c.teacher_id FROM classes c WHERE c.id = _class_id
      LOOP
        INSERT INTO notifications (user_id, type, content, reference_id)
        VALUES (_classmate.user_id, 'streak',
          COALESCE(_display_name, 'A classmate') || ' is on a streak! ' || _completed_count || ' levels completed 🔥',
          NEW.user_id);
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_level_completed
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.on_level_completed();

-- Also auto-post when a member joins a class
CREATE OR REPLACE FUNCTION public.on_class_member_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _display_name text;
BEGIN
  SELECT display_name INTO _display_name FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO class_feed (class_id, user_id, action_type, content)
  VALUES (NEW.class_id, NEW.user_id, 'member_joined',
    COALESCE(_display_name, 'Someone') || ' joined the class! 👋');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_class_member_joined
  AFTER INSERT ON public.class_members
  FOR EACH ROW
  EXECUTE FUNCTION public.on_class_member_joined();

-- Auto-post when assignment is created
CREATE OR REPLACE FUNCTION public.on_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _display_name text;
BEGIN
  SELECT display_name INTO _display_name FROM profiles WHERE user_id = NEW.teacher_id;

  INSERT INTO class_feed (class_id, user_id, action_type, content)
  VALUES (NEW.class_id, NEW.teacher_id, 'assignment_created',
    COALESCE(_display_name, 'Teacher') || ' posted a new assignment: ' || NEW.title || ' 📝');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assignment_created
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_assignment_created();

-- Auto-post when assignment is submitted
CREATE OR REPLACE FUNCTION public.on_assignment_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _display_name text;
  _assignment_title text;
  _class_id uuid;
BEGIN
  SELECT display_name INTO _display_name FROM profiles WHERE user_id = NEW.user_id;
  SELECT title, class_id INTO _assignment_title, _class_id FROM assignments WHERE id = NEW.assignment_id;

  IF _class_id IS NOT NULL THEN
    INSERT INTO class_feed (class_id, user_id, action_type, content)
    VALUES (_class_id, NEW.user_id, 'assignment_submitted',
      COALESCE(_display_name, 'A learner') || ' submitted ' || COALESCE(_assignment_title, 'an assignment') || ' (Score: ' || COALESCE(NEW.score::text, '?') || ') ✅');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assignment_submitted
  AFTER INSERT ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.on_assignment_submitted();