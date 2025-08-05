-- Setup Image Storage for Biglio V2
-- Run this in Supabase SQL Editor

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('book-covers', 'book-covers', true),
  ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for book covers
CREATE POLICY "Public book covers are viewable by everyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'book-covers');

CREATE POLICY "Users can upload book covers" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'book-covers' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own book covers" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'book-covers' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own book covers" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'book-covers' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policies for profile images
CREATE POLICY "Public profile images are viewable by everyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload profile images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-images' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own profile images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'profile-images' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own profile images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'profile-images' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add cover_url column to biglios table if not exists
ALTER TABLE biglios 
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Add avatar and cover image columns to channels table if not exists  
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Add some helpful comments
COMMENT ON COLUMN biglios.cover_url IS 'URL to book cover image in Supabase Storage';
COMMENT ON COLUMN channels.avatar_url IS 'URL to user profile picture in Supabase Storage';
COMMENT ON COLUMN channels.cover_url IS 'URL to channel cover photo in Supabase Storage';