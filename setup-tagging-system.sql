-- 🏷️ TAGGING & DISCOVERY SYSTEM - Database Schema
-- Run this in Supabase SQL Editor to set up the tagging foundation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================
-- 1. TAG CATEGORIES TABLE
-- ===============================
CREATE TABLE tag_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tag categories
INSERT INTO tag_categories (name, description, sort_order) VALUES
('genre', 'Primary genre classification (Fiction, Non-Fiction, etc.)', 1),
('subgenre', 'Specific genre subcategories (Thriller, Romance, etc.)', 2),
('mood', 'Emotional tone and atmosphere', 3),
('theme', 'Central themes and topics', 4),
('length', 'Reading time and book length', 5),
('style', 'Writing and narrative style', 6),
('audience', 'Target audience and reading level', 7);

-- ===============================
-- 2. TAGS TABLE
-- ===============================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES tag_categories(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  popularity_score INTEGER DEFAULT 0,
  is_trending BOOLEAN DEFAULT FALSE,
  color_hex VARCHAR(7) DEFAULT '#6366f1',
  emoji VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tags_category_id ON tags(category_id);
CREATE INDEX idx_tags_parent_tag_id ON tags(parent_tag_id);
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_popularity ON tags(popularity_score DESC);

-- ===============================
-- 3. BIGLIO TAGS (Many-to-Many)
-- ===============================
CREATE TABLE biglio_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
  added_by_author BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(biglio_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX idx_biglio_tags_biglio_id ON biglio_tags(biglio_id);
CREATE INDEX idx_biglio_tags_tag_id ON biglio_tags(tag_id);
CREATE INDEX idx_biglio_tags_relevance ON biglio_tags(relevance_score DESC);

-- ===============================
-- 4. USER TAG PREFERENCES
-- ===============================
CREATE TABLE user_tag_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  interest_weight DECIMAL(3,2) DEFAULT 0.5 CHECK (interest_weight >= 0.0 AND interest_weight <= 1.0),
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE,
  is_following BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_tag_preferences_user_id ON user_tag_preferences(user_id);
CREATE INDEX idx_user_tag_preferences_tag_id ON user_tag_preferences(tag_id);
CREATE INDEX idx_user_tag_preferences_following ON user_tag_preferences(is_following) WHERE is_following = TRUE;

-- ===============================
-- 5. USER DISCOVERY SETTINGS
-- ===============================
CREATE TABLE user_discovery_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  algorithm_preference VARCHAR(20) DEFAULT 'balanced' CHECK (algorithm_preference IN ('trending', 'personalized', 'balanced')),
  content_freshness_preference VARCHAR(20) DEFAULT 'mixed' CHECK (content_freshness_preference IN ('latest', 'popular', 'mixed')),
  diversity_factor DECIMAL(3,2) DEFAULT 0.7 CHECK (diversity_factor >= 0.0 AND diversity_factor <= 1.0),
  explicit_content_ok BOOLEAN DEFAULT FALSE,
  preferred_book_length VARCHAR(20) DEFAULT 'any' CHECK (preferred_book_length IN ('short', 'medium', 'long', 'any')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================
-- 6. INTERACTION TRACKING
-- ===============================
CREATE TABLE user_content_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'like', 'save', 'complete', 'share', 'skip', 'click')),
  interaction_strength DECIMAL(3,2) DEFAULT 1.0 CHECK (interaction_strength >= 0.0 AND interaction_strength <= 1.0),
  session_id VARCHAR(100),
  context VARCHAR(50) CHECK (context IN ('feed', 'search', 'tag_page', 'recommendation', 'channel', 'direct')),
  metadata JSONB, -- Additional context data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance and analytics
CREATE INDEX idx_user_content_interactions_user_id ON user_content_interactions(user_id);
CREATE INDEX idx_user_content_interactions_biglio_id ON user_content_interactions(biglio_id);
CREATE INDEX idx_user_content_interactions_type ON user_content_interactions(interaction_type);
CREATE INDEX idx_user_content_interactions_created_at ON user_content_interactions(created_at DESC);

-- ===============================
-- 7. TRENDING CONTENT TRACKING
-- ===============================
CREATE TABLE trending_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  trend_score DECIMAL(7,2) DEFAULT 0.0,
  time_window VARCHAR(10) CHECK (time_window IN ('1h', '6h', '24h', '7d')),
  peak_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_trending_content_biglio_id ON trending_content(biglio_id);
CREATE INDEX idx_trending_content_tag_id ON trending_content(tag_id);
CREATE INDEX idx_trending_content_score ON trending_content(trend_score DESC);
CREATE INDEX idx_trending_content_time_window ON trending_content(time_window, expires_at);

-- ===============================
-- 8. INSERT INITIAL TAGS
-- ===============================

-- Get category IDs for reference
DO $$
DECLARE
    genre_cat_id UUID;
    subgenre_cat_id UUID;
    mood_cat_id UUID;
    theme_cat_id UUID;
    length_cat_id UUID;
    style_cat_id UUID;
    audience_cat_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO genre_cat_id FROM tag_categories WHERE name = 'genre';
    SELECT id INTO subgenre_cat_id FROM tag_categories WHERE name = 'subgenre';
    SELECT id INTO mood_cat_id FROM tag_categories WHERE name = 'mood';
    SELECT id INTO theme_cat_id FROM tag_categories WHERE name = 'theme';
    SELECT id INTO length_cat_id FROM tag_categories WHERE name = 'length';
    SELECT id INTO style_cat_id FROM tag_categories WHERE name = 'style';
    SELECT id INTO audience_cat_id FROM tag_categories WHERE name = 'audience';

    -- Insert main genres
    INSERT INTO tags (category_id, name, slug, emoji, color_hex) VALUES
    (genre_cat_id, 'Fiction', 'fiction', '📚', '#8b5cf6'),
    (genre_cat_id, 'Non-Fiction', 'non-fiction', '📖', '#06b6d4'),
    (genre_cat_id, 'Biography', 'biography', '👤', '#f59e0b'),
    (genre_cat_id, 'Business', 'business', '💼', '#10b981'),
    (genre_cat_id, 'Self-Help', 'self-help', '💪', '#f97316');

    -- Insert fiction subgenres
    INSERT INTO tags (category_id, name, slug, emoji, color_hex) VALUES
    (subgenre_cat_id, 'Romance', 'romance', '💕', '#ec4899'),
    (subgenre_cat_id, 'Thriller', 'thriller', '⚡', '#dc2626'),
    (subgenre_cat_id, 'Mystery', 'mystery', '🔍', '#7c3aed'),
    (subgenre_cat_id, 'Science Fiction', 'science-fiction', '🚀', '#3b82f6'),
    (subgenre_cat_id, 'Fantasy', 'fantasy', '🧙', '#8b5cf6'),
    (subgenre_cat_id, 'Horror', 'horror', '👻', '#1f2937'),
    (subgenre_cat_id, 'Literary Fiction', 'literary-fiction', '✍️', '#6b7280'),
    (subgenre_cat_id, 'Historical Fiction', 'historical-fiction', '🏛️', '#92400e');

    -- Insert moods
    INSERT INTO tags (category_id, name, slug, emoji, color_hex) VALUES
    (mood_cat_id, 'Uplifting', 'uplifting', '☀️', '#fbbf24'),
    (mood_cat_id, 'Dark', 'dark', '🌙', '#374151'),
    (mood_cat_id, 'Funny', 'funny', '😄', '#f59e0b'),
    (mood_cat_id, 'Suspenseful', 'suspenseful', '😰', '#dc2626'),
    (mood_cat_id, 'Thought-Provoking', 'thought-provoking', '🤔', '#6366f1'),
    (mood_cat_id, 'Relaxing', 'relaxing', '😌', '#10b981'),
    (mood_cat_id, 'Adventurous', 'adventurous', '🗺️', '#059669'),
    (mood_cat_id, 'Nostalgic', 'nostalgic', '📸', '#d97706');

    -- Insert themes
    INSERT INTO tags (category_id, name, slug, emoji, color_hex) VALUES
    (theme_cat_id, 'Coming of Age', 'coming-of-age', '🌱', '#22c55e'),
    (theme_cat_id, 'Love & Relationships', 'love-relationships', '❤️', '#ec4899'),
    (theme_cat_id, 'Family', 'family', '👨‍👩‍👧‍👦', '#f97316'),
    (theme_cat_id, 'Friendship', 'friendship', '🤝', '#3b82f6'),
    (theme_cat_id, 'Good vs Evil', 'good-vs-evil', '⚖️', '#7c3aed'),
    (theme_cat_id, 'Identity', 'identity', '🪞', '#8b5cf6'),
    (theme_cat_id, 'Power & Corruption', 'power-corruption', '👑', '#dc2626'),
    (theme_cat_id, 'Survival', 'survival', '🏔️', '#059669');

    -- Insert reading lengths
    INSERT INTO tags (category_id, name, slug, emoji, color_hex) VALUES
    (length_cat_id, 'Quick Read', 'quick-read', '⏱️', '#22c55e'),
    (length_cat_id, 'Medium Read', 'medium-read', '📖', '#3b82f6'),
    (length_cat_id, 'Long Read', 'long-read', '📚', '#7c3aed'),
    (length_cat_id, 'Series', 'series', '📚📚', '#8b5cf6');

    -- Insert audience levels
    INSERT INTO tags (category_id, name, slug, emoji, color_hex) VALUES
    (audience_cat_id, 'Beginner Friendly', 'beginner-friendly', '🌟', '#22c55e'),
    (audience_cat_id, 'Young Adult', 'young-adult', '🧑', '#3b82f6'),
    (audience_cat_id, 'Adult', 'adult', '👤', '#6b7280'),
    (audience_cat_id, 'Academic', 'academic', '🎓', '#7c3aed');

END $$;

-- ===============================
-- 9. CREATE FUNCTIONS FOR ALGORITHM SUPPORT
-- ===============================

-- Function to update tag popularity based on usage
CREATE OR REPLACE FUNCTION update_tag_popularity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tags 
    SET popularity_score = (
        SELECT COUNT(*) 
        FROM biglio_tags 
        WHERE tag_id = NEW.tag_id
    )
    WHERE id = NEW.tag_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update popularity when biglio_tags changes
CREATE TRIGGER trigger_update_tag_popularity
    AFTER INSERT OR DELETE ON biglio_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_popularity();

-- Function to record user interactions (for future algorithm use)
CREATE OR REPLACE FUNCTION record_user_interaction(
    p_user_id UUID,
    p_biglio_id UUID,
    p_interaction_type VARCHAR(20),
    p_context VARCHAR(50) DEFAULT 'direct'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_content_interactions (
        user_id, 
        biglio_id, 
        interaction_type, 
        context,
        session_id
    ) VALUES (
        p_user_id, 
        p_biglio_id, 
        p_interaction_type, 
        p_context,
        gen_random_uuid()::TEXT
    );
    
    -- Update user tag preferences based on this interaction
    INSERT INTO user_tag_preferences (user_id, tag_id, interaction_count, last_interaction)
    SELECT 
        p_user_id,
        bt.tag_id,
        1,
        NOW()
    FROM biglio_tags bt
    WHERE bt.biglio_id = p_biglio_id
    ON CONFLICT (user_id, tag_id) 
    DO UPDATE SET
        interaction_count = user_tag_preferences.interaction_count + 1,
        last_interaction = NOW(),
        interest_weight = LEAST(1.0, user_tag_preferences.interest_weight + 0.1);
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 10. ENABLE ROW LEVEL SECURITY
-- ===============================

-- Enable RLS on user-specific tables
ALTER TABLE user_tag_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_discovery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tag_preferences
CREATE POLICY "Users can view their own tag preferences" ON user_tag_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tag preferences" ON user_tag_preferences
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_discovery_settings
CREATE POLICY "Users can view their own discovery settings" ON user_discovery_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own discovery settings" ON user_discovery_settings
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_content_interactions (read-only for users)
CREATE POLICY "Users can view their own interactions" ON user_content_interactions
    FOR SELECT USING (auth.uid() = user_id);

-- Public read access for tag-related tables
ALTER TABLE tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biglio_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tag categories" ON tag_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Anyone can view biglio tags" ON biglio_tags FOR SELECT USING (true);

-- ===============================
-- SETUP COMPLETE!
-- ===============================

-- Create a view for easy tag browsing
CREATE VIEW v_popular_tags AS
SELECT 
    t.id,
    t.name,
    t.slug,
    t.emoji,
    t.color_hex,
    tc.name as category,
    t.popularity_score,
    COUNT(bt.biglio_id) as biglio_count
FROM tags t
LEFT JOIN tag_categories tc ON t.category_id = tc.id
LEFT JOIN biglio_tags bt ON t.id = bt.tag_id
WHERE t.popularity_score > 0
GROUP BY t.id, t.name, t.slug, t.emoji, t.color_hex, tc.name, t.popularity_score
ORDER BY t.popularity_score DESC, t.name;

COMMENT ON TABLE tag_categories IS 'Categories for organizing tags (genre, mood, theme, etc.)';
COMMENT ON TABLE tags IS 'Individual tags that can be applied to biglios';
COMMENT ON TABLE biglio_tags IS 'Many-to-many relationship between biglios and tags';
COMMENT ON TABLE user_tag_preferences IS 'User preferences and following status for tags';
COMMENT ON TABLE user_discovery_settings IS 'User settings for content discovery algorithm';
COMMENT ON TABLE user_content_interactions IS 'Tracking table for all user interactions with content';
COMMENT ON TABLE trending_content IS 'Tracking trending biglios within specific time windows';

-- Success message
SELECT 'Tagging system setup complete! 🏷️ Ready for smart content discovery.' as status;