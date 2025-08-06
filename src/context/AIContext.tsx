'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { detectBookType } from '@/utils/bookTypeDetection';

interface BookContext {
  bookTitle?: string;
  bookDescription?: string;
  bookType?: 'fiction' | 'non-fiction';
  genre?: string;
  targetAudience?: string[];
  readingLevel?: string;
  currentChapterTitle?: string;
  currentChapterNumber?: number;
  currentChapterContent?: string;
  currentChapterOutline?: string;
  wordCount?: number;
  fullBookContent?: string;
  previousChapters?: string;
  chapterSummaries?: string[];
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

  const isContextTooLarge = useCallback((context: string): boolean => {
    const APPROX_TOKEN_LIMIT = 12000;
    return estimateTokenCount(context) > APPROX_TOKEN_LIMIT;
  }, []);

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
  }, [isContextTooLarge]);

  // Generate sophisticated prompts (enhanced with book type awareness from old system)
  const generatePrompt = useCallback((type: AIPromptType, context?: BookContext): string => {
    const bookInfo = context?.bookTitle ? ` for "${context.bookTitle}"` : '';
    const chapterInfo = context?.currentChapterTitle ? ` in the chapter "${context.currentChapterTitle}"` : '';
    const bookType = context?.bookType || detectBookType(context?.genre);
    const isNonFiction = bookType === 'non-fiction';
    
    switch (type) {
      case AIPromptType.CHAPTER_IDEA:
        if (isNonFiction) {
          return `Please write the beginning of this chapter${chapterInfo}${bookInfo}. Write exactly 3500 characters of practical, instructional content that teaches valuable concepts. Use the chapter outline as your guide but write clear, authoritative prose that explains, guides, and provides actionable insights. Focus on frameworks, examples, and practical applications. ${context?.currentChapterOutline ? `Chapter outline: ${context.currentChapterOutline}` : ''} Start writing now:`;
        }
        return `Please write the beginning of this chapter${chapterInfo}${bookInfo}. Write exactly 3500 characters of engaging narrative content that starts the chapter with compelling storytelling. Use the chapter outline as your guide but write full narrative prose that develops characters, advances plot, and creates emotional engagement. ${context?.currentChapterOutline ? `Chapter outline: ${context.currentChapterOutline}` : ''} Start writing now:`;
        
      case AIPromptType.PLOT_DEVELOPMENT:
        if (isNonFiction) {
          return `Continue writing this chapter${chapterInfo}${bookInfo} from where it left off. Write exactly 3500 characters that build on the existing content logically and progressively. Focus on teaching additional concepts, providing more examples, or offering deeper insights into the topic. Maintain instructional clarity and practical value. ${context?.currentChapterContent ? `Existing content: ${context.currentChapterContent}` : ''} Continue writing now:`;
        }
        return `Continue writing this chapter${chapterInfo}${bookInfo} from where it left off. Write exactly 3500 characters that continue the story naturally from the existing content. Advance the plot, develop characters further, and maintain narrative tension and engagement. ${context?.currentChapterContent ? `Existing content: ${context.currentChapterContent}` : ''} Continue writing now:`;
        
      case AIPromptType.CHARACTER_DEVELOPMENT:
        if (isNonFiction) {
          return `Suggest ways to better connect with readers and make the content more engaging${chapterInfo}${bookInfo}. How can I add more relatable examples, case studies, or personal anecdotes? Focus on making the instructional content more human and accessible.`;
        }
        return `Suggest ways to develop character arcs${chapterInfo}${bookInfo}. How can I show growth, change, or reveal new aspects of the characters? Focus on authentic character moments, emotional depth, and meaningful development that serves the story.`;
        
      case AIPromptType.STYLE_IMPROVEMENT:
        if (isNonFiction) {
          return `Please rewrite and improve this entire chapter${chapterInfo}${bookInfo}. Take the existing content and enhance it for clarity, authority, and practical value. Improve the instructional flow, add better examples, and make complex concepts more accessible. Maintain the same key concepts but make the teaching more effective and engaging for audio consumption. ${context?.currentChapterContent ? `Current chapter content: ${context.currentChapterContent}` : ''} Improved version:`;
        }
        return `Please rewrite and improve this entire chapter${chapterInfo}${bookInfo}. Take the existing content and make it better - improve narrative flow, character development, dialogue, and descriptive language. Enhance emotional engagement and story pacing while maintaining the same plot events. Keep it around the same length but make every sentence more impactful. ${context?.currentChapterContent ? `Current chapter content: ${context.currentChapterContent}` : ''} Improved version:`;
        
      case AIPromptType.GENERAL:
      default:
        if (isNonFiction) {
          return `I'm working on my ${context?.genre || 'non-fiction'} book${bookInfo}${chapterInfo ? ` and specifically this chapter${chapterInfo}` : ''}. Can you help me create more valuable, practical content that teaches and guides readers effectively?`;
        }
        return `I'm working on my ${context?.genre || 'fiction'} book${bookInfo}${chapterInfo ? ` and specifically this chapter${chapterInfo}` : ''}. Can you help me with creative ideas, character development, plot enhancement, and storytelling guidance?`;
    }
  }, []);

  const buildContextualMessage = useCallback((message: string, context?: BookContext): string => {
    if (!context) return message;

    let contextualMessage = '';
    
    // Detect book type if not provided (enhanced from old system)
    const bookType = context.bookType || detectBookType(context.genre);
    
    // Build rich context based on mode
    if (contextMode === 'full' && context.fullBookContent) {
      contextualMessage = optimizeContext(context.fullBookContent, message);
    } else if (contextMode === 'book' && context.bookTitle) {
      contextualMessage += `Book Context: "${context.bookTitle}"`;
      if (context.bookDescription) {
        contextualMessage += ` - ${context.bookDescription}`;
      }
      
      // Add book metadata for better AI context (enhanced from old system)
      contextualMessage += `\nType: ${bookType}`;
      
      if (context.genre) {
        contextualMessage += `\nGenre: ${context.genre}`;
      }
      if (context.targetAudience && context.targetAudience.length > 0) {
        contextualMessage += `\nTarget Audience: ${context.targetAudience.join(', ')}`;
      }
      if (context.readingLevel) {
        contextualMessage += `\nReading Level: ${context.readingLevel}`;
      }
      
      if (context.totalChapters) {
        contextualMessage += ` (${context.totalChapters} chapters)`;
      }
      contextualMessage += `\n\n`;
    }
    
    // Add previous chapters context for better story continuity
    if (context.chapterSummaries && context.chapterSummaries.length > 0) {
      contextualMessage += `Story so far:\n`;
      context.chapterSummaries.forEach((summary, index) => {
        contextualMessage += `Chapter ${index + 1}: ${summary}\n`;
      });
      contextualMessage += `\n`;
    }

    // Add current chapter context (mode-aware)
    if (context.currentChapterTitle) {
      contextualMessage += `Currently working on: "${context.currentChapterTitle}"`;
      if (context.currentChapterNumber) {
        contextualMessage += ` (Chapter ${context.currentChapterNumber})`;
      }
      
      // MODE-AWARE CONTEXT BUILDING
      if (context.currentChapterContent) {
        // WRITE MODE: User is actively writing, show written content
        const preview = context.currentChapterContent.substring(0, 500);
        contextualMessage += `\n\n📝 Current chapter content: "${preview}${context.currentChapterContent.length > 500 ? '...' : ''}"`;
        
        // Show outline as background reference in write mode
        if (context.currentChapterOutline) {
          contextualMessage += `\n\n📋 Chapter plan (for reference): "${context.currentChapterOutline}"`;
        }
        
        if (context.wordCount) {
          contextualMessage += `\n\nWord count: ${context.wordCount}`;
        }
      } else if (context.currentChapterOutline) {
        // OUTLINE MODE: User is planning, show outline content prominently
        contextualMessage += `\n\n📋 Chapter outline/plan: "${context.currentChapterOutline}"`;
        contextualMessage += `\n\n💡 Focus: Help with planning, outlining, and research for this chapter.`;
      }
      
      contextualMessage += `\n\n`;
    }
    
    contextualMessage += `User question: ${message}`;
    
    return contextualMessage;
  }, [optimizeContext, contextMode]);

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
  }, [contextMode, messageHistory, optimizeContext, buildContextualMessage]);

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
          genre: options?.genre,
          targetAudience: options?.targetAudience,
          chapterCount: options?.chapterCount || 10,
          existingOutline: options?.existingOutline
        }),
      });

      if (!response.ok) {
        throw new Error(`Outline generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        const detailedError = data.details ? `${data.error}: ${data.details}` : data.error;
        throw new Error(detailedError);
      }

      return data.outline || [];
    } catch (err) {
      let errorMessage = 'Outline generation failed';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      console.error('AI Context outline error:', err);
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