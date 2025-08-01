# Biglio V2 - Instagram for Audiobooks

## 🎯 Project Overview

Biglio V2 is a complete rebuild of the Biglio platform, transforming it into an Instagram-like experience for audiobook discovery and consumption. Users will scroll through an infinite feed of audiobook covers, tap to listen instantly, and follow their favorite creators across multiple channels.

## 🚀 Key Features

### Core User Experience
- **Instagram-style infinite scroll** of audiobook covers
- **Instant audio playback** on tap (no loading delays)
- **PWA (Progressive Web App)** for mobile-first experience
- **Multi-channel creation** under single user account
- **Real-time engagement** (likes, comments, saves)
- **Smart discovery** through tags, hashtags, and AI recommendations

### Authentication & User Model
- **Flexible login**: Phone (Twilio) OR Email
- **Multiple channels** per user account (@username style)
- **Channel switching** interface for creators
- **Global namespace** for channel handles

### Content Creation
- **Desktop-optimized editor** (keep current system)
- **Mobile creation flow** (voice-to-text + AI generation)
- **AI-powered tagging** and content analysis
- **Custom or library book covers**

## 🛠 Technical Architecture

### Frontend Stack
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **PWA** with service workers
- **Web Audio API** for instant playback

### Backend Stack
- **Supabase** (PostgreSQL + Real-time + Auth + Storage)
- **Vercel** for hosting and edge functions
- **Google Text-to-Speech** (current) + ElevenLabs (future voice cloning)
- **Vercel Edge Functions** for serverless processing

### Mobile Strategy
- **Phase 1**: PWA (no app store approval needed)
- **Phase 2**: Native apps with Capacitor (same codebase)
- **Installation**: Users can add PWA to home screen directly

## 📊 Data Model

```
Users
├── id (UUID)
├── phone (optional)
├── email (optional)
├── created_at
└── profile_data (JSON)

Channels
├── id (UUID)
├── user_id (FK)
├── handle (unique, @username)
├── display_name
├── avatar_url
├── bio
├── follower_count
└── following_count

Biglios (Books)
├── id (UUID)
├── channel_id (FK)
├── title
├── description
├── cover_image_url
├── audio_url
├── duration
├── tags (array)
├── hashtags (array)
├── ai_summary
├── play_count
├── like_count
└── created_at

Chapters
├── id (UUID)
├── biglio_id (FK)
├── title
├── content (text)
├── audio_url
├── order_index
└── duration

Engagement
├── Likes (user_id, biglio_id)
├── Comments (user_id, biglio_id, content, thread)
├── Saves (user_id, biglio_id)
├── Follows (follower_id, channel_id)
└── Listening_History (user_id, biglio_id, progress)
```

## 🎨 UI/UX Strategy

### Instagram-Inspired Design
- **Feed**: Infinite scroll of square/portrait book covers
- **Player**: Overlay modal with waveform, controls, comments
- **Channels**: Profile pages with grid of Biglios
- **Discovery**: Search, trending, categories, personalized

### Mobile-First Approach
- **Touch-optimized** interactions
- **Gesture navigation** (swipe, pinch, tap)
- **Responsive design** that works on all devices
- **Offline capability** for downloaded Biglios

## 🔄 Migration Strategy

### Phase 1: Setup & Core Features
1. New repository setup
2. Supabase project configuration
3. Basic authentication (phone/email)
4. Channel creation system
5. Biglio upload and management

### Phase 2: Discovery & Engagement
1. Instagram-style feed
2. Audio streaming infrastructure
3. Like, comment, save functionality
4. Search and tagging system

### Phase 3: Advanced Features
1. Algorithm-based recommendations
2. Real-time notifications
3. Voice cloning integration
4. Advanced analytics

### Phase 4: Launch Transition
1. Data migration from V1
2. Domain switch
3. User communication
4. V1 deprecation

## 🎵 Audio Architecture

### Streaming Strategy
- **Progressive download** for instant playback
- **Audio chunking** for faster initial response
- **Background downloading** for seamless experience
- **Offline caching** for saved Biglios

### Voice Technology
- **Current**: Google Text-to-Speech (proven, reliable)
- **Future**: ElevenLabs for voice cloning
- **Storage**: Supabase Storage with global CDN
- **Processing**: Edge functions for audio optimization

## 📱 Progressive Web App Features

### Native-like Experience
- **Home screen installation**
- **Offline functionality**
- **Push notifications**
- **Background audio playback**
- **Share integration**

### Performance Optimizations
- **Image lazy loading**
- **Audio preloading strategies**
- **Service worker caching**
- **Edge-side rendering**

## 🔍 Discovery & Algorithm

### Content Discovery
- **Tags**: User-defined during creation
- **Hashtags**: Social-style discovery
- **AI Analysis**: Automatic content categorization
- **Trending**: Engagement-based visibility

### Recommendation Engine
- **Start Simple**: Recent + Popular + Tagged
- **Scale Advanced**: ML-based on user behavior
- **Personalization**: Listening history, likes, follows
- **Diversity**: Balanced content exposure

## 🚀 Development Roadmap

### Month 1: Foundation
- [ ] Repository setup and basic Next.js app
- [ ] Supabase configuration and schema
- [ ] Authentication system (phone/email)
- [ ] Basic channel creation and management

### Month 2: Core Features
- [ ] Biglio creation and upload system
- [ ] Audio streaming infrastructure
- [ ] Instagram-style feed interface
- [ ] Basic engagement (likes, saves)

### Month 3: Enhancement
- [ ] Comment system with threads
- [ ] Search and discovery features
- [ ] Mobile creation flow
- [ ] PWA optimization

### Month 4: Polish & Launch
- [ ] Performance optimization
- [ ] Data migration tools
- [ ] Beta testing with existing users
- [ ] Production deployment

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm
- Supabase account
- Vercel account
- Google Cloud account (for TTS)

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_TTS_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

## 📋 Marketing & Terminology

### Brand Evolution
- **Books** → **Biglios** (marketing term only, data model flexible)
- **Authors** → **Creators**
- **Library** → **Channel**
- **Readers** → **Listeners** or **Fans**

### Social Features
- **Follow** creators across channels
- **Subscribe** to channel updates
- **Share** individual Biglios
- **Curate** personal collections

## 🎯 Success Metrics

### Engagement KPIs
- **Daily Active Users** (DAU)
- **Average listening time** per session
- **Content completion rate**
- **Social engagement** (likes, comments, shares)
- **Creator retention** and publishing frequency

### Technical KPIs
- **Audio playback latency** (<2 seconds)
- **Feed scroll performance** (60fps)
- **PWA installation rate**
- **Mobile vs desktop usage**

---

## 🤝 Contributing

This is a private project currently in development. Once ready for beta testing, we'll expand the contributor guidelines.

## 📞 Contact

For questions about this project, reach out to the development team.

---

**Note**: This README will evolve as the project develops. Keep it updated with architectural decisions and implementation details.