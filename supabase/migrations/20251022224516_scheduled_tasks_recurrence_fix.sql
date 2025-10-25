-- Fix custom_weekly recurrence logic to properly calculate next occurrence
-- This addresses the issue where tasks scheduled for Mon-Thu show incorrect next dates

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
  new_scheduled_timestamp TIMESTAMPTZ;
  current_day_of_week INTEGER;
  next_scheduled_day INTEGER;
  days_until_next INTEGER;
  days_difference INTEGER;
  i INTEGER;
  min_day INTEGER;
BEGIN
  -- Process all due tasks
  FOR task_record IN
    SELECT * FROM public.scheduled_tasks
    WHERE next_occurrence_date <= CURRENT_DATE
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
      priority,
      created_at
    ) VALUES (
      task_record.target_column_id,
      new_position,
      'simple',
      task_record.title,
      task_record.summary,
      COALESCE(task_record.priority, 0),
      now()
    );

    -- Add tags to the new card if specified
    IF task_record.tag_ids IS NOT NULL AND array_length(task_record.tag_ids, 1) > 0 THEN
      INSERT INTO public.card_tags (card_id, tag_id)
      SELECT currval(pg_get_serial_sequence('public.cards', 'id')), unnest(task_record.tag_ids::uuid[]);
    END IF;

    -- Calculate next occurrence based on recurrence type
    CASE task_record.recurrence_type
      WHEN 'once' THEN
        -- Delete one-time tasks
        DELETE FROM public.scheduled_tasks WHERE id = task_record.id;
        CONTINUE;

      WHEN 'daily' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '1 day';
        END IF;

      WHEN 'weekdays' THEN
        current_day_of_week := EXTRACT(DOW FROM task_record.next_occurrence_date);
        IF current_day_of_week = 5 THEN -- Friday
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '3 days'; -- Skip to Monday
        ELSE
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';
        END IF;
        -- Skip weekends
        WHILE EXTRACT(DOW FROM new_next_occurrence) IN (0, 6) LOOP
          new_next_occurrence := new_next_occurrence + INTERVAL '1 day';
        END LOOP;
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          days_difference := new_next_occurrence - task_record.next_occurrence_date;
          new_scheduled_timestamp := task_record.scheduled_timestamp + (days_difference || ' days')::INTERVAL;
        END IF;

      WHEN 'weekly' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '7 days';
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '7 days';
        END IF;

      WHEN 'bi-weekly' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '14 days';
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '14 days';
        END IF;

      WHEN 'monthly' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 month';
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '1 month';
        END IF;

      WHEN 'custom_weekly' THEN
        IF task_record.days_of_week IS NOT NULL AND array_length(task_record.days_of_week, 1) > 0 THEN
          current_day_of_week := EXTRACT(DOW FROM task_record.next_occurrence_date);
          next_scheduled_day := NULL;
          days_until_next := 0;

          -- Look for the next day in the current week (after today)
          FOR i IN 1..array_length(task_record.days_of_week, 1) LOOP
            IF task_record.days_of_week[i] > current_day_of_week THEN
              days_until_next := task_record.days_of_week[i] - current_day_of_week;
              next_scheduled_day := task_record.days_of_week[i];
              EXIT; -- Take the first match (earliest in the week)
            END IF;
          END LOOP;

          -- If no day found in current week, find the earliest day in next week
          IF next_scheduled_day IS NULL THEN
            -- Find the minimum day in the array
            min_day := task_record.days_of_week[1];
            FOR i IN 2..array_length(task_record.days_of_week, 1) LOOP
              IF task_record.days_of_week[i] < min_day THEN
                min_day := task_record.days_of_week[i];
              END IF;
            END LOOP;

            next_scheduled_day := min_day;
            -- Calculate days until that day next week
            days_until_next := (7 - current_day_of_week) + next_scheduled_day;
          END IF;

          new_next_occurrence := task_record.next_occurrence_date + (days_until_next || ' days')::INTERVAL;
          IF task_record.scheduled_timestamp IS NOT NULL THEN
            new_scheduled_timestamp := task_record.scheduled_timestamp + (days_until_next || ' days')::INTERVAL;
          END IF;
        ELSE
          -- Fallback to weekly if no days specified
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '7 days';
          IF task_record.scheduled_timestamp IS NOT NULL THEN
            new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '7 days';
          END IF;
        END IF;

      ELSE
        -- Default fallback
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '1 day';
        END IF;
    END CASE;

    -- Update the scheduled task with the new occurrence date and timestamp
    UPDATE public.scheduled_tasks
    SET
      next_occurrence_date = new_next_occurrence,
      scheduled_timestamp = new_scheduled_timestamp
    WHERE id = task_record.id;

  END LOOP;
END;
$$;