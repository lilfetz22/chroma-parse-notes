-- Add a function to manually check and fix custom weekly scheduled tasks
-- This can help debug why tasks show incorrect next occurrence dates

CREATE OR REPLACE FUNCTION public.debug_custom_weekly_task(task_id UUID)
RETURNS TABLE (
  today_date DATE,
  task_title TEXT,
  days_of_week INTEGER[],
  current_next_occurrence DATE,
  current_day_of_week INTEGER,
  calculated_next_occurrence DATE,
  days_until_next INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_record RECORD;
  current_dow INTEGER;
  next_day INTEGER;
  days_diff INTEGER;
  new_occurrence DATE;
  min_day INTEGER;
  i INTEGER;
BEGIN
  -- Get the task
  SELECT * INTO task_record
  FROM public.scheduled_tasks
  WHERE id = task_id AND recurrence_type = 'custom_weekly';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not custom_weekly type';
  END IF;

  current_dow := EXTRACT(DOW FROM task_record.next_occurrence_date);
  next_day := NULL;
  days_diff := 0;

  -- Look for next day in current week
  FOR i IN 1..array_length(task_record.days_of_week, 1) LOOP
    IF task_record.days_of_week[i] > current_dow THEN
      days_diff := task_record.days_of_week[i] - current_dow;
      next_day := task_record.days_of_week[i];
      EXIT;
    END IF;
  END LOOP;

  -- If no day found, find minimum day for next week
  IF next_day IS NULL THEN
    min_day := task_record.days_of_week[1];
    FOR i IN 2..array_length(task_record.days_of_week, 1) LOOP
      IF task_record.days_of_week[i] < min_day THEN
        min_day := task_record.days_of_week[i];
      END IF;
    END LOOP;
    next_day := min_day;
    days_diff := (7 - current_dow) + next_day;
  END IF;

  new_occurrence := task_record.next_occurrence_date + (days_diff || ' days')::INTERVAL;

  RETURN QUERY SELECT
    CURRENT_DATE::DATE,
    task_record.title,
    task_record.days_of_week,
    task_record.next_occurrence_date,
    current_dow,
    new_occurrence,
    days_diff;
END;
$$;

-- Function to manually update a custom weekly task's next occurrence
CREATE OR REPLACE FUNCTION public.fix_custom_weekly_task(task_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_record RECORD;
  current_dow INTEGER;
  next_day INTEGER;
  days_diff INTEGER;
  new_occurrence DATE;
  min_day INTEGER;
  i INTEGER;
BEGIN
  -- Get the task
  SELECT * INTO task_record
  FROM public.scheduled_tasks
  WHERE id = task_id AND recurrence_type = 'custom_weekly';

  IF NOT FOUND THEN
    RETURN 'Task not found or not custom_weekly type';
  END IF;

  current_dow := EXTRACT(DOW FROM CURRENT_DATE);
  next_day := NULL;
  days_diff := 0;

  -- Look for next day in current week
  FOR i IN 1..array_length(task_record.days_of_week, 1) LOOP
    IF task_record.days_of_week[i] > current_dow THEN
      days_diff := task_record.days_of_week[i] - current_dow;
      next_day := task_record.days_of_week[i];
      EXIT;
    END IF;
  END LOOP;

  -- If no day found, find minimum day for next week
  IF next_day IS NULL THEN
    min_day := task_record.days_of_week[1];
    FOR i IN 2..array_length(task_record.days_of_week, 1) LOOP
      IF task_record.days_of_week[i] < min_day THEN
        min_day := task_record.days_of_week[i];
      END IF;
    END LOOP;
    next_day := min_day;
    days_diff := (7 - current_dow) + next_day;
  END IF;

  new_occurrence := CURRENT_DATE + (days_diff || ' days')::INTERVAL;

  -- Update the task
  UPDATE public.scheduled_tasks
  SET next_occurrence_date = new_occurrence
  WHERE id = task_id;

  RETURN 'Updated task "' || task_record.title || '" next occurrence from ' ||
         task_record.next_occurrence_date || ' to ' || new_occurrence;
END;
$$;