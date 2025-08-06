'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

// Type definitions for realtime data
interface Comment {
  id: string;
  content: string;
  biglio_id: string;
  user_id: string;
  created_at: string;
  [key: string]: unknown;
}

interface Biglio {
  id: string;
  title: string;
  description?: string;
  is_published: boolean;
  [key: string]: unknown;
}

interface RealtimeState {
  // Book/Biglio counts
  biglioStats: Record<string, {
    likeCount: number;
    commentCount: number;
    saveCount: number;
  }>;
  
  // Channel counts
  channelStats: Record<string, {
    followerCount: number;
  }>;
  
  // New content notifications
  newComments: Comment[];
  newBiglios: Biglio[];
}

interface RealtimeContextType {
  state: RealtimeState;
  updateBiglioStats: (biglioId: string, stats: Partial<RealtimeState['biglioStats'][string]>) => void;
  updateChannelStats: (channelId: string, stats: Partial<RealtimeState['channelStats'][string]>) => void;
  addNewComment: (comment: Comment) => void;
  addNewBiglio: (biglio: Biglio) => void;
  clearNewComments: () => void;
  clearNewBiglios: () => void;
  getBiglioStats: (biglioId: string) => RealtimeState['biglioStats'][string] | null;
  getChannelStats: (channelId: string) => RealtimeState['channelStats'][string] | null;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RealtimeState>({
    biglioStats: {},
    channelStats: {},
    newComments: [],
    newBiglios: []
  });

  const updateBiglioStats = useCallback((biglioId: string, stats: Partial<RealtimeState['biglioStats'][string]>) => {
    setState(prev => ({
      ...prev,
      biglioStats: {
        ...prev.biglioStats,
        [biglioId]: {
          ...prev.biglioStats[biglioId],
          likeCount: 0,
          commentCount: 0,
          saveCount: 0,
          ...stats
        }
      }
    }));
  }, []);

  const updateChannelStats = useCallback((channelId: string, stats: Partial<RealtimeState['channelStats'][string]>) => {
    setState(prev => ({
      ...prev,
      channelStats: {
        ...prev.channelStats,
        [channelId]: {
          ...prev.channelStats[channelId],
          followerCount: 0,
          ...stats
        }
      }
    }));
  }, []);

  const addNewComment = useCallback((comment: Comment) => {
    setState(prev => ({
      ...prev,
      newComments: [comment, ...prev.newComments.slice(0, 49)] // Keep last 50
    }));
  }, []);

  const addNewBiglio = useCallback((biglio: Biglio) => {
    setState(prev => ({
      ...prev,
      newBiglios: [biglio, ...prev.newBiglios.slice(0, 9)] // Keep last 10
    }));
  }, []);

  const clearNewComments = useCallback(() => {
    setState(prev => ({ ...prev, newComments: [] }));
  }, []);

  const clearNewBiglios = useCallback(() => {
    setState(prev => ({ ...prev, newBiglios: [] }));
  }, []);

  const getBiglioStats = useCallback((biglioId: string) => {
    return state.biglioStats[biglioId] || null;
  }, [state.biglioStats]);

  const getChannelStats = useCallback((channelId: string) => {
    return state.channelStats[channelId] || null;
  }, [state.channelStats]);

  // Set up real-time subscriptions
  useRealtime({
    onLikeChange: (biglioId, likeCount) => {
      console.log('🔄 Real-time like update:', biglioId, likeCount);
      updateBiglioStats(biglioId, { likeCount });
    },
    
    onCommentChange: (biglioId, commentCount) => {
      console.log('🔄 Real-time comment count update:', biglioId, commentCount);
      updateBiglioStats(biglioId, { commentCount });
    },
    
    onSaveChange: (biglioId, saveCount) => {
      console.log('🔄 Real-time save update:', biglioId, saveCount);
      updateBiglioStats(biglioId, { saveCount });
    },
    
    onFollowChange: (channelId, followerCount) => {
      console.log('🔄 Real-time follow update:', channelId, followerCount);
      updateChannelStats(channelId, { followerCount });
    },
    
    onNewBiglio: (biglio) => {
      console.log('🔄 New biglio published:', biglio.title);
      addNewBiglio(biglio as Biglio);
    },
    
    onNewComment: (comment) => {
      console.log('🔄 New comment added:', comment.content);
      addNewComment(comment as Comment);
    }
  });

  const value: RealtimeContextType = {
    state,
    updateBiglioStats,
    updateChannelStats,
    addNewComment,
    addNewBiglio,
    clearNewComments,
    clearNewBiglios,
    getBiglioStats,
    getChannelStats
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
}