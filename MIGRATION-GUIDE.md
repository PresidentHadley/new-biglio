# 🚀 Biglio V1 to V2 Migration Guide

This guide helps you migrate your existing AWS-based Biglio data to the new Supabase-based system.

## 📋 What Gets Migrated

- ✅ **Users** → Supabase `users` table
- ✅ **Books** → Supabase `biglios` table  
- ✅ **Chapters** → Supabase `chapters` table
- ✅ **Audio Files** → Supabase Storage
- ✅ **Metadata** (titles, descriptions, timestamps)

## 🛠️ Prerequisites

### 1. Environment Setup
Create `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. AWS Configuration
Your AWS CLI should be configured with access to:
- DynamoDB tables: `Biglio-Books`, `Biglio-Chapters`, `Biglio-Users`  
- S3 bucket(s): `storage-audio-file` (or your custom bucket)

### 3. Dependencies
```bash
npm install aws-sdk @supabase/supabase-js dotenv
```

## 🎯 Migration Options

### Option 1: Quick Metadata Migration (Recommended First)
Migrate just the data structure without audio files:

```bash
# Test run first
node quick-migration.js --dry-run

# Migrate all data
node quick-migration.js

# Migrate specific user only
node quick-migration.js --user=abc123
```

### Option 2: Audio File Migration
After metadata migration, transfer your audio files:

```bash
# Check what files exist
node audio-migration.js --dry-run

# Migrate all audio files
node audio-migration.js

# Specify custom bucket
node audio-migration.js --bucket=your-bucket-name
```

### Option 3: Full Migration (Advanced)
Complete migration including audio files:

```bash
# Test everything first
node migration-script.js --dry-run

# Full migration
node migration-script.js

# Skip audio if needed
node migration-script.js --skip-audio
```

## 📊 Understanding Your Old Data Structure

The migration scripts will automatically detect your DynamoDB table structure. Based on the Lambda functions found, your data likely looks like:

### Books Table (`Biglio-Books`)
```json
{
  "bookId": "unique_book_id",
  "userId": "user_id", 
  "title": "Book Title",
  "summary": "Book description",
  "blurb": "Marketing copy",
  "chapterCount": 5,
  "isPublished": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Chapters Table (`Biglio-Chapters`)
```json
{
  "chapterId": "unique_chapter_id",
  "bookId": "parent_book_id",
  "title": "Chapter Title", 
  "content": "Chapter text content",
  "chapterNumber": 1,
  "audioUrl": "https://s3.amazonaws.com/...",
  "duration": 300,
  "isPublished": true
}
```

## 🔄 How The Migration Works

### Data Mapping
```
Old AWS System          →    New Supabase System
─────────────────────────────────────────────────
DynamoDB Users          →    users table
DynamoDB Books          →    biglios table  
DynamoDB Chapters       →    chapters table
S3 Audio Files          →    Supabase Storage
```

### New Structure Created
For each user in your old system:
1. **User record** in `users` table
2. **Primary channel** in `channels` table (handle: `user_timestamp_random`)
3. **Biglios** linked to the channel
4. **Chapters** with original content + audio URLs

## 🚨 Important Notes

### Before Migration
- ✅ **Test with `--dry-run`** first
- ✅ **Backup your current data** 
- ✅ **Verify Supabase schema** is deployed
- ✅ **Check AWS permissions** for DynamoDB/S3 access

### During Migration
- 📊 **Monitor progress** in the console output
- ⏱️ **Be patient** - audio files take time to transfer
- 🔄 **Can be resumed** if interrupted (checks for existing data)

### After Migration
- 🧪 **Test your migrated data** in the new app
- 🎵 **Verify audio playback** works correctly
- 👥 **Create proper channel handles** (auto-generated ones are temporary)
- 🔐 **Set up authentication** for users to access their content

## 🐛 Troubleshooting

### Common Issues

**"Table not found"**
- Check your DynamoDB table names
- Verify AWS region configuration

**"Access denied"** 
- Ensure AWS CLI is configured
- Check IAM permissions for DynamoDB/S3

**"Supabase connection failed"**
- Verify `.env.local` has correct Supabase credentials
- Check if service role key has proper permissions

**"Audio files not found"**
- Verify S3 bucket name with `--bucket=your-bucket`
- Check if files exist with `--dry-run` first

### Getting Help
```bash
# Show detailed help for any script
node quick-migration.js --help
node audio-migration.js --help
node migration-script.js --help
```

## 📈 What's Next?

After successful migration:

1. **Test your content** in the new Biglio V2 app
2. **Set up authentication** (phone/email) for users
3. **Customize channel profiles** (handles, bios, avatars)
4. **Configure domain** when ready to switch
5. **Archive old AWS resources** once verified

## 🎉 Success!

Once migration is complete, you'll have:
- ✅ All your books preserved as "Biglios"
- ✅ All chapters with content intact
- ✅ Audio files accessible via new URLs
- ✅ User accounts ready for authentication
- ✅ Modern Instagram-style interface
- ✅ Real-time features (likes, comments, follows)

Your content is now ready for the Biglio V2 experience! 🚀
