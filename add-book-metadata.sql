-- Add comprehensive book metadata for AI context and search/tagging
-- These fields will help the AI understand the book better and enable search features

ALTER TABLE biglios 
ADD COLUMN book_type TEXT CHECK (book_type IN ('fiction', 'non-fiction')),
ADD COLUMN genre TEXT,
ADD COLUMN target_audience TEXT[], -- Array to store multiple age groups
ADD COLUMN keywords TEXT[], -- For future search/tagging features
ADD COLUMN reading_level TEXT;

-- Add comments to explain the fields
COMMENT ON COLUMN biglios.book_type IS 'Fiction or Non-Fiction classification';
COMMENT ON COLUMN biglios.genre IS 'Book genre (Business, Fantasy, Romance, etc.)';
COMMENT ON COLUMN biglios.target_audience IS 'Array of target age groups (Children, Young Adult, Adult, etc.)';
COMMENT ON COLUMN biglios.keywords IS 'Keywords/tags for search and categorization';
COMMENT ON COLUMN biglios.reading_level IS 'Reading difficulty level (Beginner, Intermediate, Advanced)';

-- Create index for better search performance
CREATE INDEX idx_biglios_genre ON biglios(genre);
CREATE INDEX idx_biglios_book_type ON biglios(book_type);
CREATE INDEX idx_biglios_target_audience ON biglios USING GIN(target_audience);
CREATE INDEX idx_biglios_keywords ON biglios USING GIN(keywords);

-- Example of how the data will look:
-- book_type: 'non-fiction'
-- genre: 'Business'
-- target_audience: ['Adult', 'Young Adult']
-- keywords: ['customer service', 'sales', 'business growth']