-- Fix Channel Images Setup
-- Run this in Supabase SQL Editor to add channel-avatars bucket

-- Create channel-avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('channel-avatars', 'channel-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for channel images
CREATE POLICY "Public channel images are viewable by everyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'channel-avatars');

CREATE POLICY "Users can upload their own channel images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'channel-avatars' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own channel images" 
ON storage.objects FOR UPDATE 
WITH CHECK (
  bucket_id = 'channel-avatars' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own channel images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'channel-avatars' AND 
  auth.role() = 'authenticated'
);