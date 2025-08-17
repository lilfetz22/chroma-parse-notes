-- Create enum for card types
CREATE TYPE public.card_type AS ENUM ('simple', 'linked');

-- Create boards table
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Board',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Create policies for boards table
CREATE POLICY "Users can view their own boards" ON public.boards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boards" ON public.boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards" ON public.boards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards" ON public.boards
  FOR DELETE USING (auth.uid() = user_id);

-- Create columns table
CREATE TABLE public.columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on columns
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

-- Create policies for columns table
CREATE POLICY "Users can view columns in their boards" ON public.columns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.boards 
      WHERE boards.id = columns.board_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create columns in their boards" ON public.columns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards 
      WHERE boards.id = board_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update columns in their boards" ON public.columns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.boards 
      WHERE boards.id = columns.board_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete columns in their boards" ON public.columns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.boards 
      WHERE boards.id = columns.board_id 
      AND boards.user_id = auth.uid()
    )
  );

-- Create cards table
CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  card_type public.card_type NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Create policies for cards table
CREATE POLICY "Users can view cards in their boards" ON public.cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.columns
      JOIN public.boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cards in their boards" ON public.cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.columns
      JOIN public.boards ON boards.id = columns.board_id
      WHERE columns.id = column_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cards in their boards" ON public.cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.columns
      JOIN public.boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id 
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cards in their boards" ON public.cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.columns
      JOIN public.boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id 
      AND boards.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_boards_user_id ON public.boards(user_id);
CREATE INDEX idx_columns_board_id ON public.columns(board_id);
CREATE INDEX idx_columns_position ON public.columns(position);
CREATE INDEX idx_cards_column_id ON public.cards(column_id);
CREATE INDEX idx_cards_position ON public.cards(position);
CREATE INDEX idx_cards_note_id ON public.cards(note_id);

-- Create RPC function to get complete board details
CREATE OR REPLACE FUNCTION public.get_board_details(board_id_param UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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