'use client';

import { useState, useEffect } from 'react';
import { FaHeart, FaReply, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { Comment as BaseComment } from '@/types/database';

// Extended comment interface with joined data
interface Comment extends BaseComment {
  user?: {
    id: string;
    email?: string;
  };
  channel?: {
    handle: string;
    display_name: string;
    avatar_url?: string;
  };
}

// Minimal book interface for Comments
interface BookMinimal {
  id: string;
  title?: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  level?: number;
}

function CommentItem({ comment, onReply, level = 0 }: CommentItemProps) {
  const maxLevel = 3; // Limit nesting depth
  const canReply = level < maxLevel;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  return (
    <div className={`${level > 0 ? 'ml-8 mt-3' : 'mb-4'}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {comment.channel?.display_name?.charAt(0).toUpperCase() || 
             comment.user?.email?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              @{comment.channel?.handle || 'unknown'}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-2">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
              <FaHeart size={12} />
              {comment.like_count > 0 && (
                <span>{comment.like_count}</span>
              )}
            </button>

            {canReply && onReply && (
              <button 
                onClick={() => onReply(comment)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
              >
                <FaReply size={12} />
                Reply
              </button>
            )}

            {comment.reply_count > 0 && (
              <span className="text-xs text-gray-500">
                {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CommentsProps {
  book: BookMinimal;
  className?: string;
}

export default function Comments({ book, className = '' }: CommentsProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/comments?biglio_id=${book.id}`);
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error('Failed to fetch comments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [book.id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          biglio_id: book.id,
          content: newComment.trim(),
          parent_comment_id: replyingTo?.id || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      const data = await response.json();
      
      // Add new comment to the list
      if (replyingTo) {
        // For replies, we'd need to fetch comments again or implement nested updates
        // For now, refresh all comments
        const commentsResponse = await fetch(`/api/comments?biglio_id=${book.id}`);
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData.comments || []);
        }
      } else {
        // Add new top-level comment
        setComments(prev => [data.comment, ...prev]);
      }

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Comment submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.channel?.handle} `);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  return (
    <div className={`${className}`}>
      {/* Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          {replyingTo && (
            <div className="mb-2 p-2 bg-blue-50 rounded-lg text-sm">
              <span className="text-blue-600">
                Replying to @{replyingTo.channel?.handle}
              </span>
              <button
                type="button"
                onClick={cancelReply}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
          
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                maxLength={2000}
                disabled={submitting}
              />
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/2000
                </span>
                
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaPaperPlane size={14} />
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">
            Sign in to join the conversation
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}