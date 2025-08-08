#!/usr/bin/env node

/**
 * PRIORITY AUDIO MIGRATION
 * 
 * This script only migrates audio files that match existing chapters in your database.
 * Much faster and more efficient than migrating all 2,448 files!
 * 
 * Usage:
 *   node priority-audio-migration.js --dry-run    # See what would be migrated
 *   node priority-audio-migration.js              # Migrate only needed files
 */

require('dotenv').config({ path: '.env.local' });
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const isDryRun = process.argv.includes('--dry-run');
const S3_BUCKET = 'storage-audio-file';
const TEMP_DIR = './audio-temp';

const s3 = new AWS.S3({ region: 'us-east-1' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const log = (msg, data = '') => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`, data);

async function priorityAudioMigration() {
  try {
    if (isDryRun) log('🔍 DRY RUN MODE - Analyzing priority files only');
    
    log('📋 Step 1: Getting chapters that need audio...');
    
    // Get all chapters that don't have audio URLs yet
    const { data: chaptersNeedingAudio, error: chaptersError } = await supabase
      .from('chapters')
      .select(`
        id,
        biglio_id,
        chapter_number,
        title,
        audio_url
      `)
      .is('audio_url', null);
    
    // Get book and channel info separately
    const biglioIds = [...new Set(chaptersNeedingAudio?.map(c => c.biglio_id) || [])];
    const { data: books, error: booksError } = await supabase
      .from('biglios')
      .select(`
        id,
        title,
        channel_id
      `)
      .in('id', biglioIds);
    
    // Get channel info
    const channelIds = [...new Set(books?.map(b => b.channel_id) || [])];
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, handle')
      .in('id', channelIds);
    
    if (channelsError) {
      log('❌ Error fetching channels:', channelsError);
      return;
    }
    
    if (booksError) {
      log('❌ Error fetching books:', booksError);
      return;
    }
    
    // Merge book and channel info with chapters
    chaptersNeedingAudio?.forEach(chapter => {
      const book = books?.find(b => b.id === chapter.biglio_id);
      if (book) {
        const channel = channels?.find(c => c.id === book.channel_id);
        chapter.biglios = {
          ...book,
          channels: channel
        };
      }
    });

    if (chaptersError) {
      log('❌ Error fetching chapters:', chaptersError);
      return;
    }

    log(`📊 Found ${chaptersNeedingAudio.length} chapters needing audio`);

    if (chaptersNeedingAudio.length === 0) {
      log('🎉 All chapters already have audio! Migration complete.');
      return;
    }

    // Create temp directory
    if (!isDryRun && !fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    log('🔍 Step 2: Scanning S3 for matching audio files...');
    
    // Get all audio files from S3
    const s3Objects = [];
    let continuationToken;
    
    do {
      const params = {
        Bucket: S3_BUCKET,
        Prefix: 'audio/',
        ContinuationToken: continuationToken
      };
      
      const response = await s3.listObjectsV2(params).promise();
      s3Objects.push(...response.Contents);
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    log(`📁 Found ${s3Objects.length} total audio files in S3`);

    // Match audio files to chapters using various strategies
    const matches = [];
    let matchedChapters = 0;

    for (const chapter of chaptersNeedingAudio) {
      // Try multiple matching strategies
      const potentialMatches = s3Objects.filter(obj => {
        const fileName = obj.Key.toLowerCase();
        const chapterTitle = chapter.title?.toLowerCase() || '';
        const bookTitle = chapter.biglios?.title?.toLowerCase() || '';
        
        // Strategy 1: Look for chapter title in filename
        if (fileName.includes(chapterTitle.substring(0, 10))) return true;
        
        // Strategy 2: Look for book title + chapter number
        if (fileName.includes(bookTitle.substring(0, 10)) && 
            fileName.includes(chapter.chapter_number.toString())) return true;
        
        // Strategy 3: Look for exact chapter ID (if using timestamp-based naming)
        if (fileName.includes(chapter.id)) return true;
        
        return false;
      });

      if (potentialMatches.length > 0) {
        // Take the most recent file (largest timestamp in filename)
        const bestMatch = potentialMatches.sort((a, b) => {
          const aTimestamp = a.Key.match(/(\d{13})/)?.[1] || '0';
          const bTimestamp = b.Key.match(/(\d{13})/)?.[1] || '0';
          return bTimestamp.localeCompare(aTimestamp);
        })[0];

        matches.push({
          chapter,
          s3Object: bestMatch
        });
        matchedChapters++;
      }
    }

    log(`🎯 Matched ${matchedChapters}/${chaptersNeedingAudio.length} chapters to audio files`);

    if (isDryRun) {
      log('📋 Priority migration plan:');
      matches.forEach(({ chapter, s3Object }, index) => {
        const sizeMB = (s3Object.Size / (1024 * 1024)).toFixed(2);
        log(`  ${index + 1}. "${chapter.title}" → ${s3Object.Key} (${sizeMB} MB)`);
      });
      log(`\n💡 To migrate these ${matches.length} priority files, run: node priority-audio-migration.js`);
      return;
    }

    // Actually migrate the matched files
    log(`🚀 Step 3: Migrating ${matches.length} priority audio files...`);
    
    let completed = 0;
    for (const { chapter, s3Object } of matches) {
      try {
        log(`⬇️ [${completed + 1}/${matches.length}] Downloading: ${s3Object.Key}`);
        
        // Download from S3
        const downloadParams = { Bucket: S3_BUCKET, Key: s3Object.Key };
        const s3Data = await s3.getObject(downloadParams).promise();
        const tempFilePath = path.join(TEMP_DIR, path.basename(s3Object.Key));
        fs.writeFileSync(tempFilePath, s3Data.Body);

        // Upload to Supabase Storage
        const supabaseFileName = `migrated/${s3Object.Key}`;
        log(`⬆️ Uploading to Supabase: ${supabaseFileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio')
          .upload(supabaseFileName, fs.readFileSync(tempFilePath), {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          log(`❌ Upload failed for ${s3Object.Key}:`, uploadError.message);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('audio')
          .getPublicUrl(supabaseFileName);

        // Update chapter with audio URL
        const { error: updateError } = await supabase
          .from('chapters')
          .update({ audio_url: publicUrl })
          .eq('id', chapter.id);

        if (updateError) {
          log(`❌ Database update failed for chapter ${chapter.id}:`, updateError.message);
          continue;
        }

        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        
        completed++;
        log(`✅ [${completed}/${matches.length}] Completed: "${chapter.title}"`);
        
      } catch (error) {
        log(`❌ Error migrating ${s3Object.Key}:`, error.message);
        continue;
      }
    }

    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    log(`🎉 Priority migration complete!`);
    log(`📊 Successfully migrated ${completed}/${matches.length} audio files`);
    log(`📋 ${chaptersNeedingAudio.length - completed} chapters still need audio (no matching files found)`);

  } catch (error) {
    log('❌ Migration failed:', error.message);
    console.error(error);
  }
}

// Run the migration
priorityAudioMigration();
