'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  description?: string;
  total_chapters: number;
  is_published: boolean;
  updated_at: string;
  channel_id: string;
}

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDescription, setNewBookDescription] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('biglios')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBook = async () => {
    if (!newBookTitle.trim()) return;
    
    try {
      setIsCreating(true);
      
      // For now, use the first channel we can find or create a default one
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .limit(1);
      
      let channelId = channels?.[0]?.id;
      
      if (!channelId) {
        // Create a default channel if none exists
        const { data: newChannel, error: channelError } = await supabase
          .from('channels')
          .insert({
            handle: 'mybooks',
            display_name: 'My Books',
            bio: 'My book collection'
          })
          .select('id')
          .single();
        
        if (channelError) throw channelError;
        channelId = newChannel.id;
      }

      const { error } = await supabase
        .from('biglios')
        .insert({
          title: newBookTitle,
          description: newBookDescription || '',
          channel_id: channelId,
          total_chapters: 0,
          is_published: false
        })
        .select()
        .single();

      if (error) throw error;

      setNewBookTitle('');
      setNewBookDescription('');
      setShowCreateForm(false);
      fetchBooks();
    } catch (error) {
      console.error('Error creating book:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">📚 Book Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              ➕ New Book
            </button>
            <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors">
              ← Back to Feed
            </Link>
          </div>
        </div>

        {/* Create Book Form */}
        {showCreateForm && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Create New Book</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Book Title"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <textarea
                placeholder="Book Description (optional)"
                value={newBookDescription}
                onChange={(e) => setNewBookDescription(e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
              />
              <div className="flex gap-4">
                <button
                  onClick={createBook}
                  disabled={isCreating || !newBookTitle.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Book'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Books List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-blue-200 mt-4">Loading books...</p>
          </div>
        ) : (
          <>
            <p className="text-blue-200 mb-6">
              Found {books.length} book(s). {books.length === 0 ? 'Create your first book to get started!' : 'Click on any book to start writing.'}
            </p>
            
            {books.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-lg mb-4">No books yet</p>
                <p className="text-gray-500">Create your first book to start writing with AI assistance!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {books.map((book) => (
                  <div key={book.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
                    <h3 className="text-xl font-bold text-white mb-2 truncate">{book.title}</h3>
                    {book.description && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">{book.description}</p>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-blue-400 text-sm">
                        {book.total_chapters} chapters
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        book.is_published 
                          ? 'bg-green-600 text-white' 
                          : 'bg-yellow-600 text-white'
                      }`}>
                        {book.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/book/${book.id}`}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-center text-sm font-semibold transition-colors"
                      >
                        ✍️ Write
                      </Link>
                      <Link
                        href={`/book/${book.id}/outline`}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-center text-sm font-semibold transition-colors"
                      >
                        📋 Outline
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
