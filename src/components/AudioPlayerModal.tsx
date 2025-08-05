'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { 
  FaPlay, 
  FaPause, 
  FaForward, 
  FaBackward, 
  FaVolumeUp, 
 
  FaTimes,
  FaList
} from 'react-icons/fa';
import SocialActions from '@/components/SocialActions';
import Comments from '@/components/Comments';
import FollowButton from '@/components/FollowButton';

interface Book {
  id: string;
  title: string;
  description: string;
  cover_url?: string;
  total_chapters: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  channel: {
    id: string;
    user_id: string;
    handle: string;
    display_name: string;
    avatar_url?: string;
    follower_count: number;
  };
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

interface AudioPlayerModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AudioPlayerModal({ book, isOpen, onClose }: AudioPlayerModalProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const supabase = createClient();

  const fetchChapters = useCallback(async () => {
    if (!book) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('biglio_id', book.id)
        .order('chapter_number', { ascending: true });

      if (error) throw error;

      const chapters = (data as unknown as Chapter[]) || [];
      setChapters(chapters);
      
      console.log(`🎵 AudioPlayerModal: Loaded ${chapters.length} chapters for "${book.title}"`);
      console.log('📋 Chapter details:', chapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        number: ch.chapter_number,
        hasAudio: !!ch.audio_url,
        audioUrl: ch.audio_url,
        duration: ch.duration_seconds
      })));
      
      // Auto-select first chapter with audio
      const firstChapterWithAudio = chapters?.find(ch => ch.audio_url);
      if (firstChapterWithAudio) {
        console.log('🎯 Auto-selecting first chapter with audio:', firstChapterWithAudio.title);
        setCurrentChapter(firstChapterWithAudio);
      } else {
        console.log('⚠️ No chapters with audio found');
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setIsLoading(false);
    }
  }, [book, supabase]);

  const playChapter = useCallback((chapter: Chapter) => {
    if (!chapter.audio_url) return;
    
    setCurrentChapter(chapter);
    setIsPlaying(false);
    
    // Small delay to ensure audio src is updated
    setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.load();
        audio.play().then(() => setIsPlaying(true));
      }
    }, 100);
  }, []);

  const playNextChapter = useCallback(() => {
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter?.id);
    const nextChapter = chapters[currentIndex + 1];
    if (nextChapter) {
      playChapter(nextChapter);
    }
  }, [chapters, currentChapter, playChapter]);

  useEffect(() => {
    if (book && isOpen) {
      fetchChapters();
    }
  }, [book, isOpen, fetchChapters]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNextChapter();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentChapter, playNextChapter]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentChapter?.audio_url) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playPreviousChapter = () => {
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter?.id);
    const prevChapter = chapters[currentIndex - 1];
    if (prevChapter) {
      playChapter(prevChapter);
    }
  };

  const seekTo = (percentage: number) => {
    const audio = audioRef.current;
    if (audio && duration) {
      audio.currentTime = (percentage / 100) * duration;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    // TODO: API call to update like status
  };

  const toggleSave = () => {
    setIsSaved(!isSaved);
    // TODO: API call to update save status
  };

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white w-full md:max-w-4xl md:rounded-lg max-h-[95vh] md:max-h-[90vh] overflow-hidden shadow-2xl md:m-4">
        {/* Mobile-First Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              {book.cover_url ? (
                <Image 
                  src={book.cover_url} 
                  alt={book.title}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg md:text-xl">
                  {book.title.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{book.title}</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm md:text-base text-gray-600 truncate">by @{book.channel.handle}</p>
                <FollowButton channel={book.channel} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Chapter List Toggle (Mobile) */}
            <button
              onClick={() => setShowChapterList(!showChapterList)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              <FaList className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <FaTimes className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Main Player */}
          <div className="flex-1 p-4 md:p-6">
            {/* Current Chapter Info */}
            {currentChapter && (
              <div className="mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1 md:mb-2">
                  {currentChapter.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  Chapter {currentChapter.chapter_number} of {chapters.length}
                </p>
              </div>
            )}

            {/* Mobile-Optimized Audio Player Controls */}
            <div className="bg-gray-50 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
              {/* Progress Bar - Bigger touch target on mobile */}
              <div className="mb-4 md:mb-4">
                <div 
                  className="w-full h-3 md:h-2 bg-gray-200 rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                    seekTo(percentage);
                  }}
                >
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Mobile-Optimized Playback Controls */}
              <div className="flex items-center justify-center gap-6 md:gap-4 mb-4">
                <button
                  onClick={playPreviousChapter}
                  disabled={!currentChapter || chapters.findIndex(ch => ch.id === currentChapter.id) === 0}
                  className="p-4 md:p-3 text-gray-600 hover:text-gray-800 disabled:text-gray-300 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <FaBackward className="w-6 h-6 md:w-5 md:h-5" />
                </button>
                
                <button
                  onClick={togglePlayPause}
                  disabled={!currentChapter?.audio_url}
                  className="p-5 md:p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:bg-gray-300 shadow-lg"
                >
                  {isPlaying ? <FaPause className="w-7 h-7 md:w-6 md:h-6" /> : <FaPlay className="w-7 h-7 md:w-6 md:h-6 ml-1" />}
                </button>
                
                <button
                  onClick={playNextChapter}
                  disabled={!currentChapter || chapters.findIndex(ch => ch.id === currentChapter.id) === chapters.length - 1}
                  className="p-4 md:p-3 text-gray-600 hover:text-gray-800 disabled:text-gray-300 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <FaForward className="w-6 h-6 md:w-5 md:h-5" />
                </button>
              </div>

              {/* Volume Control - Hidden on mobile for space */}
              <div className="hidden md:flex items-center gap-2">
                <FaVolumeUp className="text-gray-600" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    if (audioRef.current) {
                      audioRef.current.volume = newVolume;
                    }
                  }}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Social Actions */}
            <div className="mb-4 md:mb-6">
              <SocialActions 
                book={book}
                onCommentClick={() => setShowComments(!showComments)}
                size="md"
                className="justify-center"
              />
            </div>

            {/* Comments Section */}
            {showComments && (
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="font-semibold text-lg mb-4">Comments</h3>
                <Comments book={book} />
              </div>
            )}

            {/* No Audio Message */}
            {!currentChapter?.audio_url && (
              <div className="text-center py-6 md:py-8 text-gray-500">
                <p className="text-sm md:text-base">No audio available for this chapter yet.</p>
                <p className="text-xs md:text-sm mt-2">Audio generation may still be in progress.</p>
              </div>
            )}
          </div>

          {/* Chapter List - Responsive */}
          <div className={`${showChapterList ? 'block' : 'hidden'} md:block w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-200 bg-gray-50`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaList className="text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Chapters</h4>
                </div>
                <button
                  onClick={() => setShowChapterList(false)}
                  className="md:hidden text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="max-h-64 md:max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading chapters...</div>
              ) : chapters.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No chapters available</div>
              ) : (
                chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    onClick={() => {
                      if (chapter.audio_url) {
                        playChapter(chapter);
                        setShowChapterList(false); // Close on mobile after selection
                      }
                    }}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${
                      currentChapter?.id === chapter.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${!chapter.audio_url ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <h5 className="font-medium text-gray-900 text-sm mb-1">
                      {chapter.title}
                    </h5>
                    <p className="text-xs text-gray-500">
                      Chapter {chapter.chapter_number}
                      {chapter.audio_url ? (
                        chapter.duration_seconds > 0 ? 
                          ` • ${formatTime(chapter.duration_seconds)}` : 
                          ' • Ready'
                      ) : ' • No audio'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        {currentChapter?.audio_url && (
          <audio
            ref={audioRef}
            src={currentChapter.audio_url}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setDuration(audioRef.current.duration);
                audioRef.current.volume = volume;
              }
            }}
          />
        )}
      </div>
    </div>
  );
}