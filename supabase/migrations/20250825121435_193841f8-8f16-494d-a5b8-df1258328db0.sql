-- Create scheduled_tasks table for one-time and recurring task automation
CREATE TABLE public.scheduled_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  target_column_id UUID NOT NULL,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('once', 'daily', 'weekly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  next_occurrence_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own scheduled tasks" 
ON public.scheduled_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own scheduled tasks" 
ON public.scheduled_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled tasks" 
ON public.scheduled_tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled tasks" 
ON public.scheduled_tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to process scheduled tasks (runs via cron)
CREATE OR REPLACE FUNCTION public.process_scheduled_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_record RECORD;
  new_position INTEGER;
  next_date DATE;
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
      created_at
    ) VALUES (
      task_record.target_column_id,
      new_position,
      'simple',
      task_record.title,
      task_record.summary,
      now()
    );
    
    -- Handle recurrence or deletion
    IF task_record.recurrence_type = 'once' THEN
      -- Delete one-time tasks
      DELETE FROM public.scheduled_tasks WHERE id = task_record.id;
    ELSIF task_record.recurrence_type = 'daily' THEN
      -- Update daily tasks to next day
      UPDATE public.scheduled_tasks 
      SET next_occurrence_date = task_record.next_occurrence_date + INTERVAL '1 day'
      WHERE id = task_record.id;
    ELSIF task_record.recurrence_type = 'weekly' THEN
      -- Update weekly tasks to same day next week
      UPDATE public.scheduled_tasks 
      SET next_occurrence_date = task_record.next_occurrence_date + INTERVAL '7 days'
      WHERE id = task_record.id;
    END IF;
  END LOOP;
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at 5:00 AM UTC
SELECT cron.schedule(
  'daily-task-processor',
  '0 5 * * *',
  $$ SELECT public.process_scheduled_tasks() $$
);