// Test script for the new audio generation API
// Run with: node test-audio-api.js

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testAudioGeneration() {
  console.log('🎵 Testing Audio Generation API...\n');

  try {
    const response = await fetch(`${API_BASE}/api/audio/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello! This is a test of our new audio generation system. It should create high-quality speech using Google Text-to-Speech.',
        voiceId: 'en-US-Chirp3-HD-Umbriel',
        chapterId: 'test-chapter-id',
        biglioId: 'test-biglio-id'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', error);
      return;
    }

    const result = await response.json();
    console.log('✅ Audio generation result:', result);

    if (result.audioUrl) {
      console.log('\n🎧 Audio file created at:', result.audioUrl);
      console.log('📊 Job ID:', result.jobId);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Server is running on port 3000');
    console.log('   - Database is set up with setup-audio-database.sql');
    console.log('   - Environment variables are configured');
  }
}

testAudioGeneration();