-- Add publication status and audio readiness to biglios table
ALTER TABLE biglios 
ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'draft' CHECK (publication_status IN ('draft', 'review', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS audio_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add audio generation status to chapters
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS audio_status TEXT DEFAULT 'none' CHECK (audio_status IN ('none', 'generating', 'ready', 'failed')),
ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;

-- Function to check if all chapters have audio ready
CREATE OR REPLACE FUNCTION check_book_audio_ready(book_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_chapters INTEGER;
  ready_chapters INTEGER;
BEGIN
  -- Count total chapters
  SELECT COUNT(*) INTO total_chapters
  FROM chapters
  WHERE biglio_id = book_id;
  
  -- Count chapters with audio ready
  SELECT COUNT(*) INTO ready_chapters
  FROM chapters
  WHERE biglio_id = book_id 
    AND audio_url IS NOT NULL 
    AND audio_status = 'ready';
  
  -- Return true if all chapters have audio (and there's at least one chapter)
  RETURN total_chapters > 0 AND ready_chapters = total_chapters;
END;
$$ LANGUAGE plpgsql;

-- Function to update book audio ready status
CREATE OR REPLACE FUNCTION update_book_audio_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the book's audio_ready status
  UPDATE biglios 
  SET audio_ready = check_book_audio_ready(NEW.biglio_id)
  WHERE id = NEW.biglio_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update book audio status when chapters change
DROP TRIGGER IF EXISTS trigger_update_book_audio_status ON chapters;
CREATE TRIGGER trigger_update_book_audio_status
  AFTER INSERT OR UPDATE OF audio_url, audio_status ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_book_audio_status();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_biglios_publication_status ON biglios(publication_status);
CREATE INDEX IF NOT EXISTS idx_biglios_audio_ready ON biglios(audio_ready);
CREATE INDEX IF NOT EXISTS idx_chapters_audio_status ON chapters(audio_status);

-- Policy for public to see only published books
DROP POLICY IF EXISTS "Public can view published biglios" ON biglios;
CREATE POLICY "Public can view published biglios" ON biglios
  FOR SELECT USING (publication_status = 'published');

-- Policy for users to see their own books in any status
DROP POLICY IF EXISTS "Users can view their own biglios" ON biglios;
CREATE POLICY "Users can view their own biglios" ON biglios
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE user_id = auth.uid()
    )
  );

-- Policy for users to update their own books
DROP POLICY IF EXISTS "Users can update their own biglios" ON biglios;
CREATE POLICY "Users can update their own biglios" ON biglios
  FOR UPDATE USING (
    channel_id IN (
      SELECT id FROM channels WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    channel_id IN (
      SELECT id FROM channels WHERE user_id = auth.uid()
    )
  );