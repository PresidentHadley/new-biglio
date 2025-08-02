'use client';

import { useState, useEffect, useRef } from 'react';
import { useAI } from '@/context/AIContext';
import { 
  FaPaperPlane, 
  FaUser, 
  FaRobot, 
  FaSpinner,
  FaLightbulb,
  FaMagic,
  FaEdit,
  FaQuestionCircle
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
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapter_number: number;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage: sendAIMessage, isLoading, error } = useAI();

  const quickPrompts = [
    { icon: FaLightbulb, text: "Give me ideas for this chapter", prompt: "What are some creative ideas I could explore in this chapter?" },
    { icon: FaMagic, text: "Improve this content", prompt: "How can I improve the content I've written so far?" },
    { icon: FaEdit, text: "Help with writing", prompt: "I'm stuck writing this chapter. Can you help me continue?" },
    { icon: FaQuestionCircle, text: "Writing tips", prompt: "What are some general writing tips for this type of content?" }
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
      return `Hi! I'm your AI writing assistant. I can see you're working on "${currentChapter.title}" in "${book.title}". How can I help you with your writing today?`;
    } else if (book) {
      return `Hi! I'm your AI writing assistant for "${book.title}". How can I help you with your writing today?`;
    }
    return `Hi! I'm your AI writing assistant. I'm here to help you with writing, brainstorming, and improving your content. What would you like to work on?`;
  };

  const buildContext = () => {
    const context = {
      bookTitle: book?.title || '',
      bookDescription: book?.description || '',
      currentChapterTitle: currentChapter?.title || '',
      currentChapterNumber: currentChapter?.chapter_number || 0,
      currentChapterContent: currentChapter?.content || '',
      wordCount: currentChapter?.content?.length || 0
    };
    return context;
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
      const contextualPrompt = `Context: You are helping a writer working on a book called "${context.bookTitle}"${context.bookDescription ? ` (${context.bookDescription})` : ''}. They are currently working on "${context.currentChapterTitle}" (Chapter ${context.currentChapterNumber})${context.currentChapterContent ? `. Current chapter content: "${context.currentChapterContent.substring(0, 500)}${context.currentChapterContent.length > 500 ? '...' : ''}"` : ''}. 

User question: ${content}

Please provide helpful, specific advice for their writing. Be encouraging and constructive.`;

      const response = await sendAIMessage(contextualPrompt, context);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
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
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <FaRobot className="text-purple-600" size={20} />
          <h3 className="font-semibold text-gray-900">AI Writing Assistant</h3>
        </div>
        {book && currentChapter && (
          <p className="text-sm text-gray-600 mt-1">
            Helping with: {currentChapter.title}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && (
                  <FaRobot className="text-purple-600 mt-1 flex-shrink-0" size={14} />
                )}
                {message.role === 'user' && (
                  <FaUser className="text-blue-200 mt-1 flex-shrink-0" size={14} />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <FaRobot className="text-purple-600" size={14} />
                <FaSpinner className="animate-spin text-gray-600" size={14} />
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 mb-3">Quick suggestions:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt.prompt)}
                className="flex items-center gap-2 p-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <prompt.icon className="text-purple-600 flex-shrink-0" size={14} />
                <span className="text-gray-700">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for writing help, ideas, or feedback..."
            className="flex-1 resize-none p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <FaPaperPlane size={14} />
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-2">
            Error: {error}
          </p>
        )}
      </div>
    </div>
  );
}