import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize Supabase client with service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Google TTS client
const ttsClient = new TextToSpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}')
});

// Voice mapping to match old AWS Lambda configuration
const voiceMap: { [key: string]: string } = {
  'male': 'en-US-Chirp3-HD-Umbriel',
  'female': 'en-US-Chirp3-HD-Aoede'
};

// Helper function to chunk text for TTS
function chunkText(text: string, maxLength: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence + '. ';
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence + '. ';
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// Main TTS function
async function performTextToSpeech(text: string, voice: string): Promise<Buffer> {
  const chunks = chunkText(text);
  const audioChunks: Buffer[] = [];
  
  for (const chunk of chunks) {
    const request = {
      input: { text: chunk },
      voice: { 
        languageCode: 'en-US', 
        name: voiceMap[voice] || voiceMap['female']
      },
      audioConfig: { 
        audioEncoding: 'MP3' as const,
        speakingRate: 1.0,
        pitch: 0.0
      }
    };
    
    const [response] = await ttsClient.synthesizeSpeech(request);
    if (response.audioContent) {
      audioChunks.push(Buffer.from(response.audioContent));
    }
  }
  
  return Buffer.concat(audioChunks);
}

export async function POST(request: NextRequest) {
  try {
    const { chapterId, text, voice = 'female' } = await request.json();
    
    if (!chapterId || !text) {
      return NextResponse.json(
        { error: 'Missing required parameters: chapterId, text' },
        { status: 400 }
      );
    }
    
    // Update audio job status to processing
    await supabase
      .from('audio_jobs')
      .upsert({
        chapter_id: chapterId,
        status: 'processing',
        started_at: new Date().toISOString()
      });
    
    // Generate audio using Google TTS
    const audioBuffer = await performTextToSpeech(text, voice);
    const audioFileName = `audio/${chapterId}.mp3`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(audioFileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(audioFileName);
    
    const audioUrl = urlData.publicUrl;
    const durationSeconds = Math.round(audioBuffer.length / 16000); // Rough estimate
    
    // Update chapter with audio URL and duration
    await supabase
      .from('chapters')
      .update({
        audio_url: audioUrl,
        duration_seconds: durationSeconds
      })
      .eq('id', chapterId);
    
    // Update audio job status to completed
    await supabase
      .from('audio_jobs')
      .update({
        status: 'completed',
        audio_url: audioUrl,
        duration_seconds: durationSeconds,
        completed_at: new Date().toISOString()
      })
      .eq('chapter_id', chapterId);
    
    return NextResponse.json({
      success: true,
      audioUrl,
      durationSeconds,
      message: 'Audio generated successfully'
    });
    
  } catch (error) {
    console.error('Audio generation error:', error);
    
    // Update audio job status to failed
    if (request.json) {
      const { chapterId } = await request.json().catch(() => ({}));
      if (chapterId) {
        await supabase
          .from('audio_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('chapter_id', chapterId);
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Audio generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}