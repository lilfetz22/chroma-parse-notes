-- Add Priority System and Tagging System to the Kanban board
-- This migration adds priority support to cards and scheduled_tasks, and creates a tagging system

-- Step 1: Add priority column to cards table
ALTER TABLE public.cards
ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- Step 2: Create tags table for master tag list
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create policies for tags table
CREATE POLICY "Users can view their own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- Step 3: Create card_tags join table for many-to-many relationship
CREATE TABLE public.card_tags (
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

-- Enable Row Level Security on card_tags
ALTER TABLE public.card_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for card_tags table
CREATE POLICY "Users can view card tags for their cards" ON public.card_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cards
      JOIN public.columns ON columns.id = cards.column_id
      JOIN public.boards ON boards.id = columns.board_id
      WHERE cards.id = card_tags.card_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create card tags for their cards" ON public.card_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards
      JOIN public.columns ON columns.id = cards.column_id
      JOIN public.boards ON boards.id = columns.board_id
      WHERE cards.id = card_id 
      AND boards.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.tags
      WHERE tags.id = tag_id 
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete card tags for their cards" ON public.card_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cards
      JOIN public.columns ON columns.id = cards.column_id
      JOIN public.boards ON boards.id = columns.board_id
      WHERE cards.id = card_tags.card_id 
      AND boards.user_id = auth.uid()
    )
  );

-- Step 4: Add priority and tag_ids to scheduled_tasks table
ALTER TABLE public.scheduled_tasks
ADD COLUMN priority INTEGER NOT NULL DEFAULT 0,
ADD COLUMN tag_ids UUID[] NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_priority ON public.cards(priority);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_priority ON public.scheduled_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON public.card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON public.card_tags(tag_id);

-- Step 5: Update process_scheduled_tasks function to handle priority and tags
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
  new_card_id UUID;
  tag_id UUID;
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
    
    -- Create the new card with priority
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

-- Step 6: Update get_board_details function to include tags and priority
CREATE OR REPLACE FUNCTION public.get_board_details(project_id_param uuid DEFAULT NULL::uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  user_board_id UUID;
BEGIN
  -- Get the board for the specified project
  IF project_id_param IS NOT NULL THEN
    SELECT id INTO user_board_id 
    FROM public.boards 
    WHERE project_id = project_id_param AND user_id = auth.uid();
  ELSE
    -- If no project specified, get the first available board
    SELECT id INTO user_board_id 
    FROM public.boards 
    WHERE user_id = auth.uid() 
    ORDER BY created_at DESC 
    LIMIT 1;
  END IF;

  -- If no board exists and project_id is provided, return empty result
  IF user_board_id IS NULL AND project_id_param IS NOT NULL THEN
    SELECT json_build_object(
      'board', NULL,
      'columns', '[]'::json,
      'cards', '[]'::json
    ) INTO result;
    RETURN result;
  END IF;

  -- If no board exists at all, create a default one (backward compatibility)
  IF user_board_id IS NULL THEN
    INSERT INTO public.boards (user_id, title) 
    VALUES (auth.uid(), 'My Board') 
    RETURNING id INTO user_board_id;
  END IF;

  -- Return complete board data with columns and cards (including tags and priority)
  SELECT json_build_object(
    'board', json_build_object(
      'id', b.id,
      'title', b.title,
      'created_at', b.created_at,
      'project_id', b.project_id
    ),
    'columns', COALESCE(columns_data.columns, '[]'::json),
    'cards', COALESCE(cards_data.cards, '[]'::json)
  ) INTO result
  FROM public.boards b
  LEFT JOIN (
    SELECT 
      board_id,
      json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'position', position,
          'created_at', created_at
        ) ORDER BY position
      ) as columns
    FROM public.columns
    WHERE board_id = user_board_id
    GROUP BY board_id
  ) columns_data ON columns_data.board_id = b.id
  LEFT JOIN (
    SELECT 
      c.board_id,
      json_agg(
        json_build_object(
          'id', cards.id,
          'column_id', cards.column_id,
          'position', cards.position,
          'card_type', cards.card_type,
          'title', cards.title,
          'content', cards.content,
          'note_id', cards.note_id,
          'summary', cards.summary,
          'priority', cards.priority,
          'scheduled_at', cards.scheduled_at,
          'recurrence', cards.recurrence,
          'activated_at', cards.activated_at,
          'completed_at', cards.completed_at,
          'created_at', cards.created_at,
          'tags', COALESCE(card_tags.tags, '[]'::json)
        ) ORDER BY cards.position
      ) as cards
    FROM public.cards cards
    JOIN public.columns c ON c.id = cards.column_id
    LEFT JOIN (
      SELECT 
        ct.card_id,
        json_agg(
          json_build_object(
            'id', t.id,
            'name', t.name,
            'color', t.color
          )
        ) as tags
      FROM public.card_tags ct
      JOIN public.tags t ON t.id = ct.tag_id
      GROUP BY ct.card_id
    ) card_tags ON card_tags.card_id = cards.id
    WHERE c.board_id = user_board_id
      AND (cards.scheduled_at IS NULL OR cards.scheduled_at <= now())
    GROUP BY c.board_id
  ) cards_data ON cards_data.board_id = b.id
  WHERE b.id = user_board_id;

  RETURN result;
END;
$$;
