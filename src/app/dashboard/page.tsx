'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  description?: string;
  updated_at: string;
  [key: string]: unknown;
}

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">📚 Book Dashboard</h1>
        <p className="text-blue-200 mb-8">Dashboard working! Ready to build book management.</p>
        <Link href="/" className="px-4 py-2 bg-purple-600 text-white rounded">← Back to Feed</Link>
      </div>
    </div>
  );
}
