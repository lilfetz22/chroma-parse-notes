-- Add summary column to cards table
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS summary text;
