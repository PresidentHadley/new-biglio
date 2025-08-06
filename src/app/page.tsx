'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaPlay, FaUser, FaSpinner, FaHeadphones } from 'react-icons/fa';
import { useBooks } from '@/hooks/useBooks';
import { AudioPlayerModal } from '@/components/AudioPlayerModal';

import SocialActions from '@/components/SocialActions';

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
  published_at: string;
  channel: {
    id: string;
    user_id: string;
    handle: string;
    display_name: string;
    avatar_url?: string;
    follower_count: number;
  };
}

export default function HomePage() {
  const { books, loading, error, refetch } = useBooks();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openBookModal = (book: Book) => {
    console.log('🎵 Opening audio player for book:', {
      id: book.id,
      title: book.title,
      total_chapters: book.total_chapters,
      channel: book.channel.handle
    });
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBook(null);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  return (
    <div className="min-h-screen bg-black pt-16">
      {/* Content now uses the fixed modern navbar from layout */}



      {/* Instagram-style Feed */}
      <main className="max-w-md mx-auto">
        {loading && (
          <div className="p-6 text-center">
            <div className="text-white flex items-center justify-center gap-2">
          <FaSpinner className="animate-spin" />
          Loading audiobooks from Supabase...
        </div>
            <div className="text-gray-400 text-sm mt-2">Connecting to database</div>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <div className="text-red-400 mb-2">Database Error:</div>
            <div className="text-gray-400 text-sm">{error}</div>
            <button 
              onClick={refetch}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Retry Connection
            </button>
          </div>
        )}

        {books.map((book) => (
          <div key={book.id} className="bg-black border-b border-gray-800">
            {/* Creator Header */}
            <div className="flex items-center px-4 py-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              <div className="ml-3">
                <p className="text-white font-semibold text-sm">@{book.channel.handle}</p>
                <p className="text-gray-400 text-xs">{formatTimeAgo(book.published_at)}</p>
              </div>
            </div>

            {/* Book Cover - Real Data */}
            <div 
              className="relative aspect-square cursor-pointer hover:scale-105 transition-transform overflow-hidden"
              onClick={() => {
                console.log(`📸 Book "${book.title}" cover_url:`, book.cover_url);
                openBookModal(book);
              }}
            >
              {book.cover_url ? (
                // Real book cover
                <>
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    fill
                    className="object-cover z-0"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {/* Title overlay with black background */}
                  <div className="absolute bottom-0 left-0 right-0 z-10">
                    <div className="bg-black bg-opacity-75 backdrop-blur-sm p-3">
                      <h3 className="text-white font-bold text-sm md:text-base leading-tight overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {book.title}
                      </h3>
                      <p className="text-gray-300 text-xs mt-1">
                        {book.total_chapters} chapters
                      </p>
                    </div>
                  </div>

                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <button className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full p-4 hover:bg-opacity-100 transition-all shadow-lg">
                      <FaPlay className="text-gray-900 text-xl ml-1" />
                    </button>
                  </div>
                </>
              ) : (
                // Fallback gradient with title
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white px-4">
                      <h3 className="text-2xl font-bold mb-2">{book.title}</h3>
                      <p className="text-sm opacity-90 mb-4">{book.total_chapters} chapters</p>
                      <button className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 hover:bg-opacity-30 transition-all">
                        <FaPlay className="text-white text-xl ml-1" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Channel Info Section - Instagram Style */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-700">
              <Link 
                href={`/channel/${book.channel.handle}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {book.channel.avatar_url ? (
                    <Image
                      src={book.channel.avatar_url}
                      alt={book.channel.display_name}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <FaUser className="text-white text-sm" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{book.channel.display_name}</p>
                  <p className="text-gray-400 text-xs">@{book.channel.handle}</p>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <FollowButton 
                  channel={book.channel}
                  size="sm"
                  variant="button"
                />
                <div className="text-right">
                  <p className="text-white text-xs">{book.total_chapters} chapters</p>
                  <p className="text-gray-400 text-xs">{new Date(book.published_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Social Actions */}
            <div className="px-4 py-3">
              <SocialActions 
                book={book} 
                size="lg"
                className="text-white"
              />
            </div>

            {/* Engagement Info - Real Data */}
            <div className="px-4 pb-3">
              <p className="text-white font-semibold text-sm">{book.like_count.toLocaleString()} likes</p>
              <p className="text-white text-sm mt-1">
                <Link 
                  href={`/channel/${book.channel.handle}`}
                  className="font-semibold hover:text-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()} // Prevent triggering book modal
                >
                  <FaUser className="w-3 h-3" />
                  @{book.channel.handle}
                                  </Link> {book.description} 
                  <div className="flex items-center gap-1 mt-1">
                    <FaHeadphones className="text-purple-500 text-sm" />
                    <span className="text-gray-500 text-xs">Audiobook</span>
                  </div>
              </p>
              <p className="text-gray-400 text-sm mt-1">View all {book.comment_count} comments</p>
            </div>
          </div>
        ))}

        {/* No Books State */}
        {!loading && books.length === 0 && !error && (
          <div className="p-6 text-center">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-3">Welcome to Biglio V2</h2>
              <p className="text-white text-sm mb-4">
                No books found. Check your database setup in Supabase.
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {books.length > 0 && (
          <div className="p-6 text-center">
            <div className="bg-green-900 rounded-lg p-4">
              <p className="text-green-400 font-semibold">✅ Connected to Supabase!</p>
              <p className="text-green-300 text-sm">Loaded {books.length} book(s) from database</p>
            </div>
          </div>
        )}
      </main>

      {/* Audio Player Modal */}
      <AudioPlayerModal 
        book={selectedBook}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}