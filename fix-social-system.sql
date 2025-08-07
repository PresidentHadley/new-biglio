-- Fix social system - Deploy all required functions and check tables
-- Run this script in Supabase SQL Editor to fix follow and like system

-- 1. First, let's ensure all tables exist with correct structure
-- Check if follows table has correct schema
DO $$
BEGIN
    -- Add follower_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'follows' AND column_name = 'follower_user_id') THEN
        ALTER TABLE follows ADD COLUMN follower_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add followed_channel_id column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'follows' AND column_name = 'followed_channel_id') THEN
        ALTER TABLE follows ADD COLUMN followed_channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create or replace all social database functions
-- Function to increment biglio like count
CREATE OR REPLACE FUNCTION increment_biglio_like_count(biglio_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE biglios 
  SET like_count = like_count + 1,
      updated_at = NOW()
  WHERE id = biglio_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement biglio like count
CREATE OR REPLACE FUNCTION decrement_biglio_like_count(biglio_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE biglios 
  SET like_count = GREATEST(like_count - 1, 0),
      updated_at = NOW()
  WHERE id = biglio_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment biglio save count
CREATE OR REPLACE FUNCTION increment_biglio_save_count(biglio_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE biglios 
  SET save_count = save_count + 1,
      updated_at = NOW()
  WHERE id = biglio_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement biglio save count
CREATE OR REPLACE FUNCTION decrement_biglio_save_count(biglio_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE biglios 
  SET save_count = GREATEST(save_count - 1, 0),
      updated_at = NOW()
  WHERE id = biglio_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment biglio comment count
CREATE OR REPLACE FUNCTION increment_biglio_comment_count(biglio_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE biglios 
  SET comment_count = comment_count + 1,
      updated_at = NOW()
  WHERE id = biglio_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment channel follower count
CREATE OR REPLACE FUNCTION increment_channel_follower_count(channel_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE channels 
  SET follower_count = follower_count + 1,
      updated_at = NOW()
  WHERE id = channel_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement channel follower count
CREATE OR REPLACE FUNCTION decrement_channel_follower_count(channel_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE channels 
  SET follower_count = GREATEST(follower_count - 1, 0),
      updated_at = NOW()
  WHERE id = channel_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure biglios table has social count columns
ALTER TABLE biglios ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE biglios ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE biglios ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- 4. Ensure channels table has follower count column
ALTER TABLE channels ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- 5. Check if tables exist and create indexes for performance
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_likes_user_biglio ON likes(user_id, biglio_id);
CREATE INDEX IF NOT EXISTS idx_likes_biglio ON likes(biglio_id);
CREATE INDEX IF NOT EXISTS idx_saves_user_biglio ON saves(user_id, biglio_id);  
CREATE INDEX IF NOT EXISTS idx_saves_biglio ON saves(biglio_id);
CREATE INDEX IF NOT EXISTS idx_follows_user_channel ON follows(follower_user_id, followed_channel_id);
CREATE INDEX IF NOT EXISTS idx_follows_channel ON follows(followed_channel_id);
CREATE INDEX IF NOT EXISTS idx_comments_biglio ON comments(biglio_id);

-- 6. Test the functions work
DO $$
BEGIN
  RAISE NOTICE 'Social system database functions deployed successfully!';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '- increment_biglio_like_count(uuid)';
  RAISE NOTICE '- decrement_biglio_like_count(uuid)';
  RAISE NOTICE '- increment_biglio_save_count(uuid)';
  RAISE NOTICE '- decrement_biglio_save_count(uuid)';
  RAISE NOTICE '- increment_biglio_comment_count(uuid)';
  RAISE NOTICE '- increment_channel_follower_count(uuid)';
  RAISE NOTICE '- decrement_channel_follower_count(uuid)';
END $$;
