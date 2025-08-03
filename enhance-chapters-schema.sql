-- Enhance chapters table to support outline vs content separation
-- and AI context management

-- Add new fields for proper content separation and AI context
ALTER TABLE chapters 
ADD COLUMN outline_content TEXT,
ADD COLUMN summary TEXT;

-- Add comments to clarify field purposes
COMMENT ON COLUMN chapters.outline_content IS 'Chapter outline/summary for planning and AI context - what this chapter should cover';
COMMENT ON COLUMN chapters.content IS 'Final written chapter content for TTS generation';
COMMENT ON COLUMN chapters.summary IS 'Auto-generated summary of written content for AI context in subsequent chapters';

-- For existing chapters, move current content to outline_content if it's short (likely outline)
-- and clear content field for proper separation
UPDATE chapters 
SET outline_content = content,
    content = NULL 
WHERE char_length(content) < 500;

-- For longer content, keep as content and generate outline_content
UPDATE chapters 
SET outline_content = substring(content, 1, 200) || '...'
WHERE char_length(content) >= 500 AND outline_content IS NULL;