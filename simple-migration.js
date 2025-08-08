#!/usr/bin/env node

/**
 * SIMPLE BIGLIO MIGRATION - FIXED VERSION
 * 
 * This version bypasses the auth.users constraint by creating a temporary
 * migration approach that works with your current setup.
 */

require('dotenv').config({ path: '.env.local' });
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');

const isDryRun = process.argv.includes('--dry-run');
const onlyUser = process.argv.find(arg => arg.startsWith('--user='))?.split('=')[1];

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const log = (msg, data = '') => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`, data);

async function simpleMigration() {
  try {
    if (isDryRun) log('🔍 DRY RUN MODE - No data will be modified');
    
    log('🚀 Starting simple migration (bypassing auth constraints)...');
    
    // Get books and chapters
    const { Items: books } = await dynamoDB.scan({ TableName: 'Biglio-Books' }).promise();
    const { Items: chapters } = await dynamoDB.scan({ TableName: 'Biglio-Chapters' }).promise();
    
    log(`Found ${books.length} books and ${chapters.length} chapters`);
    
    if (isDryRun) {
      log('✅ Dry run complete!');
      return;
    }
    
    // Create a single test user first (bypassing foreign key constraint)
    const testUserId = await createTestUser();
    
    // Create channels and biglios without the auth constraint
    const channelMapping = new Map();
    const bookMapping = new Map();
    
    let migratedBooks = 0;
    let migratedChapters = 0;
    
    // Group books by userId to minimize channel creation
    const booksByUser = new Map();
    books.forEach(book => {
      if (!booksByUser.has(book.userId)) {
        booksByUser.set(book.userId, []);
      }
      booksByUser.get(book.userId).push(book);
    });
    
    // Migrate each user's books
    for (const [originalUserId, userBooks] of booksByUser) {
      try {
        if (onlyUser && originalUserId !== onlyUser) continue;
        
        // Create one channel per user (using our test user)
        const channelId = await createChannel(testUserId, originalUserId);
        channelMapping.set(originalUserId, channelId);
        
        // Migrate all books for this user
        for (const book of userBooks) {
          try {
            const biglioId = await createBiglio(channelId, book);
            bookMapping.set(book.bookId, biglioId);
            migratedBooks++;
            log(`✅ Book: ${book.title}`);
          } catch (error) {
            log(`❌ Book error: ${error.message}`);
          }
        }
        
      } catch (error) {
        log(`❌ User error: ${error.message}`);
      }
    }
    
    // Migrate chapters
    for (const chapter of chapters) {
      try {
        const biglioId = bookMapping.get(chapter.bookId);
        if (!biglioId) continue;
        
        await createChapter(biglioId, chapter);
        migratedChapters++;
        
        if (migratedChapters % 10 === 0) {
          log(`📖 Migrated ${migratedChapters} chapters...`);
        }
        
      } catch (error) {
        log(`❌ Chapter error: ${error.message}`);
      }
    }
    
    log(`🎉 Migration complete! ${migratedBooks} books, ${migratedChapters} chapters`);
    
  } catch (error) {
    log('💥 Migration failed:', error.message);
    console.error(error);
  }
}

async function createTestUser() {
  // Create a test user in Supabase Auth first (this is required for the foreign key)
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'migration@biglio.com',
    password: 'temp-password-123',
    email_confirm: true
  });
  
  if (authError) {
    log('Using existing test user...');
    // Try to get existing user
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users.users.find(u => u.email === 'migration@biglio.com');
    if (existingUser) {
      return existingUser.id;
    }
    throw new Error('Could not create or find test user');
  }
  
  // Now create user record in public.users table
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: authUser.user.id,
      email: 'migration@biglio.com',
      display_name: 'Migration User',
      bio: 'Temporary user for data migration'
    });
  
  if (userError && !userError.message.includes('duplicate')) {
    throw userError;
  }
  
  log('✅ Created test user for migration');
  return authUser.user.id;
}

async function createChannel(userId, originalUserId) {
  const { data, error } = await supabase
    .from('channels')
    .insert({
      user_id: userId,
      handle: `migrated_${originalUserId.slice(-8)}`,
      display_name: `Migrated User ${originalUserId.slice(-4)}`,
      bio: `Migrated content from user ${originalUserId}`,
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
      title: book.title || 'Untitled Book',
      description: book.summary || book.blurb || book.description || 'Migrated book',
      total_chapters: book.chapterCount || 0,
      is_published: book.isPublished || false
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
      title: chapter.title || `Chapter ${chapter.order || 1}`,
      content: chapter.content || '',
      chapter_number: chapter.order || 1,
      duration_seconds: chapter.duration || 0,
      is_published: chapter.isPublished || false
    });
    
  if (error) throw error;
}

// Show help
if (process.argv.includes('--help')) {
  console.log(`
SIMPLE BIGLIO MIGRATION - Fixed for Auth Constraints

This version creates a single test user in Supabase Auth first,
then migrates all your content under that user's channels.

Usage: node simple-migration.js [options]

Options:
  --dry-run        Test run without making changes
  --user=USER_ID   Migrate only specific user's data
  --help           Show this help

Examples:
  node simple-migration.js --dry-run
  node simple-migration.js --user=abc123
  node simple-migration.js

This will create all your books/chapters in the new system!
You can later reassign them to proper users once auth is set up.
`);
  process.exit(0);
}

simpleMigration();
