'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface BookContext {
  bookTitle?: string;
  bookDescription?: string; 
  currentChapterTitle?: string;
  currentChapterNumber?: number;
  currentChapterContent?: string;
  wordCount?: number;
  fullBookContent?: string;
  previousChapters?: string;
  totalChapters?: number;
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

// AI Prompt Types (upgraded from old system)
export enum AIPromptType {
  CHAPTER_IDEA = 'chapter_idea',
  PLOT_DEVELOPMENT = 'plot_development', 
  CHARACTER_DEVELOPMENT = 'character_development',
  STYLE_IMPROVEMENT = 'style_improvement',
  GENERAL = 'general'
}

export type AIContextMode = 'chapter' | 'book' | 'full';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIContextType {
  sendMessage: (message: string, context?: BookContext, conversationId?: string) => Promise<string>;
  generateOutline: (title: string, description: string, options?: OutlineOptions) => Promise<OutlineResult[]>;
  generatePrompt: (type: AIPromptType, context?: BookContext) => string;
  setContextMode: (mode: AIContextMode) => void;
  clearConversation: (conversationId?: string) => void;
  optimizeContext: (fullContext: string, message: string) => string;
  contextMode: AIContextMode;
  isLoading: boolean;
  error: string | null;
  messageHistory: Record<string, ChatMessage[]>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextMode, setContextMode] = useState<AIContextMode>('chapter');
  const [messageHistory, setMessageHistory] = useState<Record<string, ChatMessage[]>>({});

  // Token estimation for context optimization (from old system)
  const estimateTokenCount = (text: string): number => {
    return Math.ceil(text.length / 4);
  };

  const isContextTooLarge = (context: string): boolean => {
    const APPROX_TOKEN_LIMIT = 12000;
    return estimateTokenCount(context) > APPROX_TOKEN_LIMIT;
  };

  // Advanced context optimization (upgraded from old system)
  const optimizeContext = useCallback((fullContext: string, userMessage: string): string => {
    if (!isContextTooLarge(fullContext)) {
      return fullContext;
    }
    
    console.log('Context is very large, optimizing for token usage');
    
    // Extract metadata
    const metadataMatch = fullContext.match(/Book Metadata:[\s\S]*?(?=\n\n)/);
    const metadata = metadataMatch ? metadataMatch[0] : '';
    
    const currentChapterMatch = fullContext.match(/Currently focused on:[\s\S]*?(?=\n\n)/);
    const currentChapterFocus = currentChapterMatch ? currentChapterMatch[0] : '';
    
    const chapterSections = fullContext.split(/=====\s*CHAPTER\s+\d+:/i);
    
    // Truncate chapter content while preserving structure
    const truncatedChapterSections = chapterSections.map(section => {
      const titleMatch = section.match(/^.*?(?=\n)/);
      const outlineMatch = section.match(/OUTLINE:[\s\S]*?(?=\n\nCONTENT:)/);
      const contentMatch = section.match(/CONTENT:([\s\S]*?)(?=\n\n|$)/);
      
      if (titleMatch && outlineMatch && contentMatch) {
        const title = titleMatch[0];
        const outline = outlineMatch[0];
        const content = contentMatch[1];
        const words = content.split(/\s+/);
        const previewWords = words.slice(0, 150);
        const contentPreview = previewWords.join(' ');
        
        return `${title}\n${outline}\nCONTENT: ${contentPreview}...\n[Content truncated for brevity]\n`;
      }
      
      return section;
    });
    
    let optimizedContext = `${metadata}\n\n`;
    if (currentChapterFocus) {
      optimizedContext += `${currentChapterFocus}\n\n`;
    }
    
    optimizedContext += "NOTE: The following is an abbreviated version of all chapters. Full content has been truncated to work within token limits.\n\n";
    truncatedChapterSections.forEach((section, index) => {
      if (index > 0) {
        optimizedContext += `===== CHAPTER ${index}: ${section}\n`;
      }
    });
    
    optimizedContext += `\nUser question: ${userMessage}`;
    
    console.log(`Reduced context from ~${estimateTokenCount(fullContext)} to ~${estimateTokenCount(optimizedContext)} tokens`);
    
    return optimizedContext;
  }, []);

  // Generate sophisticated prompts (upgraded from old system)
  const generatePrompt = useCallback((type: AIPromptType, context?: BookContext): string => {
    const bookInfo = context?.bookTitle ? ` for "${context.bookTitle}"` : '';
    const chapterInfo = context?.currentChapterTitle ? ` in the chapter "${context.currentChapterTitle}"` : '';
    
    switch (type) {
      case AIPromptType.CHAPTER_IDEA:
        return `Generate three creative ideas for a new chapter${bookInfo}. Focus on advancing the plot in an interesting way and maintaining consistency with the existing story.${context?.currentChapterContent ? ` Current chapter progress: ${context.currentChapterContent.substring(0, 200)}...` : ''}`;
        
      case AIPromptType.PLOT_DEVELOPMENT:
        return `Help me develop the plot further from the current point${bookInfo}${chapterInfo}. What interesting complications, twists, or character developments could I introduce? Consider the story's current direction and momentum.`;
        
      case AIPromptType.CHARACTER_DEVELOPMENT:
        return `Suggest ways to develop character arcs${chapterInfo}${bookInfo}. How can I show growth, change, or reveal new aspects of the characters? Focus on authentic character moments and development.`;
        
      case AIPromptType.STYLE_IMPROVEMENT:
        return `Please analyze my writing style${chapterInfo}${bookInfo} and suggest improvements for clarity, engagement, and flow. Look at sentence structure, pacing, dialogue, and descriptive language.`;
        
      case AIPromptType.GENERAL:
      default:
        return `I'm working on my book${bookInfo}${chapterInfo ? ` and specifically this chapter${chapterInfo}` : ''}. Can you help me with some creative ideas and writing guidance?`;
    }
  }, []);

  const buildContextualMessage = (message: string, context?: BookContext): string => {
    if (!context) return message;

    let contextualMessage = '';
    
    // Build rich context based on mode
    if (contextMode === 'full' && context.fullBookContent) {
      contextualMessage = optimizeContext(context.fullBookContent, message);
    } else if (contextMode === 'book' && context.bookTitle) {
      contextualMessage += `Book Context: "${context.bookTitle}"`;
      if (context.bookDescription) {
        contextualMessage += ` - ${context.bookDescription}`;
      }
      if (context.totalChapters) {
        contextualMessage += ` (${context.totalChapters} chapters)`;
      }
      contextualMessage += `\n\n`;
    }
    
    // Add current chapter context
    if (context.currentChapterTitle) {
      contextualMessage += `Currently working on: "${context.currentChapterTitle}"`;
      if (context.currentChapterNumber) {
        contextualMessage += ` (Chapter ${context.currentChapterNumber})`;
      }
      if (context.currentChapterContent) {
        const preview = context.currentChapterContent.substring(0, 500);
        contextualMessage += `\n\nCurrent chapter content: "${preview}${context.currentChapterContent.length > 500 ? '...' : ''}"`;
      }
      if (context.wordCount) {
        contextualMessage += `\n\nWord count: ${context.wordCount}`;
      }
      contextualMessage += `\n\n`;
    }
    
    contextualMessage += `User question: ${message}`;
    
    return contextualMessage;
  };

  const sendMessage = useCallback(async (
    message: string, 
    context?: BookContext, 
    conversationId: string = 'default'
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build contextual message
      const contextualMessage = buildContextualMessage(message, context);
      
      // Add to message history
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      setMessageHistory(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), userMessage]
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: contextualMessage }],
          context,
          conversationHistory: messageHistory[conversationId] || []
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || '',
        timestamp: new Date().toISOString()
      };

      // Add assistant response to history
      setMessageHistory(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), assistantMessage]
      }));

      return data.message || '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI request failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [contextMode, messageHistory, optimizeContext]);

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
          options
        }),
      });

      if (!response.ok) {
        throw new Error(`Outline generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.outline || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Outline generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = useCallback((conversationId: string = 'default') => {
    setMessageHistory(prev => ({
      ...prev,
      [conversationId]: []
    }));
  }, []);

  const value: AIContextType = {
    sendMessage,
    generateOutline,
    generatePrompt,
    setContextMode,
    clearConversation,
    optimizeContext,
    contextMode,
    isLoading,
    error,
    messageHistory
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}