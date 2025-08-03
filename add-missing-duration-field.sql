-- Add missing total_duration_seconds field to biglios table
-- Run this in your Supabase SQL Editor

-- Check if the column already exists, and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'biglios' 
        AND column_name = 'total_duration_seconds'
    ) THEN
        ALTER TABLE biglios ADD COLUMN total_duration_seconds INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_duration_seconds column to biglios table';
    ELSE
        RAISE NOTICE 'total_duration_seconds column already exists in biglios table';
    END IF;
END $$;

-- Update existing biglios to calculate total_duration_seconds from their chapters
UPDATE biglios 
SET total_duration_seconds = COALESCE(
    (SELECT SUM(duration_seconds) 
     FROM chapters 
     WHERE biglio_id = biglios.id AND is_published = true), 
    0
)
WHERE total_duration_seconds = 0 OR total_duration_seconds IS NULL;

-- Verify the update
SELECT 
    id, 
    title, 
    total_chapters, 
    total_duration_seconds 
FROM biglios 
LIMIT 5;