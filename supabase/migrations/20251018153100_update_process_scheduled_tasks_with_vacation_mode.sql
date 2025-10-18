CREATE OR REPLACE FUNCTION public.process_scheduled_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_record RECORD;
  new_position INTEGER;
  new_next_occurrence DATE;
  current_day_of_week INTEGER;
  next_scheduled_day INTEGER;
  days_until_next INTEGER;
  i INTEGER;
BEGIN
  -- Process all due tasks for users who are NOT on vacation
  FOR task_record IN
    SELECT st.*
    FROM public.scheduled_tasks st
    LEFT JOIN public.user_settings us ON st.user_id = us.user_id
    WHERE st.next_occurrence_date <= CURRENT_DATE
      AND (us.is_on_vacation IS NULL OR us.is_on_vacation = false)
  LOOP
    -- Get the highest position in the target column to place new card at top
    SELECT COALESCE(MAX(position), 0) + 1 INTO new_position
    FROM public.cards
    WHERE column_id = task_record.target_column_id;

    -- Create the new card
    INSERT INTO public.cards (
      column_id,
      position,
      card_type,
      title,
      summary,
      created_at,
      user_id
    ) VALUES (
      task_record.target_column_id,
      new_position,
      'simple',
      task_record.title,
      task_record.summary,
      now(),
      task_record.user_id
    );

    -- Handle recurrence based on type
    CASE task_record.recurrence_type
      WHEN 'once' THEN
        -- Delete one-time tasks
        DELETE FROM public.scheduled_tasks WHERE id = task_record.id;

      WHEN 'daily' THEN
        -- Update daily tasks to next day
        UPDATE public.scheduled_tasks
        SET next_occurrence_date = task_record.next_occurrence_date + INTERVAL '1 day'
        WHERE id = task_record.id;

      WHEN 'weekdays' THEN
        -- Add logic to skip weekends
        current_day_of_week := EXTRACT(DOW FROM task_record.next_occurrence_date);
        IF current_day_of_week = 5 THEN -- Friday
          -- Next occurrence is Monday (+3 days)
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '3 days';
        ELSIF current_day_of_week = 6 THEN -- Saturday
          -- Next occurrence is Monday (+2 days)
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '2 days';
        ELSE
          -- Next occurrence is next day
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';
        END IF;

        UPDATE public.scheduled_tasks
        SET next_occurrence_date = new_next_occurrence
        WHERE id = task_record.id;

      WHEN 'weekly' THEN
        -- Update weekly tasks to same day next week
        UPDATE public.scheduled_tasks
        SET next_occurrence_date = task_record.next_occurrence_date + INTERVAL '7 days'
        WHERE id = task_record.id;

      WHEN 'bi-weekly' THEN
        -- Update bi-weekly tasks to same day in 2 weeks
        UPDATE public.scheduled_tasks
        SET next_occurrence_date = task_record.next_occurrence_date + INTERVAL '14 days'
        WHERE id = task_record.id;

      WHEN 'monthly' THEN
        -- Add robust logic for adding one month, handling rollovers correctly
        new_next_occurrence := (
          date_trunc('month', task_record.next_occurrence_date) +
          INTERVAL '1 month' +
          (EXTRACT(DAY FROM task_record.next_occurrence_date) - 1) * INTERVAL '1 day'
        );

        -- If the resulting date is invalid (e.g., Jan 31 -> Feb 31),
        -- truncate to the last day of the target month
        IF new_next_occurrence > (date_trunc('month', new_next_occurrence) + INTERVAL '1 month' - INTERVAL '1 day') THEN
          new_next_occurrence := date_trunc('month', new_next_occurrence) + INTERVAL '1 month' - INTERVAL '1 day';
        END IF;

        UPDATE public.scheduled_tasks
        SET next_occurrence_date = new_next_occurrence
        WHERE id = task_record.id;

      WHEN 'custom_weekly' THEN
        -- Find the next scheduled day from the days_of_week array
        current_day_of_week := EXTRACT(DOW FROM task_record.next_occurrence_date);
        next_scheduled_day := NULL;
        days_until_next := 0;

        -- First, look for the next day in the current week
        FOR i IN 1..array_length(task_record.days_of_week, 1) LOOP
          IF task_record.days_of_week[i] > current_day_of_week THEN
            days_until_next := task_record.days_of_week[i] - current_day_of_week;
            next_scheduled_day := task_record.days_of_week[i];
            EXIT;
          END IF;
        END LOOP;

        -- If no day found in current week, wrap to next week
        IF next_scheduled_day IS NULL THEN
          days_until_next := (7 - current_day_of_week) + task_record.days_of_week[1];
          next_scheduled_day := task_record.days_of_week[1];
        END IF;

        new_next_occurrence := task_record.next_occurrence_date + (days_until_next * INTERVAL '1 day');

        UPDATE public.scheduled_tasks
        SET next_occurrence_date = new_next_occurrence
        WHERE id = task_record.id;

    END CASE;
  END LOOP;
END;
$$;