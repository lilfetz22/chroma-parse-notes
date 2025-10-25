-- Drop the old, incorrect column if it was already created from a previous attempt
ALTER TABLE public.scheduled_tasks DROP COLUMN IF EXISTS scheduled_time;


-- Add a scheduled_timestamp column to the scheduled_tasks table.
-- This stores a full, timezone-aware timestamp for when the task should activate.
ALTER TABLE public.scheduled_tasks
ADD COLUMN scheduled_timestamp TIMESTAMPTZ;

-- Add a comment explaining the column's purpose.
COMMENT ON COLUMN public.scheduled_tasks.scheduled_timestamp IS 'The absolute, timezone-aware timestamp for when the scheduled task should be activated (stored in UTC)';


-- Drop the old function so it can be replaced with the correct signature and logic.
DROP FUNCTION IF EXISTS public.convert_card_to_scheduled_task(UUID, TEXT, INTEGER[], DATE, TIME);


-- Update the convert_card_to_scheduled_task function to correctly handle timezones.
CREATE OR REPLACE FUNCTION public.convert_card_to_scheduled_task(
  p_card_id UUID,
  p_recurrence_type TEXT,
  p_days_of_week INTEGER[],
  p_next_occurrence_date DATE,
  p_scheduled_time TIME,
  p_user_timezone TEXT -- IMPORTANT: Add a parameter for the user's IANA timezone name (e.g., 'America/New_York')
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  card_record RECORD;
  new_task RECORD;
  result JSON;
  v_scheduled_timestamp TIMESTAMPTZ;
BEGIN
  -- Correctly combine the date and time in the user's specified timezone,
  -- which PostgreSQL will convert to a proper UTC timestamp for storage.
  v_scheduled_timestamp := (p_next_occurrence_date + p_scheduled_time) AT TIME ZONE p_user_timezone;

  -- Get the card details and verify ownership
  SELECT c.*, u.id as user_id
  FROM cards c
  JOIN columns col ON c.column_id = col.id
  JOIN boards b ON col.board_id = b.id
  JOIN projects p ON b.project_id = p.id
  JOIN auth.users u ON p.user_id = u.id
  WHERE c.id = p_card_id AND u.id = auth.uid()
  INTO card_record;

  -- Check if card exists and user owns it
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found or access denied';
  END IF;

  -- Insert new scheduled task using the timezone-aware timestamp
  INSERT INTO scheduled_tasks (
    user_id,
    project_id,
    title,
    summary,
    target_column_id,
    recurrence_type,
    days_of_week,
    next_occurrence_date,
    scheduled_timestamp, -- Use the new TIMESTAMPTZ column
    priority,
    tag_ids
  )
  SELECT
    card_record.user_id,
    (SELECT p.id FROM projects p
     JOIN boards b ON p.id = b.project_id
     JOIN columns col ON b.id = col.board_id
     WHERE col.id = card_record.column_id),
    card_record.title,
    COALESCE(card_record.summary,
             CASE
               WHEN card_record.card_type = 'simple' AND card_record.content IS NOT NULL
               THEN card_record.content::text
               ELSE NULL
             END),
    card_record.column_id,
    p_recurrence_type,
    p_days_of_week,
    p_next_occurrence_date,
    v_scheduled_timestamp, -- Insert the calculated timezone-aware timestamp
    COALESCE(card_record.priority, 0),
    COALESCE(
      (SELECT array_agg(ct.tag_id)
       FROM card_tags ct
       WHERE ct.card_id = card_record.id),
      ARRAY[]::UUID[]
    )
  RETURNING * INTO new_task;

  -- Delete the original card and its relationships
  DELETE FROM card_tags WHERE card_id = p_card_id;
  DELETE FROM cards WHERE id = p_card_id;

  -- Return the new scheduled task details
  SELECT json_build_object(
    'success', true,
    'scheduled_task', row_to_json(new_task),
    'message', 'Card successfully converted to scheduled task'
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to convert card to scheduled task'
    ) INTO result;

    RETURN result;
END;
$$;


-- Grant execute permission to authenticated users (with the new 6-parameter signature)
GRANT EXECUTE ON FUNCTION public.convert_card_to_scheduled_task(UUID, TEXT, INTEGER[], DATE, TIME, TEXT) TO authenticated;