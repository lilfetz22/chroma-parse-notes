-- Create the user_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nlh_global_enabled BOOLEAN NOT NULL DEFAULT true,
  nlh_highlight_noun BOOLEAN NOT NULL DEFAULT true,
  nlh_highlight_verb BOOLEAN NOT NULL DEFAULT true,
  nlh_highlight_adverb BOOLEAN NOT NULL DEFAULT true,
  nlh_highlight_adjective BOOLEAN NOT NULL DEFAULT true,
  nlh_highlight_number BOOLEAN NOT NULL DEFAULT true,
  nlh_highlight_proper_noun BOOLEAN NOT NULL DEFAULT true,
  nlh_color_noun TEXT NOT NULL DEFAULT '#28a745',
  nlh_color_verb TEXT NOT NULL DEFAULT '#ffc107',
  nlh_color_adverb TEXT NOT NULL DEFAULT '#fd7e14',
  nlh_color_adjective TEXT NOT NULL DEFAULT '#007bff',
  nlh_color_number TEXT NOT NULL DEFAULT '#dc3545',
  nlh_color_proper_noun TEXT NOT NULL DEFAULT '#6f42c1'
);

-- Add is_on_vacation column to user_settings, ensuring not to fail if it exists
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS is_on_vacation BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS for the user_settings table
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to prevent conflicts
DROP POLICY IF EXISTS "Allow individual user access" ON public.user_settings;

-- Create a policy that allows users to SELECT and UPDATE their own settings.
CREATE POLICY "Allow individual user access"
ON public.user_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_settings IS 'Stores user-specific settings for the application.';
COMMENT ON COLUMN public.user_settings.is_on_vacation IS 'When true, scheduled tasks for this user will not be processed.';
COMMENT ON POLICY "Allow individual user access" ON public.user_settings IS 'Users can view and update only their own settings.';

