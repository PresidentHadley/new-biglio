-- Check what channel handle was actually created for the user
-- Run this in your Supabase SQL Editor

-- Find your channel handle
SELECT 
    handle,
    display_name,
    bio,
    created_at
FROM channels 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;

-- If you want to update your channel handle to match your email prefix,
-- uncomment and run this (replace 'presidenthadley' with your email prefix):

-- UPDATE channels 
-- SET handle = 'presidenthadley'
-- WHERE user_id = auth.uid();

-- Verify the update:
-- SELECT handle, display_name FROM channels WHERE user_id = auth.uid();