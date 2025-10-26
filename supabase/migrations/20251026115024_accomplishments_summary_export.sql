-- Create function to export accomplishments summary for performance reviews
-- This function aggregates completed tasks, grouping recurring tasks together

CREATE OR REPLACE FUNCTION export_accomplishments(
  start_date TEXT,
  end_date TEXT
)
RETURNS TABLE (
  project_name TEXT,
  task_title TEXT,
  task_summary TEXT,
  tags TEXT,
  completion_count BIGINT,
  completion_dates TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH completed_cards AS (
    -- Get all completed cards within the date range
    SELECT 
      c.id,
      c.title,
      c.summary,
      c.completed_at,
      c.column_id,
      p.title as project_title
    FROM cards c
    JOIN columns col ON col.id = c.column_id
    JOIN boards b ON b.id = col.board_id
    JOIN projects p ON p.id = b.project_id
    WHERE 
      c.completed_at IS NOT NULL
      AND c.completed_at::date >= start_date::date
      AND c.completed_at::date <= end_date::date
      AND (col.title ILIKE 'Done' OR col.title ILIKE 'Completed')
      AND p.user_id = auth.uid()
  ),
  card_tag_aggregation AS (
    -- Aggregate tags for each card
    SELECT 
      cc.id as card_id,
      STRING_AGG(DISTINCT t.name, ', ' ORDER BY t.name) as tag_list
    FROM completed_cards cc
    LEFT JOIN card_tags ct ON ct.card_id = cc.id
    LEFT JOIN tags t ON t.id = ct.tag_id
    GROUP BY cc.id
  ),
  grouped_tasks AS (
    -- Group by project and task title, get most recent summary
    SELECT 
      cc.project_title,
      cc.title,
      (
        SELECT summary 
        FROM completed_cards cc2 
        WHERE cc2.project_title = cc.project_title 
          AND cc2.title = cc.title 
        ORDER BY cc2.completed_at DESC 
        LIMIT 1
      ) as latest_summary,
      STRING_AGG(DISTINCT cta.tag_list, ', ') as all_tags,
      COUNT(*) as completion_count,
      STRING_AGG(
        TO_CHAR(cc.completed_at, 'YYYY-MM-DD'),
        ', '
        ORDER BY cc.completed_at ASC
      ) as completion_dates
    FROM completed_cards cc
    LEFT JOIN card_tag_aggregation cta ON cta.card_id = cc.id
    GROUP BY cc.project_title, cc.title
  )
  SELECT 
    gt.project_title::TEXT as project_name,
    gt.title::TEXT as task_title,
    COALESCE(gt.latest_summary, '')::TEXT as task_summary,
    COALESCE(gt.all_tags, '')::TEXT as tags,
    gt.completion_count,
    gt.completion_dates::TEXT
  FROM grouped_tasks gt
  ORDER BY gt.project_title, gt.completion_count DESC, gt.title;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION export_accomplishments(TEXT, TEXT) TO authenticated;

