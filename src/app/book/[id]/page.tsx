'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function BookEditor() {
  const params = useParams();
  const bookId = params.id;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">← Dashboard</Link>
        <h1 className="text-4xl font-bold text-white mb-8 mt-4">✍️ Book Editor</h1>
        <p className="text-gray-300 mb-4">Book ID: {bookId}</p>
        <p className="text-blue-200">Book editor working! Ready to build chapter management & AI features.</p>
      </div>
    </div>
  );
}
