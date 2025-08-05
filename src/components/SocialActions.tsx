'use client';

import { useState, useEffect } from 'react';
import { FaHeart, FaComment, FaBookmark, FaShare } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
// Minimal book interface for SocialActions
interface BookMinimal {
  id: string;
  title: string;
  like_count: number;
  comment_count: number;
  save_count: number;
  channel: {
    handle: string;
  };
}

interface SocialActionsProps {
  book: BookMinimal;
  onCommentClick?: () => void;
  className?: string;
  showCounts?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SocialActions({ 
  book, 
  onCommentClick, 
  className = '',
  showCounts = true,
  size = 'md'
}: SocialActionsProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(book.like_count || 0);
  const [saveCount, setSaveCount] = useState(book.save_count || 0);
  const [loading, setLoading] = useState(false);

  // Icon sizes based on prop
  const iconSize = {
    sm: 16,
    md: 18,
    lg: 20
  }[size];

  // Check initial like/save status
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkInitialStatus = async () => {
      try {
        // Check like status
        const likeResponse = await fetch(`/api/likes?biglio_id=${book.id}`);
        if (likeResponse.ok) {
          const likeData = await likeResponse.json();
          setLiked(likeData.liked);
        }

        // Check save status
        const saveResponse = await fetch(`/api/saves?biglio_id=${book.id}`);
        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          setSaved(saveData.saved);
        }
      } catch (error) {
        console.error('Failed to check initial status:', error);
      }
    };

    checkInitialStatus();
  }, [book.id, isAuthenticated, user]);

  const handleLike = async () => {
    if (!isAuthenticated || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ biglio_id: book.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await response.json();
      setLiked(data.liked);
      setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Like error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/saves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ biglio_id: book.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle save');
      }

      const data = await response.json();
      setSaved(data.saved);
      setSaveCount(prev => data.saved ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `Check out "${book.title}" by @${book.channel.handle}`,
          url: window.location.origin + `/channel/${book.channel.handle}`,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      const url = window.location.origin + `/channel/${book.channel.handle}`;
      navigator.clipboard.writeText(url);
      // TODO: Show toast notification
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Like Button */}
      <button
        onClick={handleLike}
        disabled={!isAuthenticated || loading}
        className={`flex items-center gap-2 transition-colors ${
          liked 
            ? 'text-red-500 hover:text-red-600' 
            : 'text-gray-500 hover:text-red-500'
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <FaHeart 
          className={liked ? 'fill-current' : ''} 
          size={iconSize}
        />
        {showCounts && (
          <span className="text-sm font-medium">
            {likeCount.toLocaleString()}
          </span>
        )}
      </button>

      {/* Comment Button */}
      <button
        onClick={onCommentClick}
        className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
      >
        <FaComment size={iconSize} />
        {showCounts && (
          <span className="text-sm font-medium">
            {(book.comment_count || 0).toLocaleString()}
          </span>
        )}
      </button>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isAuthenticated || loading}
        className={`flex items-center gap-2 transition-colors ${
          saved 
            ? 'text-yellow-500 hover:text-yellow-600' 
            : 'text-gray-500 hover:text-yellow-500'
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <FaBookmark 
          className={saved ? 'fill-current' : ''} 
          size={iconSize}
        />
        {showCounts && (
          <span className="text-sm font-medium">
            {saveCount.toLocaleString()}
          </span>
        )}
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors"
      >
        <FaShare size={iconSize} />
      </button>
    </div>
  );
}