-- Expand recurrence options for scheduled tasks
-- This migration adds support for weekdays, bi-weekly, monthly, and custom weekly schedules

-- First, drop any existing check constraints that might conflict
ALTER TABLE public.scheduled_tasks 
DROP CONSTRAINT IF EXISTS scheduled_tasks_day_of_week_check;

ALTER TABLE public.scheduled_tasks 
DROP CONSTRAINT IF EXISTS scheduled_tasks_recurrence_type_check;

-- Update the recurrence_type column to support new patterns
ALTER TABLE public.scheduled_tasks 
ALTER COLUMN recurrence_type TYPE TEXT;

-- Add new check constraint with expanded recurrence types
ALTER TABLE public.scheduled_tasks 
ADD CONSTRAINT scheduled_tasks_recurrence_type_check 
CHECK (recurrence_type IN ('once', 'daily', 'weekdays', 'weekly', 'bi-weekly', 'monthly', 'custom_weekly'));

-- Rename day_of_week to days_of_week and change to array type
ALTER TABLE public.scheduled_tasks 
RENAME COLUMN day_of_week TO days_of_week;

-- Change the data type to integer array
ALTER TABLE public.scheduled_tasks 
ALTER COLUMN days_of_week TYPE INTEGER[] USING 
  CASE 
    WHEN days_of_week IS NOT NULL THEN ARRAY[days_of_week]
    ELSE NULL
  END;

-- Add a check constraint to ensure days_of_week values are valid (0-6, representing Sunday-Saturday)
ALTER TABLE public.scheduled_tasks 
ADD CONSTRAINT scheduled_tasks_days_of_week_check 
CHECK (
  days_of_week IS NULL OR 
  (array_length(days_of_week, 1) BETWEEN 1 AND 7 AND
   days_of_week <@ ARRAY[0,1,2,3,4,5,6]
  )
);

-- Add comment to document the new structure
COMMENT ON COLUMN public.scheduled_tasks.recurrence_type IS 'Recurrence pattern: once, daily, weekdays (Mon-Fri), weekly, bi-weekly (every 2 weeks), monthly, or custom_weekly';
COMMENT ON COLUMN public.scheduled_tasks.days_of_week IS 'Array of day numbers (0=Sunday to 6=Saturday) for weekly and custom_weekly recurrence types';