'use client';

import { useState, useEffect } from 'react';
import { FaPlay, FaPause, FaSpinner, FaVolumeUp, FaDownload, FaMale, FaFemale } from 'react-icons/fa';

interface AudioGenerationButtonProps {
  chapterId: string;
  chapterTitle: string;
  chapterContent: string;
  bookId: string;
  bookVoicePreference?: 'male' | 'female' | null;
  existingAudioUrl?: string;
  disabled?: boolean;
  onAudioGenerated?: (audioUrl: string) => void;
  onVoicePreferenceSet?: (voice: 'male' | 'female') => void;
  className?: string;
}

export function AudioGenerationButton({
  chapterId,
  chapterTitle,
  chapterContent,
  bookId,
  bookVoicePreference,
  existingAudioUrl,
  disabled = false,
  onAudioGenerated,
  onVoicePreferenceSet,
  className = ''
}: AudioGenerationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Get the voice to use (book preference or default)
  const voiceToUse = bookVoicePreference || 'female';

  const generateAudio = async () => {
    if (!chapterContent.trim()) {
      setError('Chapter content is required to generate audio');
      return;
    }

    if (chapterContent.length > 7500) {
      setError('Chapter content exceeds 7,500 character limit for audio generation');
      return;
    }

    // If no voice preference is set for this book, show selection modal
    if (!bookVoicePreference) {
      setShowVoiceSelection(true);
      return;
    }

    await performAudioGeneration(voiceToUse);
  };

  const performAudioGeneration = async (voice: 'male' | 'female') => {
    setIsGenerating(true);
    setError(null);
    setProgress('Generating high-quality audio...');

    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterId,
          text: chapterContent,
          voice: voice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Audio generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setProgress('Audio generated successfully!');
        onAudioGenerated?.(data.audioUrl);
        
        // Clear progress after a delay
        setTimeout(() => setProgress(''), 3000);
      }
    } catch (err) {
      console.error('Error generating audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceSelection = async (voice: 'male' | 'female') => {
    try {
      // Save voice preference to the book
      const response = await fetch(`/api/books/${bookId}/voice-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voicePreference: voice })
      });

      if (!response.ok) {
        throw new Error('Failed to save voice preference');
      }

      // Notify parent component
      onVoicePreferenceSet?.(voice);
      
      // Close modal and proceed with audio generation
      setShowVoiceSelection(false);
      await performAudioGeneration(voice);
    } catch (err) {
      console.error('Error setting voice preference:', err);
      setError('Failed to save voice preference. Please try again.');
    }
  };

  // Global audio control - stop all other audio when starting new one
  useEffect(() => {
    return () => {
      // Cleanup: pause any playing audio when component unmounts
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const togglePlayPause = () => {
    if (!audioUrl) return;

    if (currentAudio && !currentAudio.paused) {
      // Currently playing - pause it
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      // Stop any other audio that might be playing globally
      const allAudioElements = document.querySelectorAll('audio');
      allAudioElements.forEach(audio => {
        if (!audio.paused) {
          audio.pause();
        }
      });

      // Create new audio or resume existing
      let audio = currentAudio;
      if (!audio) {
        audio = new Audio(audioUrl);
        setCurrentAudio(audio);
        
        // Set up event listeners
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
        });
        
        audio.addEventListener('error', (err) => {
          console.error('Error playing audio:', err);
          setError('Failed to play audio');
          setIsPlaying(false);
        });
      }

      // Play the audio
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
        setIsPlaying(false);
      });
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `${chapterTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      {/* Voice Selection Modal - One-time choice */}
      {showVoiceSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Voice for This Biglio</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will be used for all chapters in this biglio. You can change it later in book settings.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleVoiceSelection('female')}
                className="w-full flex items-center gap-3 p-4 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
              >
                <FaFemale className="text-pink-600" size={18} />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Female Voice</div>
                  <div className="text-sm text-gray-600">Warm, professional female narrator</div>
                </div>
              </button>
              
              <button
                onClick={() => handleVoiceSelection('male')}
                className="w-full flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FaMale className="text-blue-600" size={18} />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Male Voice</div>
                  <div className="text-sm text-gray-600">Deep, engaging male narrator</div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowVoiceSelection(false)}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-3 ${className}`}>
        {/* Voice Preference Display */}
        {bookVoicePreference && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs font-medium text-gray-600">Voice:</span>
            <div className="flex items-center gap-1">
              {bookVoicePreference === 'female' ? (
                <FaFemale className="text-pink-600" size={12} />
              ) : (
                <FaMale className="text-blue-600" size={12} />
              )}
              <span className="text-xs text-gray-700 capitalize">{bookVoicePreference}</span>
            </div>
          </div>
        )}

      {/* Main Action Button */}
      <div className="flex gap-2">
        {!audioUrl ? (
          <button
            onClick={generateAudio}
            disabled={disabled || isGenerating || !chapterContent.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
          >
            {isGenerating ? (
              <>
                <FaSpinner className="animate-spin" size={16} />
                Generating {voiceToUse} voice...
              </>
            ) : (
              <>
                <FaVolumeUp size={16} />
                Generate {voiceToUse === 'female' ? '👩' : '👨'} Audio
              </>
            )}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={togglePlayPause}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold transition-colors ${
                isPlaying 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isPlaying ? (
                <>
                  <FaPause size={16} />
                  Pause
                </>
              ) : (
                <>
                  <FaPlay size={16} />
                  Play
                </>
              )}
            </button>
            <button
              onClick={downloadAudio}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              <FaDownload size={16} />
              Download
            </button>
            <button
              onClick={generateAudio}
              disabled={disabled || isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
            >
              {isGenerating ? (
                <>
                  <FaSpinner className="animate-spin" size={16} />
                  Regenerating...
                </>
              ) : (
                <>
                  <FaVolumeUp size={16} />
                  Regenerate
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Progress/Status Messages */}
      {progress && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          {isGenerating && <FaSpinner className="animate-spin" size={14} />}
          {progress}
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Audio Info */}
      {audioUrl && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
          ✅ Audio available for &quot;{chapterTitle}&quot;
        </div>
      )}

        {/* Instructions */}
        {!audioUrl && !isGenerating && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            💡 Generate high-quality audio narration for this chapter using advanced text-to-speech technology. Audio will be optimized for audiobook listening.
          </div>
        )}
      </div>
    </>
  );
}