-- Fix Row Level Security policies for authenticated users
-- Run this in your Supabase SQL Editor

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE biglios ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all biglios" ON biglios;
DROP POLICY IF EXISTS "Users can create biglios in their channel" ON biglios;
DROP POLICY IF EXISTS "Users can update their own biglios" ON biglios;
DROP POLICY IF EXISTS "Users can delete their own biglios" ON biglios;

DROP POLICY IF EXISTS "Users can read all chapters" ON chapters;
DROP POLICY IF EXISTS "Users can manage chapters of their biglios" ON chapters;

DROP POLICY IF EXISTS "Users can read all channels" ON channels;
DROP POLICY IF EXISTS "Users can create their own channel" ON channels;
DROP POLICY IF EXISTS "Users can update their own channel" ON channels;

DROP POLICY IF EXISTS "Users can manage their audio jobs" ON audio_jobs;

-- BIGLIOS table policies
CREATE POLICY "Users can read all biglios"
  ON biglios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create biglios in their channel"
  ON biglios FOR INSERT
  TO authenticated
  WITH CHECK (
    channel_id IN (
      SELECT id FROM channels WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own biglios"
  ON biglios FOR UPDATE
  TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM channels WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own biglios"
  ON biglios FOR DELETE
  TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM channels WHERE user_id = auth.uid()
    )
  );

-- CHAPTERS table policies
CREATE POLICY "Users can read all chapters"
  ON chapters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage chapters of their biglios"
  ON chapters FOR ALL
  TO authenticated
  USING (
    biglio_id IN (
      SELECT b.id FROM biglios b
      JOIN channels c ON b.channel_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- CHANNELS table policies
CREATE POLICY "Users can read all channels"
  ON channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own channel"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own channel"
  ON channels FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- AUDIO_JOBS table policies
CREATE POLICY "Users can manage their audio jobs"
  ON audio_jobs FOR ALL
  TO authenticated
  USING (
    chapter_id IN (
      SELECT ch.id FROM chapters ch
      JOIN biglios b ON ch.biglio_id = b.id
      JOIN channels c ON b.channel_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON biglios TO authenticated;
GRANT ALL ON chapters TO authenticated;
GRANT ALL ON channels TO authenticated;
GRANT ALL ON audio_jobs TO authenticated;