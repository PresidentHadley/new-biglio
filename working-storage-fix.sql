-- Working Storage Fix for RLS Policy Error
-- Run this in Supabase Dashboard > SQL Editor

-- First, drop all existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "book_covers_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "channel_avatars_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "channel_avatars_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "channel_avatars_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "channel_avatars_delete_policy" ON storage.objects;

-- Also drop any old policies that might exist
DROP POLICY IF EXISTS "Public book covers are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own book covers" ON storage.objects;
DROP POLICY IF EXISTS "Public profile images are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policies for book covers
CREATE POLICY "book_covers_select_policy" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'book-covers');

CREATE POLICY "book_covers_insert_policy" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

CREATE POLICY "book_covers_update_policy" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

CREATE POLICY "book_covers_delete_policy" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

-- Create new policies for channel avatars
CREATE POLICY "channel_avatars_select_policy" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'channel-avatars');

CREATE POLICY "channel_avatars_insert_policy" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'channel-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "channel_avatars_update_policy" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'channel-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "channel_avatars_delete_policy" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'channel-avatars' AND auth.role() = 'authenticated');

-- Make sure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('book-covers', 'book-covers', true),
  ('channel-avatars', 'channel-avatars', true)
ON CONFLICT (id) DO NOTHING;