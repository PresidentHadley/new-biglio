'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAI, AIPromptType, AIContextMode } from '@/context/AIContext';
import { 
  FaPaperPlane, 
  FaUser, 
  FaRobot, 
  FaSpinner,
  FaLightbulb,
  FaMagic,
  FaEdit,
  FaCog,
  FaTimes,
  FaBook,
  FaFileAlt,
  FaGlobe,
  FaCopy,
  FaPlus
} from 'react-icons/fa';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Book {
  id: string;
  title: string;
  description?: string;
  total_chapters?: number;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapter_number?: number;
}

interface AIAssistantChatProps {
  book?: Book;
  currentChapter?: Chapter;
  mode?: 'outline' | 'write';
  onContentSuggestion?: (content: string) => void;
  onInsertContent?: (content: string) => void;
  className?: string;
}

export function AIAssistantChat({
  book,
  currentChapter,
  mode = 'write',
  onContentSuggestion,
  onInsertContent,
  className = ''
}: AIAssistantChatProps) {
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    sendMessage: sendAIMessage, 
    generatePrompt,
    setContextMode,
    clearConversation,
    contextMode,
    isLoading, 
    error 
  } = useAI();

  // Mode-aware prompt types (upgraded from old system)
  const getPromptTypes = () => {
    if (mode === 'outline') {
      return [
        { 
          type: AIPromptType.CHAPTER_IDEA, 
          icon: FaLightbulb, 
          text: "Chapter Ideas", 
          description: "Generate creative chapter concepts",
          color: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
        },
        { 
          type: AIPromptType.PLOT_DEVELOPMENT, 
          icon: FaMagic, 
          text: "Plot Structure", 
          description: "Plan story arcs and plot development",
          color: "text-purple-600 bg-purple-50 hover:bg-purple-100"
        },
        { 
          type: AIPromptType.CHARACTER_DEVELOPMENT, 
          icon: FaUser, 
          text: "Character Planning", 
          description: "Design character arcs and relationships",
          color: "text-blue-600 bg-blue-50 hover:bg-blue-100"
        },
        { 
          type: AIPromptType.GENERAL, 
          icon: FaBook, 
          text: "Research", 
          description: "Research topics and background info",
          color: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
        }
      ];
    } else {
      return [
        { 
          type: AIPromptType.CHAPTER_IDEA, 
          icon: FaLightbulb, 
          text: "Start Writing", 
          description: "Get help starting this chapter",
          color: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
        },
        { 
          type: AIPromptType.PLOT_DEVELOPMENT, 
          icon: FaMagic, 
          text: "Continue Story", 
          description: "What happens next in the story",
          color: "text-purple-600 bg-purple-50 hover:bg-purple-100"
        },
        { 
          type: AIPromptType.CHARACTER_DEVELOPMENT, 
          icon: FaUser, 
          text: "Character Scene", 
          description: "Develop characters in this scene",
          color: "text-blue-600 bg-blue-50 hover:bg-blue-100"
        },
        { 
          type: AIPromptType.STYLE_IMPROVEMENT, 
          icon: FaEdit, 
          text: "Improve Writing", 
          description: "Enhance style and flow",
          color: "text-green-600 bg-green-50 hover:bg-green-100"
        }
      ];
    }
  };

  const promptTypes = getPromptTypes();

  // Context modes (upgraded from old system)
  const contextModes = [
    { 
      mode: 'chapter' as AIContextMode, 
      icon: FaFileAlt, 
      text: "Chapter Focus", 
      description: "Focus only on current chapter"
    },
    { 
      mode: 'book' as AIContextMode, 
      icon: FaBook, 
      text: "Book Context", 
      description: "Include full book context"
    },
    { 
      mode: 'full' as AIContextMode, 
      icon: FaGlobe, 
      text: "Full Context", 
      description: "Complete context with optimization"
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getWelcomeMessage = useCallback(() => {
    if (mode === 'outline') {
      if (book && currentChapter) {
        return `📋 **Research Mode Activated**

I'm helping you plan and outline "${book.title}". Currently viewing "${currentChapter.title}".

I can help with:
• **Chapter Ideas** - Generate creative concepts
• **Plot Structure** - Plan story arcs and development  
• **Character Planning** - Design character relationships
• **Research** - Background info and world-building

**Context: ${contextMode.charAt(0).toUpperCase() + contextMode.slice(1)} Mode**

What would you like to plan or research?`;
      } else if (book) {
        return `📋 **Research Mode** for "${book.title}"\n\nI'm here to help you plan, outline, and research. What aspect of your book would you like to work on?`;
      }
      return `📋 **Research Mode**\n\nI'm here to help you plan and outline your book. What would you like to explore?`;
    } else {
      if (book && currentChapter) {
        return `✍️ **Writing Mode Activated**

Ready to write "${currentChapter.title}" in "${book.title}".

I can help you:
• **Start Writing** - Get the chapter flowing
• **Continue Story** - What happens next
• **Character Scenes** - Develop characters
• **Improve Writing** - Enhance style and flow

**Context: ${contextMode.charAt(0).toUpperCase() + contextMode.slice(1)} Mode**

Let's create something amazing!`;
      } else if (book) {
        return `✍️ **Writing Mode** for "${book.title}"\n\nI'm here to help you write and improve your content. Select a chapter to begin!`;
      }
      return `✍️ **Writing Mode**\n\nI'm ready to help you write! What would you like to work on?`;
    }
  }, [mode, book, currentChapter, contextMode]);

  useEffect(() => {
    // Update welcome message when mode, book, or chapter changes
    const welcomeMessage: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: getWelcomeMessage(),
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [getWelcomeMessage]);

  const buildContext = () => {
    return {
      bookTitle: book?.title || '',
      bookDescription: book?.description || '',
      currentChapterTitle: currentChapter?.title || '',
      currentChapterNumber: currentChapter?.chapter_number || 0,
      currentChapterContent: currentChapter?.content || '',
      wordCount: currentChapter?.content?.length || 0,
      totalChapters: book?.total_chapters || 0
    };
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const context = buildContext();
      const conversationId = book && currentChapter ? 
        `${book.id}-${currentChapter.id}` : 
        book?.id || 'general';

      const response = await sendAIMessage(content, context, conversationId);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If it's a content suggestion and callback is provided
      if (onContentSuggestion && response.length > 100) {
        // Check if response seems like it could be content
        const isContentSuggestion = content.toLowerCase().includes('write') || 
                                   content.toLowerCase().includes('continue') ||
                                   content.toLowerCase().includes('content');
        if (isContentSuggestion) {
          onContentSuggestion(response);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handlePromptType = (type: AIPromptType) => {
    const context = buildContext();
    const prompt = generatePrompt(type, context);
    sendMessage(prompt);
  };

  const handleContextModeChange = (mode: AIContextMode) => {
    setContextMode(mode);
    
    // Add a system message about the mode change
    const modeMessage: ChatMessage = {
      id: `mode-${Date.now()}`,
      role: 'assistant',
      content: `🔄 Context mode changed to **${mode.charAt(0).toUpperCase() + mode.slice(1)}**. ${
        mode === 'chapter' ? 'I\'ll focus only on the current chapter.' :
        mode === 'book' ? 'I\'ll consider the full book context.' :
        'I\'ll use complete context with smart optimization.'
      }`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, modeMessage]);
  };

  const handleClearConversation = () => {
    const conversationId = book && currentChapter ? 
      `${book.id}-${currentChapter.id}` : 
      book?.id || 'general';
    
    clearConversation(conversationId);
    setMessages([]);
    
    // Add welcome message back
    const welcomeMessage: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: getWelcomeMessage(),
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const insertContent = (content: string) => {
    if (onInsertContent) {
      onInsertContent(content);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Ultra-Compact Header */}
      <div className="p-2 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
        {/* Single Row: Title + Mode + Controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <FaRobot className="text-purple-600" size={16} />
            <h3 className="font-medium text-gray-900 text-sm">AI Assistant</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
              {mode === 'outline' ? '📋' : '✍️'}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Settings"
            >
              <FaCog size={12} />
            </button>
            <button
              onClick={handleClearConversation}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Clear conversation"
            >
              <FaTimes size={12} />
            </button>
          </div>
        </div>

        {/* Working On (if exists) + Quick Prompts */}
        <div className="space-y-1.5">
          {book && currentChapter && (
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium">{currentChapter.title}</span>
            </p>
          )}
          
          {/* Mini Quick Prompts */}
          <div className="grid grid-cols-2 gap-1">
            {promptTypes.map(({ type, icon: Icon, text, description, color }) => (
              <button
                key={type}
                onClick={() => handlePromptType(type)}
                disabled={isLoading}
                className={`flex items-center gap-1 p-1.5 rounded border border-gray-200 ${color} transition-colors text-left disabled:opacity-50`}
                title={description}
              >
                <Icon size={10} />
                <span className="font-medium text-xs">{text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">Context Mode</h4>
          <div className="grid grid-cols-1 gap-1.5">
            {contextModes.map(({ mode, icon: Icon, text, description }) => (
              <button
                key={mode}
                onClick={() => handleContextModeChange(mode)}
                className={`flex items-center gap-2 p-2 rounded border transition-colors text-left text-sm ${
                  contextMode === mode 
                    ? 'border-purple-300 bg-purple-50 text-purple-700' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className={contextMode === mode ? 'text-purple-600' : 'text-gray-400'} size={14} />
                <div>
                  <div className="font-medium text-xs">{text}</div>
                  <div className="text-xs text-gray-600">{description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages - Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FaRobot className="text-purple-600" size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-lg p-3'
                  : 'bg-gray-100 text-gray-900 rounded-lg'
              }`}
            >
              <div className={message.role === 'assistant' ? 'p-3 pb-2' : ''}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
              
              {/* Insert & Copy buttons for AI responses */}
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  <button
                    onClick={() => insertContent(message.content)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    title="Insert into editor"
                  >
                    <FaPlus size={10} />
                    Insert
                  </button>
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <FaCopy size={10} />
                    Copy
                  </button>
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FaUser className="text-blue-600" size={14} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FaSpinner className="text-purple-600 animate-spin" size={14} />
            </div>
            <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FaSpinner className="animate-spin" size={12} />
                AI is thinking...
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input at Bottom */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your AI writing assistant..."
            disabled={isLoading}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-gray-100"
          />
          <button
            onClick={() => sendMessage(inputMessage)}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <FaSpinner className="animate-spin" size={16} />
            ) : (
              <FaPaperPlane size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}