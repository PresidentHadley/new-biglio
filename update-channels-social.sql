-- Add social media fields to channels table
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_channels_username ON channels(username);
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);

-- Update RLS policies to allow public read access to channels
DROP POLICY IF EXISTS "Public can view published channels" ON channels;
CREATE POLICY "Public can view published channels" ON channels
  FOR SELECT USING (true);

-- Policy for users to update their own channels
DROP POLICY IF EXISTS "Users can update their own channels" ON channels;
CREATE POLICY "Users can update their own channels" ON channels
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());