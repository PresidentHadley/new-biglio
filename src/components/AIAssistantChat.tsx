'use client';

import { useState, useEffect, useRef } from 'react';
import { useAI, AIPromptType, AIContextMode } from '@/context/AIContext';
import { 
  FaPaperPlane, 
  FaUser, 
  FaRobot, 
  FaSpinner,
  FaLightbulb,
  FaMagic,
  FaEdit,
  FaQuestionCircle,
  FaCog,
  FaTimes,
  FaBook,
  FaFileAlt,
  FaGlobe
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
  onContentSuggestion?: (content: string) => void;
  className?: string;
}

export function AIAssistantChat({ 
  book, 
  currentChapter, 
  onContentSuggestion,
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

  // Sophisticated prompt types (upgraded from old system)
  const promptTypes = [
    { 
      type: AIPromptType.CHAPTER_IDEA, 
      icon: FaLightbulb, 
      text: "Chapter Ideas", 
      description: "Generate creative ideas for new chapters",
      color: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
    },
    { 
      type: AIPromptType.PLOT_DEVELOPMENT, 
      icon: FaMagic, 
      text: "Plot Development", 
      description: "Help advance the plot with complications and twists",
      color: "text-purple-600 bg-purple-50 hover:bg-purple-100"
    },
    { 
      type: AIPromptType.CHARACTER_DEVELOPMENT, 
      icon: FaUser, 
      text: "Character Development", 
      description: "Suggest character arc development",
      color: "text-blue-600 bg-blue-50 hover:bg-blue-100"
    },
    { 
      type: AIPromptType.STYLE_IMPROVEMENT, 
      icon: FaEdit, 
      text: "Style Improvement", 
      description: "Analyze and improve writing style",
      color: "text-green-600 bg-green-50 hover:bg-green-100"
    },
    { 
      type: AIPromptType.GENERAL, 
      icon: FaQuestionCircle, 
      text: "General Help", 
      description: "Creative writing assistance",
      color: "text-gray-600 bg-gray-50 hover:bg-gray-100"
    }
  ];

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

  useEffect(() => {
    // Welcome message when component mounts
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [book, currentChapter]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getWelcomeMessage = () => {
    if (book && currentChapter) {
      return `Hi! I'm your advanced AI writing assistant. I can see you're working on "${currentChapter.title}" in "${book.title}". 

I have 5 sophisticated modes to help you:
• **Chapter Ideas** - Generate creative chapter concepts
• **Plot Development** - Advance your story with twists
• **Character Development** - Deepen character arcs  
• **Style Improvement** - Enhance your writing craft
• **General Help** - Creative writing guidance

Current context mode: **${contextMode.charAt(0).toUpperCase() + contextMode.slice(1)}**

How can I help you with your writing today?`;
    } else if (book) {
      return `Hi! I'm your AI writing assistant for "${book.title}". I have multiple specialized modes to help with different aspects of your writing. How can I assist you today?`;
    }
    return `Hi! I'm your AI writing assistant. I can help with chapter ideas, plot development, character arcs, style improvement, and general creative writing. What would you like to work on?`;
  };

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

  return (
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaRobot className="text-purple-600" size={20} />
            <h3 className="font-semibold text-gray-900">AI Writing Assistant</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              {contextMode.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <FaCog size={16} />
            </button>
            <button
              onClick={handleClearConversation}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>
        
        {book && currentChapter && (
          <p className="text-sm text-gray-600 mt-1">
            Working on: {currentChapter.title}
          </p>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Context Mode</h4>
          <div className="grid grid-cols-1 gap-2">
            {contextModes.map(({ mode, icon: Icon, text, description }) => (
              <button
                key={mode}
                onClick={() => handleContextModeChange(mode)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  contextMode === mode 
                    ? 'border-purple-300 bg-purple-50 text-purple-700' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className={contextMode === mode ? 'text-purple-600' : 'text-gray-400'} />
                <div>
                  <div className="font-medium">{text}</div>
                  <div className="text-sm text-gray-600">{description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Quick Writing Prompts</h4>
        <div className="grid grid-cols-2 gap-2">
          {promptTypes.map(({ type, icon: Icon, text, description, color }) => (
            <button
              key={type}
              onClick={() => handlePromptType(type)}
              disabled={isLoading}
              className={`flex items-center gap-2 p-3 rounded-lg border border-gray-200 ${color} transition-colors text-left disabled:opacity-50`}
              title={description}
            >
              <Icon size={16} />
              <span className="font-medium text-sm">{text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
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
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {formatTime(message.timestamp)}
              </div>
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

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
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