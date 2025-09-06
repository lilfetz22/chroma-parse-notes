-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card_tags junction table for many-to-many relationship
CREATE TABLE public.card_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags
CREATE POLICY "Users can view their own tags" 
ON public.tags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" 
ON public.tags 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
ON public.tags 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for card_tags
CREATE POLICY "Users can view card_tags for their own cards" 
ON public.card_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_tags.card_id 
    AND EXISTS (
      SELECT 1 FROM public.columns 
      WHERE columns.id = cards.column_id 
      AND EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = columns.board_id 
        AND boards.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create card_tags for their own cards" 
ON public.card_tags 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_tags.card_id 
    AND EXISTS (
      SELECT 1 FROM public.columns 
      WHERE columns.id = cards.column_id 
      AND EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = columns.board_id 
        AND boards.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update card_tags for their own cards" 
ON public.card_tags 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_tags.card_id 
    AND EXISTS (
      SELECT 1 FROM public.columns 
      WHERE columns.id = cards.column_id 
      AND EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = columns.board_id 
        AND boards.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete card_tags for their own cards" 
ON public.card_tags 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_tags.card_id 
    AND EXISTS (
      SELECT 1 FROM public.columns 
      WHERE columns.id = cards.column_id 
      AND EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = columns.board_id 
        AND boards.user_id = auth.uid()
      )
    )
  )
);

-- Create function to convert card to scheduled task
CREATE OR REPLACE FUNCTION convert_card_to_scheduled_task(
  p_card_id UUID,
  p_recurrence_type TEXT DEFAULT 'once',
  p_days_of_week INTEGER[] DEFAULT NULL,
  p_next_occurrence_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_card public.cards%ROWTYPE;
  v_column_id UUID;
  v_scheduled_task_id UUID;
BEGIN
  -- Get the card details
  SELECT * INTO v_card FROM public.cards WHERE id = p_card_id;
  
  -- Get the target column (first column of the board)
  SELECT c.id INTO v_column_id 
  FROM public.columns c
  JOIN public.columns source_col ON source_col.board_id = c.board_id
  WHERE source_col.id = v_card.column_id
  ORDER BY c.position
  LIMIT 1;
  
  -- Create scheduled task
  INSERT INTO public.scheduled_tasks (
    title,
    summary,
    recurrence_type,
    days_of_week,
    next_occurrence_date,
    target_column_id,
    project_id,
    user_id
  ) VALUES (
    v_card.title,
    COALESCE(v_card.summary, ''),
    p_recurrence_type,
    p_days_of_week,
    COALESCE(p_next_occurrence_date, NOW()),
    v_column_id,
    (SELECT project_id FROM public.boards b JOIN public.columns c ON b.id = c.board_id WHERE c.id = v_card.column_id),
    (SELECT user_id FROM public.boards b JOIN public.columns c ON b.id = c.board_id WHERE c.id = v_card.column_id)
  ) RETURNING id INTO v_scheduled_task_id;
  
  -- Delete the original card
  DELETE FROM public.cards WHERE id = p_card_id;
  
  RETURN v_scheduled_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;