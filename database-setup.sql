-- Biglio V2 Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  phone TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT users_email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Channels table (Instagram-like @username channels)
CREATE TABLE channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  handle TEXT UNIQUE NOT NULL, -- @storyteller
  display_name TEXT NOT NULL, -- "The Storyteller"
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT channels_handle_format CHECK (handle ~ '^[a-zA-Z0-9_]{3,30}$'),
  CONSTRAINT channels_display_name_length CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 50)
);

-- Biglios table (the audiobooks, called "BIGLIO" in marketing)
CREATE TABLE biglios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  total_chapters INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  listen_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT biglios_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200)
);

-- Chapters table
CREATE TABLE chapters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT, -- The text content for TTS
  audio_url TEXT, -- Generated audio file URL
  chapter_number INTEGER NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chapters_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  CONSTRAINT chapters_number_positive CHECK (chapter_number > 0),
  UNIQUE(biglio_id, chapter_number)
);

-- Likes table
CREATE TABLE likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, biglio_id)
);

-- Comments table (thread-style like Instagram)
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT comments_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- Saves table (bookmark functionality)
CREATE TABLE saves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, biglio_id)
);

-- Follows table (following channels)
CREATE TABLE follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  followed_channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(follower_user_id, followed_channel_id)
);

-- Listening history table
CREATE TABLE listening_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  last_position_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, biglio_id)
);

-- Tags table (for discovery and algorithms)
CREATE TABLE tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT tags_name_format CHECK (name ~ '^[a-zA-Z0-9_-]{2,30}$')
);

-- Biglio tags junction table
CREATE TABLE biglio_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(biglio_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_channels_handle ON channels(handle);
CREATE INDEX idx_biglios_channel_id ON biglios(channel_id);
CREATE INDEX idx_biglios_published ON biglios(is_published, published_at);
CREATE INDEX idx_chapters_biglio_id ON chapters(biglio_id);
CREATE INDEX idx_chapters_number ON chapters(biglio_id, chapter_number);
CREATE INDEX idx_likes_biglio_id ON likes(biglio_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_comments_biglio_id ON comments(biglio_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_saves_user_id ON saves(user_id);
CREATE INDEX idx_follows_follower ON follows(follower_user_id);
CREATE INDEX idx_follows_followed ON follows(followed_channel_id);
CREATE INDEX idx_listening_history_user ON listening_history(user_id);
CREATE INDEX idx_biglio_tags_biglio ON biglio_tags(biglio_id);
CREATE INDEX idx_biglio_tags_tag ON biglio_tags(tag_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE biglios ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biglio_tags ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Channels policies
CREATE POLICY "Anyone can view published channels" ON channels FOR SELECT USING (true);
CREATE POLICY "Users can manage own channels" ON channels FOR ALL USING (auth.uid() = user_id);

-- Biglios policies
CREATE POLICY "Anyone can view published biglios" ON biglios FOR SELECT USING (is_published = true);
CREATE POLICY "Channel owners can manage their biglios" ON biglios FOR ALL USING (
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = biglios.channel_id 
    AND channels.user_id = auth.uid()
  )
);

-- Chapters policies
CREATE POLICY "Anyone can view published chapters" ON chapters FOR SELECT USING (
  is_published = true AND 
  EXISTS (
    SELECT 1 FROM biglios 
    WHERE biglios.id = chapters.biglio_id 
    AND biglios.is_published = true
  )
);
CREATE POLICY "Channel owners can manage their chapters" ON chapters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM biglios 
    JOIN channels ON channels.id = biglios.channel_id
    WHERE biglios.id = chapters.biglio_id 
    AND channels.user_id = auth.uid()
  )
);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Saves policies
CREATE POLICY "Users can view own saves" ON saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own saves" ON saves FOR ALL USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON follows FOR ALL USING (auth.uid() = follower_user_id);

-- Listening history policies
CREATE POLICY "Users can view own listening history" ON listening_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own listening history" ON listening_history FOR ALL USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Anyone can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Biglio tags policies
CREATE POLICY "Anyone can view biglio tags" ON biglio_tags FOR SELECT USING (true);
CREATE POLICY "Channel owners can manage their biglio tags" ON biglio_tags FOR ALL USING (
  EXISTS (
    SELECT 1 FROM biglios 
    JOIN channels ON channels.id = biglios.channel_id
    WHERE biglios.id = biglio_tags.biglio_id 
    AND channels.user_id = auth.uid()
  )
);

-- Create functions for updating counters
CREATE OR REPLACE FUNCTION update_biglio_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Update like count
  IF TG_TABLE_NAME = 'likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE biglios SET like_count = like_count + 1 WHERE id = NEW.biglio_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE biglios SET like_count = like_count - 1 WHERE id = OLD.biglio_id;
    END IF;
  END IF;

  -- Update comment count
  IF TG_TABLE_NAME = 'comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE biglios SET comment_count = comment_count + 1 WHERE id = NEW.biglio_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE biglios SET comment_count = comment_count - 1 WHERE id = OLD.biglio_id;
    END IF;
  END IF;

  -- Update save count
  IF TG_TABLE_NAME = 'saves' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE biglios SET save_count = save_count + 1 WHERE id = NEW.biglio_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE biglios SET save_count = save_count - 1 WHERE id = OLD.biglio_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for counter updates
CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_biglio_counters();

CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_biglio_counters();

CREATE TRIGGER trigger_update_save_count
  AFTER INSERT OR DELETE ON saves
  FOR EACH ROW EXECUTE FUNCTION update_biglio_counters();

-- Create function for updating follower count
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channels SET follower_count = follower_count + 1 WHERE id = NEW.followed_channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channels SET follower_count = follower_count - 1 WHERE id = OLD.followed_channel_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follower count
CREATE TRIGGER trigger_update_follower_count
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_count();

-- Insert some sample data for development
INSERT INTO users (id, email, display_name, bio) VALUES 
('d63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f', 'storyteller@biglio.com', 'Alex Chen', 'Professional storyteller and audiobook creator');

INSERT INTO channels (user_id, handle, display_name, bio, is_primary) VALUES 
('d63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f', 'storyteller', 'The Storyteller', 'Creating immersive audio experiences', true);

INSERT INTO biglios (channel_id, title, description, total_chapters, is_published, published_at) VALUES 
((SELECT id FROM channels WHERE handle = 'storyteller'), 'The Midnight Chronicles', 'A thrilling adventure series set in a world where magic and technology collide', 5, true, NOW());

INSERT INTO chapters (biglio_id, title, content, chapter_number, is_published) VALUES 
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), 'Chapter 1: The Beginning', 'In the heart of Neo-Tokyo, where neon lights painted the perpetual twilight...', 1, true),
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), 'Chapter 2: The Discovery', 'Maya awakened to find her world forever changed...', 2, true),
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), 'Chapter 3: The Alliance', 'The underground resistance was more than she had imagined...', 3, true);

INSERT INTO tags (name) VALUES 
('sci-fi'), ('adventure'), ('fantasy'), ('thriller'), ('mystery');

INSERT INTO biglio_tags (biglio_id, tag_id) VALUES 
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), (SELECT id FROM tags WHERE name = 'sci-fi')),
((SELECT id FROM biglios WHERE title = 'The Midnight Chronicles'), (SELECT id FROM tags WHERE name = 'adventure'));