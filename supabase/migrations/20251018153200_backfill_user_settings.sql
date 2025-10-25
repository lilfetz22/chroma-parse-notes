-- Backfill user_settings for all existing users
-- This ensures every user in auth.users has a corresponding user_settings row
INSERT INTO public.user_settings (user_id)
SELECT id 
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.user_settings s 
  WHERE s.user_id = u.id
);

COMMENT ON TABLE public.user_settings IS 'Stores user-specific settings for the application. Each user should have exactly one settings row.';