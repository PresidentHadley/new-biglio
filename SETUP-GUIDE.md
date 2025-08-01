# 🚀 Biglio V2 Setup Guide

## Step 1: Database Setup

### Run the Database Schema
1. Open your Supabase project: https://hdvadrswlzmjtlfkdewu.supabase.co
2. Go to **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Copy and paste the entire contents of `database-setup.sql`
5. Click **"Run"** to create all tables and sample data

### What Gets Created:
- ✅ **9 core tables**: users, channels, biglios, chapters, likes, comments, saves, follows, listening_history, tags, biglio_tags
- ✅ **Row Level Security** policies for data protection
- ✅ **Automatic counters** (likes, followers, etc.)
- ✅ **Sample data**: One channel (@storyteller) with "The Midnight Chronicles" book
- ✅ **Performance indexes** for fast queries

## Step 2: Verify Setup

After running the SQL, check these tables exist:
```sql
-- Run this in SQL Editor to verify
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see: `biglio_tags`, `biglios`, `channels`, `chapters`, `comments`, `follows`, `likes`, `listening_history`, `saves`, `tags`, `users`

## Step 3: Test Sample Data

```sql
-- See the sample book
SELECT 
  b.title,
  c.handle as channel,
  b.total_chapters,
  b.like_count
FROM biglios b
JOIN channels c ON c.id = b.channel_id;
```

Should return: "The Midnight Chronicles" by @storyteller

## Step 4: Environment Variables

Your `.env.local` already has:
```
NEXT_PUBLIC_SUPABASE_URL=https://hdvadrswlzmjtlfkdewu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Next Steps

✅ **Database Ready!**  
🎯 **Next**: Build modal system for book opening  
🎯 **Then**: Add authentication  
🎯 **Then**: Real audio integration

## Troubleshooting

**Error: "permission denied"**
- Make sure you're signed in to Supabase
- Try refreshing the SQL Editor page

**Error: "relation already exists"**
- Tables already exist, you're good to go!
- Or drop existing tables first: `DROP TABLE IF EXISTS [table_name] CASCADE;`

**Sample data not showing**
- Run the INSERT statements at the bottom of `database-setup.sql` separately