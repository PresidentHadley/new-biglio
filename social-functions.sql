-- Database functions for social features counter updates

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

-- Function to increment comment reply count
CREATE OR REPLACE FUNCTION increment_comment_reply_count(comment_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE comments 
  SET reply_count = reply_count + 1,
      updated_at = NOW()
  WHERE id = comment_id;
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