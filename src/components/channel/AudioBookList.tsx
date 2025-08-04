'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  FaPlay, 
  FaPause, 
  FaChevronDown, 
  FaChevronRight, 
  FaBook,
  FaClock,
  FaHeadphones
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

interface AudioBookListProps {
  books: Book[];
  isOwner: boolean;
}

export function AudioBookList({ books, isOwner }: AudioBookListProps) {
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const [playingBook, setPlayingBook] = useState<string | null>(null);

  const toggleBookExpansion = (bookId: string) => {
    setExpandedBooks(prev => ({
      ...prev,
      [bookId]: !prev[bookId]
    }));
  };

  const handlePlayBook = (bookId: string) => {
    if (playingBook === bookId) {
      setPlayingBook(null);
    } else {
      setPlayingBook(bookId);
      // TODO: Start playing the first chapter
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
            : 'This creator hasn\'t published any books yet. Check back later!'
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
                    onClick={() => handlePlayBook(book.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                  >
                    {playingBook === book.id ? (
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

                    {/* Expand Button */}
                    <button
                      onClick={() => toggleBookExpansion(book.id)}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      {expandedBooks[book.id] ? (
                        <FaChevronDown className="text-gray-600" />
                      ) : (
                        <FaChevronRight className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Chapters (TODO: Implement when we have chapter data) */}
            {expandedBooks[book.id] && (
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="text-center text-gray-600 py-8">
                  <FaBook className="text-2xl mx-auto mb-2 text-gray-400" />
                  <p>Chapter list coming soon...</p>
                  <p className="text-sm mt-1">Will show individual chapters with play buttons</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}