'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function SetupUserPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [channelName, setChannelName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [hasUserEditedChannelName, setHasUserEditedChannelName] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Auto-generate username from email, but only set channel name if user hasn't edited it
    if (user?.email) {
      const emailUsername = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      setUsername(emailUsername);
      
      // Only auto-set channel name if user hasn't manually edited it
      if (!hasUserEditedChannelName) {
        setChannelName(emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1) + "'s Channel");
      }
    }
  }, [user, hasUserEditedChannelName]);

  const createUserChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);
    setError('');

    try {
      // Check if handle is available
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('handle')
        .eq('handle', username)
        .maybeSingle();

      if (existingChannel) {
        setError('Username already taken. Please choose another.');
        setIsCreating(false);
        return;
      }

      // Create the channel
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          user_id: user.id,
          handle: username,
          display_name: channelName,
          bio: description || `Welcome to ${channelName}! 📚`,
          avatar_url: null,
          cover_url: null,
          follower_count: 0,
          following_count: 0
        })
        .select()
        .single();

      if (channelError) throw channelError;

      console.log('Channel created:', channel);
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (err) {
      console.error('Error creating channel:', err);
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pt-16">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Your Channel
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Set up your audiobook channel to start creating
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={createUserChannel}>
          <div className="space-y-4">
            <div>
              <label htmlFor="channelName" className="block text-sm font-medium text-gray-700">
                Channel Name
              </label>
              <input
                id="channelName"
                name="channelName"
                type="text"
                required
                value={channelName}
                onChange={(e) => {
                  setChannelName(e.target.value);
                  setHasUserEditedChannelName(true);
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Audiobook Channel"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username (unique)
              </label>
              <div className="mt-1 flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  @
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="myusername"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This will be your channel URL: /channel/{username}
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Channel Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell people what kind of audiobooks you create..."
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isCreating || !channelName.trim() || !username.trim()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Channel...' : 'Create Channel & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}