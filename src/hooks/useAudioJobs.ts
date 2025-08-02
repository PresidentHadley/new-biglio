'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AudioJob {
  id: string;
  chapter_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url?: string;
  duration_seconds?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export function useAudioJobs(chapterId?: string) {
  const [jobs, setJobs] = useState<AudioJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!chapterId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audio_jobs')
          .select('*')
          .eq('chapter_id', chapterId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error('Error fetching audio jobs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch audio jobs');
      } finally {
        setLoading(false);
      }
    };

    const subscribeToJobs = () => {
      if (!chapterId) return;

      const subscription = supabase
        .channel('audio_jobs')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'audio_jobs',
            filter: `chapter_id=eq.${chapterId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setJobs((current) => [payload.new as AudioJob, ...current]);
            } else if (payload.eventType === 'UPDATE') {
              setJobs((current) =>
                current.map((job) =>
                  job.id === payload.new.id ? (payload.new as AudioJob) : job
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setJobs((current) =>
                current.filter((job) => job.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    if (chapterId) {
      fetchJobs();
      const cleanup = subscribeToJobs();
      return cleanup;
    }
  }, [chapterId]);

  const fetchJobs = async () => {
    if (!chapterId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audio_jobs')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching audio jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audio jobs');
    } finally {
      setLoading(false);
    }
  };

  const generateAudio = async (text: string, voice: string = 'female'): Promise<AudioJob> => {
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    setError(null);
    
    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterId,
          text,
          voice
        }),
      });

      if (!response.ok) {
        throw new Error(`Audio generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Fetch the updated job from database
      await fetchJobs();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audio generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getLatestJob = (): AudioJob | undefined => {
    return jobs.length > 0 ? jobs[0] : undefined;
  };

  const getJobByStatus = (status: AudioJob['status']): AudioJob[] => {
    return jobs.filter((job) => job.status === status);
  };

  return {
    jobs,
    loading,
    error,
    generateAudio,
    refetch: fetchJobs,
    getLatestJob,
    getJobByStatus
  };
}