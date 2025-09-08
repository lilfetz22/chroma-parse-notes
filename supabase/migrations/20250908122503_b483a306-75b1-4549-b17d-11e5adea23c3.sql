-- Create the missing update_card_positions function
CREATE OR REPLACE FUNCTION public.update_card_positions(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  update_record jsonb;
BEGIN
  -- Loop through each update in the jsonb array
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Update the card with new position and optionally column_id
    UPDATE public.cards 
    SET 
      position = (update_record->>'position')::integer,
      column_id = COALESCE(
        NULLIF(update_record->>'column_id', '')::uuid, 
        column_id
      )
    WHERE id = (update_record->>'id')::uuid;
  END LOOP;
END;
$function$;