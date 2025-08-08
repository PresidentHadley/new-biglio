#!/usr/bin/env node

/**
 * QUICK BIGLIO MIGRATION - Data Only (No Audio Files)
 * 
 * This is a simplified version that just migrates your metadata
 * without transferring audio files. Perfect for quick testing.
 * 
 * Steps:
 * 1. Read your DynamoDB tables  
 * 2. Create users, channels, biglios, and chapters in Supabase
 * 3. Skip audio file transfer (you can do this later)
 * 
 * Usage:
 *   npm install aws-sdk @supabase/supabase-js dotenv
 *   node quick-migration.js --dry-run    # Test first
 *   node quick-migration.js              # Actually migrate
 */

require('dotenv').config({ path: '.env.local' });
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const isDryRun = process.argv.includes('--dry-run');
const onlyUser = process.argv.find(arg => arg.startsWith('--user='))?.split('=')[1];

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tables to migrate from
const TABLES = {
  books: 'Biglio-Books',      // Adjust these to match your actual table names
  chapters: 'Biglio-Chapters',
  users: 'Biglio-Users'       // If you have a users table
};

const log = (msg, data = '') => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`, data);

async function quickMigration() {
  try {
    if (isDryRun) log('🔍 DRY RUN MODE - No data will be modified');
    
    log('🚀 Starting quick migration...');
    
    // Step 1: Get all your books from DynamoDB
    log('📚 Fetching books from DynamoDB...');
    const { Items: books } = await dynamoDB.scan({ TableName: TABLES.books }).promise();
    log(`Found ${books.length} books`);
    
    // Show sample book structure
    if (books.length > 0) {
      log('📖 Sample book structure:', JSON.stringify(books[0], null, 2));
    }
    
    // Step 2: Get all chapters
    log('📖 Fetching chapters from DynamoDB...');
    const { Items: chapters } = await dynamoDB.scan({ TableName: TABLES.chapters }).promise();
    log(`Found ${chapters.length} chapters`);
    
    // Show sample chapter structure  
    if (chapters.length > 0) {
      log('📄 Sample chapter structure:', JSON.stringify(chapters[0], null, 2));
    }
    
    // Step 3: Migrate to Supabase (if not dry run)
    if (!isDryRun) {
      await migrateToSupabase(books, chapters);
    } else {
      log('✅ Dry run complete. Data structures look good!');
      log('\n💡 To actually migrate, run: node quick-migration.js');
    }
    
  } catch (error) {
    log('❌ Migration error:', error.message);
    console.error(error);
  }
}

async function migrateToSupabase(books, chapters) {
  const userMapping = new Map();
  const channelMapping = new Map();
  const bookMapping = new Map();
  
  // Process each book
  for (const book of books) {
    try {
      if (onlyUser && book.userId !== onlyUser) continue;
      
      let userId = userMapping.get(book.userId);
      let channelId = channelMapping.get(book.userId);
      
      // Create user if doesn't exist
      if (!userId) {
        userId = await createUser(book);
        userMapping.set(book.userId, userId);
      }
      
      // Create channel if doesn't exist
      if (!channelId) {
        channelId = await createChannel(userId, book);
        channelMapping.set(book.userId, channelId);
      }
      
      // Create biglio
      const biglioId = await createBiglio(channelId, book);
      bookMapping.set(book.bookId, biglioId);
      
      log(`✅ Migrated book: ${book.title}`);
      
    } catch (error) {
      log(`❌ Error migrating book ${book.bookId}:`, error.message);
    }
  }
  
  // Process chapters
  for (const chapter of chapters) {
    try {
      const biglioId = bookMapping.get(chapter.bookId);
      if (!biglioId) {
        log(`⚠️ Skipping chapter ${chapter.chapterId} - no biglio found`);
        continue;
      }
      
      await createChapter(biglioId, chapter);
      log(`✅ Migrated chapter: ${chapter.title || 'Untitled'}`);
      
    } catch (error) {
      log(`❌ Error migrating chapter ${chapter.chapterId}:`, error.message);
    }
  }
  
  log('🎉 Migration complete!');
}

async function createUser(book) {
  // Generate a new UUID for the user
  const userId = crypto.randomUUID();
  
  const { error } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: `user-${book.userId}@migrated.biglio.com`, // Placeholder email
      display_name: `User ${book.userId}`,
      bio: 'Migrated from Biglio V1'
    });
    
  if (error && !error.message.includes('duplicate')) throw error;
  return userId;
}

async function createChannel(userId, book) {
  const { data, error } = await supabase
    .from('channels')
    .insert({
      user_id: userId,
      handle: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      display_name: 'My Channel',
      bio: 'Migrated from Biglio V1',
      is_primary: true
    })
    .select('id')
    .single();
    
  if (error) throw error;
  return data.id;
}

async function createBiglio(channelId, book) {
  const { data, error } = await supabase
    .from('biglios')
    .insert({
      channel_id: channelId,
      title: book.title,
      description: book.summary || book.blurb || book.description,
      total_chapters: book.chapterCount || 0,
      is_published: book.isPublished || false,
      created_at: book.createdAt,
      updated_at: book.updatedAt
    })
    .select('id')
    .single();
    
  if (error) throw error;
  return data.id;
}

async function createChapter(biglioId, chapter) {
  const { error } = await supabase
    .from('chapters')
    .insert({
      biglio_id: biglioId,
      title: chapter.title || `Chapter ${chapter.chapterNumber || 1}`,
      content: chapter.content,
      // audio_url: null, // We'll migrate audio files separately
      chapter_number: chapter.chapterNumber || 1,
      duration_seconds: chapter.duration || 0,
      is_published: chapter.isPublished || false,
      created_at: chapter.createdAt,
      updated_at: chapter.updatedAt
    });
    
  if (error) throw error;
}

// Helper for crypto.randomUUID if not available
const crypto = require('crypto');
if (!crypto.randomUUID) {
  crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Show help
if (process.argv.includes('--help')) {
  console.log(`
QUICK BIGLIO MIGRATION - Metadata Only

Usage: node quick-migration.js [options]

Options:
  --dry-run        Test run - show data structure without migrating
  --user=USER_ID   Migrate only specific user's data
  --help           Show this help

Examples:
  node quick-migration.js --dry-run
  node quick-migration.js --user=abc123
  node quick-migration.js

Required Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Make sure your AWS CLI is configured for DynamoDB access.
`);
  process.exit(0);
}

// Run it
quickMigration();
