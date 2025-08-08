#!/usr/bin/env node

/**
 * BIGLIO V1 TO V2 MIGRATION SCRIPT
 * 
 * This script migrates data from your old AWS DynamoDB + S3 system
 * to the new Supabase + Next.js system.
 * 
 * WHAT IT DOES:
 * 1. Reads your old DynamoDB tables (Biglio-Books, Biglio-Chapters, Users)
 * 2. Downloads audio files from S3
 * 3. Uploads audio files to Supabase Storage
 * 4. Creates corresponding records in new Supabase database
 * 5. Maintains all relationships and metadata
 * 
 * BEFORE RUNNING:
 * 1. Set up your AWS credentials (AWS CLI configured)
 * 2. Set up your Supabase credentials in .env.local
 * 3. Make sure your new Supabase database schema is deployed
 * 4. Run: npm install aws-sdk @supabase/supabase-js dotenv
 */

require('dotenv').config({ path: '.env.local' });
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Configuration
const config = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    dynamoTables: {
      books: process.env.BIGLIO_BOOKS_TABLE || 'Biglio-Books',
      chapters: process.env.BIGLIO_CHAPTERS_TABLE || 'Biglio-Chapters', 
      users: process.env.BIGLIO_USERS_TABLE || 'Biglio-Users'
    },
    s3Buckets: {
      audio: process.env.S3_AUDIO_BUCKET || 'storage-audio-file',
      streaming: process.env.S3_STREAMING_BUCKET || 'biglio-streaming'
    }
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    storageBucket: 'audio-files'
  },
  migration: {
    batchSize: 10,
    tempDir: './migration-temp',
    dryRun: process.argv.includes('--dry-run'),
    skipAudio: process.argv.includes('--skip-audio'),
    onlyUser: process.argv.find(arg => arg.startsWith('--user='))?.split('=')[1]
  }
};

// Initialize clients
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: config.aws.region });
const s3 = new AWS.S3({ region: config.aws.region });
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Utility functions
const log = (message, data = '') => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};

const createTempDir = () => {
  if (!fs.existsSync(config.migration.tempDir)) {
    fs.mkdirSync(config.migration.tempDir, { recursive: true });
  }
};

const downloadFromS3 = async (bucket, key, localPath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(localPath);
    s3.getObject({ Bucket: bucket, Key: key })
      .createReadStream()
      .pipe(file)
      .on('finish', resolve)
      .on('error', reject);
  });
};

const uploadToSupabase = async (filePath, fileName, bucket = config.supabase.storageBucket) => {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });
  
  if (error) throw error;
  return data;
};

// Main migration functions
class BiglioMigrator {
  constructor() {
    this.stats = {
      users: { processed: 0, migrated: 0, errors: 0 },
      channels: { processed: 0, migrated: 0, errors: 0 },
      books: { processed: 0, migrated: 0, errors: 0 },
      chapters: { processed: 0, migrated: 0, errors: 0 },
      audioFiles: { processed: 0, migrated: 0, errors: 0 }
    };
    this.userMapping = new Map(); // old userId -> new userId
    this.channelMapping = new Map(); // old userId -> new channelId
    this.bookMapping = new Map(); // old bookId -> new biglioId
  }

  async migrate() {
    try {
      log('🚀 Starting Biglio V1 to V2 migration...');
      
      if (config.migration.dryRun) {
        log('🔍 DRY RUN MODE - No actual data will be modified');
      }

      createTempDir();

      // Step 1: Migrate Users
      await this.migrateUsers();
      
      // Step 2: Create Channels for Users
      await this.createChannels();
      
      // Step 3: Migrate Books -> Biglios
      await this.migrateBooks();
      
      // Step 4: Migrate Chapters
      await this.migrateChapters();
      
      // Step 5: Clean up
      this.cleanup();
      
      log('✅ Migration completed successfully!');
      this.printStats();
      
    } catch (error) {
      log('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async migrateUsers() {
    log('👥 Migrating users...');
    
    const { Items: oldUsers } = await dynamoDB.scan({
      TableName: config.aws.dynamoTables.users
    }).promise();

    for (const oldUser of oldUsers) {
      try {
        this.stats.users.processed++;
        
        if (config.migration.onlyUser && oldUser.userId !== config.migration.onlyUser) {
          continue;
        }

        // Create user in Supabase (if not exists)
        const newUserId = crypto.randomUUID();
        
        if (!config.migration.dryRun) {
          const { error } = await supabase
            .from('users')
            .upsert({
              id: newUserId,
              email: oldUser.email,
              phone: oldUser.phone,
              display_name: oldUser.displayName || oldUser.username,
              bio: oldUser.bio,
              avatar_url: oldUser.profileImageUrl
            });

          if (error && !error.message.includes('already exists')) {
            throw error;
          }
        }

        this.userMapping.set(oldUser.userId, newUserId);
        this.stats.users.migrated++;
        
        log(`✅ User migrated: ${oldUser.username || oldUser.email}`);
        
      } catch (error) {
        this.stats.users.errors++;
        log(`❌ Error migrating user ${oldUser.userId}:`, error.message);
      }
    }
  }

  async createChannels() {
    log('📺 Creating channels...');
    
    for (const [oldUserId, newUserId] of this.userMapping) {
      try {
        this.stats.channels.processed++;
        
        // Generate a unique handle
        const handle = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const channelId = crypto.randomUUID();
        
        if (!config.migration.dryRun) {
          const { error } = await supabase
            .from('channels')
            .insert({
              id: channelId,
              user_id: newUserId,
              handle: handle,
              display_name: 'My Channel', // Can be updated later
              bio: 'Migrated from Biglio V1',
              is_primary: true
            });

          if (error) throw error;
        }

        this.channelMapping.set(oldUserId, channelId);
        this.stats.channels.migrated++;
        
        log(`✅ Channel created for user: ${oldUserId}`);
        
      } catch (error) {
        this.stats.channels.errors++;
        log(`❌ Error creating channel for user ${oldUserId}:`, error.message);
      }
    }
  }

  async migrateBooks() {
    log('📚 Migrating books...');
    
    const { Items: oldBooks } = await dynamoDB.scan({
      TableName: config.aws.dynamoTables.books
    }).promise();

    for (const oldBook of oldBooks) {
      try {
        this.stats.books.processed++;
        
        if (config.migration.onlyUser && oldBook.userId !== config.migration.onlyUser) {
          continue;
        }

        const channelId = this.channelMapping.get(oldBook.userId);
        if (!channelId) {
          log(`⚠️ No channel found for user ${oldBook.userId}, skipping book ${oldBook.bookId}`);
          continue;
        }

        const newBiglioId = crypto.randomUUID();
        
        if (!config.migration.dryRun) {
          const { error } = await supabase
            .from('biglios')
            .insert({
              id: newBiglioId,
              channel_id: channelId,
              title: oldBook.title,
              description: oldBook.summary || oldBook.blurb,
              total_chapters: oldBook.chapterCount || 0,
              is_published: oldBook.isPublished || false,
              created_at: oldBook.createdAt,
              updated_at: oldBook.updatedAt
            });

          if (error) throw error;
        }

        this.bookMapping.set(oldBook.bookId, newBiglioId);
        this.stats.books.migrated++;
        
        log(`✅ Book migrated: ${oldBook.title}`);
        
      } catch (error) {
        this.stats.books.errors++;
        log(`❌ Error migrating book ${oldBook.bookId}:`, error.message);
      }
    }
  }

  async migrateChapters() {
    log('📖 Migrating chapters...');
    
    const { Items: oldChapters } = await dynamoDB.scan({
      TableName: config.aws.dynamoTables.chapters
    }).promise();

    for (const oldChapter of oldChapters) {
      try {
        this.stats.chapters.processed++;
        
        const newBiglioId = this.bookMapping.get(oldChapter.bookId);
        if (!newBiglioId) {
          log(`⚠️ No biglio found for book ${oldChapter.bookId}, skipping chapter ${oldChapter.chapterId}`);
          continue;
        }

        let newAudioUrl = null;
        
        // Migrate audio file if it exists
        if (oldChapter.audioUrl && !config.migration.skipAudio) {
          try {
            newAudioUrl = await this.migrateAudioFile(oldChapter);
          } catch (audioError) {
            log(`⚠️ Failed to migrate audio for chapter ${oldChapter.chapterId}:`, audioError.message);
          }
        }

        if (!config.migration.dryRun) {
          const { error } = await supabase
            .from('chapters')
            .insert({
              biglio_id: newBiglioId,
              title: oldChapter.title || `Chapter ${oldChapter.chapterNumber}`,
              content: oldChapter.content,
              audio_url: newAudioUrl,
              chapter_number: oldChapter.chapterNumber || 1,
              duration_seconds: oldChapter.duration || 0,
              is_published: oldChapter.isPublished || false,
              created_at: oldChapter.createdAt,
              updated_at: oldChapter.updatedAt
            });

          if (error) throw error;
        }

        this.stats.chapters.migrated++;
        log(`✅ Chapter migrated: ${oldChapter.title}`);
        
      } catch (error) {
        this.stats.chapters.errors++;
        log(`❌ Error migrating chapter ${oldChapter.chapterId}:`, error.message);
      }
    }
  }

  async migrateAudioFile(chapter) {
    this.stats.audioFiles.processed++;
    
    try {
      // Extract S3 key from audioUrl
      const url = new URL(chapter.audioUrl);
      const s3Key = url.pathname.substring(1); // Remove leading slash
      
      // Download from S3
      const tempFilePath = path.join(config.migration.tempDir, `${chapter.chapterId}.mp3`);
      await downloadFromS3(config.aws.s3Buckets.audio, s3Key, tempFilePath);
      
      // Upload to Supabase
      const fileName = `chapters/${chapter.bookId}/${chapter.chapterId}.mp3`;
      await uploadToSupabase(tempFilePath, fileName);
      
      // Get public URL
      const { data } = supabase.storage
        .from(config.supabase.storageBucket)
        .getPublicUrl(fileName);
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      
      this.stats.audioFiles.migrated++;
      return data.publicUrl;
      
    } catch (error) {
      this.stats.audioFiles.errors++;
      throw error;
    }
  }

  cleanup() {
    try {
      if (fs.existsSync(config.migration.tempDir)) {
        fs.rmSync(config.migration.tempDir, { recursive: true });
      }
    } catch (error) {
      log('⚠️ Cleanup error:', error.message);
    }
  }

  printStats() {
    log('\n📊 MIGRATION STATISTICS:');
    console.table(this.stats);
    
    const totalErrors = Object.values(this.stats).reduce((sum, stat) => sum + stat.errors, 0);
    const totalMigrated = Object.values(this.stats).reduce((sum, stat) => sum + stat.migrated, 0);
    
    log(`\n🎯 SUMMARY: ${totalMigrated} items migrated, ${totalErrors} errors`);
  }
}

// Command line interface
async function main() {
  try {
    // Validate configuration
    if (!config.supabase.url || !config.supabase.serviceKey) {
      throw new Error('Missing Supabase configuration. Check your .env.local file.');
    }

    const migrator = new BiglioMigrator();
    await migrator.migrate();
    
  } catch (error) {
    log('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
BIGLIO V1 TO V2 MIGRATION SCRIPT

Usage: node migration-script.js [options]

Options:
  --dry-run        Run without making any changes (test mode)
  --skip-audio     Skip audio file migration (faster)
  --user=USER_ID   Migrate only specific user's data
  --help, -h       Show this help message

Examples:
  node migration-script.js --dry-run
  node migration-script.js --user=abc123 --skip-audio
  node migration-script.js

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  
AWS Configuration:
  - AWS CLI configured with credentials
  - Or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  
Optional AWS Environment Variables:
  AWS_REGION (default: us-east-1)
  BIGLIO_BOOKS_TABLE (default: Biglio-Books)
  BIGLIO_CHAPTERS_TABLE (default: Biglio-Chapters)
  BIGLIO_USERS_TABLE (default: Biglio-Users)
  S3_AUDIO_BUCKET (default: storage-audio-file)
  S3_STREAMING_BUCKET (default: biglio-streaming)
`);
  process.exit(0);
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = BiglioMigrator;
