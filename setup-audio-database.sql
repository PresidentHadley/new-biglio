-- Audio Generation System Database Setup
-- Run this in your Supabase SQL Editor

-- Create audio_jobs table for tracking audio generation progress
CREATE TABLE IF NOT EXISTS audio_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  audio_url TEXT,
  error_message TEXT,
  voice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE audio_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own audio jobs
CREATE POLICY "Users can view own audio jobs" ON audio_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own audio jobs
CREATE POLICY "Users can create own audio jobs" ON audio_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own audio jobs
CREATE POLICY "Users can update own audio jobs" ON audio_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audio_jobs_user_id ON audio_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_biglio_id ON audio_jobs(biglio_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_audio_jobs_updated_at 
    BEFORE UPDATE ON audio_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample audio jobs (optional)
-- You can uncomment these if you want test data
/*
INSERT INTO audio_jobs (biglio_id, chapter_id, user_id, status, progress, voice_id) VALUES
  (
    (SELECT id FROM biglios LIMIT 1),
    (SELECT id FROM chapters LIMIT 1), 
    (SELECT id FROM users LIMIT 1),
    'completed',
    100,
    'en-US-Chirp3-HD-Umbriel'
  );
*/

SELECT 'Audio jobs table created successfully!' as message;