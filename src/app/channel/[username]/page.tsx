'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ChannelHeader } from '@/components/channel/ChannelHeader';
import { AudioBookList } from '@/components/channel/AudioBookList';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BookCreationModal, BookFormData } from '@/components/BookCreationModal';

interface Channel {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  follower_count: number;
  created_at: string;
  user_id: string;
  // Add missing properties for ChannelHeader compatibility
  name: string;
  username: string;
  description: string;
  following_count: number;
  book_count: number;
}

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

interface SupabaseBook {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  channel_id: string;
  created_at: string;
  updated_at: string;
  total_chapters: number;
  total_duration_seconds: number;
  is_published: boolean;
}



export default function ChannelPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        setLoading(true);
        
        // Check if username exists
        if (!username || typeof username !== 'string') {
          throw new Error('Invalid username');
        }
        
        // Fetch channel by handle (@username)
        const { data: channelData, error: channelError } = await supabase
          .from('channels')
          .select('id, handle, display_name, bio, avatar_url, cover_url, follower_count, created_at, user_id')
          .eq('handle', username)
          .single();

        if (channelError) {
          throw new Error(`Channel not found: ${channelError.message}`);
        }

        const channel = {
          ...channelData,
          name: channelData.display_name,
          username: channelData.handle,
          description: channelData.bio || '',
          following_count: 0,
          book_count: 0
        } as Channel;
        setChannel(channel);

        // Check if current user is the owner
        const { data: { user } } = await supabase.auth.getUser();
        const userIsOwner = user?.id === channel.user_id;
        setIsOwner(userIsOwner);

        // Fetch books for this channel
        let booksQuery = supabase
          .from('biglios')
          .select('id, title, description, cover_url, channel_id, created_at, updated_at, total_chapters, total_duration_seconds, is_published')
          .eq('channel_id', channel.id);
        
        // Only filter by is_published if viewer is not the channel owner
        if (!userIsOwner) {
          booksQuery = booksQuery.eq('is_published', true);
        }
        
        const { data: booksData, error: booksError } = await booksQuery
          .order('created_at', { ascending: false });

        if (booksError) {
          throw new Error(`Failed to fetch books: ${booksError.message}`);
        }

        // Map books with stats from database fields (no complex joins needed)  
        const booksWithStats = (booksData as SupabaseBook[])?.map(book => ({
          ...book,
          chapter_count: book.total_chapters || 0,
          total_duration: book.total_duration_seconds || 0,
          is_published: book.is_published
        }));

        setBooks(booksWithStats as Book[]);

      } catch (err) {
        console.error('Error fetching channel data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load channel');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchChannelData();
    }
  }, [username, supabase]);

  const handleCreateBook = async (bookData: BookFormData) => {
    if (!channel?.id || !user) return;
    
    try {
      setIsCreating(true);

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
          channel_id: channel.id,
          total_chapters: 0,
          is_published: false
        })
        .select()
        .single();

      if (error) throw error;

      // Success! Close modal and redirect to outline editor
      setShowCreateModal(false);
      
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

  const handleChannelUpdate = (updatedChannel: Partial<Channel>) => {
    if (channel) {
      setChannel({ ...channel, ...updatedChannel });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Channel Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Channel Not Found</h1>
          <p className="text-gray-600">This channel does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Channel Header */}
      <ChannelHeader 
        channel={channel}
        isOwner={isOwner}
        bookCount={books.length}
        onChannelUpdate={handleChannelUpdate}
        onCreateBook={() => setShowCreateModal(true)}
      />

      {/* Books/Audio Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AudioBookList 
          books={books}
          isOwner={isOwner}
        />
      </div>

      {/* Book Creation Modal */}
      <BookCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateBook}
        isCreating={isCreating}
      />
    </div>
  );
}