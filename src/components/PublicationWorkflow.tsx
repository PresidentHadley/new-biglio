'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { FaCheck, FaExclamationTriangle, FaEye, FaClock, FaPlay } from 'react-icons/fa';

interface Chapter {
  id: string;
  title: string;
  content: string;
  audio_url?: string;
  audio_status: 'none' | 'generating' | 'ready' | 'failed';
  duration_seconds?: number;
}

interface PublicationWorkflowProps {
  bookId: string;
  currentStatus: 'draft' | 'review' | 'published' | 'archived';
  onStatusChange: (newStatus: string) => void;
}

export function PublicationWorkflow({ bookId, currentStatus, onStatusChange }: PublicationWorkflowProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchChapters = async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, title, content, audio_url, audio_status, duration_seconds')
        .eq('biglio_id', bookId)
        .order('order_index');

      if (!error && data) {
        setChapters(data as unknown as Chapter[]);
      }
      setLoading(false);
    };

    fetchChapters();
  }, [bookId, supabase]);

  const allChaptersHaveAudio = chapters.length > 0 && chapters.every(ch => ch.audio_url && ch.audio_status === 'ready');
  const someChaptersGenerating = chapters.some(ch => ch.audio_status === 'generating');
  const hasFailedChapters = chapters.some(ch => ch.audio_status === 'failed');

  const handlePublish = async () => {
    if (!allChaptersHaveAudio) return;

    setPublishing(true);
    try {
      console.log('🚀 Publishing book to main feed...', bookId);
      
      const publishedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('biglios')
        .update({
          is_published: true,
          published_at: publishedAt
        })
        .eq('id', bookId)
        .select();

      if (error) {
        console.error('❌ Error publishing book:', error);
        alert('Failed to publish book. Please try again.');
        return;
      }

      console.log('✅ Book published successfully:', data);
      
      // Verify the book is actually published
      const { data: verifyData } = await supabase
        .from('biglios')
        .select('id, title, is_published, published_at')
        .eq('id', bookId)
        .single();
        
      console.log('🔍 Verification - Book status after publish:', verifyData);
      
      onStatusChange('published');
      
      // Show success message
      alert(`🎉 Success! Your book is now live on the main feed!\n\nPublished at: ${new Date(publishedAt).toLocaleString()}`);
      
    } catch (err) {
      console.error('❌ Error publishing book:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleRequestReview = async () => {
    setPublishing(true);
    try {
      const { error } = await supabase
        .from('biglios')
        .update({ publication_status: 'review' })
        .eq('id', bookId);

      if (!error) {
        onStatusChange('review');
      }
    } catch (err) {
      console.error('Error requesting review:', err);
    } finally {
      setPublishing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <FaCheck className="text-green-500" />;
      case 'generating': return <FaClock className="text-yellow-500 animate-spin" />;
      case 'failed': return <FaExclamationTriangle className="text-red-500" />;
      default: return <FaExclamationTriangle className="text-gray-400" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'No audio';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Publication Status</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          currentStatus === 'published' ? 'bg-green-100 text-green-800' :
          currentStatus === 'review' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </div>
      </div>

      {/* Audio Generation Status */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Audio Generation Status</h4>
        <div className="space-y-2">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(chapter.audio_status)}
                <span className="text-sm text-gray-700 truncate max-w-xs">
                  {chapter.title || 'Untitled Chapter'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatDuration(chapter.duration_seconds)}</span>
                {chapter.audio_url && (
                  <FaPlay className="text-blue-500 cursor-pointer hover:text-blue-700" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <FaEye className="text-blue-600" />
          <span className="font-medium text-blue-900">Ready for Publication?</span>
        </div>
        
        {allChaptersHaveAudio ? (
          <p className="text-sm text-green-700">
            ✅ All {chapters.length} chapters have audio generated and are ready for publication!
          </p>
        ) : someChaptersGenerating ? (
          <p className="text-sm text-yellow-700">
            ⏳ Audio generation in progress for some chapters. Please wait for completion.
          </p>
        ) : hasFailedChapters ? (
          <p className="text-sm text-red-700">
            ❌ Some chapters failed to generate audio. Please retry audio generation.
          </p>
        ) : (
          <p className="text-sm text-gray-700">
            📝 {chapters.filter(ch => !ch.audio_url).length} chapters still need audio generation.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {currentStatus === 'draft' && allChaptersHaveAudio && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? 'Publishing...' : 'Publish to Feed'}
          </button>
        )}
        
        {currentStatus === 'draft' && !allChaptersHaveAudio && (
          <button
            onClick={handleRequestReview}
            disabled={publishing || chapters.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? 'Saving...' : 'Save for Review'}
          </button>
        )}

        {currentStatus === 'published' && (
          <div className="text-sm text-green-600 flex items-center gap-1">
            <FaCheck />
            <span>Live on the feed!</span>
          </div>
        )}
      </div>
    </div>
  );
}