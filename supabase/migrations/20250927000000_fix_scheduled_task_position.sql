-- Fix scheduled task positioning to appear at top of column instead of bottom
-- This updates the process_scheduled_tasks function to insert new cards at position 0

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
  current_day_of_week INTEGER;
  next_scheduled_day INTEGER;
  days_until_next INTEGER;
  i INTEGER;
BEGIN
  -- Process all due tasks
  FOR task_record IN 
    SELECT * FROM public.scheduled_tasks 
    WHERE next_occurrence_date <= CURRENT_DATE
  LOOP
    -- Shift all existing cards in the target column down by 1 position
    -- This makes room for the new card at position 0
    UPDATE public.cards 
    SET position = position + 1
    WHERE column_id = task_record.target_column_id;
    
    -- Create the new card at position 0 (top of column)
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
      0,  -- Position 0 = top of column
      'simple',
      task_record.title,
      task_record.summary,
      task_record.priority,
      now()
    ) RETURNING id INTO new_card_id;
    
    -- Create card_tags entries if tag_ids are specified
    IF task_record.tag_ids IS NOT NULL AND array_length(task_record.tag_ids, 1) > 0 THEN
      FOREACH tag_id IN ARRAY task_record.tag_ids
      LOOP
        INSERT INTO public.card_tags (card_id, tag_id)
        VALUES (new_card_id, tag_id)
        ON CONFLICT DO NOTHING; -- Prevent duplicate tag assignments
      END LOOP;
    END IF;
    
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
        -- Use date_trunc to get the first day of the month, then add months and adjust
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