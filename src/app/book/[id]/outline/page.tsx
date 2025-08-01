'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function OutlineEditor() {
  const params = useParams();
  const bookId = params.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">← Dashboard</Link>
        <h1 className="text-4xl font-bold text-white mb-8 mt-4">📋 Outline Editor</h1>
        <p className="text-gray-300 mb-4">Book ID: {bookId}</p>
        <p className="text-blue-200">Outline editor working! Ready to build AI outline generation.</p>
        <div className="mt-8">
          <Link href="/book/{bookId}" className="px-4 py-2 bg-green-600 text-white rounded mr-4">✍️ Write</Link>
        </div>
      </div>
    </div>
  );
}
