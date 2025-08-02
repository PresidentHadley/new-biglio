'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface BookContext {
  title?: string;
  description?: string;
  genre?: string;
  chapters?: string[];
  [key: string]: unknown;
}

interface OutlineOptions {
  chapterCount?: number;
  genre?: string;
  targetAudience?: string;
  existingOutline?: unknown[];
  [key: string]: unknown;
}

interface OutlineResult {
  chapterNumber: number;
  title: string;
  summary: string;
  keyPoints: string[];
  estimatedWordCount: number;
}

interface AIContextType {
  sendMessage: (message: string, context?: BookContext) => Promise<string>;
  generateOutline: (title: string, description: string, options?: OutlineOptions) => Promise<OutlineResult[]>;
  isLoading: boolean;
  error: string | null;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string, context?: BookContext): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          context
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.message || '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI request failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOutline = async (title: string, description: string, options?: OutlineOptions): Promise<OutlineResult[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error(`Outline generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.outline;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Outline generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AIContextType = {
    sendMessage,
    generateOutline,
    isLoading,
    error
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI(): AIContextType {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}