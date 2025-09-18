CREATE OR REPLACE FUNCTION public.update_card_positions(
  updates jsonb,
  p_source_column_id uuid,
  p_dest_column_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  update_record jsonb;
  moved_card_id uuid;
  dest_column_title text;
BEGIN
  -- Update positions and column_id for all cards in the updates
  UPDATE cards
  SET
    position = (u.data->>'position')::integer,
    column_id = COALESCE((u.data->>'column_id')::uuid, cards.column_id)
  FROM (SELECT jsonb_array_elements(updates) AS data) AS u
  WHERE cards.id = (u.data->>'id')::uuid;

  -- Check if a card was moved to the 'Done' column
  IF p_source_column_id <> p_dest_column_id THEN
    -- Find the moved card
    SELECT u.data->>'id'
    INTO moved_card_id
    FROM (SELECT jsonb_array_elements(updates) AS data) AS u
    WHERE u.data->>'column_id' IS NOT NULL
    LIMIT 1;

    -- Get destination column title
    SELECT title
    INTO dest_column_title
    FROM columns
    WHERE id = p_dest_column_id;

    -- Update completed_at if moved to 'Done'
    IF dest_column_title = 'Done' AND moved_card_id IS NOT NULL THEN
      UPDATE cards
      SET completed_at = now()
      WHERE id = moved_card_id AND completed_at IS NULL;
    -- Remove completed_at if moved out of 'Done'
    ELSIF (SELECT title FROM columns WHERE id = p_source_column_id) = 'Done' AND dest_column_title <> 'Done' AND moved_card_id IS NOT NULL THEN
      UPDATE cards
      SET completed_at = NULL
      WHERE id = moved_card_id;
    END IF;
  END IF;

END;
$function$
;
