'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ChannelHeader } from '@/components/channel/ChannelHeader';
import { AudioBookList } from '@/components/channel/AudioBookList';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
}

export default function ChannelPage() {
  const { username } = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

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

        const channel = channelData as Channel;
        setChannel(channel);

        // Check if current user is the owner
        const { data: { user } } = await supabase.auth.getUser();
        setIsOwner(user?.id === channel.user_id);

        // Fetch books for this channel
        const { data: booksData, error: booksError } = await supabase
          .from('biglios')
          .select('id, title, description, cover_url, channel_id, created_at, updated_at, total_chapters, total_duration_seconds')
          .eq('channel_id', channel.id)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (booksError) {
          throw new Error(`Failed to fetch books: ${booksError.message}`);
        }

        // Map books with stats from database fields (no complex joins needed)  
        const booksWithStats = booksData?.map((book: any) => ({
          ...book,
          chapter_count: book.total_chapters || 0,
          total_duration: book.total_duration_seconds || 0
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Channel Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Channel Not Found</h1>
          <p className="text-gray-600">This channel does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Channel Header */}
      <ChannelHeader 
        channel={channel}
        isOwner={isOwner}
        bookCount={books.length}
      />

      {/* Books/Audio Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AudioBookList 
          books={books}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}