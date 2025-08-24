-- Create projects table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects table
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add project_id to boards table
ALTER TABLE public.boards 
ADD COLUMN project_id uuid;

-- Add project_id to notes table (nullable since notes can exist without projects)
ALTER TABLE public.notes 
ADD COLUMN project_id uuid;

-- Create a function to automatically create a board when a project is created
CREATE OR REPLACE FUNCTION public.create_board_for_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.boards (user_id, title, project_id)
  VALUES (NEW.user_id, NEW.title || ' Board', NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create board when project is created
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_board_for_project();

-- Drop and recreate the get_board_details function to be project-aware
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