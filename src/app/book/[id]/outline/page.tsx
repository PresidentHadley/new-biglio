'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AIContext } from '@/context/AIContext';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  description?: string;
  total_chapters: number;
}

interface OutlineItem {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

export default function OutlineEditor() {
  const params = useParams();
  const bookId = params.id as string;
  const [book, setBook] = useState<Book | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  // const [showManualAdd, setShowManualAdd] = useState(false); // TODO: Add manual item form
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  const aiContext = useContext(AIContext);

  useEffect(() => {
    if (bookId) {
      fetchBookData();
      loadOutline();
    }
  }, [bookId]);

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

  const loadOutline = async () => {
    try {
      setIsLoading(true);
      // For now, we'll store outline items as a simple mock
      // In a real implementation, you'd have an outline table
      setOutline([]);
    } catch (error) {
      console.error('Error loading outline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIOutline = async () => {
    if (!aiContext || !book) return;

    try {
      setIsGenerating(true);
      
      const promptText = aiPrompt || `Generate a comprehensive outline for a book titled "${book.title}"${book.description ? ` with the description: ${book.description}` : ''}. Create 8-12 chapters with engaging titles and detailed descriptions.`;

      const result = await aiContext.generateOutline(
        book.title,
        book.description || '',
        {
          additionalPrompt: promptText,
          chapterCount: 10
        }
      );

      if (result && result.length > 0) {
        const generatedOutline: OutlineItem[] = result.map((item, index) => ({
          id: `ai-${Date.now()}-${index}`,
          title: item.title,
          description: item.summary || '',
          order_index: index + 1
        }));
        
        setOutline(generatedOutline);
        setAiPrompt('');
      }
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const addManualItem = () => {
    if (!newItemTitle.trim()) return;

    const newItem: OutlineItem = {
      id: `manual-${Date.now()}`,
      title: newItemTitle,
      description: newItemDescription,
      order_index: outline.length + 1
    };

    setOutline([...outline, newItem]);
    setNewItemTitle('');
    setNewItemDescription('');
    // setShowManualAdd(false); // TODO: Add manual item form
  };

  const removeItem = (id: string) => {
    setOutline(outline.filter(item => item.id !== id));
  };

  const createChaptersFromOutline = async () => {
    if (!book || outline.length === 0) return;

    try {
      const confirmCreate = window.confirm(`This will create ${outline.length} new chapters. Continue?`);
      if (!confirmCreate) return;

      for (const item of outline) {
        await supabase
          .from('chapters')
          .insert({
            biglio_id: bookId,
            title: item.title,
            content: `# ${item.title}\n\n${item.description}\n\n[Start writing your chapter content here...]`,
            chapter_number: item.order_index,
            order_index: item.order_index,
            is_published: false,
            duration_seconds: 0
          });
      }

      // Update book's total chapters
      await supabase
        .from('biglios')
        .update({ total_chapters: outline.length })
        .eq('id', bookId);

      alert('Chapters created successfully! You can now go to the editor to write them.');
    } catch (error) {
      console.error('Error creating chapters:', error);
      alert('Error creating chapters. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-900 mt-4">Loading outline...</p>
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">← Dashboard</Link>
            <h1 className="text-4xl font-bold text-gray-900 mt-2">📋 Outline Editor</h1>
            <h2 className="text-xl text-gray-700 mt-2">{book.title}</h2>
          </div>
          <div className="flex gap-4">
            <Link
              href={`/book/${bookId}`}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              ✍️ Write Chapters
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* AI Outline Generation */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">🤖 AI Outline Generation</h3>
            <div className="space-y-4">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Describe what you want in your book outline... (Leave empty for automatic generation based on "${book.title}")`}
                className="w-full h-32 p-4 bg-gray-50 text-gray-900 rounded border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none resize-none"
              />
              <button
                onClick={generateAIOutline}
                disabled={isGenerating || !aiContext}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
              >
                {isGenerating ? '🤖 Generating...' : '✨ Generate AI Outline'}
              </button>
              {!aiContext && (
                <p className="text-amber-600 text-sm bg-amber-50 p-3 rounded border border-amber-200">AI Context not available. Check your setup.</p>
              )}
            </div>
          </div>

          {/* Manual Item Addition */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">➕ Add Manual Item</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Chapter title"
                className="w-full p-3 bg-gray-50 text-gray-900 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder="Chapter description or summary"
                className="w-full h-24 p-3 bg-gray-50 text-gray-900 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none resize-none"
              />
              <button
                onClick={addManualItem}
                disabled={!newItemTitle.trim()}
                className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold transition-colors"
              >
                Add to Outline
              </button>
            </div>
          </div>
        </div>

        {/* Current Outline */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">📚 Current Outline</h3>
            {outline.length > 0 && (
              <button
                onClick={createChaptersFromOutline}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
              >
                🚀 Create {outline.length} Chapters
              </button>
            )}
          </div>

          {outline.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">No outline items yet</p>
              <p className="text-gray-500">Use AI generation or add items manually to create your book outline</p>
            </div>
          ) : (
            <div className="space-y-4">
              {outline.map((item, index) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-purple-600 text-white text-sm font-bold px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-4 text-red-500 hover:text-red-700 p-1"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
