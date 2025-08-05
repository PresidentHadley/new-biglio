'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { BookCreationModal, BookFormData } from '@/components/BookCreationModal';
import Link from 'next/link';

interface Biglio {
  id: string;
  title: string;
  description?: string;
  total_chapters: number;
  is_published: boolean;
  updated_at: string;
  channel_id: string;
  book_type?: 'fiction' | 'non-fiction';
  genre?: string;
  target_audience?: string[];
  reading_level?: string;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [biglios, setBiglios] = useState<Biglio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userChannel, setUserChannel] = useState<{id: string; handle: string; display_name: string} | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const fetchBooksForChannel = useCallback(async (channelId: string) => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('biglios')
        .select('id, title, description, total_chapters, is_published, updated_at, channel_id, book_type, genre, target_audience, reading_level')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBiglios((data as Biglio[]) || []);
    } catch (err) {
      console.error('Error fetching biglios:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkUserChannel = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    try {
      // Check if user has a channel
      const { data: channel, error } = await supabase
        .from('channels')
        .select('id, handle, display_name')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (!channel) {
        // No channel found, redirect to setup
        router.push('/setup-user');
        return;
      }

      setUserChannel(channel as {id: string; handle: string; display_name: string});
      fetchBooksForChannel((channel as {id: string; handle: string; display_name: string}).id);
    } catch (err) {
      console.error('Error checking user channel:', err);
      setIsLoading(false);
    }
  }, [user, router, fetchBooksForChannel]);

  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
      return;
    }
    
    if (user) {
      setShowAuthModal(false);
      checkUserChannel();
    }
  }, [user, authLoading, checkUserChannel]);


  const handleCreateBiglio = async (bookData: BookFormData) => {
    if (!userChannel?.id) return;
    
    const supabase = createClient();
    try {
      setIsCreating(true);
      setCreateSuccess(false);

      const { data, error } = await supabase
        .from('biglios')
        .insert({
          title: bookData.title,
          description: bookData.description || '',
          book_type: bookData.book_type,
          genre: bookData.genre,
          target_audience: bookData.target_audience,
          reading_level: bookData.reading_level,
          cover_url: bookData.cover_url || null,
          channel_id: userChannel.id,
          total_chapters: 0,
          is_published: false
        })
        .select()
        .single();

      if (error) throw error;

      // Success! Show feedback and redirect to outline editor
      setCreateSuccess(true);
      setShowCreateModal(false);
      
      // Refresh the biglios list
      await fetchBooksForChannel(userChannel.id);
      
      // Redirect to the new book's outline editor
      if (data) {
        router.push(`/book/${data.id}?mode=outline`);
      }
      
    } catch (error) {
      console.error('Error creating biglio:', error);
      throw error; // Re-throw so the modal can handle it
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">📚 Biglio Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              ➕ New Biglio
            </button>
            <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors">
              ← Back to Feed
            </Link>
          </div>
        </div>

        {/* Success Message */}
        {createSuccess && (
          <div className="bg-green-800 border border-green-600 text-green-100 px-6 py-4 rounded-lg mb-6">
            ✅ Biglio created successfully! 🎉
          </div>
        )}



        {/* Books List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-blue-200 mt-4">Loading biglios...</p>
          </div>
        ) : (
          <>
            <p className="text-blue-200 mb-6">
              Found {biglios.length} biglio(s). {biglios.length === 0 ? 'Create your first biglio to get started!' : 'Click on any biglio to start writing.'}
            </p>
            
            {biglios.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-lg mb-4">No biglios yet</p>
                <p className="text-gray-500">Create your first biglio to start writing with AI assistance!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {biglios.map((biglio) => (
                  <div key={biglio.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
                    <h3 className="text-xl font-bold text-white mb-2 truncate">{biglio.title}</h3>
                    {biglio.description && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">{biglio.description}</p>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-blue-400 text-sm">
                        {biglio.total_chapters} chapters
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        biglio.is_published 
                          ? 'bg-green-600 text-white' 
                          : 'bg-yellow-600 text-white'
                      }`}>
                        {biglio.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/book/${biglio.id}`}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-center text-sm font-semibold transition-colors"
                      >
                        ✍️ Write
                      </Link>
                      <Link
                        href={`/book/${biglio.id}/outline`}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          if (user) {
            checkUserChannel();
          }
        }}
      />

      {/* Book Creation Modal */}
      <BookCreationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
        }}
        onSubmit={handleCreateBiglio}
        isCreating={isCreating}
      />
    </div>
  );
}
