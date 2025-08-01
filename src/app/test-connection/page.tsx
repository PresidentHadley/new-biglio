'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function TestConnectionPage() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [books, setBooks] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Test basic connection
      setConnectionStatus('Testing Supabase connection...');
      
      const { data, error } = await supabase
        .from('biglios')
        .select(`
          id,
          title,
          description,
          total_chapters,
          like_count,
          channels!inner (
            handle,
            display_name
          )
        `)
        .eq('is_published', true);

      if (error) {
        console.error('Supabase error:', error);
        setError(error.message);
        setConnectionStatus('❌ Connection failed');
        return;
      }

      setBooks(data || []);
      setConnectionStatus('✅ Connected successfully');
      
      if (!data || data.length === 0) {
        setError('No books found. You may need to add sample data.');
      }

    } catch (err) {
      console.error('Connection test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionStatus('❌ Connection failed');
    }
  };

  const addSampleData = async () => {
    try {
      setConnectionStatus('Adding sample data...');
      
      // Add sample user (this might fail if auth is not set up)
      const { data: _userData, error: _userError } = await supabase
        .from('users')
        .upsert({
          id: 'd63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f',
          email: 'storyteller@biglio.com',
          display_name: 'Alex Chen',
          bio: 'Professional storyteller and audiobook creator'
        });

      // Add sample channel
      const { data: _channelData, error: _channelError } = await supabase
        .from('channels')
        .upsert({
          user_id: 'd63e8f92-0c6e-4a4e-8f8a-9b8b8c8d8e8f',
          handle: 'storyteller',
          display_name: 'The Storyteller',
          bio: 'Creating immersive audio experiences',
          is_primary: true
        });

      if (channelError) {
        console.error('Channel error:', channelError);
        setError(`Channel error: ${channelError.message}`);
        return;
      }

      // Get the channel ID
      const { data: channelResult } = await supabase
        .from('channels')
        .select('id')
        .eq('handle', 'storyteller')
        .single();

      if (!channelResult) {
        setError('Could not find channel after creation');
        return;
      }

      // Add sample book
      const { data: _bookData, error: bookError } = await supabase
        .from('biglios')
        .upsert({
          channel_id: channelResult.id,
          title: 'The Midnight Chronicles',
          description: 'A thrilling adventure series set in a world where magic and technology collide',
          total_chapters: 3,
          is_published: true,
          published_at: new Date().toISOString()
        });

      if (bookError) {
        console.error('Book error:', bookError);
        setError(`Book error: ${bookError.message}`);
        return;
      }

      setConnectionStatus('✅ Sample data added successfully');
      testConnection(); // Refresh the data
      
    } catch (err) {
      console.error('Error adding sample data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Biglio V2 Connection Test</h1>
        
        {/* Connection Status */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <p className="text-lg">{connectionStatus}</p>
          {error && (
            <div className="mt-2 p-3 bg-red-900 rounded text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Environment Check</h2>
          <div className="space-y-1 text-sm">
            <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
            <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
            <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
          </div>
        </div>

        {/* Books Data */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Books Found ({books.length})</h2>
          {books.length > 0 ? (
            <div className="space-y-2">
              {books.map((book, index) => (
                <div key={book.id || index} className="bg-gray-800 p-3 rounded">
                  <p><strong>Title:</strong> {book.title}</p>
                  <p><strong>Channel:</strong> @{book.channels?.handle}</p>
                  <p><strong>Chapters:</strong> {book.total_chapters}</p>
                  <p><strong>Likes:</strong> {book.like_count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No books found in database</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={testConnection}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold"
          >
            🔄 Retry Connection
          </button>
          
          {books.length === 0 && (
            <button
              onClick={addSampleData}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold ml-4"
            >
              ➕ Add Sample Data
            </button>
          )}
          
          <Link
            href="/"
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-semibold ml-4 inline-block"
          >
            🏠 Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}