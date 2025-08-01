'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestFeaturesPage() {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDatabase = async () => {
    addResult('🔌 Testing database connection...');
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      addResult('✅ Database connection successful!');
    } catch (error: any) {
      addResult(`❌ Database error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-4">🚀 Biglio V2 Tests</h1>
          
          <button
            onClick={testDatabase}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-4 rounded-lg font-bold mb-6"
          >
            Test Database
          </button>

          <div className="bg-black/30 rounded-lg p-4 h-40 overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-gray-400">Click button to test...</div>
            ) : (
              results.map((result, index) => (
                <div key={index} className="text-green-300 text-sm mb-1">{result}</div>
              ))
            )}
          </div>

          <div className="mt-6 bg-blue-500/20 rounded-lg p-4">
            <h3 className="text-blue-300 font-bold mb-2">📝 Book Writing</h3>
            <p className="text-blue-100 text-sm">
              The book editor needs to be migrated from the old system. 
              Currently only the Instagram-style feed is available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
