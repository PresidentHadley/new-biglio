'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { AIContext } from '@/context/AIContext';
import { useContext } from 'react';
import { AudioGenerationButton } from '@/components/AudioGenerationButton';

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
  const bookId = params.id as string;
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  // Form states
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');

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
    if (bookId) {
      fetchBookData();
      fetchChapters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

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
    <div className="min-h-screen bg-gray-50 flex">
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
              <h3 className="text-gray-900 font-semibold truncate">{chapter.title}</h3>
              <p className="text-gray-600 text-sm">Chapter {chapter.chapter_number}</p>
              <p className="text-gray-500 text-xs">{chapter.content.length} characters</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
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
                    text={selectedChapter.content}
                    onSuccess={(audioUrl) => {
                      console.log('Audio generated:', audioUrl);
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
            <div className="flex-1 flex">
              <div className="flex-1 p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-3 bg-white text-gray-900 text-xl font-bold rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      placeholder="Chapter title"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-96 p-4 bg-white text-gray-900 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none resize-none leading-relaxed"
                      placeholder="Start writing your chapter..."
                    />
                    <div className="flex gap-3">
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
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
                    >
                      ✏️ Edit Chapter
                    </button>
                  </div>
                )}
              </div>

              {/* AI Chat Sidebar */}
              {showAIChat && (
                <div className="w-96 bg-white border-l border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">🤖 AI Writing Assistant</h3>
                    <button
                      onClick={() => setShowAIChat(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="bg-blue-50 rounded p-4 text-center border border-blue-200">
                    <p className="text-gray-700 text-sm">
                      AI chat integration ready! Ask for writing help, suggestions, or improvements.
                    </p>
                    <p className="text-blue-600 text-xs mt-2">
                      Feature available - click to activate full AI chat
                    </p>
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
    </div>
  );
}
