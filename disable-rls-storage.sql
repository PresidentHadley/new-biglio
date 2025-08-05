-- Temporarily disable RLS on storage.objects to allow uploads
-- Run this in Supabase Dashboard > SQL Editor

-- Disable RLS on storage.objects (temporary solution)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Make sure buckets exist and are public
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('book-covers', 'book-covers', true),
  ('channel-avatars', 'channel-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Comment for later: Re-enable RLS when you have owner access
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;