# 🎵 Audio Generation Setup Guide

## 📋 **Database Setup**

### 1. Create Audio Jobs Table
Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of setup-audio-tables.sql
```

### 2. Create Storage Bucket
In Supabase Dashboard → Storage:

1. **Create bucket**: `audio-files`
2. **Set to Public**: ✅ (so audio URLs work)
3. **File size limit**: 50MB (for audio files)

### 3. Storage Policies
Add these policies in Storage → audio-files → Policies:

```sql
-- Allow authenticated users to upload audio
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-files');

-- Allow public access to audio files  
CREATE POLICY "Public can view audio files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-files');

-- Allow users to delete their own audio
CREATE POLICY "Users can delete their own audio" 
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-files');
```

## 🔧 **Environment Variables**

Make sure these are set in `.env.local`:

```bash
# Google TTS (already configured)
GOOGLE_CLOUD_PROJECT=biglio-tts
GOOGLE_APPLICATION_CREDENTIALS={...your credentials...}

# Supabase (already configured)
SUPABASE_SERVICE_ROLE_KEY={...your service key...}
```

## 🧪 **Testing the Audio Generation**

### 1. Test the API directly:
```bash
curl -X POST http://localhost:3000/api/audio/generate \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "test-chapter-id",
    "text": "Hello, this is a test of the audio generation system.",
    "voice": "female"
  }'
```

### 2. Test in the UI:
1. Go to book editor
2. Add content to a chapter (under 7500 chars)  
3. Click the 🎵 icon or "Generate Audio" button
4. Watch for progress indicators
5. Audio should appear with play/download options

## 🚀 **What This Enables**

✅ **High-quality TTS** with Google's latest voices  
✅ **Chunk processing** for long content  
✅ **Supabase storage** for fast audio delivery  
✅ **Progress tracking** with audio_jobs table  
✅ **Error handling** and retry capabilities  
✅ **7500 character limits** for optimal quality and cost  

## 🎯 **Voice Options**

- **Female**: `en-US-Chirp3-HD-Aoede` (default)
- **Male**: `en-US-Chirp3-HD-Umbriel`

Both are high-definition Google Chirp voices optimized for audiobooks!