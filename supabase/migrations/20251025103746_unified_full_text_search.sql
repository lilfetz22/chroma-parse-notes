-- Fix global search function to return proper JSONB array
-- The previous version used SETOF JSON which caused issues with the Supabase client

DROP FUNCTION IF EXISTS global_search(TEXT);

CREATE OR REPLACE FUNCTION global_search(search_term TEXT)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  preview TEXT,
  project_id UUID,
  project_title TEXT,
  updated_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH search_results AS (
    -- Search in projects
    SELECT 
      p.id,
      'project'::TEXT as type,
      p.title,
      ts_headline('english', 
        p.title || ' ' || COALESCE(p.description, ''), 
        plainto_tsquery('english', search_term),
        'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false'
      ) as preview,
      p.id as project_id,
      p.title as project_title,
      p.created_at as updated_at,
      ts_rank(
        to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')),
        plainto_tsquery('english', search_term)
      ) as rank
    FROM projects p
    WHERE 
      p.user_id = auth.uid()
      AND to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', search_term)

    UNION ALL

    -- Search in notes
    SELECT 
      n.id,
      'note'::TEXT as type,
      n.title,
      ts_headline('english', 
        n.title || ' ' || n.content, 
        plainto_tsquery('english', search_term),
        'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false'
      ) as preview,
      n.project_id,
      COALESCE(p.title, 'Personal Notes') as project_title,
      n.updated_at,
      ts_rank(
        to_tsvector('english', n.title || ' ' || n.content),
        plainto_tsquery('english', search_term)
      ) as rank
    FROM notes n
    LEFT JOIN projects p ON p.id = n.project_id
    WHERE 
      n.user_id = auth.uid()
      AND to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', search_term)

    UNION ALL

    -- Search in cards
    SELECT 
      c.id,
      'card'::TEXT as type,
      c.title,
      ts_headline('english', 
        c.title || ' ' || COALESCE(c.summary, '') || ' ' || COALESCE(c.content::text, ''), 
        plainto_tsquery('english', search_term),
        'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false'
      ) as preview,
      b.project_id,
      COALESCE(p.title, 'Default Project') as project_title,
      c.created_at as updated_at,
      ts_rank(
        to_tsvector('english', c.title || ' ' || COALESCE(c.summary, '') || ' ' || COALESCE(c.content::text, '')),
        plainto_tsquery('english', search_term)
      ) as rank
    FROM cards c
    JOIN columns col ON col.id = c.column_id
    JOIN boards b ON b.id = col.board_id
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE 
      b.user_id = auth.uid()
      AND to_tsvector('english', c.title || ' ' || COALESCE(c.summary, '') || ' ' || COALESCE(c.content::text, '')) @@ plainto_tsquery('english', search_term)
  )
  SELECT 
    id,
    type,
    title,
    preview,
    project_id,
    project_title,
    updated_at,
    rank
  FROM search_results 
  ORDER BY rank DESC, updated_at DESC;
$$;

