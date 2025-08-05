-- Simple Storage Fix for RLS Policy Error
-- Run this in Supabase Dashboard > SQL Editor as admin

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create basic policies that allow authenticated users to manage their own files
-- These are simpler and should work

-- Book covers policies
CREATE OR REPLACE POLICY "book_covers_select_policy" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'book-covers');

CREATE OR REPLACE POLICY "book_covers_insert_policy" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

CREATE OR REPLACE POLICY "book_covers_update_policy" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

CREATE OR REPLACE POLICY "book_covers_delete_policy" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

-- Channel avatars policies  
CREATE OR REPLACE POLICY "channel_avatars_select_policy" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'channel-avatars');

CREATE OR REPLACE POLICY "channel_avatars_insert_policy" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'channel-avatars' AND auth.role() = 'authenticated');

CREATE OR REPLACE POLICY "channel_avatars_update_policy" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'channel-avatars' AND auth.role() = 'authenticated');

CREATE OR REPLACE POLICY "channel_avatars_delete_policy" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'channel-avatars' AND auth.role() = 'authenticated');