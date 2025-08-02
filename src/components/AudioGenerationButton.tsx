'use client';

import { useState } from 'react';
import { FaPlay, FaSpinner, FaVolumeUp, FaDownload } from 'react-icons/fa';

interface AudioGenerationButtonProps {
  chapterId: string;
  chapterTitle: string;
  chapterContent: string;
  existingAudioUrl?: string;
  disabled?: boolean;
  onAudioGenerated?: (audioUrl: string) => void;
  className?: string;
}

export function AudioGenerationButton({
  chapterId,
  chapterTitle,
  chapterContent,
  existingAudioUrl,
  disabled = false,
  onAudioGenerated,
  className = ''
}: AudioGenerationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const generateAudio = async () => {
    if (!chapterContent.trim()) {
      setError('Chapter content is required to generate audio');
      return;
    }

    if (chapterContent.length > 7500) {
      setError('Chapter content exceeds 7,500 character limit for audio generation');
      return;
    }

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
          voice: 'female' // Default to female voice
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

  // Remove polling function since our API completes synchronously

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
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
    <div className={`space-y-3 ${className}`}>
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
                Generating...
              </>
            ) : (
              <>
                <FaVolumeUp size={16} />
                Generate Audio
              </>
            )}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={playAudio}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              <FaPlay size={16} />
              Play Audio
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
  );
}