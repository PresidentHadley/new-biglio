#!/usr/bin/env node

/**
 * BIGLIO AUDIO FILE MIGRATION
 * 
 * This script migrates audio files from your S3 bucket to Supabase Storage.
 * Run this AFTER you've migrated your metadata with quick-migration.js
 * 
 * What it does:
 * 1. Scans your S3 bucket for audio files
 * 2. Downloads and uploads them to Supabase Storage
 * 3. Updates chapter records with new audio URLs
 * 
 * Usage:
 *   node audio-migration.js --dry-run    # See what files would be migrated
 *   node audio-migration.js              # Actually migrate files
 *   node audio-migration.js --bucket=your-bucket-name  # Specify bucket
 */

require('dotenv').config({ path: '.env.local' });
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const isDryRun = process.argv.includes('--dry-run');
const customBucket = process.argv.find(arg => arg.startsWith('--bucket='))?.split('=')[1];

const S3_BUCKET = customBucket || 'storage-audio-file'; // Your S3 bucket name
const TEMP_DIR = './audio-temp';

const s3 = new AWS.S3({ region: 'us-east-1' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const log = (msg, data = '') => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`, data);

async function migrateAudioFiles() {
  try {
    if (isDryRun) log('🔍 DRY RUN MODE - No files will be transferred');
    
    log('🎵 Starting audio file migration...');
    
    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    // Step 1: List all audio files in S3
    log(`📂 Scanning S3 bucket: ${S3_BUCKET}`);
    const audioFiles = await listS3AudioFiles();
    log(`Found ${audioFiles.length} audio files`);
    
    if (audioFiles.length === 0) {
      log('ℹ️ No audio files found. Check your bucket name.');
      return;
    }
    
    // Show sample files
    log('📄 Sample files found:');
    audioFiles.slice(0, 5).forEach(file => log(`  - ${file.Key} (${formatBytes(file.Size)})`));
    if (audioFiles.length > 5) log(`  ... and ${audioFiles.length - 5} more`);
    
    if (isDryRun) {
      log('✅ Dry run complete. Files look good!');
      log('\n💡 To actually migrate files, run: node audio-migration.js');
      return;
    }
    
    // Step 2: Migrate each file
    let migrated = 0;
    let errors = 0;
    
    for (const file of audioFiles) {
      try {
        await migrateAudioFile(file);
        migrated++;
        log(`✅ Migrated: ${file.Key}`);
      } catch (error) {
        errors++;
        log(`❌ Error migrating ${file.Key}:`, error.message);
      }
    }
    
    // Step 3: Update database with new URLs
    await updateChapterAudioUrls();
    
    // Cleanup
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }
    
    log(`🎉 Migration complete! ${migrated} files migrated, ${errors} errors`);
    
  } catch (error) {
    log('❌ Audio migration error:', error.message);
    console.error(error);
  }
}

async function listS3AudioFiles() {
  const files = [];
  let continuationToken = null;
  
  do {
    const params = {
      Bucket: S3_BUCKET,
      MaxKeys: 1000,
      ContinuationToken: continuationToken
    };
    
    const result = await s3.listObjectsV2(params).promise();
    
    // Filter for audio files
    const audioFiles = result.Contents.filter(file => 
      file.Key.match(/\.(mp3|wav|m4a|aac)$/i)
    );
    
    files.push(...audioFiles);
    continuationToken = result.NextContinuationToken;
    
  } while (continuationToken);
  
  return files;
}

async function migrateAudioFile(file) {
  // Download from S3
  const localPath = path.join(TEMP_DIR, path.basename(file.Key));
  
  log(`⬇️ Downloading: ${file.Key}`);
  const s3Object = await s3.getObject({ Bucket: S3_BUCKET, Key: file.Key }).promise();
  fs.writeFileSync(localPath, s3Object.Body);
  
  // Generate new file path for Supabase
  // Example: "audio/chapters/book123/chapter456.mp3"
  const newFileName = `migrated/${file.Key}`;
  
  log(`⬆️ Uploading to Supabase: ${newFileName}`);
  
  // Upload to Supabase Storage
  const fileBuffer = fs.readFileSync(localPath);
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(newFileName, fileBuffer, {
      contentType: getContentType(file.Key),
      upsert: true
    });
  
  if (error) throw error;
  
  // Clean up local file
  fs.unlinkSync(localPath);
  
  return data;
}

async function updateChapterAudioUrls() {
  log('🔗 Updating chapter audio URLs...');
  
  // Get all chapters that don't have audio URLs yet
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, biglio_id, chapter_number')
    .is('audio_url', null);
  
  if (error) throw error;
  
  log(`Found ${chapters.length} chapters without audio URLs`);
  
  // For each chapter, try to find corresponding audio file
  let updated = 0;
  
  for (const chapter of chapters) {
    try {
      // Try to find audio file based on various naming patterns
      const possibleFiles = [
        `migrated/chapters/${chapter.biglio_id}/${chapter.id}.mp3`,
        `migrated/chapters/${chapter.biglio_id}/chapter${chapter.chapter_number}.mp3`,
        `migrated/${chapter.id}.mp3`,
        `migrated/chapter_${chapter.id}.mp3`
      ];
      
      let audioUrl = null;
      
      for (const fileName of possibleFiles) {
        // Check if file exists in Supabase Storage
        const { data } = await supabase.storage
          .from('audio-files')
          .list('migrated', { search: path.basename(fileName) });
        
        if (data && data.length > 0) {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('audio-files')
            .getPublicUrl(fileName);
          
          audioUrl = urlData.publicUrl;
          break;
        }
      }
      
      if (audioUrl) {
        // Update chapter with audio URL
        const { error: updateError } = await supabase
          .from('chapters')
          .update({ audio_url: audioUrl })
          .eq('id', chapter.id);
        
        if (updateError) throw updateError;
        
        updated++;
        log(`✅ Updated chapter ${chapter.id} with audio URL`);
      }
      
    } catch (error) {
      log(`❌ Error updating chapter ${chapter.id}:`, error.message);
    }
  }
  
  log(`🔗 Updated ${updated} chapters with audio URLs`);
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.m4a': return 'audio/mp4';
    case '.aac': return 'audio/aac';
    default: return 'audio/mpeg';
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show help
if (process.argv.includes('--help')) {
  console.log(`
BIGLIO AUDIO FILE MIGRATION

Usage: node audio-migration.js [options]

Options:
  --dry-run              Test run - scan files without migrating
  --bucket=BUCKET_NAME   Specify S3 bucket name (default: storage-audio-file)
  --help                 Show this help

Examples:
  node audio-migration.js --dry-run
  node audio-migration.js --bucket=my-audio-bucket
  node audio-migration.js

Required Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Make sure your AWS CLI is configured for S3 access.
`);
  process.exit(0);
}

// Run it
migrateAudioFiles();
