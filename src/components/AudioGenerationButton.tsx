'use client';

import { useState } from 'react';
import { FaPlay, FaSpinner, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { useAudioJobs } from '@/hooks/useAudioJobs';

interface AudioGenerationButtonProps {
  chapterId: string;
  text: string;
  voice?: 'male' | 'female';
  onSuccess?: (audioUrl: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function AudioGenerationButton({
  chapterId,
  text,
  voice = 'female',
  onSuccess,
  onError,
  className = ''
}: AudioGenerationButtonProps) {
  const { generateAudio, getLatestJob, loading } = useAudioJobs(chapterId);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const latestJob = getLatestJob();
  
  const handleGenerate = async () => {
    if (!text.trim()) {
      const error = 'No text provided for audio generation';
      onError?.(error);
      return;
    }

    setIsGenerating(true);
    
    try {
      const result = await generateAudio(text, voice);
      
      if (result.audio_url) {
        onSuccess?.(result.audio_url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audio generation failed';
      onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonContent = () => {
    if (isGenerating || loading) {
      return (
        <>
          <FaSpinner className="w-4 h-4 animate-spin" />
          <span>Generating Audio...</span>
        </>
      );
    }

    if (latestJob) {
      switch (latestJob.status) {
        case 'processing':
          return (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          );
        case 'completed':
          return (
            <>
              <FaCheck className="w-4 h-4 text-green-400" />
              <span>Audio Ready</span>
            </>
          );
        case 'failed':
          return (
            <>
              <FaExclamationTriangle className="w-4 h-4 text-red-400" />
              <span>Generation Failed</span>
            </>
          );
        default:
          return (
            <>
              <FaPlay className="w-4 h-4" />
              <span>Generate Audio</span>
            </>
          );
      }
    }

    return (
      <>
        <FaPlay className="w-4 h-4" />
        <span>Generate Audio</span>
      </>
    );
  };

  const getButtonColor = () => {
    if (latestJob?.status === 'completed') {
      return 'bg-green-600 hover:bg-green-700';
    }
    if (latestJob?.status === 'failed') {
      return 'bg-red-600 hover:bg-red-700';
    }
    if (isGenerating || loading || latestJob?.status === 'processing') {
      return 'bg-gray-600 cursor-not-allowed';
    }
    return 'bg-indigo-600 hover:bg-indigo-700';
  };

  const isDisabled = isGenerating || loading || latestJob?.status === 'processing' || !text.trim();

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={isDisabled}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium transition-colors
          ${getButtonColor()}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {getButtonContent()}
      </button>
      
      {/* Job Status Display */}
      {latestJob && (
        <div className="text-sm text-gray-400">
          {latestJob.status === 'processing' && (
            <div>Processing audio generation...</div>
          )}
          {latestJob.status === 'completed' && latestJob.duration_seconds && (
            <div>Duration: {Math.round(latestJob.duration_seconds / 60)}m {latestJob.duration_seconds % 60}s</div>
          )}
          {latestJob.status === 'failed' && latestJob.error_message && (
            <div className="text-red-400">Error: {latestJob.error_message}</div>
          )}
        </div>
      )}
    </div>
  );
}