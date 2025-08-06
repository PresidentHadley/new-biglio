'use client';

import { useState, useEffect } from 'react';
import { FaUserPlus, FaUserCheck } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeContext } from '@/context/RealtimeContext';
// Minimal channel interface for FollowButton
interface ChannelMinimal {
  id: string;
  user_id: string;
  handle: string;
  display_name?: string;
  follower_count?: number;
}

interface FollowButtonProps {
  channel: ChannelMinimal;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon';
}

export default function FollowButton({ 
  channel, 
  className = '',
  size = 'md',
  variant = 'button'
}: FollowButtonProps) {
  const { user } = useAuth();
  const { getChannelStats, updateChannelStats } = useRealtimeContext();
  const isAuthenticated = !!user;
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(channel.follower_count || 0);
  const [loading, setLoading] = useState(false);

  // Initialize real-time stats
  useEffect(() => {
    updateChannelStats(channel.id, {
      followerCount: channel.follower_count || 0
    });
  }, [channel.id, channel.follower_count, updateChannelStats]);

  // Listen for real-time updates
  useEffect(() => {
    const stats = getChannelStats(channel.id);
    if (stats) {
      setFollowerCount(stats.followerCount);
    }
  }, [channel.id, getChannelStats]);

  // Don't show follow button for own channel
  const isOwnChannel = isAuthenticated && user && channel.user_id === user.id;

  // Check initial follow status
  useEffect(() => {
    if (!isAuthenticated || !user || isOwnChannel) return;

    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/follows?channel_id=${channel.id}`);
        if (response.ok) {
          const data = await response.json();
          setFollowing(data.following);
        }
      } catch (error) {
        console.error('Failed to check follow status:', error);
      }
    };

    checkFollowStatus();
  }, [channel.id, isAuthenticated, user, isOwnChannel]);

  const handleFollow = async () => {
    if (!isAuthenticated || loading || isOwnChannel) return;

    setLoading(true);
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel_id: channel.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle follow');
      }

      const data = await response.json();
      setFollowing(data.following);
      setFollowerCount(prev => data.following ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if it's the user's own channel
  if (isOwnChannel) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 18
  }[size];

  if (variant === 'icon') {
    return (
      <button
        onClick={handleFollow}
        disabled={!isAuthenticated || loading}
        className={`p-2 rounded-full transition-colors ${
          following
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            : 'text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-blue-600'
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        title={following ? 'Unfollow' : 'Follow'}
      >
        {following ? (
          <FaUserCheck size={iconSize} />
        ) : (
          <FaUserPlus size={iconSize} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={!isAuthenticated || loading}
      className={`
        inline-flex items-center gap-2 rounded-lg font-medium transition-colors
        ${sizeClasses[size]}
        ${following
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
        }
        ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}
        ${loading ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {following ? (
        <>
          <FaUserCheck size={iconSize} />
          Following
        </>
      ) : (
        <>
          <FaUserPlus size={iconSize} />
          Follow
        </>
      )}
    </button>
  );
}