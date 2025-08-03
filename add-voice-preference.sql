-- Add voice preference field to biglios table
-- This stores the user's voice choice (male/female) for the entire book
-- so they don't have to select it for every chapter

ALTER TABLE biglios 
ADD COLUMN voice_preference TEXT CHECK (voice_preference IN ('male', 'female'));

-- Add a comment to explain the field
COMMENT ON COLUMN biglios.voice_preference IS 'User''s preferred voice type for audio generation (male/female) - applies to all chapters';

-- Optional: Set a default for existing books (can be NULL initially)
-- UPDATE biglios SET voice_preference = 'female' WHERE voice_preference IS NULL;