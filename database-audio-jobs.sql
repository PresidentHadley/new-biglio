-- Audio Jobs table for tracking TTS generation jobs
-- Run this in your Supabase SQL Editor to add audio job tracking

CREATE TABLE audio_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  
  -- Job details
  chapter_text TEXT NOT NULL,
  book_title TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  chapter_order INTEGER,
  selected_voice TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  audio_url TEXT,
  file_size INTEGER,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT audio_jobs_chapter_text_length CHECK (char_length(chapter_text) >= 1),
  CONSTRAINT audio_jobs_status_valid CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create indexes for performance
CREATE INDEX idx_audio_jobs_user_id ON audio_jobs(user_id);
CREATE INDEX idx_audio_jobs_biglio_id ON audio_jobs(biglio_id);
CREATE INDEX idx_audio_jobs_chapter_id ON audio_jobs(chapter_id);
CREATE INDEX idx_audio_jobs_status ON audio_jobs(status);
CREATE INDEX idx_audio_jobs_created_at ON audio_jobs(created_at);

-- Enable Row Level Security
ALTER TABLE audio_jobs ENABLE ROW LEVEL SECURITY;

-- Audio jobs policies
CREATE POLICY "Users can view own audio jobs" ON audio_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own audio jobs" ON audio_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audio jobs" ON audio_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audio jobs" ON audio_jobs FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_audio_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER trigger_update_audio_jobs_updated_at
  BEFORE UPDATE ON audio_jobs
  FOR EACH ROW EXECUTE FUNCTION update_audio_jobs_updated_at();

-- Create the audio-files storage bucket (run this if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for audio files
CREATE POLICY "Allow authenticated users to upload audio files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Allow public access to audio files" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'audio-files');

CREATE POLICY "Allow users to update their own audio files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own audio files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);