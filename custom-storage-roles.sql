-- Custom Storage Roles Solution
-- Run this in Supabase Dashboard > SQL Editor

-- Create a custom storage_manager role
CREATE ROLE storage_manager;

-- Grant the role to authenticator and anon (required by Supabase)
GRANT storage_manager TO authenticator;
GRANT anon TO storage_manager;

-- Create policies for book covers with the custom role
CREATE POLICY "Storage managers can view all book covers"
ON storage.objects
FOR SELECT
TO storage_manager
USING (bucket_id = 'book-covers');

CREATE POLICY "Storage managers can upload book covers"
ON storage.objects
FOR INSERT
TO storage_manager
WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "Storage managers can update book covers"
ON storage.objects
FOR UPDATE
TO storage_manager
USING (bucket_id = 'book-covers');

CREATE POLICY "Storage managers can delete book covers"
ON storage.objects
FOR DELETE
TO storage_manager
USING (bucket_id = 'book-covers');

-- Create policies for channel avatars with the custom role
CREATE POLICY "Storage managers can view all channel avatars"
ON storage.objects
FOR SELECT
TO storage_manager
USING (bucket_id = 'channel-avatars');

CREATE POLICY "Storage managers can upload channel avatars"
ON storage.objects
FOR INSERT
TO storage_manager
WITH CHECK (bucket_id = 'channel-avatars');

CREATE POLICY "Storage managers can update channel avatars"
ON storage.objects
FOR UPDATE
TO storage_manager
USING (bucket_id = 'channel-avatars');

CREATE POLICY "Storage managers can delete channel avatars"
ON storage.objects
FOR DELETE
TO storage_manager
USING (bucket_id = 'channel-avatars');

-- Also allow public read access for everyone
CREATE POLICY "Public can view book covers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'book-covers');

CREATE POLICY "Public can view channel avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'channel-avatars');

-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('book-covers', 'book-covers', true),
  ('channel-avatars', 'channel-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;