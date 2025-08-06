# 🏷️ Tagging & Discovery System - Algorithmic Foundation

## 🎯 Vision: "Smart Content Discovery for Audiobook Lovers"

Build a sophisticated tagging and recommendation system that allows users to discover content based on interests, not just who they follow. This creates a sustainable engagement model even when creators aren't publishing frequently.

---

## 🧠 System Architecture

### Core Concept: Multi-Dimensional Discovery
```
User Interests = [Authors, Genres, Themes, Moods, Length, Rating Ranges]
Content Tags = [Genre, Subgenre, Themes, Mood, Length, Reading Level, Keywords]
Algorithm = Match(User_Interests, Content_Tags) + Collaborative_Filtering + Trending_Signals
```

### Database Design Philosophy
- **Flexible tag relationships** (many-to-many)
- **Hierarchical categories** (Genre → Subgenre → Micro-genres)
- **User preference weights** (how much they like each tag)
- **Interaction tracking** (clicks, completes, saves per tag)
- **Algorithm-friendly metrics** (engagement scores, similarity scores)

---

## 📊 Database Schema

### Core Tables

#### 1. **Tags System**
```sql
-- Main tag categories (expandable)
CREATE TABLE tag_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'genre', 'mood', 'theme', 'length', 'style'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual tags within categories
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES tag_categories(id),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE, -- 'psychological-thriller'
  description TEXT,
  parent_tag_id UUID REFERENCES tags(id), -- For hierarchical tags
  popularity_score INTEGER DEFAULT 0, -- Algorithm metric
  is_trending BOOLEAN DEFAULT FALSE,
  color_hex VARCHAR(7), -- For UI display
  emoji VARCHAR(10), -- For visual tags
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many: Biglios can have multiple tags
CREATE TABLE biglio_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) DEFAULT 1.0, -- How relevant is this tag (0.0-1.0)
  added_by_author BOOLEAN DEFAULT TRUE, -- Author-added vs AI-suggested
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(biglio_id, tag_id)
);
```

#### 2. **User Interest System**
```sql
-- User tag preferences and discovery settings
CREATE TABLE user_tag_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  interest_weight DECIMAL(3,2) DEFAULT 0.5, -- 0.0 = avoid, 1.0 = love
  interaction_count INTEGER DEFAULT 0, -- How many times engaged with this tag
  last_interaction TIMESTAMP,
  is_following BOOLEAN DEFAULT FALSE, -- Explicitly following this tag
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

-- User discovery preferences
CREATE TABLE user_discovery_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  algorithm_preference VARCHAR(20) DEFAULT 'balanced', -- 'trending', 'personalized', 'balanced'
  content_freshness_preference VARCHAR(20) DEFAULT 'mixed', -- 'latest', 'popular', 'mixed'
  diversity_factor DECIMAL(3,2) DEFAULT 0.7, -- How much variety in recommendations
  explicit_content_ok BOOLEAN DEFAULT FALSE,
  preferred_book_length VARCHAR(20) DEFAULT 'any', -- 'short', 'medium', 'long', 'any'
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **Interaction Tracking**
```sql
-- Track all user interactions for algorithm learning
CREATE TABLE user_content_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL, -- 'view', 'like', 'save', 'complete', 'share', 'skip'
  interaction_strength DECIMAL(3,2) DEFAULT 1.0, -- Weight of this interaction
  session_id VARCHAR(100), -- Track within sessions
  context VARCHAR(50), -- 'feed', 'search', 'tag_page', 'recommendation'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Aggregate interaction scores for algorithm efficiency
CREATE TABLE biglio_interaction_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  total_interactions INTEGER DEFAULT 0,
  positive_interactions INTEGER DEFAULT 0, -- likes, saves, completes
  negative_interactions INTEGER DEFAULT 0, -- skips, unlikes
  engagement_score DECIMAL(5,2) DEFAULT 0.0, -- Calculated engagement metric
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(biglio_id, tag_id)
);
```

#### 4. **Algorithm Support Tables**
```sql
-- Content similarity matrix for collaborative filtering
CREATE TABLE content_similarity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biglio_a_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  biglio_b_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,4), -- 0.0000 to 1.0000
  calculation_method VARCHAR(20), -- 'tag_overlap', 'user_behavior', 'hybrid'
  last_calculated TIMESTAMP DEFAULT NOW(),
  UNIQUE(biglio_a_id, biglio_b_id)
);

-- User similarity for collaborative filtering
CREATE TABLE user_similarity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,4),
  common_interests_count INTEGER,
  last_calculated TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
);

-- Trending content tracking
CREATE TABLE trending_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biglio_id UUID REFERENCES biglios(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id), -- Trending within specific tags
  trend_score DECIMAL(7,2),
  time_window VARCHAR(10), -- '1h', '6h', '24h', '7d'
  peak_position INTEGER, -- Highest trending position reached
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

---

## 🏷️ Tag Categories & Examples

### 1. **Genres** (Primary Discovery)
```
Fiction:
  - Literary Fiction
  - Science Fiction (Hard Sci-Fi, Space Opera, Cyberpunk)
  - Fantasy (High Fantasy, Urban Fantasy, Epic Fantasy)
  - Mystery & Thriller (Cozy Mystery, Psychological Thriller, Crime)
  - Romance (Contemporary, Historical, Paranormal)
  - Horror (Supernatural, Psychological, Gothic)

Non-Fiction:
  - Biography & Memoir
  - Business & Economics
  - Health & Fitness
  - History
  - Science & Technology
  - Self-Help
```

### 2. **Moods** (Emotional Discovery)
```
- Uplifting
- Dark & Intense
- Funny & Light
- Thought-Provoking
- Relaxing
- Adventurous
- Nostalgic
- Suspenseful
```

### 3. **Themes** (Content Discovery)
```
- Coming of Age
- Good vs Evil
- Love & Relationships
- Family Dynamics
- Power & Corruption
- Identity & Self-Discovery
- Survival
- Redemption
```

### 4. **Reading Experience** (Practical Discovery)
```
- Quick Read (< 2 hours)
- Medium Read (2-8 hours)
- Long Read (8+ hours)
- Episodic (Series)
- Standalone
- Beginner Friendly
- Advanced/Complex
```

---

## 🤖 Algorithm Framework

### Phase 1: Content-Based Filtering
```javascript
function calculateRecommendationScore(user, biglio) {
  let score = 0;
  
  // Tag preference matching
  for (const tag of biglio.tags) {
    const userPreference = user.tagPreferences[tag.id] || 0.5;
    score += tag.relevance_score * userPreference;
  }
  
  // Content freshness
  const daysSincePublished = (Date.now() - biglio.published_at) / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.exp(-daysSincePublished / 30); // Exponential decay
  
  // Popularity boost
  const popularityScore = Math.log(biglio.like_count + 1) / 10;
  
  return score * 0.7 + freshnessScore * 0.2 + popularityScore * 0.1;
}
```

### Phase 2: Collaborative Filtering
```javascript
function findSimilarUsers(userId) {
  // Find users with similar tag preferences
  // Weight by interaction patterns
  // Return similarity scores
}

function getCollaborativeRecommendations(userId) {
  const similarUsers = findSimilarUsers(userId);
  const recommendations = [];
  
  for (const similarUser of similarUsers) {
    const theirLikes = getUserLikedContent(similarUser.id);
    for (const content of theirLikes) {
      if (!userHasInteractedWith(userId, content.id)) {
        recommendations.push({
          biglio: content,
          score: similarUser.similarity * content.engagement_score
        });
      }
    }
  }
  
  return recommendations.sort((a, b) => b.score - a.score);
}
```

### Phase 3: Hybrid Algorithm
```javascript
function generateFeedRecommendations(userId) {
  const contentBased = getContentBasedRecommendations(userId);
  const collaborative = getCollaborativeRecommendations(userId);
  const trending = getTrendingContent();
  
  // Merge and balance different signals
  const hybrid = mergeRecommendations({
    contentBased: contentBased,
    collaborative: collaborative,
    trending: trending
  }, user.discoverySettings);
  
  return diversifyResults(hybrid, user.diversityFactor);
}
```

---

## 📱 User Experience Flow

### Tag Following System
```
1. User browses tags or discovers through content
2. "Follow" button on tag pages
3. Followed tags influence feed algorithm
4. Tag-specific notification preferences
5. "Tag feed" showing only followed tag content
```

### Discovery Onboarding
```
1. New user signup
2. "What interests you?" tag selection (8-12 tags)
3. Initial feed populated based on selections
4. Algorithm learns from interactions
5. Periodic "Discover new interests" prompts
```

### Advanced Discovery Features
```
- "Surprise me" button (high diversity, random tags)
- "More like this" on any biglio
- Tag-based search with filters
- "Because you liked [Tag]" explanations
- Mood-based recommendations ("I want something uplifting")
```

---

## 🚀 Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Create tag database schema
- [ ] Basic tag management admin interface
- [ ] Manual tag assignment for authors
- [ ] Tag display on biglio cards
- [ ] Simple tag-based filtering

### Phase 2: User Preferences (Week 3-4)
- [ ] Tag following system
- [ ] User preference tracking
- [ ] Basic content-based recommendations
- [ ] Tag-specific feeds
- [ ] Interaction tracking implementation

### Phase 3: Algorithm (Week 5-6)
- [ ] Recommendation engine v1
- [ ] A/B testing framework
- [ ] Performance optimization
- [ ] Trending content detection
- [ ] Collaborative filtering basics

### Phase 4: Advanced Features (Week 7-8)
- [ ] Machine learning integration
- [ ] Advanced similarity calculations
- [ ] Real-time recommendation updates
- [ ] Personalized discovery onboarding
- [ ] Analytics and optimization

---

## 📊 Success Metrics

### Engagement Metrics
- **Tag follow rate** (% of users following tags)
- **Discovery click-through rate** (recommended content clicks)
- **Time spent on recommended content**
- **Cross-tag exploration** (how many different tags users engage with)

### Algorithm Performance
- **Recommendation accuracy** (liked content rate)
- **Diversity score** (variety in recommendations)
- **Freshness balance** (new vs popular content ratio)
- **Coverage** (% of catalog being recommended)

### Business Impact
- **User retention** (effect of recommendations on retention)
- **Content discovery** (how much catalog gets discovered)
- **Creator benefit** (how recommendations help new creators)
- **Engagement growth** (overall platform engagement increase)

---

## 🔮 Future Enhancements

### Advanced AI Features
- **Sentiment analysis** of content for mood matching
- **Audio analysis** for voice/style preferences
- **Natural language processing** for theme extraction
- **Image recognition** for cover-based recommendations

### Social Intelligence
- **Friend recommendations** influence
- **Social proof** in recommendations
- **Group listening** sessions
- **Community-driven tags**

### Personalization 2.0
- **Time-of-day preferences** (morning motivation, evening relaxation)
- **Seasonal adjustments** (summer beach reads, winter mysteries)
- **Mood detection** from interaction patterns
- **Life stage adaptations** (student, parent, retiree content)

---

## 🎯 Call to Action

**This system will:**
- 🎯 **Solve the "what to listen to next" problem**
- 📈 **Increase user engagement and retention**
- 🆕 **Help new creators get discovered**
- 🤖 **Create a learning, improving recommendation system**
- 🏆 **Differentiate Biglio from simple follow-based platforms**

### Immediate Next Steps
1. **Implement basic tag schema** and management
2. **Add tag selection** to book creation flow
3. **Create tag following** system for users
4. **Build simple content filtering** by tags
5. **Start collecting interaction data** for future algorithms

---

*"The best recommendations feel like magic - they know what you want before you do."*

**Let's build the Netflix of audiobooks.** 🎧✨