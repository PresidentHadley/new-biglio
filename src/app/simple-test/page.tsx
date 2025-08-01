'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SimpleTestPage() {
  const [clickCount, setClickCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    setShowAlert(true);
    console.log('🎯 Button clicked! Count:', clickCount + 1);
    alert(`Button clicked ${clickCount + 1} times!`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-bold mb-6">🧪 Simple Test Page</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <p className="mb-4">Click count: <span className="text-green-400 font-bold">{clickCount}</span></p>
          
          <button
            onClick={handleClick}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            🎯 Test Click (Click Me!)
          </button>
          
          {showAlert && (
            <p className="mt-4 text-green-400">✅ JavaScript is working!</p>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded-lg text-sm">
          <h3 className="font-semibold mb-2">Environment Check:</h3>
          <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
          <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-semibold inline-block"
          >
            🏠 Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}