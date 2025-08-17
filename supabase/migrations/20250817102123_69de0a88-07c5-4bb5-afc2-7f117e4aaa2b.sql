-- Fix the search path for the get_board_details function
CREATE OR REPLACE FUNCTION public.get_board_details(board_id_param UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  user_board_id UUID;
BEGIN
  -- Get the user's board (create one if none exists)
  IF board_id_param IS NOT NULL THEN
    SELECT id INTO user_board_id 
    FROM public.boards 
    WHERE id = board_id_param AND user_id = auth.uid();
  ELSE
    SELECT id INTO user_board_id 
    FROM public.boards 
    WHERE user_id = auth.uid() 
    ORDER BY created_at DESC 
    LIMIT 1;
  END IF;

  -- If no board exists, create one
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
      'created_at', b.created_at
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
          'created_at', cards.created_at
        ) ORDER BY cards.position
      ) as cards
    FROM public.cards cards
    JOIN public.columns c ON c.id = cards.column_id
    WHERE c.board_id = user_board_id
    GROUP BY c.board_id
  ) cards_data ON cards_data.board_id = b.id
  WHERE b.id = user_board_id;

  RETURN result;
END;
$$;