'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaPlay, FaPause, FaHeart, FaComment, FaBookmark } from 'react-icons/fa';

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  duration_seconds: number;
  audio_url?: string;
  is_published: boolean;
}

interface Book {
  id: string;
  title: string;
  description: string;
  total_chapters: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  published_at: string;
  channel: {
    handle: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface BookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookModal({ book, isOpen, onClose }: BookModalProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const loadChapters = async () => {
      setLoading(true);
      try {
        // TODO: Implement chapter loading from Supabase
        // For now, show placeholder data
        const mockChapters: Chapter[] = Array.from({ length: book.total_chapters }, (_, i) => ({
          id: `chapter-${i + 1}`,
          title: `Chapter ${i + 1}`,
          chapter_number: i + 1,
          duration_seconds: 1200 + Math.random() * 600,
          is_published: true
        }));
        setChapters(mockChapters);
      } catch (error) {
        console.error('Error loading chapters:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && book) {
      loadChapters();
    }
  }, [isOpen, book]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const playChapter = (chapter: Chapter) => {
    setCurrentChapter(chapter);
    setIsPlaying(true);
    // TODO: Implement actual audio playback
    console.log('Playing chapter:', chapter.title);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual play/pause
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-700">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">{book.title}</h1>
            <p className="text-gray-300 mb-4">{book.description}</p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>@{book.channel.handle}</span>
              <span>•</span>
              <span>{formatTimeAgo(book.published_at)}</span>
              <span>•</span>
              <span>{book.total_chapters} chapters</span>
            </div>
            
            <div className="flex items-center space-x-6 mt-4">
              <button className="flex items-center space-x-2 text-red-400 hover:text-red-300">
                <FaHeart className="w-4 h-4" />
                <span>{book.like_count}</span>
              </button>
              <button className="flex items-center space-x-2 text-blue-400 hover:text-blue-300">
                <FaComment className="w-4 h-4" />
                <span>{book.comment_count}</span>
              </button>
              <button className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300">
                <FaBookmark className="w-4 h-4" />
                <span>{book.save_count}</span>
              </button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white ml-4"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Audio Player */}
        {currentChapter && (
          <div className="p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlayPause}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full"
              >
                {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
              </button>
              <div className="flex-1">
                <div className="text-white font-medium">{currentChapter.title}</div>
                <div className="text-gray-400 text-sm">
                  Duration: {formatDuration(currentChapter.duration_seconds)}
                </div>
              </div>
            </div>
            
            {/* Progress Bar Placeholder */}
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
              <div className="bg-indigo-600 h-2 rounded-full w-1/3"></div>
            </div>
          </div>
        )}

        {/* Chapters List */}
        <div className="p-6 overflow-y-auto max-h-96">
          <h3 className="text-lg font-semibold text-white mb-4">Chapters</h3>
          
          {loading ? (
            <div className="text-center text-gray-400">Loading chapters...</div>
          ) : (
            <div className="space-y-3">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    currentChapter?.id === chapter.id
                      ? 'bg-indigo-900 border border-indigo-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  onClick={() => playChapter(chapter)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-indigo-400 font-mono text-sm">
                      {chapter.chapter_number.toString().padStart(2, '0')}
                    </div>
                    <div>
                      <div className="text-white font-medium">{chapter.title}</div>
                      <div className="text-gray-400 text-sm">
                        {formatDuration(chapter.duration_seconds)}
                      </div>
                    </div>
                  </div>
                  
                  <button className="text-indigo-400 hover:text-indigo-300">
                    <FaPlay className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}