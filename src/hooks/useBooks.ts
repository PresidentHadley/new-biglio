'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

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
    handle: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface SupabaseBiglio {
  id: string;
  title: string;
  description: string;
  cover_url?: string;
  total_chapters: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  published_at: string;
  channel_id: string;
}

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  duration_seconds: number;
  audio_url?: string;
  is_published: boolean;
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching published books for main feed...');
      
      // First, get biglios data
      const { data: bigliosData, error: bigliosError } = await supabase
        .from('biglios')
        .select(`
          id,
          title,
          description,
          cover_url,
          total_chapters,
          like_count,
          comment_count,
          save_count,
          published_at,
          channel_id,
          is_published
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      console.log('🔍 Supabase query result:', {
        data: bigliosData,
        error: bigliosError,
        count: bigliosData?.length || 0
      });

      if (bigliosError) {
        console.error('❌ Error fetching books:', bigliosError);
        throw bigliosError;
      }

      if (!bigliosData || bigliosData.length === 0) {
        console.log('📭 No published books found in database');
        setBooks([]);
        setError(null); // Clear any previous errors
        return;
      }

      console.log(`✅ Found ${bigliosData.length} published books`);
      bigliosData.forEach((book, index) => {
        console.log(`📖 ${index + 1}. "${book.title}" - Published: ${book.published_at}`);
      });

      // Get unique channel IDs
      const channelIds = [...new Set(bigliosData.map(book => book.channel_id))];
      
      // Fetch channel data separately
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('id, handle, display_name, avatar_url')
        .in('id', channelIds);

      if (channelsError) throw channelsError;

      // Create a map of channels for easy lookup
      const channelsMap = new Map(channelsData?.map(channel => [channel.id, channel]) || []);

      // Transform the data to match our interface
      const transformedBooks = (bigliosData as unknown as SupabaseBiglio[])?.map((book: SupabaseBiglio) => {
        const channel = channelsMap.get(book.channel_id);
        return {
          id: book.id,
          title: book.title,
          description: book.description || '',
          cover_url: book.cover_url,
          total_chapters: book.total_chapters,
          like_count: book.like_count,
          comment_count: book.comment_count,
          save_count: book.save_count,
          published_at: book.published_at,
          channel: {
            handle: channel?.handle ? String(channel.handle) : 'unknown',
            display_name: channel?.display_name ? String(channel.display_name) : 'Unknown Channel',
            avatar_url: channel?.avatar_url
          }
        };
      }) || [];

      setBooks(transformedBooks as Book[]);
      console.log(`🎉 Main feed updated with ${transformedBooks.length} published books`);
      
      // Debug cover URLs
      transformedBooks.forEach((book, index) => {
        console.log(`📸 Book ${index + 1}: "${book.title}" - cover_url:`, book.cover_url);
      });
      
      setError(null); // Clear any previous errors on success
    } catch (err) {
      console.error('❌ Error fetching books:', err);
      setError('Failed to load books');
      setBooks([]); // Clear books on error
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return { books, loading, error, refetch: fetchBooks };
}

export function useChapters(bookId: string) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookId) {
      fetchChapters(bookId);
    }
  }, [bookId]);

  const fetchChapters = async (bookId: string) => {
    try {
      setLoading(true);
      const client = createClient();
      
      const { data, error } = await client
        .from('chapters')
        .select('*')
        .eq('biglio_id', bookId)
        .eq('is_published', true)
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      
      setChapters((data as unknown as Chapter[]) || []);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setError('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  return { chapters, loading, error };
}