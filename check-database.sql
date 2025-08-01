-- Check existing tables and data in your Supabase database
-- Run these queries one by one in your Supabase SQL Editor

-- 1. Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if sample data exists
SELECT 
  b.title,
  c.handle as channel,
  b.total_chapters,
  b.like_count,
  b.is_published
FROM biglios b
JOIN channels c ON c.id = b.channel_id;

-- 3. Check chapters for "The Midnight Chronicles"
SELECT 
  ch.chapter_number,
  ch.title,
  ch.is_published
FROM chapters ch
JOIN biglios b ON b.id = ch.biglio_id
WHERE b.title = 'The Midnight Chronicles'
ORDER BY ch.chapter_number;

-- 4. If no sample data exists, run this to add it:
-- (Only run if the previous queries return empty results)

INSERT INTO users (id, email, display_name, bio) VALUES 
('d63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f', 'storyteller@biglio.com', 'Alex Chen', 'Professional storyteller and audiobook creator')
ON CONFLICT (id) DO NOTHING;

INSERT INTO channels (user_id, handle, display_name, bio, is_primary) VALUES 
('d63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f', 'storyteller', 'The Storyteller', 'Creating immersive audio experiences', true)
ON CONFLICT (handle) DO NOTHING;

INSERT INTO biglios (channel_id, title, description, total_chapters, is_published, published_at) VALUES 
((SELECT id FROM channels WHERE handle = 'storyteller'), 'The Midnight Chronicles', 'A thrilling adventure series set in a world where magic and technology collide', 3, true, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO chapters (biglio_id, title, content, chapter_number, duration_seconds, is_published) VALUES 
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), 'Chapter 1: The Beginning', 'In the heart of Neo-Tokyo, where neon lights painted the perpetual twilight...', 1, 780, true),
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), 'Chapter 2: The Discovery', 'Maya awakened to find her world forever changed...', 2, 920, true),
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), 'Chapter 3: The Alliance', 'The underground resistance was more than she had imagined...', 3, 1050, true)
ON CONFLICT (biglio_id, chapter_number) DO NOTHING;

INSERT INTO tags (name) VALUES 
('sci-fi'), ('adventure'), ('fantasy'), ('thriller'), ('mystery')
ON CONFLICT (name) DO NOTHING;

INSERT INTO biglio_tags (biglio_id, tag_id) VALUES 
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), (SELECT id FROM tags WHERE name = 'sci-fi')),
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), (SELECT id FROM tags WHERE name = 'adventure'))
ON CONFLICT (biglio_id, tag_id) DO NOTHING;