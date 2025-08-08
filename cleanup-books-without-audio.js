#!/usr/bin/env node

/**
 * CLEANUP BOOKS WITHOUT AUDIO
 * 
 * This script removes books from the feed that don't have any playable audio chapters.
 * Much cleaner feed with only functional audiobooks!
 * 
 * Usage:
 *   node cleanup-books-without-audio.js --dry-run    # See what would be deleted
 *   node cleanup-books-without-audio.js              # Actually delete books
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const isDryRun = process.argv.includes('--dry-run');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const log = (msg, data = '') => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`, data);

async function cleanupBooksWithoutAudio() {
  try {
    if (isDryRun) log('🔍 DRY RUN MODE - Analyzing books without audio');
    
    log('📋 Step 1: Finding books without any audio chapters...');
    
    // Get all published books
    const { data: allBooks, error: booksError } = await supabase
      .from('biglios')
      .select(`
        id,
        title,
        is_published
      `)
      .eq('is_published', true);

    if (booksError) {
      log('❌ Error fetching books:', booksError);
      return;
    }

    log(`📚 Found ${allBooks.length} published books`);

    // Check each book for audio chapters
    const booksWithoutAudio = [];
    const booksWithAudio = [];

    for (const book of allBooks) {
      // Check if this book has any chapters with audio
      const { data: chaptersWithAudio, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, audio_url')
        .eq('biglio_id', book.id)
        .not('audio_url', 'is', null);

      if (chaptersError) {
        log(`❌ Error checking chapters for book ${book.id}:`, chaptersError);
        continue;
      }

      if (!chaptersWithAudio || chaptersWithAudio.length === 0) {
        booksWithoutAudio.push(book);
      } else {
        booksWithAudio.push({
          ...book,
          audioChapters: chaptersWithAudio.length
        });
      }
    }

    log(`📊 Analysis complete:`);
    log(`  ✅ ${booksWithAudio.length} books WITH audio`);
    log(`  ❌ ${booksWithoutAudio.length} books WITHOUT audio`);

    if (isDryRun) {
      log('\n📋 Books that would be DELETED (no audio):');
      booksWithoutAudio.forEach((book, i) => {
        log(`  ${i + 1}. "${book.title}" (ID: ${book.id})`);
      });
      
      log('\n📋 Books that would be KEPT (have audio):');
      booksWithAudio.forEach((book, i) => {
        log(`  ${i + 1}. "${book.title}" (${book.audioChapters} audio chapters)`);
      });
      
      log(`\n💡 To delete ${booksWithoutAudio.length} books without audio, run: node cleanup-books-without-audio.js`);
      return;
    }

    if (booksWithoutAudio.length === 0) {
      log('🎉 All published books have audio! Nothing to clean up.');
      return;
    }

    log(`🗑️ Step 2: Deleting ${booksWithoutAudio.length} books without audio...`);

    let deleted = 0;
    for (const book of booksWithoutAudio) {
      try {
        log(`🗑️ [${deleted + 1}/${booksWithoutAudio.length}] Deleting: "${book.title}"`);

        // Delete associated data first
        
        // 1. Delete chapters
        const { error: chaptersDeleteError } = await supabase
          .from('chapters')
          .delete()
          .eq('biglio_id', book.id);

        if (chaptersDeleteError) {
          log(`❌ Error deleting chapters for "${book.title}":`, chaptersDeleteError.message);
          continue;
        }

        // 2. Delete likes
        const { error: likesDeleteError } = await supabase
          .from('likes')
          .delete()
          .eq('biglio_id', book.id);

        if (likesDeleteError) {
          log(`❌ Error deleting likes for "${book.title}":`, likesDeleteError.message);
          continue;
        }

        // 3. Delete saves  
        const { error: savesDeleteError } = await supabase
          .from('saves')
          .delete()
          .eq('biglio_id', book.id);

        if (savesDeleteError) {
          log(`❌ Error deleting saves for "${book.title}":`, savesDeleteError.message);
          continue;
        }

        // 4. Delete comments
        const { error: commentsDeleteError } = await supabase
          .from('comments')
          .delete()
          .eq('biglio_id', book.id);

        if (commentsDeleteError) {
          log(`❌ Error deleting comments for "${book.title}":`, commentsDeleteError.message);
          continue;
        }

        // 5. Delete the book itself
        const { error: bookDeleteError } = await supabase
          .from('biglios')
          .delete()
          .eq('id', book.id);

        if (bookDeleteError) {
          log(`❌ Error deleting book "${book.title}":`, bookDeleteError.message);
          continue;
        }

        deleted++;
        log(`✅ [${deleted}/${booksWithoutAudio.length}] Deleted: "${book.title}"`);

      } catch (error) {
        log(`❌ Unexpected error deleting "${book.title}":`, error.message);
        continue;
      }
    }

    log(`\n🎉 Cleanup complete!`);
    log(`📊 Successfully deleted ${deleted}/${booksWithoutAudio.length} books without audio`);
    log(`✅ Your feed now only shows ${booksWithAudio.length} books with working audio!`);

    // Final count
    const { data: remainingBooks } = await supabase
      .from('biglios')
      .select('id')
      .eq('is_published', true);
      
    log(`📱 Total books in feed: ${remainingBooks?.length || 0}`);

  } catch (error) {
    log('❌ Cleanup failed:', error.message);
    console.error(error);
  }
}

// Run the cleanup
cleanupBooksWithoutAudio();
