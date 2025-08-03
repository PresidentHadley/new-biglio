'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAI } from '@/context/AIContext';
import { AuthModal } from '@/components/AuthModal';
import { AudioGenerationButton } from '@/components/AudioGenerationButton';
import { AIAssistantChat } from '@/components/AIAssistantChat';
import Link from 'next/link';

type EditorMode = 'outline' | 'write';

interface Book {
  id: string;
  title: string;
  description?: string;
  total_chapters: number;
  is_published: boolean;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapter_number: number;
  is_published: boolean;
  duration_seconds?: number;
  audio_url?: string;
}

export default function UnifiedBookEditor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { generateOutline } = useAI();

  // Get initial mode from URL params or default to 'write'
  const initialMode = (searchParams.get('mode') as EditorMode) || 'write';
  
  // Core state
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingChapter, setSavingChapter] = useState(false);

  // Chapter creation
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  const supabase = createClient();

  // Check authentication and load data
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    setShowAuthModal(false);
    if (bookId) {
      fetchBookData();
      fetchChapters();
    }
  }, [bookId, user, authLoading]);

  const fetchBookData = async () => {
    try {
      const { data, error } = await supabase
        .from('biglios')
        .select('id, title, description, total_chapters, is_published')
        .eq('id', bookId)
        .single();
      
      if (error) throw error;
      setBook(data as Book);
    } catch (error) {
      console.error('Error fetching book:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chapters')
        .select('id, title, content, chapter_number, is_published, duration_seconds, audio_url')
        .eq('biglio_id', bookId)
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      
      const chaptersData = (data as Chapter[]) || [];
      setChapters(chaptersData);
      
      // Auto-select first chapter if none selected
      if (chaptersData.length > 0 && !selectedChapter) {
        const firstChapter = chaptersData[0];
        setSelectedChapter(firstChapter);
        setEditTitle(firstChapter.title);
        setEditContent(firstChapter.content);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createChapter = async () => {
    if (!newChapterTitle.trim() || !book) return;

    try {
      const nextChapterNumber = Math.max(...chapters.map(c => c.chapter_number), 0) + 1;
      
      const { error } = await supabase
        .from('chapters')
        .insert({
          biglio_id: bookId,
          title: newChapterTitle,
          content: '',
          chapter_number: nextChapterNumber,
          is_published: false,
          duration_seconds: 0
        });

      if (error) throw error;

      // Update total chapters count
      await supabase
        .from('biglios')
        .update({ total_chapters: chapters.length + 1 })
        .eq('id', bookId);

      setNewChapterTitle('');
      setShowCreateChapter(false);
      fetchChapters();
      fetchBookData();
    } catch (error) {
      console.error('Error creating chapter:', error);
    }
  };

  const saveChapter = async () => {
    if (!selectedChapter) return;

    try {
      setSavingChapter(true);
      const { error } = await supabase
        .from('chapters')
        .update({
          title: editTitle,
          content: editContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChapter.id);

      if (error) throw error;

      // Update local state immediately
      setChapters(prev => prev.map(ch => 
        ch.id === selectedChapter.id 
          ? { ...ch, title: editTitle, content: editContent }
          : ch
      ));
      
      setSelectedChapter(prev => prev ? { ...prev, title: editTitle, content: editContent } : null);
      setIsEditing(false);
      
      console.log('Chapter saved successfully!');
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save chapter. Please try again.');
    } finally {
      setSavingChapter(false);
    }
  };

  const selectChapter = (chapter: Chapter) => {
    if (isEditing) {
      const confirmSwitch = window.confirm('You have unsaved changes. Switch chapters anyway?');
      if (!confirmSwitch) return;
    }
    
    setSelectedChapter(chapter);
    setEditTitle(chapter.title);
    setEditContent(chapter.content);
    setIsEditing(false);
  };

  const generateAIOutline = async () => {
    if (!book) return;

    try {
      setIsGeneratingOutline(true);
      
      const promptText = aiPrompt || `Generate a comprehensive outline for a book titled "${book.title}"${book.description ? ` with the description: ${book.description}` : ''}. Create 8-12 chapters with engaging titles and detailed descriptions.`;

      const result = await generateOutline(
        book.title,
        book.description || '',
        {
          additionalPrompt: promptText,
          chapterCount: 10
        }
      );

      if (result && result.length > 0) {
        // Create chapters from AI outline
        for (let i = 0; i < result.length; i++) {
          const chapter = result[i];
          await supabase
            .from('chapters')
            .insert({
              biglio_id: bookId,
              title: chapter.title,
              content: `# ${chapter.title}\n\n${chapter.summary || ''}\n\n[Start writing your chapter content here...]`,
              chapter_number: i + 1,
              is_published: false,
              duration_seconds: 0
            });
        }

        // Update book's total chapters
        await supabase
          .from('biglios')
          .update({ total_chapters: result.length })
          .eq('id', bookId);

        setAiPrompt('');
        fetchChapters();
        fetchBookData();
      }
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const getCharacterCount = () => editContent.length;
  const getWordCount = () => editContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isNearLimit = () => getCharacterCount() > 6500;
  const isOverLimit = () => getCharacterCount() > 7500;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-900 mt-4">Loading book...</p>
        </div>
      </div>
    );
  }

  // No book found
  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl text-gray-900 mb-4">Book not found</h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header with Mode Toggle */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('outline')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'outline' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 Outline Mode
            </button>
            <button
              onClick={() => setMode('write')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'write' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✍️ Write Mode
            </button>
          </div>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Chapters List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Chapters</h3>
              <span className="text-sm text-gray-600">{chapters.length} total</span>
            </div>
            
            <button
              onClick={() => setShowCreateChapter(!showCreateChapter)}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
            >
              ➕ Add Chapter
            </button>
          </div>

          {/* Chapter Creation Form */}
          {showCreateChapter && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <input
                type="text"
                placeholder="Chapter title"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="w-full p-2 bg-white text-gray-900 rounded border border-gray-300 focus:border-blue-500 focus:outline-none mb-2"
                onKeyPress={(e) => e.key === 'Enter' && createChapter()}
              />
              <div className="flex gap-2">
                <button
                  onClick={createChapter}
                  disabled={!newChapterTitle.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateChapter(false)}
                  className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Chapters List */}
          <div className="flex-1 overflow-y-auto">
            {chapters.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="mb-4">No chapters yet</p>
                {mode === 'outline' && (
                  <p className="text-sm">Use AI to generate an outline below</p>
                )}
              </div>
            ) : (
              chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  onClick={() => selectChapter(chapter)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChapter?.id === chapter.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">{chapter.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Chapter {chapter.chapter_number}</p>
                      <p className="text-xs text-gray-500">{chapter.content.length} characters</p>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      {chapter.content.trim() && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✍️
                        </span>
                      )}
                      {chapter.audio_url && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          🎵
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: Context-Aware Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {mode === 'outline' ? (
            /* OUTLINE MODE */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Book Summary */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">📖 Book Summary</h3>
                  <div className="prose max-w-none">
                    {selectedChapter ? (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Chapter {selectedChapter.chapter_number}: {selectedChapter.title}</h4>
                        {selectedChapter.content ? (
                          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded border">
                            {selectedChapter.content.substring(0, 500)}{selectedChapter.content.length > 500 ? '...' : ''}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No content yet. Switch to Write Mode to add content.</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-700 mb-4">{book.description || 'No description yet.'}</p>
                        <div className="bg-blue-50 p-4 rounded border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-2">📊 Book Stats</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700">Total Chapters:</span>
                              <span className="font-medium ml-2">{chapters.length}</span>
                            </div>
                            <div>
                              <span className="text-blue-700">Total Words:</span>
                              <span className="font-medium ml-2">
                                {chapters.reduce((total, ch) => total + ch.content.trim().split(/\s+/).filter(word => word.length > 0).length, 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Outline Generation */}
                {chapters.length === 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">🤖 AI Outline Generation</h3>
                    <div className="space-y-4">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={`Describe what you want in your book outline... (Leave empty for automatic generation based on "${book.title}")`}
                        className="w-full h-32 p-4 bg-gray-50 text-gray-900 rounded border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none resize-none"
                      />
                      <button
                        onClick={generateAIOutline}
                        disabled={isGeneratingOutline}
                        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                      >
                        {isGeneratingOutline ? '🤖 Generating...' : '✨ Generate AI Outline'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* WRITE MODE */
            selectedChapter ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chapter Header */}
                <div className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedChapter.title}</h2>
                      <p className="text-gray-600">Chapter {selectedChapter.chapter_number}</p>
                    </div>
                    <div className="flex gap-3">
                      <AudioGenerationButton
                        chapterId={selectedChapter.id}
                        chapterTitle={isEditing ? editTitle : selectedChapter.title}
                        chapterContent={isEditing ? editContent : selectedChapter.content}
                        existingAudioUrl={selectedChapter.audio_url}
                        onAudioGenerated={(audioUrl) => {
                          setSelectedChapter(prev => prev ? { ...prev, audio_url: audioUrl } : null);
                          fetchChapters();
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full p-3 bg-white text-gray-900 text-xl font-bold rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        placeholder="Chapter title"
                      />
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className={`w-full h-96 p-4 bg-white text-gray-900 rounded border leading-relaxed focus:outline-none resize-none ${
                            isOverLimit() 
                              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                              : isNearLimit()
                              ? 'border-yellow-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
                              : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                          }`}
                          placeholder="Start writing your chapter..."
                        />
                        
                        {/* Character count and warnings */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className={`${isOverLimit() ? 'text-red-600 font-bold' : isNearLimit() ? 'text-yellow-600 font-medium' : 'text-gray-600'}`}>
                              {getCharacterCount().toLocaleString()} / 7,500 characters
                            </span>
                            <span className="text-gray-500">
                              ~{getWordCount()} words
                            </span>
                          </div>
                          
                          {isOverLimit() && (
                            <span className="text-red-600 text-xs font-medium">
                              ⚠️ Over limit - Audio generation disabled
                            </span>
                          )}
                          {isNearLimit() && !isOverLimit() && (
                            <span className="text-yellow-600 text-xs font-medium">
                              ⚠️ Approaching character limit
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={saveChapter}
                          disabled={savingChapter}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-semibold transition-colors"
                        >
                          {savingChapter ? '💾 Saving...' : '💾 Save Chapter'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="prose max-w-none">
                        {selectedChapter.content ? (
                          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed bg-white p-6 rounded border border-gray-200 shadow-sm">
                            {selectedChapter.content}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic bg-gray-50 p-6 rounded border border-gray-200">No content yet. Click &ldquo;Edit&rdquo; to start writing.</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
                        >
                          ✏️ Edit Chapter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Select a Chapter</h2>
                  <p className="text-gray-600 mb-6">Choose a chapter from the sidebar to start writing</p>
                </div>
              </div>
            )
          )}
        </div>

        {/* RIGHT PANEL: AI Assistant */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h3 className="text-lg font-bold text-gray-900">AI Assistant</h3>
            </div>
            <div className="text-sm text-gray-600">
              {mode === 'outline' ? (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">📋 Research Mode</span>
              ) : (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">✍️ Writing Mode</span>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <AIAssistantChat
              book={book}
              currentChapter={selectedChapter || undefined}
              mode={mode}
              onContentSuggestion={(content) => {
                if (selectedChapter && mode === 'write') {
                  setEditContent(prev => prev + '\n\n' + content);
                  setIsEditing(true);
                }
              }}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          if (bookId && user) {
            fetchBookData();
            fetchChapters();
          }
        }}
      />
    </div>
  );
}