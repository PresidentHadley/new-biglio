-- Check what tables exist in your Supabase database
-- Run this in Supabase SQL Editor to see current state

SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Also check if biglios table exists specifically
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'biglios'
) as biglios_table_exists;

-- Check if main tables exist
SELECT 
  EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as users_exists,
  EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'channels') as channels_exists,
  EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biglios') as biglios_exists,
  EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chapters') as chapters_exists;