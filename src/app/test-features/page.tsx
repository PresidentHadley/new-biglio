'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestFeaturesPage() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    addResult('🔌 Testing database connection...');
    try {
      const result = await supabase.from('users').select('count').limit(1);
      if (result.error) throw result.error;
      addResult('✅ Database connection successful!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addResult(`❌ Database error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-2">
            🚀 Biglio V2 Feature Tests
          </h1>
          <p className="text-blue-200 mb-8">
            Test the database connection and core systems
          </p>

          <button
            onClick={testDatabaseConnection}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 mb-6"
          >
            🔌 Test Database Connection
          </button>

          <div className="mt-8">
            <h3 className="text-xl font-bold text-white mb-4">📊 Test Results</h3>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-300 h-64 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-gray-400">Click "Test Database Connection" to see results...</div>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-blue-300 font-bold mb-2">📝 Book Writing System</h4>
            <div className="text-blue-100 text-sm space-y-2">
              <div>The book writing/editing interface from your old system needs to be migrated.</div>
              <div>Currently available: Instagram-style feed view</div>
              <div>🔄 **Next:** Migrate book editor UI from biglio-repo to new architecture</div>
            </div>
          </div>

          <div className="mt-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-300 font-bold mb-2">⚡ Current Status</h4>
            <div className="text-yellow-100 text-sm space-y-1">
              <div>✅ **Frontend** - Instagram-style feed working</div>
              <div>✅ **Database** - Supabase connected</div>
              <div>⚠️ **Book Editor** - Not migrated yet (still in old system)</div>
              <div>⚠️ **Audio/AI APIs** - Need to be created</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}