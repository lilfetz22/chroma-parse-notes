-- Update process_scheduled_tasks to respect vacation mode
-- This migration modifies the function to skip creating cards for users on vacation
-- and includes all modern features: priority, tags, scheduled_timestamp
-- Key improvement: Tasks are always rescheduled, even for users on vacation

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
  days_until_next INTEGER;
  days_difference INTEGER;
  next_day_in_week INTEGER;
  min_day_in_array INTEGER;
  i INTEGER;
  new_card_id UUID;
BEGIN
  -- Process all due tasks, joining with user_settings to get vacation status in one query
  FOR task_record IN
    SELECT
      st.*,
      COALESCE(us.is_on_vacation, false) AS user_on_vacation
    FROM
      public.scheduled_tasks st
    LEFT JOIN
      public.user_settings us ON st.user_id = us.user_id
    WHERE
      st.next_occurrence_date <= CURRENT_DATE
  LOOP
    -- Only create a card if the user is NOT on vacation
    IF NOT task_record.user_on_vacation THEN
      -- Get the highest position in the target column to place new card at top
      SELECT COALESCE(MAX(position), 0) + 1 INTO new_position
      FROM public.cards
      WHERE column_id = task_record.target_column_id;

      -- Create the new card and capture its ID
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
      ) RETURNING id INTO new_card_id;

      -- Add tags to the new card if specified
      IF task_record.tag_ids IS NOT NULL AND array_length(task_record.tag_ids, 1) > 0 THEN
        INSERT INTO public.card_tags (card_id, tag_id)
        SELECT new_card_id, unnest(task_record.tag_ids::uuid[]);
      END IF;
    END IF; -- End of conditional card creation

    -- Calculate next occurrence based on recurrence type (this part now ALWAYS runs)
    CASE task_record.recurrence_type
      WHEN 'once' THEN
        -- Delete one-time tasks
        DELETE FROM public.scheduled_tasks WHERE id = task_record.id;
        CONTINUE;

      WHEN 'daily' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';

      WHEN 'weekdays' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';
        -- Skip weekends
        WHILE EXTRACT(DOW FROM new_next_occurrence) IN (0, 6) LOOP
          new_next_occurrence := new_next_occurrence + INTERVAL '1 day';
        END LOOP;

      WHEN 'weekly' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '7 days';

      WHEN 'bi-weekly' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '14 days';

      WHEN 'monthly' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 month';

      WHEN 'custom_weekly' THEN
        IF task_record.days_of_week IS NOT NULL AND array_length(task_record.days_of_week, 1) > 0 THEN
          current_day_of_week := EXTRACT(DOW FROM task_record.next_occurrence_date);
          next_day_in_week := NULL;

          -- Find the smallest day in the array that is > current_day_of_week
          FOR i IN 1..array_length(task_record.days_of_week, 1) LOOP
            IF task_record.days_of_week[i] > current_day_of_week THEN
              IF next_day_in_week IS NULL OR task_record.days_of_week[i] < next_day_in_week THEN
                next_day_in_week := task_record.days_of_week[i];
              END IF;
            END IF;
          END LOOP;

          IF next_day_in_week IS NOT NULL THEN
            -- Found a day later in the same week
            days_until_next := next_day_in_week - current_day_of_week;
          ELSE
            -- No more days this week, find the earliest day for next week
            min_day_in_array := task_record.days_of_week[1];
            FOR i IN 2..array_length(task_record.days_of_week, 1) LOOP
              IF task_record.days_of_week[i] < min_day_in_array THEN
                min_day_in_array := task_record.days_of_week[i];
              END IF;
            END LOOP;
            days_until_next := (7 - current_day_of_week) + min_day_in_array;
          END IF;

          new_next_occurrence := task_record.next_occurrence_date + (days_until_next || ' days')::INTERVAL;
        ELSE
          -- Fallback to weekly if no days specified
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '7 days';
        END IF;

      ELSE -- Default fallback
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';

    END CASE;

    -- Update the timestamp proportionally if it exists
    IF task_record.scheduled_timestamp IS NOT NULL THEN
      days_difference := new_next_occurrence - task_record.next_occurrence_date;
      new_scheduled_timestamp := task_record.scheduled_timestamp + (days_difference || ' days')::INTERVAL;
    ELSE
      new_scheduled_timestamp := NULL;
    END IF;

    -- Update the scheduled task with the new occurrence date and timestamp
    UPDATE public.scheduled_tasks
    SET
      next_occurrence_date = new_next_occurrence,
      scheduled_timestamp = new_scheduled_timestamp
    WHERE id = task_record.id;

  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.process_scheduled_tasks() IS 'Processes due scheduled tasks. Creates cards for users not on vacation and reschedules all processed tasks for their next occurrence. Handles various recurrence patterns.';
