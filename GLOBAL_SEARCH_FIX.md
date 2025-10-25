# Global Search Fix Instructions

## Problem Identified
The global search function wasn't working because it was using `RETURNS SETOF JSON` which caused issues with how the Supabase JavaScript client handles the response.

## Solution
I've created a new migration that fixes the function to return a proper TABLE structure instead of SETOF JSON.

## Steps to Fix (Follow Remote-First Workflow)

### 1. Apply the Migration in Supabase Dashboard

Go to the Supabase SQL Editor and run the contents of:
`supabase/migrations/20250125000000_fix_global_search_return_type.sql`

This will:
- Drop the old function
- Create a new version that returns a proper TABLE structure
- The results will be directly usable by the JavaScript client

### 2. Regenerate TypeScript Types

After applying the migration, run this command in your terminal:

```powershell
npx supabase gen types typescript --project-id hvwkhgyololbbhqaslco > src/integrations/supabase/types.ts
```

This will update the types to reflect the new function signature.

### 3. Test the Search

1. Open your app in the browser
2. Open the browser console (F12)
3. Click the search button or press Ctrl+K (or Cmd+K on Mac)
4. Type a search term
5. You should see debug logs in the console showing:
   - The search term being used
   - Raw data received from the API
   - Parsed results
6. The search results should now appear in the dropdown

## What Changed

### Before (Broken):
```sql
RETURNS SETOF JSON
-- Returns: [json_object, json_object, ...]
-- Supabase client couldn't properly handle this
```

### After (Fixed):
```sql
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
-- Returns: [{id, type, title, ...}, {id, type, title, ...}, ...]
-- Supabase client handles this correctly
```

## Additional Debugging

If you still don't see results after following the steps above:

1. Check the browser console for any error messages
2. Look for the debug logs I added (prefixed with `[GlobalSearch]` and `[AppHeader]`)
3. Make sure you have at least one project, note, or card that contains the text you're searching for

## Cleanup (Optional)

Once everything is working, you can remove the debug console.log statements from:
- `src/hooks/useGlobalSearch.tsx`
- `src/components/AppHeader.tsx`
