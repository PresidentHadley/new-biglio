'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export function DebugMainFeed() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  const runDebugTest = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // 1. Check total biglios count
      const { data: allBiglios, error: allError } = await supabase
        .from('biglios')
        .select('id, title, is_published, published_at, channel_id')
        .order('created_at', { ascending: false });
      
      results.totalBooks = allBiglios?.length || 0;
      results.allBooks = allBiglios || [];

      // 2. Check published biglios count
      const { data: publishedBiglios, error: pubError } = await supabase
        .from('biglios')
        .select('id, title, is_published, published_at, channel_id')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      
      results.publishedBooks = publishedBiglios?.length || 0;
      results.publishedBooksList = publishedBiglios || [];

      // 3. Check channels
      const { data: channels, error: channelError } = await supabase
        .from('channels')
        .select('id, handle, display_name');
      
      results.totalChannels = channels?.length || 0;
      results.channels = channels || [];

      // 4. Test the main feed query (exactly like useBooks hook)
      const { data: mainFeedBiglios, error: mainFeedError } = await supabase
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
          channel_id
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      results.mainFeedBooks = mainFeedBiglios?.length || 0;
      results.mainFeedBooksList = mainFeedBiglios || [];
      results.mainFeedError = mainFeedError;

      // 5. Check if any books have audio ready
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('biglio_id, title, audio_url, audio_status')
        .not('audio_url', 'is', null);
      
      results.chaptersWithAudio = chaptersData?.length || 0;
      results.audioBooksMap = chaptersData?.reduce((acc: any, ch: any) => {
        if (!acc[ch.biglio_id]) acc[ch.biglio_id] = 0;
        acc[ch.biglio_id]++;
        return acc;
      }, {}) || {};

    } catch (error) {
      results.error = error;
    }

    setDebugInfo(results);
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🔍 Main Feed Debug Tool</h3>
        <button
          onClick={runDebugTest}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Run Debug Test'}
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">📚 Total Books</div>
              <div className="text-2xl font-bold text-blue-600">{debugInfo.totalBooks}</div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">✅ Published Books</div>
              <div className="text-2xl font-bold text-green-600">{debugInfo.publishedBooks}</div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">📺 Channels</div>
              <div className="text-2xl font-bold text-purple-600">{debugInfo.totalChannels}</div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">🎵 Books w/ Audio</div>
              <div className="text-2xl font-bold text-orange-600">{Object.keys(debugInfo.audioBooksMap).length}</div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="font-medium text-blue-900 mb-2">🌟 Main Feed Query Result</div>
            <div className="text-lg font-bold text-blue-700">{debugInfo.mainFeedBooks} books in main feed</div>
            {debugInfo.mainFeedError && (
              <div className="text-red-600 mt-1">Error: {JSON.stringify(debugInfo.mainFeedError)}</div>
            )}
          </div>

          {debugInfo.publishedBooksList.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-gray-900">📋 Published Books Details:</div>
              {debugInfo.publishedBooksList.map((book: any, index: number) => (
                <div key={book.id} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <div className="font-medium">{index + 1}. {book.title}</div>
                  <div className="text-gray-600">
                    Published: {book.published_at ? new Date(book.published_at).toLocaleString() : 'No date'}
                  </div>
                  <div className="text-gray-600">
                    Audio Chapters: {debugInfo.audioBooksMap[book.id] || 0}
                  </div>
                </div>
              ))}
            </div>
          )}

          {debugInfo.allBooks.length > 0 && debugInfo.publishedBooks === 0 && (
            <div className="space-y-2">
              <div className="font-medium text-gray-900">📋 All Books (Draft Status):</div>
              {debugInfo.allBooks.slice(0, 5).map((book: any, index: number) => (
                <div key={book.id} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <div className="font-medium">{index + 1}. {book.title}</div>
                  <div className="text-gray-600">
                    Status: {book.is_published ? 'Published' : 'Draft'}
                  </div>
                  <div className="text-gray-600">
                    Audio Chapters: {debugInfo.audioBooksMap[book.id] || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}