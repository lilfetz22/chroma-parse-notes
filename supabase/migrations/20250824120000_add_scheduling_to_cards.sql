-- Add scheduling and state columns to cards table
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS recurrence text NULL,
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone NULL;

-- Add indexes to help queries for scheduled and state columns
CREATE INDEX IF NOT EXISTS idx_cards_scheduled_at ON public.cards(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cards_activated_at ON public.cards(activated_at);
CREATE INDEX IF NOT EXISTS idx_cards_completed_at ON public.cards(completed_at);

-- Recreate get_board_details to respect scheduled_at (only include cards with no schedule or scheduled_at <= now())
DROP FUNCTION IF EXISTS public.get_board_details(uuid);

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

  -- Return complete board data with columns and cards
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
          'scheduled_at', cards.scheduled_at,
          'recurrence', cards.recurrence,
          'activated_at', cards.activated_at,
          'completed_at', cards.completed_at,
          'created_at', cards.created_at
        ) ORDER BY cards.position
      ) as cards
    FROM public.cards cards
    JOIN public.columns c ON c.id = cards.column_id
    WHERE c.board_id = user_board_id
      AND (cards.scheduled_at IS NULL OR cards.scheduled_at <= now())
    GROUP BY c.board_id
  ) cards_data ON cards_data.board_id = b.id
  WHERE b.id = user_board_id;

  RETURN result;
END;
$$;
