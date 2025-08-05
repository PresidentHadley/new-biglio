'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { 
  FaPlay, 
  FaPause, 
  FaChevronDown, 
  FaChevronRight, 
  FaBook,
  FaClock,
  FaHeadphones,
  FaEllipsisV,
  FaRocket,
  FaCheck
} from 'react-icons/fa';

interface Book {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  channel_id: string;
  chapter_count: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
  is_published: boolean;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapter_number: number;
  audio_url?: string;
  duration_seconds: number;
  is_published: boolean;
}

interface AudioBookListProps {
  books: Book[];
  isOwner: boolean;
}

export function AudioBookList({ books, isOwner }: AudioBookListProps) {
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const [playingChapter, setPlayingChapter] = useState<string | null>(null);
  const [bookChapters, setBookChapters] = useState<Record<string, Chapter[]>>({});
  const [loadingChapters, setLoadingChapters] = useState<Record<string, boolean>>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<Record<string, number>>({});
  const [publishingBooks, setPublishingBooks] = useState<Record<string, boolean>>({});
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const supabase = createClient();

  // Debug logging
  console.log('📚 AudioBookList received books:', books);
  console.log('👤 isOwner:', isOwner);
  
  // Debug specific book chapter count issue
  books.forEach(book => {
    console.log(`📖 Book "${book.title}": shows ${book.chapter_count} chapters, total_duration: ${book.total_duration}s`);
  });

  // Fetch chapters for a book
  const fetchChapters = useCallback(async (bookId: string) => {
    if (bookChapters[bookId] || loadingChapters[bookId]) return;
    
    console.log('🔍 Fetching chapters for book:', bookId);
    
    try {
      setLoadingChapters(prev => ({ ...prev, [bookId]: true }));
      
      const { data, error } = await supabase
        .from('chapters')
        .select('id, title, content, chapter_number, audio_url, duration_seconds, is_published')
        .eq('biglio_id', bookId)
        // .eq('is_published', true) // Temporarily disabled to debug
        .order('chapter_number', { ascending: true });

      console.log('📖 Chapters query result:', { data, error });

      if (error) throw error;

      const chaptersWithAudio = (data as Chapter[])?.filter(ch => ch.audio_url);
      console.log('🎵 Chapters with audio:', chaptersWithAudio);

      setBookChapters(prev => ({
        ...prev,
        [bookId]: (data as Chapter[]) || []
      }));
    } catch (error) {
      console.error('❌ Error fetching chapters:', error);
    } finally {
      setLoadingChapters(prev => ({ ...prev, [bookId]: false }));
    }
  }, [supabase, bookChapters, loadingChapters]);

  const toggleBookExpansion = (bookId: string) => {
    const willExpand = !expandedBooks[bookId];
    
    console.log('📂 Toggling book expansion:', { bookId, willExpand });
    
    setExpandedBooks(prev => ({
      ...prev,
      [bookId]: willExpand
    }));

    // Fetch chapters when expanding
    if (willExpand) {
      console.log('🚀 Will fetch chapters for:', bookId);
      fetchChapters(bookId);
    }
  };

  const handlePlayChapter = useCallback((chapter: Chapter) => {
    if (!chapter.audio_url) return;
    
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (playingChapter === chapter.id) {
      setPlayingChapter(null);
    } else {
      setPlayingChapter(chapter.id);
      
      // Set up new audio
      if (audioRef.current) {
        audioRef.current.src = chapter.audio_url;
        audioRef.current.load();
        audioRef.current.play().catch(console.error);
      }
    }
  }, [playingChapter]);

  const togglePlaybackSpeed = (chapterId: string) => {
    const currentSpeed = playbackSpeed[chapterId] || 1;
    const newSpeed = currentSpeed === 1 ? 1.5 : currentSpeed === 1.5 ? 2 : 1;
    
    setPlaybackSpeed(prev => ({
      ...prev,
      [chapterId]: newSpeed
    }));
    
    if (audioRef.current && playingChapter === chapterId) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setPlayingChapter(prevId => prevId);
    const handlePause = () => setPlayingChapter(null);
    const handleEnded = () => setPlayingChapter(null);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if a book is ready to publish (all chapters have audio)
  const isBookReadyToPublish = (bookId: string) => {
    const chapters = bookChapters[bookId];
    if (!chapters || chapters.length === 0) return false;
    return chapters.every(ch => ch.audio_url && ch.audio_url.trim() !== '');
  };

  // Check if book is ready to publish by loading chapters if needed
  const checkBookReadinessAndPublish = async (bookId: string, bookTitle: string) => {
    let chapters = bookChapters[bookId];
    
    // If chapters not loaded, fetch them directly
    if (!chapters || chapters.length === 0) {
      console.log('📚 Loading chapters to check readiness...', bookId);
      try {
        const { data, error } = await supabase
          .from('chapters')
          .select('id, title, content, chapter_number, audio_url, duration_seconds, is_published')
          .eq('biglio_id', bookId)
          .order('chapter_number', { ascending: true });

        if (error) {
          console.error('❌ Error loading chapters for publish check:', error);
          alert('Failed to load chapters. Please try again.');
          return;
        }

        chapters = (data as Chapter[]) || [];
        
        // Update local state
        setBookChapters(prev => ({
          ...prev,
          [bookId]: chapters || []
        }));

        console.log(`📋 Loaded ${chapters?.length || 0} chapters for readiness check`);
      } catch (err) {
        console.error('❌ Error fetching chapters:', err);
        alert('Failed to load chapters. Please try again.');
        return;
      }
    }

    // Now check if all chapters have audio
    if (!chapters || chapters.length === 0) {
      alert('⚠️ This book has no chapters yet.\n\nAdd some chapters with content and generate audio before publishing.');
      return;
    }

    const chaptersWithAudio = chapters.filter(ch => ch.audio_url && ch.audio_url.trim() !== '');
    const totalChapters = chapters.length;

    console.log(`🎵 Audio check: ${chaptersWithAudio.length}/${totalChapters} chapters have audio`);

    if (chaptersWithAudio.length === totalChapters) {
      // All good, proceed with publishing
      handlePublishBook(bookId, bookTitle);
    } else {
      const missingCount = totalChapters - chaptersWithAudio.length;
      alert(`⚠️ This book cannot be published yet.\n\n${missingCount} out of ${totalChapters} chapters still need audio generation.\n\nGenerate audio for all chapters before publishing to the main feed.`);
    }
  };

  // Handle publishing a book to the main feed
  const handlePublishBook = async (bookId: string, bookTitle: string) => {
    if (!isOwner || publishingBooks[bookId]) return;
    
    setPublishingBooks(prev => ({ ...prev, [bookId]: true }));
    
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
      
      // Show success message
      alert(`🎉 Success! "${bookTitle}" is now live on the main feed!\n\nPublished at: ${new Date(publishedAt).toLocaleString()}`);
      
      // Trigger a page refresh or update the books list
      window.location.reload();
      
    } catch (err) {
      console.error('❌ Error publishing book:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setPublishingBooks(prev => ({ ...prev, [bookId]: false }));
    }
  };

  if (books.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <FaBook className="text-3xl text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {isOwner ? 'No books yet' : 'No published books'}
        </h3>
        <p className="text-gray-600 mb-6">
          {isOwner 
            ? 'Start creating your first audiobook to share with the world.'
            : 'This creator hasn&apos;t published any books yet. Check back later!'
          }
        </p>
        {isOwner && (
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create Your First Book
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Audiobooks ({books.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FaHeadphones className="text-blue-500" />
          <span>Click to play</span>
        </div>
      </div>

      <div className="grid gap-6">
        {books.map((book) => (
          <div key={book.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Book Header */}
            <div className="p-6">
              <div className="flex items-start gap-6">
                
                {/* Cover Image */}
                <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                  <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                        <FaBook className="text-white text-2xl md:text-3xl" />
                      </div>
                    )}
                  </div>
                  
                  {/* Play Button Overlay */}
                  <button
                    onClick={() => {
                      // Play first chapter of this book
                      const chapters = bookChapters[book.id];
                      const firstChapterWithAudio = chapters?.find(ch => ch.audio_url);
                      if (firstChapterWithAudio) {
                        handlePlayChapter(firstChapterWithAudio);
                      } else {
                        // If no chapters loaded yet, expand the book first
                        toggleBookExpansion(book.id);
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                  >
                    {bookChapters[book.id]?.some(ch => playingChapter === ch.id) ? (
                      <FaPause className="text-white text-xl" />
                    ) : (
                      <FaPlay className="text-white text-xl ml-1" />
                    )}
                  </button>
                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {book.title}
                        </h3>
                        {!book.is_published && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            DRAFT
                          </span>
                        )}
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FaBook className="text-blue-500" />
                          <span>{book.chapter_count} chapters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaClock className="text-green-500" />
                          <span>{formatDuration(book.total_duration)}</span>
                        </div>
                        <div className="text-gray-500">
                          {formatDate(book.created_at)}
                        </div>
                      </div>

                      {/* Description */}
                      {book.description && (
                        <p className="mt-3 text-gray-700 leading-relaxed line-clamp-3">
                          {book.description}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      {/* Publish Button - Only show for owner and unpublished books */}
                      {isOwner && !book.is_published && (
                        <button
                          onClick={() => {
                            checkBookReadinessAndPublish(book.id, book.title);
                          }}
                          disabled={publishingBooks[book.id]}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {publishingBooks[book.id] ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Publishing...</span>
                            </>
                          ) : (
                            <>
                              <FaRocket className="text-xs" />
                              <span>Publish</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Published Status Badge */}
                      {book.is_published && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <FaCheck className="text-xs" />
                          <span>Published</span>
                        </div>
                      )}

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleBookExpansion(book.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        {expandedBooks[book.id] ? (
                          <>
                            <FaChevronDown className="text-xs" />
                            <span>Hide Chapters</span>
                          </>
                        ) : (
                          <>
                            <FaChevronRight className="text-xs" />
                            <span>Show Chapters ({book.chapter_count})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Chapters */}
            {expandedBooks[book.id] && (
              <div className="border-t border-gray-200 bg-gray-50">
                {loadingChapters[book.id] ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading chapters...</p>
                  </div>
                ) : bookChapters[book.id]?.length > 0 ? (
                  <div className="space-y-0">
                    {bookChapters[book.id].map((chapter) => (
                      <div key={chapter.id} className="flex items-center gap-4 p-4 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0">
                        
                        {/* Play Button */}
                        <button
                          onClick={() => handlePlayChapter(chapter)}
                          className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors flex-shrink-0"
                          disabled={!chapter.audio_url}
                        >
                          {playingChapter === chapter.id ? (
                            <FaPause className="text-blue-600 text-sm" />
                          ) : (
                            <FaPlay className="text-gray-600 text-sm ml-0.5" />
                          )}
                        </button>

                        {/* Chapter Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            Chapter {chapter.chapter_number}: {chapter.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>

                        {/* Duration */}
                        <div className="text-sm text-gray-600 flex-shrink-0">
                          {formatTime(chapter.duration_seconds)}
                        </div>

                        {/* Playback Speed */}
                        <button
                          onClick={() => togglePlaybackSpeed(chapter.id)}
                          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors flex-shrink-0"
                        >
                          {playbackSpeed[chapter.id] || 1}x
                        </button>

                        {/* Menu Button */}
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                          <FaEllipsisV className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <FaBook className="text-2xl mx-auto mb-2 text-gray-400" />
                    <p>No chapters available</p>
                    <p className="text-sm mt-1">Chapters will appear here once they&apos;re published</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={() => {
          if (audioRef.current && playingChapter) {
            const speed = Object.values(playbackSpeed).find(s => s) || 1;
            audioRef.current.playbackRate = speed;
          }
        }}
      />
    </div>
  );
}