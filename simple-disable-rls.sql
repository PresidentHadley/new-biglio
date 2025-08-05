-- Simple solution: Disable RLS on storage for development
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily for development
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('book-covers', 'book-covers', true),
  ('channel-avatars', 'channel-avatars', true)
ON CONFLICT (id) DO NOTHING;