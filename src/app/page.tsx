'use client';

import { useState, useEffect } from 'react';
import { FaPlay, FaHeart, FaComment, FaBookmark } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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
  };
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('biglios')
        .select(`
          id,
          title,
          description,
          total_chapters,
          like_count,
          comment_count,
          save_count,
          published_at,
          channels!inner(
            handle,
            display_name
          )
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) {
        throw error;
      }

      const transformedBooks: Book[] = data?.map(book => ({
        id: book.id,
        title: book.title,
        description: book.description || '',
        total_chapters: book.total_chapters,
        like_count: book.like_count,
        comment_count: book.comment_count,
        save_count: book.save_count,
        published_at: book.published_at,
        channel: {
          handle: book.channels[0]?.handle,
          display_name: book.channels[0]?.display_name
        }
      })) || [];

      setBooks(transformedBooks);
      
      // If no books, add sample data
      if (transformedBooks.length === 0) {
        await addSampleData();
      }
      
    } catch (err) {
      console.error('Error loading books:', err);
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const addSampleData = async () => {
    try {
      // Add sample user
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: 'd63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f',
          email: 'storyteller@biglio.com',
          display_name: 'Alex Chen'
        });

      // Add sample channel
      const { error: channelError } = await supabase
        .from('channels')
        .upsert({
          user_id: 'd63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f',
          handle: 'storyteller',
          display_name: 'The Storyteller',
          is_primary: true
        });

      // Get channel ID
      const { data: channelData } = await supabase
        .from('channels')
        .select('id')
        .eq('handle', 'storyteller')
        .single();

      if (channelData) {
        // Add sample book
        const { error: bookError } = await supabase
          .from('biglios')
          .upsert({
            channel_id: channelData.id,
            title: 'The Midnight Chronicles',
            description: 'A thrilling adventure series set in a world where magic and technology collide',
            total_chapters: 3,
            like_count: 1234,
            comment_count: 89,
            save_count: 456,
            is_published: true,
            published_at: new Date().toISOString()
          });

        if (!bookError) {
          // Reload books after adding sample data
          await loadBooks();
        }
      }
    } catch (err) {
      console.error('Error adding sample data:', err);
    }
  };

  const openBookModal = (book: Book) => {
    setSelectedBook(book);
    // TODO: Show modal with chapters
    alert(`Opening "${book.title}" - Modal system coming next!`);
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
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-black border-b border-gray-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Biglio</h1>
          <div className="flex space-x-4">
            <Link 
              href="/dashboard"
              className="text-white hover:text-gray-300 flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              ✍️ Write
            </Link>
            <button className="text-white hover:text-gray-300">
              <FaHeart size={24} />
            </button>
            <button className="text-white hover:text-gray-300">
              <FaComment size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Instagram-style Feed */}
      <main className="max-w-md mx-auto">
        {loading && (
          <div className="p-6 text-center">
            <div className="text-white">📚 Loading audiobooks from Supabase...</div>
            <div className="text-gray-400 text-sm mt-2">Connecting to database</div>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <div className="text-red-400 mb-2">Database Error:</div>
            <div className="text-gray-400 text-sm">{error}</div>
            <button 
              onClick={loadBooks}
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
              className="relative aspect-square bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => openBookModal(book)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <h3 className="text-2xl font-bold mb-2">{book.title}</h3>
                  <p className="text-sm opacity-90">{book.total_chapters} chapters</p>
                  <button className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 hover:bg-opacity-30 transition-all">
                    <FaPlay className="text-white text-xl ml-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex space-x-4">
                <button className="text-white hover:text-red-500 transition-colors">
                  <FaHeart size={24} />
                </button>
                <button className="text-white hover:text-blue-500 transition-colors">
                  <FaComment size={24} />
                </button>
              </div>
              <button className="text-white hover:text-yellow-500 transition-colors">
                <FaBookmark size={24} />
              </button>
            </div>

            {/* Engagement Info - Real Data */}
            <div className="px-4 pb-3">
              <p className="text-white font-semibold text-sm">{book.like_count.toLocaleString()} likes</p>
              <p className="text-white text-sm mt-1">
                <span className="font-semibold">@{book.channel.handle}</span> {book.description} 🎧✨
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
                Setting up your database... Adding sample content!
              </p>
              <button 
                onClick={addSampleData}
                className="bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              >
                Add Sample Book
              </button>
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
    </div>
  );
}