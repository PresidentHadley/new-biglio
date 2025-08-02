'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import Link from 'next/link';

import { AudioGenerationButton } from '@/components/AudioGenerationButton';
import { AIAssistantChat } from '@/components/AIAssistantChat';

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
  duration_seconds: number;
  audio_url?: string;
}

export default function BookEditor() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const bookId = params.id as string;
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  // Form states
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [isWritingChapter, setIsWritingChapter] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // const aiContext = useContext(AIContext); // TODO: Implement AI chat functionality

  const fetchBookData = async () => {
    try {
      const { data, error } = await supabase
        .from('biglios')
        .select('*')
        .eq('id', bookId)
        .single();
      
      if (error) throw error;
      setBook(data);
    } catch (error) {
      console.error('Error fetching book:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('biglio_id', bookId)
        .order('chapter_number', { ascending: true });
      
      if (error) throw error;
      setChapters(data || []);
      
      // Select first chapter by default
      if (data && data.length > 0 && !selectedChapter) {
        setSelectedChapter(data[0]);
        setEditTitle(data[0].title);
        setEditContent(data[0].content);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
      return;
    }
    
    if (bookId && user) {
      setShowAuthModal(false);
      fetchBookData();
      fetchChapters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, user, authLoading]);

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
          order_index: nextChapterNumber,
          is_published: false,
          duration_seconds: 0
        })
        .select()
        .single();

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
      const { error } = await supabase
        .from('chapters')
        .update({
          title: editTitle,
          content: editContent
        })
        .eq('id', selectedChapter.id);

      if (error) throw error;

      setIsEditing(false);
      fetchChapters();
    } catch (error) {
      console.error('Error saving chapter:', error);
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

  const insertAIContent = (content: string) => {
    // Insert AI content at cursor position or append to current content
    const insertion = editContent ? '\n\n' + content : content;
    setEditContent(prev => prev + insertion);
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const startWritingChapter = async () => {
    if (!selectedChapter) return;
    
    setIsWritingChapter(true);
    try {
      // Call AI to start writing this chapter
      const prompt = `Start writing this chapter for me. Write approximately 3500 characters of engaging content that will sound great as an audiobook. 

Chapter: "${selectedChapter.title}"
Current content: "${editContent}"

Please write in a conversational, engaging style suitable for audio. ${editContent ? 'Continue from where the content left off.' : 'Start from the beginning.'}`;
      
      // This would use the AI context - for now, we'll add placeholder
      const aiContent = "This is where the AI would generate chapter content...";
      insertAIContent(aiContent);
    } catch (error) {
      console.error('Error starting chapter:', error);
    } finally {
      setIsWritingChapter(false);
    }
  };

  const finishChapter = async () => {
    if (!selectedChapter) return;
    
    setIsWritingChapter(true);
    try {
      // Call AI to finish this chapter
      const prompt = `Please finish this chapter for me. Write approximately 3500 characters to bring this chapter to a satisfying conclusion.

Chapter: "${selectedChapter.title}"
Current content: "${editContent}"

Please write a compelling ending that flows naturally from the existing content and will sound great as an audiobook.`;
      
      // This would use the AI context - for now, we'll add placeholder  
      const aiContent = "This is where the AI would generate chapter conclusion...";
      insertAIContent(aiContent);
    } catch (error) {
      console.error('Error finishing chapter:', error);
    } finally {
      setIsWritingChapter(false);
    }
  };

  const getCharacterCount = () => editContent.length;
  const getWordCount = () => editContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isNearLimit = () => getCharacterCount() > 6500; // Warning at 6500
  const isOverLimit = () => getCharacterCount() > 7500; // Hard limit at 7500

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-900 mt-4">Loading book...</p>
        </div>
      </div>
    );
  }

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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar - Chapters List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">← Dashboard</Link>
          <h2 className="text-xl font-bold text-gray-900 mt-2 truncate">{book.title}</h2>
          <p className="text-gray-600 text-sm">{chapters.length} chapters</p>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowCreateChapter(!showCreateChapter)}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
          >
            ➕ New Chapter
          </button>
        </div>

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

        <div className="flex-1 overflow-y-auto">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              onClick={() => selectChapter(chapter)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedChapter?.id === chapter.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-semibold truncate">{chapter.title}</h3>
                  <p className="text-gray-600 text-sm">Chapter {chapter.chapter_number}</p>
                  <p className="text-gray-500 text-xs">{chapter.content.length} characters</p>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  {chapter.content.trim() && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      ✍️
                    </span>
                  )}
                  {chapter.content.trim() && chapter.content.length <= 7500 && !chapter.audio_url && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch('/api/audio/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              chapterId: chapter.id,
                              text: chapter.content,
                              voice: 'female'
                            })
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            console.log('Audio generated:', result.audioUrl);
                            // Refresh chapters to show new audio
                            fetchChapters();
                          } else {
                            console.error('Audio generation failed');
                          }
                        } catch (error) {
                          console.error('Error generating audio:', error);
                        }
                      }}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-full transition-colors"
                      title="Generate audio"
                    >
                      🎵
                    </button>
                  )}
                  {chapter.audio_url && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      🔊
                    </span>
                  )}
                  {chapter.content.length > 7500 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full" title="Over character limit">
                      ⚠️
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChapter ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedChapter.title}</h1>
                  <p className="text-gray-600">Chapter {selectedChapter.chapter_number}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAIChat(!showAIChat)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition-colors"
                  >
                    🤖 AI Assistant
                  </button>
                  <AudioGenerationButton
                    chapterId={selectedChapter.id}
                    chapterTitle={selectedChapter.title}
                    chapterContent={selectedChapter.content}
                    existingAudioUrl={selectedChapter.audio_url}
                    onAudioGenerated={(audioUrl) => {
                      console.log('Audio generated:', audioUrl);
                      setSelectedChapter(prev => prev ? { ...prev, audio_url: audioUrl } : null);
                      fetchChapters();
                    }}
                  />
                  <Link
                    href={`/book/${bookId}/outline`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold transition-colors"
                  >
                    📋 Outline
                  </Link>
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 flex overflow-hidden">
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
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={saveChapter}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
                        >
                          💾 Save Chapter
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        
                        {/* AI Writing Assistance */}
                        <button
                          onClick={startWritingChapter}
                          disabled={isWritingChapter}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
                        >
                          {isWritingChapter ? '✍️ Writing...' : '✍️ Start Writing'}
                        </button>
                        <button
                          onClick={finishChapter}
                          disabled={isWritingChapter || !editContent.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
                        >
                          {isWritingChapter ? '✍️ Writing...' : '🏁 Finish Chapter'}
                        </button>
                      </div>
                      
                      {/* Audio Generation in Edit Mode */}
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Audio Generation</h4>
                        <AudioGenerationButton
                          chapterId={selectedChapter.id}
                          chapterTitle={editTitle}
                          chapterContent={editContent}
                          existingAudioUrl={selectedChapter.audio_url}
                          disabled={isOverLimit()}
                          onAudioGenerated={(audioUrl) => {
                            // Update the chapter with the new audio URL
                            setSelectedChapter(prev => prev ? { ...prev, audio_url: audioUrl } : null);
                          }}
                        />
                        {isOverLimit() && (
                          <p className="text-red-600 text-xs mt-2">
                            ⚠️ Chapter exceeds 7,500 character limit. Please reduce content to enable audio generation.
                          </p>
                        )}
                      </div>
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
                        <p className="text-gray-500 italic bg-gray-50 p-6 rounded border border-gray-200">No content yet. Click &quot;Edit&quot; to start writing.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
                      >
                        ✏️ Edit Chapter
                      </button>
                      
                      {/* Audio Generation */}
                      <AudioGenerationButton
                        chapterId={selectedChapter.id}
                        chapterTitle={selectedChapter.title}
                        chapterContent={selectedChapter.content}
                        existingAudioUrl={selectedChapter.audio_url}
                        onAudioGenerated={(audioUrl) => {
                          // Update the chapter with the new audio URL
                          setSelectedChapter(prev => prev ? { ...prev, audio_url: audioUrl } : null);
                          fetchChapters(); // Refresh chapters to update UI
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* AI Chat Sidebar - Fixed Desktop Layout */}
              {showAIChat && (
                <div className="w-96 bg-white border-l border-gray-200 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🤖</span>
                      <h3 className="text-lg font-bold text-gray-900">AI Assistant</h3>
                    </div>
                    <button
                      onClick={() => setShowAIChat(false)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <AIAssistantChat
                      book={book}
                      currentChapter={selectedChapter}
                      onContentSuggestion={(content) => {
                        // User can insert AI suggestions into their chapter
                        if (selectedChapter) {
                          setEditContent(prev => prev + '\n\n' + content);
                          setIsEditing(true);
                        }
                      }}
                      onInsertContent={insertAIContent}
                      className="h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Select a Chapter</h2>
              <p className="text-gray-600 mb-6">Choose a chapter from the sidebar to start writing</p>
              {chapters.length === 0 && (
                <button
                  onClick={() => setShowCreateChapter(true)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Create Your First Chapter
                </button>
              )}
            </div>
          </div>
        )}
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
