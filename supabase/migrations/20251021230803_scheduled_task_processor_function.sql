-- Update process_scheduled_tasks function to use scheduled_timestamp instead of date-only logic
-- This ensures scheduled tasks are processed at the correct time, not just date

CREATE OR REPLACE FUNCTION public.process_scheduled_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_record RECORD;
  new_card_id UUID;
  tag_id UUID;
  new_next_occurrence DATE;
  new_scheduled_timestamp TIMESTAMPTZ;
  current_day_of_week INTEGER;
  next_scheduled_day INTEGER;
  days_until_next INTEGER;
  days_difference INTEGER;
  i INTEGER;
BEGIN
  -- Process all due tasks using the new scheduled_timestamp column
  -- A task is due if its scheduled_timestamp is at or before the current UTC time
  FOR task_record IN
    SELECT * FROM public.scheduled_tasks
    WHERE scheduled_timestamp IS NOT NULL
      AND scheduled_timestamp <= NOW()
    UNION
    -- Also process tasks that don't have scheduled_timestamp but have past next_occurrence_date
    -- This handles legacy tasks or tasks created before the timestamp migration
    SELECT * FROM public.scheduled_tasks
    WHERE scheduled_timestamp IS NULL
      AND next_occurrence_date <= CURRENT_DATE
  LOOP
    -- Shift all existing cards in the target column down by 1 position
    -- This makes room for the new card at position 0
    UPDATE public.cards
    SET position = position + 1
    WHERE column_id = task_record.target_column_id;

    -- Create the new card from the scheduled task (removed user_id as it doesn't exist in cards table)
    INSERT INTO public.cards (
      title,
      summary,
      column_id,
      position,
      card_type,
      priority
    ) VALUES (
      task_record.title,
      task_record.summary,
      task_record.target_column_id,
      0, -- Always insert at position 0 (top of column)
      'simple',
      COALESCE(task_record.priority, 0)
    )
    RETURNING id INTO new_card_id;

    -- Apply tags to the new card if any are specified
    IF task_record.tag_ids IS NOT NULL THEN
      FOREACH tag_id IN ARRAY task_record.tag_ids
      LOOP
        INSERT INTO public.card_tags (card_id, tag_id)
        VALUES (new_card_id, tag_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Calculate the next occurrence based on recurrence type
    CASE task_record.recurrence_type
      WHEN 'once' THEN
        -- For one-time tasks, delete them after execution
        DELETE FROM public.scheduled_tasks WHERE id = task_record.id;
        CONTINUE;

      WHEN 'daily' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '1 day';
        END IF;

      WHEN 'weekdays' THEN
        new_next_occurrence := task_record.next_occurrence_date + INTERVAL '1 day';
        WHILE EXTRACT(DOW FROM new_next_occurrence) IN (0, 6) LOOP
          new_next_occurrence := new_next_occurrence + INTERVAL '1 day';
        END LOOP;
        IF task_record.scheduled_timestamp IS NOT NULL THEN
          -- Calculate the difference in days and convert to interval
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
          days_until_next := 8;

          FOR i IN 1..array_length(task_record.days_of_week, 1) LOOP
            IF task_record.days_of_week[i] > current_day_of_week THEN
              IF task_record.days_of_week[i] - current_day_of_week < days_until_next THEN
                days_until_next := task_record.days_of_week[i] - current_day_of_week;
                next_scheduled_day := task_record.days_of_week[i];
              END IF;
            END IF;
          END LOOP;

          IF next_scheduled_day IS NULL THEN
            next_scheduled_day := task_record.days_of_week[1];
            FOR i IN 1..array_length(task_record.days_of_week, 1) LOOP
              IF task_record.days_of_week[i] < next_scheduled_day THEN
                next_scheduled_day := task_record.days_of_week[i];
              END IF;
            END LOOP;
            days_until_next := 7 - current_day_of_week + next_scheduled_day;
          END IF;

          new_next_occurrence := task_record.next_occurrence_date + (days_until_next || ' days')::INTERVAL;
          IF task_record.scheduled_timestamp IS NOT NULL THEN
            new_scheduled_timestamp := task_record.scheduled_timestamp + (days_until_next || ' days')::INTERVAL;
          END IF;
        ELSE
          new_next_occurrence := task_record.next_occurrence_date + INTERVAL '7 days';
          IF task_record.scheduled_timestamp IS NOT NULL THEN
            new_scheduled_timestamp := task_record.scheduled_timestamp + INTERVAL '7 days';
          END IF;
        END IF;

      ELSE
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