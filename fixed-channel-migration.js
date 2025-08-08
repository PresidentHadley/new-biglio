#!/usr/bin/env node

/**
 * FIXED CHANNEL MIGRATION
 * 
 * Properly extracts book titles and chapter numbers from AWS data.
 * Usage:
 *   node fixed-channel-migration.js --channel=science-fiction --dry-run
 *   node fixed-channel-migration.js --channel=science-fiction --clean
 */

require('dotenv').config({ path: '.env.local' });
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');

const isDryRun = process.argv.includes('--dry-run');
const isClean = process.argv.includes('--clean');
const targetChannel = process.argv.find(arg => arg.startsWith('--channel='))?.split('=')[1];

if (!targetChannel) {
  console.log('❌ Please specify a channel: --channel=science-fiction');
  process.exit(1);
}

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const log = (msg, data = '') => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`, data);

async function cleanupExistingData() {
  if (!isClean) return;
  
  log('🧹 Cleaning up existing science fiction data...');
  
  try {
    // Get the channel
    const { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('handle', 'science_fiction')
      .single();
      
    if (!channel) {
      log('No existing channel to clean up');
      return;
    }
    
    // Get books for this channel
    const { data: books } = await supabase
      .from('biglios')
      .select('id')
      .eq('channel_id', channel.id);
      
    if (books && books.length > 0) {
      // Delete chapters first
      for (const book of books) {
        await supabase
          .from('chapters')
          .delete()
          .eq('biglio_id', book.id);
      }
      
      // Delete books
      await supabase
        .from('biglios')
        .delete()
        .eq('channel_id', channel.id);
        
      log(`✅ Cleaned up ${books.length} books and their chapters`);
    }
    
  } catch (error) {
    log('⚠️ Cleanup error (continuing anyway):', error.message);
  }
}

function extractBookAndChapter(id) {
  // Extract book title and chapter number from AWS ID format
  // Format: UUID_BookTitle_-_Chapter_N_ChapterTitle
  
  const patterns = [
    // Pattern 1: UUID_BookTitle_-_Chapter_N_ChapterTitle
    /^[^_]+_(.+?)_-_Chapter_(\d+)_/,
    // Pattern 2: UUID_BookTitle_Chapter_N_ChapterTitle  
    /^[^_]+_(.+?)_Chapter_(\d+)_/,
    // Pattern 3: More flexible fallback
    /^[^_]+_(.+?)_.*Chapter_(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = id.match(pattern);
    if (match) {
      const bookTitle = match[1]
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const chapterNum = parseInt(match[2]);
      
      return { bookTitle, chapterNum };
    }
  }
  
  return { bookTitle: 'Unknown Book', chapterNum: 0 };
}

function normalizeBookTitle(title) {
  return title
    .toLowerCase()
    .replace(/^the\s+/, '') // Remove "the" prefix
    .trim();
}

async function migrateChannelFixed() {
  try {
    if (isDryRun) log('🔍 DRY RUN MODE - Analyzing channel data only');
    if (isClean) await cleanupExistingData();
    
    log(`🎯 Targeting channel: @${targetChannel}`);
    
    // 1. Get all audio items
    log('📊 Scanning AudioMetadata table...');
    const { Items: audioItems } = await dynamoDB.scan({ 
      TableName: 'AudioMetadata' 
    }).promise();
    
    log(`📚 Found ${audioItems.length} total audio items in AWS`);
    
    // 2. Filter for science fiction books (more flexible matching)
    const targetTitles = [
      'cognitive reservoir',
      'data ghosts', 
      'cosmic equation',
      'glitch runners'
    ];
    
    const sciFiItems = audioItems.filter(item => {
      const id = (item.id || '').toLowerCase();
      return targetTitles.some(title => id.includes(title.replace(' ', '_')));
    });
    
    log(`🎯 Found ${sciFiItems.length} sci-fi chapters`);
    
    // 3. Extract and group by proper book titles
    const bookGroups = new Map();
    
    sciFiItems.forEach(item => {
      const { bookTitle, chapterNum } = extractBookAndChapter(item.id || '');
      const normalizedTitle = normalizeBookTitle(bookTitle);
      
      if (!bookGroups.has(normalizedTitle)) {
        bookGroups.set(normalizedTitle, {
          originalTitle: bookTitle,
          chapters: []
        });
      }
      
      bookGroups.get(normalizedTitle).chapters.push({
        ...item,
        chapterNumber: chapterNum,
        extractedTitle: bookTitle
      });
    });
    
    // 4. Sort chapters within each book
    for (const [bookKey, bookData] of bookGroups.entries()) {
      bookData.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }
    
    const books = Array.from(bookGroups.entries()).map(([key, data]) => ({
      title: data.originalTitle,
      normalizedTitle: key,
      chapters: data.chapters
    }));
    
    log(`📚 Organized into ${books.length} books:`);
    
    if (isDryRun) {
      books.forEach((book, i) => {
        log(`\n${i + 1}. "${book.title}"`);
        log(`   Normalized: "${book.normalizedTitle}"`);
        log(`   Chapters: ${book.chapters.length}`);
        
        book.chapters.slice(0, 3).forEach(ch => {
          log(`     Ch ${ch.chapterNumber}: "${ch.title || 'No title'}"`);
        });
        
        if (book.chapters.length > 3) {
          log(`     ... and ${book.chapters.length - 3} more chapters`);
        }
      });
      
      log(`\n💡 To migrate: node fixed-channel-migration.js --channel=${targetChannel} --clean`);
      return;
    }
    
    // 5. Get or create channel
    log(`📺 Getting channel @${targetChannel}...`);
    let channel;
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('*')
      .eq('handle', targetChannel.replace('-', '_'))
      .single();
      
    if (existingChannel) {
      channel = existingChannel;
      log(`✅ Using existing channel: @${channel.handle} (ID: ${channel.id})`);
    } else {
      log('❌ Channel not found. Run the original migration script first to create the channel.');
      return;
    }
    
    // 6. Migrate each book with proper organization
    let migratedBooks = 0;
    let migratedChapters = 0;
    
    for (const bookData of books) {
      try {
        log(`\n📖 Migrating "${bookData.title}" (${bookData.chapters.length} chapters)`);
        
        const newBookData = {
          title: bookData.title,
          description: `Science fiction audiobook from @${targetChannel}`,
          channel_id: channel.id,
          cover_url: null,
          total_chapters: bookData.chapters.length,
          genre: 'Science Fiction',
          target_audience: ['adult'],
          reading_level: 'Adult',
          is_published: true,
          published_at: new Date().toISOString(),
          like_count: 0,
          save_count: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: book, error: bookError } = await supabase
          .from('biglios')
          .insert(newBookData)
          .select()
          .single();
          
        if (bookError) {
          log(`❌ Error creating book: ${bookError.message}`);
          continue;
        }
        
        log(`✅ Created book: "${book.title}" (ID: ${book.id})`);
        migratedBooks++;
        
        // Create chapters in correct order
        for (const awsChapter of bookData.chapters) {
          const chapterData = {
            biglio_id: book.id,
            title: awsChapter.title || `Chapter ${awsChapter.chapterNumber}`,
            content: awsChapter.content || awsChapter.text || 'Migrated content',
            chapter_number: awsChapter.chapterNumber,
            order_index: awsChapter.chapterNumber,
            audio_url: awsChapter.audioUrl || null,
            duration_seconds: awsChapter.duration || null,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { data: chapter, error: chapterError } = await supabase
            .from('chapters')
            .insert(chapterData)
            .select()
            .single();
            
          if (chapterError) {
            log(`❌ Error creating chapter ${awsChapter.chapterNumber}: ${chapterError.message}`);
            continue;
          }
          
          log(`  ✅ Ch ${chapter.chapter_number}: "${chapter.title}" (Audio: ${chapter.audio_url ? 'Yes' : 'No'})`);
          migratedChapters++;
        }
        
      } catch (error) {
        log(`❌ Error migrating book: ${error.message}`);
        continue;
      }
    }
    
    log('\n🎉 Fixed migration complete!');
    log(`📺 Channel: @${channel.handle}`);
    log(`📚 Books migrated: ${migratedBooks}`);
    log(`📖 Chapters migrated: ${migratedChapters}`);
    log(`🔗 View at: /channel/${channel.handle}`);
    
  } catch (error) {
    log('❌ Migration failed:', error.message);
    console.error(error);
  }
}

// Run the fixed migration
migrateChannelFixed();
