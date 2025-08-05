-- Fix Storage RLS Policies for Image Upload
-- Run this in Supabase SQL Editor to fix the "row violates row-level security policy" error

-- First, drop existing policies
DROP POLICY IF EXISTS "Public book covers are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own book covers" ON storage.objects;

DROP POLICY IF EXISTS "Public profile images are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- Create more flexible policies for book covers
CREATE POLICY "Anyone can view book covers" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'book-covers');

CREATE POLICY "Authenticated users can upload book covers" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'book-covers' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update book covers" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'book-covers' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete book covers" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'book-covers' AND 
  auth.role() = 'authenticated'
);

-- Create policies for profile images (channel-avatars bucket)
CREATE POLICY "Anyone can view channel avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'channel-avatars');

CREATE POLICY "Authenticated users can upload channel avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'channel-avatars' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update channel avatars" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'channel-avatars' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete channel avatars" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'channel-avatars' AND 
  auth.role() = 'authenticated'
);

-- Ensure buckets exist with correct names
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('book-covers', 'book-covers', true),
  ('channel-avatars', 'channel-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Add helpful comment
COMMENT ON TABLE storage.objects IS 'Simplified RLS policies - any authenticated user can manage images in book-covers and channel-avatars buckets';