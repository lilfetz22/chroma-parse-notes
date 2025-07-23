create function search_notes(search_term text)
returns setof notes
as $$
  select *
  from notes
  where 
    (title @@ to_tsquery(search_term) or content @@ to_tsquery(search_term))
    and auth.uid() = user_id;
$$ language sql;