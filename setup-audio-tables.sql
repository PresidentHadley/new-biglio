-- Audio Jobs Table for tracking TTS generation status
CREATE TABLE IF NOT EXISTS audio_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  audio_url TEXT,
  duration_seconds INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audio_jobs_chapter_id ON audio_jobs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_jobs(status);

-- Row Level Security
ALTER TABLE audio_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access audio jobs for their own chapters
CREATE POLICY "Users can access their own audio jobs" ON audio_jobs
  FOR ALL USING (
    chapter_id IN (
      SELECT c.id FROM chapters c
      JOIN biglios b ON c.biglio_id = b.id
      JOIN channels ch ON b.channel_id = ch.id
      WHERE ch.user_id = auth.uid()
    )
  );

-- Policy: Service role can do anything (for API)
CREATE POLICY "Service role full access" ON audio_jobs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_audio_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audio_jobs_updated_at
  BEFORE UPDATE ON audio_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_audio_jobs_updated_at();