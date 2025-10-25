-- Create global search function for searching across projects, notes, and cards
-- Supports full-text search with PostgreSQL's tsvector capabilities

-- First, create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX IF NOT EXISTS idx_cards_fts ON cards USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(content::text, '')));

-- Create the global search function
CREATE OR REPLACE FUNCTION global_search(search_term TEXT)
RETURNS SETOF JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH search_results AS (
    -- Search in projects
    SELECT 
      json_build_object(
        'id', p.id,
        'type', 'project',
        'title', p.title,
        'preview', ts_headline('english', 
          p.title || ' ' || COALESCE(p.description, ''), 
          plainto_tsquery('english', search_term),
          'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false'
        ),
        'project_id', p.id,
        'project_title', p.title,
        'updated_at', p.created_at
      ) as result,
      ts_rank(
        to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')),
        plainto_tsquery('english', search_term)
      ) as rank,
      p.created_at as sort_date
    FROM projects p
    WHERE 
      p.user_id = auth.uid()
      AND to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', search_term)

    UNION ALL

    -- Search in notes
    SELECT 
      json_build_object(
        'id', n.id,
        'type', 'note',
        'title', n.title,
        'preview', ts_headline('english', 
          n.title || ' ' || n.content, 
          plainto_tsquery('english', search_term),
          'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false'
        ),
        'project_id', n.project_id,
        'project_title', COALESCE(p.title, 'Personal Notes'),
        'updated_at', n.updated_at
      ) as result,
      ts_rank(
        to_tsvector('english', n.title || ' ' || n.content),
        plainto_tsquery('english', search_term)
      ) as rank,
      n.updated_at as sort_date
    FROM notes n
    LEFT JOIN projects p ON p.id = n.project_id
    WHERE 
      n.user_id = auth.uid()
      AND to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', search_term)

    UNION ALL

    -- Search in cards
    SELECT 
      json_build_object(
        'id', c.id,
        'type', 'card',
        'title', c.title,
        'preview', ts_headline('english', 
          c.title || ' ' || COALESCE(c.summary, '') || ' ' || COALESCE(c.content::text, ''), 
          plainto_tsquery('english', search_term),
          'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false'
        ),
        'project_id', b.project_id,
        'project_title', COALESCE(p.title, 'Default Project'),
        'updated_at', c.created_at
      ) as result,
      ts_rank(
        to_tsvector('english', c.title || ' ' || COALESCE(c.summary, '') || ' ' || COALESCE(c.content::text, '')),
        plainto_tsquery('english', search_term)
      ) as rank,
      c.created_at as sort_date
    FROM cards c
    JOIN columns col ON col.id = c.column_id
    JOIN boards b ON b.id = col.board_id
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE 
      b.user_id = auth.uid()
      AND to_tsvector('english', c.title || ' ' || COALESCE(c.summary, '') || ' ' || COALESCE(c.content::text, '')) @@ plainto_tsquery('english', search_term)
  )
  SELECT result 
  FROM search_results 
  ORDER BY rank DESC, sort_date DESC;
$$;