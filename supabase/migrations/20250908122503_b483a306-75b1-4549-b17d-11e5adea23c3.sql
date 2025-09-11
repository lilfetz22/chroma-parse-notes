-- Create the missing update_card_positions function
CREATE OR REPLACE FUNCTION public.update_card_positions(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  update_record jsonb;
  update_sql text := '';
  first_record boolean := true;
BEGIN
  -- Build a single UPDATE statement with CASE expressions for better performance
  update_sql := 'UPDATE public.cards SET position = CASE id';

  -- Loop through each update to build the CASE statement
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    update_sql := update_sql || ' WHEN ''' || (update_record->>'id')::text || ''' THEN ' || (update_record->>'position')::text;
  END LOOP;

  update_sql := update_sql || ' END';

  -- Add column_id update if any records have column_id
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    IF update_record->>'column_id' IS NOT NULL AND update_record->>'column_id' != '' THEN
      update_sql := update_sql || ', column_id = CASE id';

      -- Reset loop for column_id updates
      FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
      LOOP
        IF update_record->>'column_id' IS NOT NULL AND update_record->>'column_id' != '' THEN
          update_sql := update_sql || ' WHEN ''' || (update_record->>'id')::text || ''' THEN ''' || (update_record->>'column_id')::text || '''';
        END IF;
      END LOOP;

      update_sql := update_sql || ' ELSE column_id END';
      EXIT; -- Only add column_id update once
    END IF;
  END LOOP;

  -- Add WHERE clause
  update_sql := update_sql || ' WHERE id IN (';
  first_record := true;
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    IF NOT first_record THEN
      update_sql := update_sql || ', ';
    END IF;
    update_sql := update_sql || '''' || (update_record->>'id')::text || '''';
    first_record := false;
  END LOOP;
  update_sql := update_sql || ')';

  -- Execute the optimized query
  EXECUTE update_sql;
END;
$function$;