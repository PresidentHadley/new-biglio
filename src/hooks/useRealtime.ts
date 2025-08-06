'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Type definitions for real-time payload data
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export interface RealtimeEventHandlers {
  onLikeChange?: (biglioId: string, likeCount: number, isLiked: boolean) => void;
  onCommentChange?: (biglioId: string, commentCount: number) => void;
  onSaveChange?: (biglioId: string, saveCount: number, isSaved: boolean) => void;
  onFollowChange?: (channelId: string, followerCount: number, isFollowed: boolean) => void;
  onNewBiglio?: (biglio: Record<string, unknown>) => void;
  onNewComment?: (comment: Record<string, unknown>) => void;
}

export function useRealtime(handlers: RealtimeEventHandlers) {
  const supabase = createClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Subscribe to likes changes
    if (handlers.onLikeChange) {
      const likesChannel = supabase
        .channel('realtime-likes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'likes' },
          async (payload: RealtimePayload) => {
            console.log('📡 Real-time likes change:', payload);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              const biglioId = payload.new?.biglio_id || payload.old?.biglio_id;
              if (biglioId && typeof biglioId === 'string') {
                // Fetch updated biglio data
                const { data: biglio } = await supabase
                  .from('biglios')
                  .select('like_count')
                  .eq('id', biglioId)
                  .single();
                
                if (biglio && handlers.onLikeChange) {
                  handlers.onLikeChange(
                    biglioId, 
                    (biglio.like_count as number) || 0,
                    payload.eventType === 'INSERT'
                  );
                }
              }
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(likesChannel);
    }

    // Subscribe to comments changes
    if (handlers.onCommentChange || handlers.onNewComment) {
      const commentsChannel = supabase
        .channel('realtime-comments')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'comments' },
          async (payload: RealtimePayload) => {
            console.log('📡 Real-time comments change:', payload);
            
            const biglioId = payload.new?.biglio_id || payload.old?.biglio_id;
            if (biglioId && typeof biglioId === 'string') {
              // Fetch updated biglio data for comment count
              const { data: biglio } = await supabase
                .from('biglios')
                .select('comment_count')
                .eq('id', biglioId)
                .single();
              
              if (biglio && handlers.onCommentChange) {
                handlers.onCommentChange(biglioId, (biglio.comment_count as number) || 0);
              }

                              // For new comments, also trigger onNewComment if available
                if (payload.eventType === 'INSERT' && handlers.onNewComment) {
                  // Fetch full comment data with user info
                  const { data: comment } = await supabase
                    .from('comments')
                    .select(`
                      *,
                      user:user_id (
                        id,
                        channels!channels_user_id_fkey (handle, display_name, avatar_url)
                      )
                    `)
                    .eq('id', payload.new?.id as string)
                    .single();
                
                if (comment) {
                  handlers.onNewComment(comment);
                }
              }
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(commentsChannel);
    }

    // Subscribe to saves changes
    if (handlers.onSaveChange) {
      const savesChannel = supabase
        .channel('realtime-saves')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'saves' },
          async (payload: RealtimePayload) => {
            console.log('📡 Real-time saves change:', payload);
            
            const biglioId = payload.new?.biglio_id || payload.old?.biglio_id;
            if (biglioId && typeof biglioId === 'string') {
              // Fetch updated biglio data
              const { data: biglio } = await supabase
                .from('biglios')
                .select('save_count')
                .eq('id', biglioId)
                .single();
              
              if (biglio && handlers.onSaveChange) {
                handlers.onSaveChange(
                  biglioId, 
                  (biglio.save_count as number) || 0,
                  payload.eventType === 'INSERT'
                );
              }
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(savesChannel);
    }

    // Subscribe to follows changes
    if (handlers.onFollowChange) {
      const followsChannel = supabase
        .channel('realtime-follows')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'follows' },
          async (payload: RealtimePayload) => {
            console.log('📡 Real-time follows change:', payload);
            
            const channelId = payload.new?.followed_channel_id || payload.old?.followed_channel_id;
            if (channelId && typeof channelId === 'string') {
              // Fetch updated channel data
              const { data: channel } = await supabase
                .from('channels')
                .select('follower_count')
                .eq('id', channelId)
                .single();
              
              if (channel && handlers.onFollowChange) {
                handlers.onFollowChange(
                  channelId, 
                  (channel.follower_count as number) || 0,
                  payload.eventType === 'INSERT'
                );
              }
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(followsChannel);
    }

    // Subscribe to new published biglios
    if (handlers.onNewBiglio) {
      const bigliosChannel = supabase
        .channel('realtime-biglios')
        .on('postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'biglios',
            filter: 'is_published=eq.true'
          },
          async (payload: RealtimePayload) => {
            console.log('📡 Real-time biglio published:', payload);
            
            // Only trigger for newly published books (not all updates)
            if (payload.old?.is_published === false && payload.new?.is_published === true) {
              // Fetch full biglio data with channel info
              const { data: biglio } = await supabase
                .from('biglios')
                .select(`
                  *,
                  channel:channels!channels_id_fkey (
                    id,
                    user_id,
                    handle,
                    display_name,
                    avatar_url,
                    follower_count
                  )
                `)
                .eq('id', payload.new?.id as string)
                .single();
              
              if (biglio && handlers.onNewBiglio) {
                handlers.onNewBiglio(biglio);
              }
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(bigliosChannel);
    }

    // Cleanup function
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [supabase, handlers]);

  return {
    // Utility function to manually trigger a refresh if needed
    refreshData: async (biglioId: string) => {
      const { data: biglio } = await supabase
        .from('biglios')
        .select('like_count, comment_count, save_count')
        .eq('id', biglioId)
        .single();
      
      return biglio;
    }
  };
}