'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAI } from '@/context/AIContext';
import { AuthModal } from '@/components/AuthModal';
import { AudioGenerationButton } from '@/components/AudioGenerationButton';
import { AIAssistantChat } from '@/components/AIAssistantChat';

import Link from 'next/link';
import { 
  FaSave,
  FaListOl,
  FaVolumeUp,
  FaEdit,
  FaClipboardList
} from 'react-icons/fa';



type EditorMode = 'outline' | 'write';

interface Book {
  id: string;
  title: string;
  description?: string;
  total_chapters: number;
  is_published: boolean;
  voice_preference?: 'male' | 'female' | null;
  book_type?: 'fiction' | 'non-fiction';
  genre?: string;
  target_audience?: string[];
  reading_level?: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  outline_content?: string;
  summary?: string;
  chapter_number: number;
  is_published: boolean;
  duration_seconds?: number;
  audio_url?: string;
}

interface OutlineChapter {
  title: string;
  summary: string;
  keyPoints?: string[];
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
  const [editOutlineContent, setEditOutlineContent] = useState('');
  const [savingChapter, setSavingChapter] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Chapter creation
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [generatingChapterCount, setGeneratingChapterCount] = useState(1);
  const [showOutlineSuccess, setShowOutlineSuccess] = useState(false);
  const [outlinePreview, setOutlinePreview] = useState<OutlineChapter[]>([]);
  const [showOutlineConfirmation, setShowOutlineConfirmation] = useState(false);

  // Chapter Edit Modal State
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editModalTitle, setEditModalTitle] = useState('');
  const [editModalSummary, setEditModalSummary] = useState('');

  const supabase = createClient();

  // Hide success screen when mode changes
  useEffect(() => {
    setShowOutlineSuccess(false);
  }, [mode]);

  const fetchBookData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('biglios')
        .select('id, title, description, total_chapters, is_published, voice_preference, book_type, genre, target_audience, reading_level')
        .eq('id', bookId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - book not found
          console.log('Book not found:', bookId);
          setBook(null);
          setIsLoading(false);
          return;
        }
        throw error;
      }
      setBook(data as Book);
    } catch (error) {
      console.error('Error fetching book:', error);
      setBook(null);
      setIsLoading(false);
    }
  }, [supabase, bookId]);

  const fetchChapters = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chapters')
        .select('id, title, content, outline_content, summary, chapter_number, is_published, duration_seconds, audio_url')
        .eq('biglio_id', bookId)
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      
      const chaptersData = (data as Chapter[]) || [];
      setChapters(chaptersData);
      
      // Auto-select first chapter if none selected and chapters exist
      // Check current selectedChapter state instead of dependency
      if (chaptersData.length > 0) {
        setSelectedChapter(prevSelected => {
          if (!prevSelected && chaptersData.length > 0) {
            const firstChapter = chaptersData[0];
            setEditTitle(firstChapter.title);
            setEditContent(firstChapter.content || '');
            setEditOutlineContent(firstChapter.outline_content || '');
            return firstChapter;
          }
          return prevSelected;
        });
      }
      
      console.log('📚 Fetched chapters:', chaptersData.length, 'chapters');
      console.log('📋 Chapter details:', chaptersData.map(ch => ({ 
        id: ch.id, 
        title: ch.title, 
        number: ch.chapter_number,
        hasContent: !!ch.content,
        hasOutline: !!ch.outline_content,
        hasAudio: !!ch.audio_url
      })));
    } catch (error) {
      console.error('❌ Error fetching chapters:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, bookId]); // ← Removed selectedChapter dependency



  // Generate chapter summary for AI context
  const generateChapterSummary = useCallback(async (title: string, content: string): Promise<string | null> => {
    if (!content.trim() || content.length < 100) return null;
    
    try {
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (!response.ok) throw new Error('Failed to generate summary');
      
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error generating chapter summary:', error);
      return null;
    }
  }, []);

  // Save chapter content (for writing mode)
  const saveChapterContent = useCallback(async (chapterId: string, title: string, content: string) => {
    try {
      setSavingChapter(true);
      
      // Generate summary for AI context if content is substantial
      const summary = await generateChapterSummary(title, content);
      
      const { error } = await supabase
        .from('chapters')
        .update({ 
          title,
          content,
          summary: summary || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId);

      if (error) throw error;
      
      // Update local state with new content and summary
      setChapters(prev => prev.map(ch => 
        ch.id === chapterId 
          ? { ...ch, title, content, summary: summary || ch.summary }
          : ch
      ));

      // Show save success feedback
      setLastSaved(new Date());
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 3000);
    } catch (error) {
      console.error('Error saving chapter content:', error);
    } finally {
      setSavingChapter(false);
    }
  }, [supabase, generateChapterSummary]);

  // Save chapter outline (for outline mode)
  const saveChapterOutline = useCallback(async (chapterId: string, title: string, outlineContent: string) => {
    try {
      setSavingChapter(true);
      const { error } = await supabase
        .from('chapters')
        .update({ 
          title,
          outline_content: outlineContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId);

      if (error) throw error;
      
      // Update local state with new outline content
      setChapters(prev => prev.map(ch => 
        ch.id === chapterId 
          ? { ...ch, title, outline_content: outlineContent }
          : ch
      ));

      // Show save success feedback
      setLastSaved(new Date());
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 3000);
    } catch (error) {
      console.error('Error saving chapter outline:', error);
    } finally {
      setSavingChapter(false);
    }
  }, [supabase]);

  // Refs to store timeout IDs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const outlineTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Create debounced save functions
  const debouncedSave = useCallback((chapterId: string, title: string, content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveChapterContent(chapterId, title, content);
    }, 1000);
  }, [saveChapterContent]);

  const debouncedSaveOutline = useCallback((chapterId: string, title: string, outlineContent: string) => {
    if (outlineTimeoutRef.current) {
      clearTimeout(outlineTimeoutRef.current);
    }
    outlineTimeoutRef.current = setTimeout(() => {
      saveChapterOutline(chapterId, title, outlineContent);
    }, 1000);
  }, [saveChapterOutline]);

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
  }, [bookId, user, authLoading, fetchBookData, fetchChapters]);

  // Debug function to check database state
  const debugDatabaseState = async () => {
    console.log('🐛 DEBUG: Checking current database state...');
    const { data: allChapters } = await supabase
      .from('chapters')
      .select('*')
      .eq('biglio_id', bookId)
      .order('chapter_number', { ascending: true });
    
    console.log('🐛 DEBUG: All chapters in database:', allChapters);
    console.log('🐛 DEBUG: React state chapters:', chapters);
    console.log('🐛 DEBUG: Mismatch?', (allChapters || []).length !== chapters.length);
    
    // Check if there's an order_index field that's causing issues
    if (allChapters && allChapters.length > 0) {
      console.log('🔍 DEBUG: First chapter structure:', Object.keys(allChapters[0]));
      allChapters.forEach((ch, index) => {
        console.log(`📋 Chapter ${index + 1}:`, {
          id: ch.id,
          title: ch.title,
          chapter_number: ch.chapter_number,
          order_index: ch.order_index, // Check if this field exists
          created_at: ch.created_at
        });
      });
    }
  };

  const createChapter = async () => {
    if (!newChapterTitle.trim() || !book) return;

    try {
      // Debug current state before creation
      await debugDatabaseState();
      // Get fresh chapters directly from database to avoid state sync issues
      console.log('🔍 Fetching fresh chapters from database before creation...');
      const { data: freshChapters, error: fetchError } = await supabase
        .from('chapters')
        .select('id, title, chapter_number, order_index')
        .eq('biglio_id', bookId)
        .order('chapter_number', { ascending: true });
      
      if (fetchError) {
        console.error('❌ Error fetching existing chapters:', fetchError);
        throw fetchError;
      }
      
      console.log('📊 Fresh database query results:', {
        total_chapters: (freshChapters || []).length,
        chapters: (freshChapters || []).map(c => ({ 
          id: c.id, 
          title: c.title, 
          number: c.chapter_number 
        }))
      });
      
      // Calculate next chapter number and order_index using fresh database data
      const existingNumbers = (freshChapters || []).map(c => c.chapter_number as number).filter(n => typeof n === 'number');
      const existingOrderIndexes = (freshChapters || []).map(c => c.order_index as number).filter(n => typeof n === 'number');
      const nextChapterNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const nextOrderIndex = existingOrderIndexes.length > 0 ? Math.max(...existingOrderIndexes) + 1 : 1;
      
      console.log('🧮 Chapter number calculation:', {
        existing_numbers: existingNumbers,
        calculated_next_number: nextChapterNumber,
        max_existing: existingNumbers.length > 0 ? Math.max(...existingNumbers) : 'none'
      });
      
      console.log('📝 About to create chapter:', {
        title: newChapterTitle,
        biglio_id: bookId,
        chapter_number: nextChapterNumber,
        fresh_db_count: (freshChapters || []).length,
        react_state_count: chapters.length
      });
      
      // Try creating with a unique timestamp or order_index to avoid conflicts
      const insertData: {
        biglio_id: string;
        title: string;
        content: string;
        outline_content: string;
        summary: string | null;
        chapter_number: number;
        is_published: boolean;
        duration_seconds: number;
        order_index?: number;
      } = {
        biglio_id: bookId,
        title: newChapterTitle,
        content: '',
        outline_content: '',
        summary: null,
        chapter_number: nextChapterNumber,
        is_published: false,
        duration_seconds: 0
      };
      
      // Always add order_index to avoid constraint violations
      insertData.order_index = nextOrderIndex;
      
      console.log('📝 Final insert data:', insertData);
      
      const { data, error } = await supabase
        .from('chapters')
        .insert(insertData)
        .select();

      if (error) {
        console.error('❌ Database error creating chapter:', error);
        
        // If it's a unique constraint violation, let's see what's actually in the database
        if (error.message && error.message.includes('duplicate') || error.code === '23505') {
          console.log('🔍 Unique constraint violation detected, querying current database state...');
          const { data: debugChapters } = await supabase
            .from('chapters')
            .select('*') // Select all fields to see what exists
            .eq('biglio_id', bookId)
            .order('chapter_number', { ascending: true });
          
          console.log('📊 Current chapters in database after error:', debugChapters);
          console.log('🔍 Constraint name from error:', error.message);
          
          // Try alternative approach - create without order_index
          if (error.message.includes('order_index')) {
            console.log('🔄 Retrying without order_index field...');
            const fallbackData = {
              biglio_id: bookId,
              title: newChapterTitle,
              content: '',
              outline_content: '',
              summary: null,
              chapter_number: nextChapterNumber,
              is_published: false,
              duration_seconds: 0
            };
            
            const { data: retryData, error: retryError } = await supabase
              .from('chapters')
              .insert(fallbackData)
              .select();
              
            if (!retryError) {
              console.log('✅ Retry successful:', retryData);
              // Continue with success flow
              const newTotalChapters = (freshChapters || []).length + 1;
              await supabase
                .from('biglios')
                .update({ total_chapters: newTotalChapters })
                .eq('id', bookId);
              
              setNewChapterTitle('');
              setShowCreateChapter(false);
              await fetchChapters();
              await fetchBookData();
              return; // Exit successfully
            } else {
              console.error('❌ Retry also failed:', retryError);
            }
          }
        }
        
        throw error;
      }

      console.log('Chapter created successfully:', data);

      // Update total chapters count with actual count from fresh data
      const newTotalChapters = (freshChapters || []).length + 1;
      const { error: updateError } = await supabase
        .from('biglios')
        .update({ total_chapters: newTotalChapters })
        .eq('id', bookId);

      if (updateError) {
        console.error('Error updating total chapters:', updateError);
      }

      setNewChapterTitle('');
      setShowCreateChapter(false);
      
      // Refresh data to get the new chapter - do this sequentially to ensure proper state updates
      console.log('Refreshing chapters after creation...');
      await fetchChapters();
      console.log('Refreshing book data after creation...');
      await fetchBookData();
      
      console.log('Chapter creation completed - new chapter count should be:', newTotalChapters);
    } catch (error) {
      console.error('Error creating chapter:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const errorObj = error as { message?: unknown; code?: unknown };
        if ('message' in error && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        } else if ('code' in error && typeof errorObj.code === 'string') {
          errorMessage = `Database error: ${errorObj.code}`;
        } else {
          errorMessage = JSON.stringify(error, null, 2);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for specific constraint violations
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        errorMessage = 'A chapter with this number already exists. This might be due to a syncing issue - please refresh the page and try again.';
      }
      
      alert(`Failed to create chapter: ${errorMessage}`);
    }
  };







  // Safe chapter selection with content preservation
  const selectChapter = useCallback(async (chapter: Chapter) => {
    // Save current chapter content before switching if we have unsaved changes
    if (selectedChapter && (
      editTitle !== selectedChapter.title || 
      editContent !== (selectedChapter.content || '') ||
      editOutlineContent !== (selectedChapter.outline_content || '')
    )) {
      // Force save the current chapter before switching
      if (mode === 'write') {
        await saveChapterContent(selectedChapter.id, editTitle, editContent);
        // Update the chapters state to reflect the save
        setChapters(prev => prev.map(ch => 
          ch.id === selectedChapter.id 
            ? { ...ch, title: editTitle, content: editContent }
            : ch
        ));
      } else {
        await saveChapterOutline(selectedChapter.id, editTitle, editOutlineContent);
        // Update the chapters state to reflect the save
        setChapters(prev => prev.map(ch => 
          ch.id === selectedChapter.id 
            ? { ...ch, title: editTitle, outline_content: editOutlineContent }
            : ch
        ));
      }
    }

    // Get the fresh chapter data to ensure we have the latest content
    const freshChapter = chapters.find(ch => ch.id === chapter.id) || chapter;

    // Update selected chapter and editor content
    setSelectedChapter(freshChapter);
    setEditTitle(freshChapter.title);
    setEditContent(freshChapter.content || '');
    setEditOutlineContent(freshChapter.outline_content || '');
  }, [selectedChapter, editTitle, editContent, editOutlineContent, mode, saveChapterContent, saveChapterOutline, chapters]);

  // Auto-save when content changes (mode-aware)
  useEffect(() => {
    if (!selectedChapter) return;

    if (mode === 'write') {
      // In write mode, save title and content changes
      if (editTitle !== selectedChapter.title || editContent !== (selectedChapter.content || '')) {
        debouncedSave(selectedChapter.id, editTitle, editContent);
      }
    } else if (mode === 'outline') {
      // In outline mode, save title and outline content changes
      if (editTitle !== selectedChapter.title || editOutlineContent !== (selectedChapter.outline_content || '')) {
        debouncedSaveOutline(selectedChapter.id, editTitle, editOutlineContent);
      }
    }
  }, [editTitle, editContent, editOutlineContent, selectedChapter, mode, debouncedSave, debouncedSaveOutline]);

  const generateAIOutline = async (chapterCount: number = 5) => {
    if (!book) return;

    try {
      setIsGeneratingOutline(true);
      setGeneratingChapterCount(chapterCount);
      console.log(`🤖 Starting AI outline generation for ${chapterCount} chapters...`);
      
      const result = await generateOutline(
        book.title,
        book.description || '',
        {
          genre: book.genre,
          targetAudience: book.target_audience?.join(', '),
          chapterCount: chapterCount,
          existingOutline: chapters.length > 0 ? chapters.map(ch => ({ title: ch.title, summary: ch.outline_content })) : undefined
        }
      );

      console.log('🎯 AI returned outline result:', {
        resultLength: result?.length || 0,
        chapters: result?.map((ch, i) => ({ index: i + 1, title: ch.title })) || []
      });

      if (result && result.length > 0) {
        console.log(`📚 AI generated ${result.length} chapters. Showing confirmation...`);
        
        // Show outline confirmation instead of immediately creating chapters
        setOutlinePreview(result);
        setShowOutlineConfirmation(true);
      } else {
        console.warn('⚠️ AI returned empty or invalid result:', result);
        alert('AI outline generation returned no chapters. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error generating outline:', error);
      // Show user-friendly error
      alert(`⚠️ Outline generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const confirmOutlineAndCreateChapters = async () => {
    if (!book || outlinePreview.length === 0) return;

    try {
      setIsGeneratingOutline(true);
      console.log(`📚 Creating ${outlinePreview.length} chapters in database...`);
      
      // Create chapters from AI outline with fresh data fetching
      let successCount = 0;
      
      for (let i = 0; i < outlinePreview.length; i++) {
        const chapter = outlinePreview[i];
        
        try {
          // Fetch fresh chapter data before each insert to avoid conflicts
          const { data: freshChapters } = await supabase
            .from('chapters')
            .select('chapter_number, order_index')
            .eq('biglio_id', bookId)
            .order('chapter_number', { ascending: false });
          
          const chapterNumber = ((freshChapters?.[0]?.chapter_number as number) || 0) + 1;
          const orderIndex = ((freshChapters?.[0]?.order_index as number) || 0) + 1;
          console.log(`Creating chapter ${chapterNumber}: "${chapter.title}"`);
          
          const insertResult = await supabase
            .from('chapters')
            .insert({
              biglio_id: bookId,
              title: chapter.title,
              content: '', // Start with empty content for writing mode
              outline_content: `${chapter.summary || ''}\n\nKey Points:\n${chapter.keyPoints ? chapter.keyPoints.map(point => `• ${point}`).join('\n') : ''}`,
              summary: null,
              chapter_number: chapterNumber,
              order_index: orderIndex,
              is_published: false,
              duration_seconds: 0
            });
            
          if (insertResult.error) {
            console.error(`Error creating chapter ${chapterNumber}:`, insertResult.error);
            // Continue with other chapters instead of failing entirely
          } else {
            console.log(`✓ Successfully created chapter ${chapterNumber}`);
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to create chapter "${chapter.title}":`, error);
        }
      }

      // Update book's total chapters based on actual success count
      if (successCount > 0) {
        const newTotalChapters = chapters.length + successCount;
        console.log(`Updating book total chapters to: ${newTotalChapters} (${successCount} created successfully)`);
        
        await supabase
          .from('biglios')
          .update({ total_chapters: newTotalChapters })
          .eq('id', bookId);
      }

      setAiPrompt('');
      await fetchChapters();
      await fetchBookData();
      
      // Show success screen
      setShowOutlineConfirmation(false);
      setOutlinePreview([]);
      setShowOutlineSuccess(true);
      
      console.log(`AI outline generation completed! Created ${successCount}/${outlinePreview.length} chapters successfully.`);
    } catch (error) {
      console.error('❌ Error creating chapters:', error);
      alert(`⚠️ Chapter creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const getCharacterCount = () => editContent.length;
  const getWordCount = () => editContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isNearLimit = () => getCharacterCount() > 6500;
  const isOverLimit = () => getCharacterCount() > 7500;

  // Chapter Edit Modal Functions
  const openEditModal = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setEditModalTitle(chapter.title);
    setEditModalSummary(chapter.outline_content || '');
  };

  const closeEditModal = () => {
    setEditingChapter(null);
    setEditModalTitle('');
    setEditModalSummary('');
  };

  const saveChapterEdits = async () => {
    if (!editingChapter) return;

    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: editModalTitle,
          outline_content: editModalSummary
        })
        .eq('id', editingChapter.id);

      if (error) throw error;

      // Update local state
      setChapters(prev => prev.map(ch => 
        ch.id === editingChapter.id 
          ? { ...ch, title: editModalTitle, outline_content: editModalSummary }
          : ch
      ));

      // Update selected chapter if it's the one being edited
      if (selectedChapter?.id === editingChapter.id) {
        setEditTitle(editModalTitle);
        setEditOutlineContent(editModalSummary);
      }

      closeEditModal();
    } catch (error) {
      console.error('Error saving chapter edits:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden pt-16">
      {/* Header with Mode Toggle */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Dashboard</Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{book.title}</h1>
          </div>
          
          {/* Mode Toggle - Always Visible */}
          <div className="flex gap-2 border-2 border-gray-200 rounded-lg p-1 bg-gray-50">
            <button
              onClick={() => setMode('outline')}
              className={`px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center gap-2 ${
                mode === 'outline' 
                  ? 'bg-purple-600 text-white shadow-md transform scale-105' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-purple-600'
              }`}
            >
              <FaClipboardList className="text-sm" />
              Outline
            </button>
            <button
              onClick={() => setMode('write')}
              className={`px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center gap-2 ${
                mode === 'write' 
                  ? 'bg-green-600 text-white shadow-md transform scale-105' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-green-600'
              }`}
            >
              <FaEdit className="text-sm" />
              Write
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{chapters.length} total</span>
                <button
                  onClick={() => {
                    console.log('🔄 Force refreshing chapters...');
                    fetchChapters();
                    debugDatabaseState();
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                  title="Force refresh chapter list & debug database state"
                >
                  🔄
                </button>
              </div>
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
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 break-words leading-tight">{chapter.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Chapter {chapter.chapter_number}</p>
                      <p className="text-xs text-gray-500">{chapter.content.length} characters</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {/* Edit Chapter Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent chapter selection
                          openEditModal(chapter);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit chapter title and summary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      {/* Status Icons */}
                      <div className="flex flex-col gap-1">
                        {chapter.content.trim() && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            ✍️
                          </span>
                        )}
                        {chapter.audio_url && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            <FaVolumeUp />
                          </span>
                        )}
                      </div>
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
              <div className="space-y-6">
                
                {/* Editable Outline */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaListOl className="text-blue-600" />
                  Chapter Outline
                </h3>
                  
                  {chapters.length === 0 ? (
                    <p className="text-gray-500 italic">No chapters yet. Generate an outline below or create chapters manually.</p>
                  ) : (
                    <div className="space-y-3">
                      {chapters.map((chapter) => (
                        <div 
                          key={chapter.id} 
                          className={`p-4 border rounded-lg transition-all ${
                            selectedChapter?.id === chapter.id 
                              ? 'border-blue-300 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <input
                              type="text"
                              value={selectedChapter?.id === chapter.id ? editTitle : chapter.title}
                              onChange={(e) => {
                                if (selectedChapter?.id === chapter.id) {
                                  setEditTitle(e.target.value);
                                } else {
                                  // Update chapter title directly for non-selected chapters
                                  setChapters(prev => prev.map(ch => 
                                    ch.id === chapter.id ? { ...ch, title: e.target.value } : ch
                                  ));
                                  debouncedSave(chapter.id, e.target.value, chapter.content);
                                }
                              }}
                              className="font-semibold text-gray-900 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1 -mx-2 -my-1 flex-1"
                              placeholder="Chapter title"
                            />
                            <span className="text-sm text-gray-500 ml-2">Ch. {chapter.chapter_number}</span>
                          </div>
                          <textarea
                            value={selectedChapter?.id === chapter.id ? editOutlineContent : (chapter.outline_content || '')}
                            onChange={(e) => {
                              if (selectedChapter?.id === chapter.id) {
                                setEditOutlineContent(e.target.value);
                              } else {
                                // Update chapter outline content directly for non-selected chapters
                                setChapters(prev => prev.map(ch => 
                                  ch.id === chapter.id ? { ...ch, outline_content: e.target.value } : ch
                                ));
                                debouncedSaveOutline(chapter.id, chapter.title, e.target.value);
                              }
                            }}
                            onClick={() => selectChapter(chapter)}
                            className="w-full h-24 p-3 text-gray-700 bg-gray-50 border border-gray-200 rounded focus:border-blue-300 focus:bg-white focus:outline-none resize-none text-sm leading-relaxed"
                            placeholder="Chapter outline, summary, or key points to cover..."
                          />
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>{(chapter.outline_content || '').length} outline chars | {(chapter.content || '').length} content chars</span>
                            <div className="flex gap-2">
                              {(chapter.outline_content || '').trim() && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">📋 Has outline</span>
                              )}
                              {(chapter.content || '').trim() && (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✍️ Has content</span>
                              )}
                              {chapter.audio_url && (
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">🎵 Has audio</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>



              {/* AI Outline Generation */}
              {chapters.length < 10 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      🤖 {chapters.length === 0 ? 'AI Outline Generation' : 'Add More Chapters'}
                    </h3>
                    
                    {isGeneratingOutline ? (
                      // Enhanced Loading State
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-purple-100 rounded-full">
                            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                          <h4 className="text-lg font-semibold text-purple-900 mb-2">Generating Your Book Outline</h4>
                          <p className="text-purple-700 mb-4">AI is creating {generatingChapterCount} chapter{generatingChapterCount > 1 ? 's' : ''} for your book...</p>
                          <div className="w-full bg-purple-200 rounded-full h-2">
                            <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <span className="text-purple-800 font-medium ml-2">Analyzing your book concept</span>
                          </div>
                          <p className="text-sm text-purple-700">
                            Creating chapter titles, summaries, and key points that align with your book&apos;s theme and target audience.
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Smart Outline Generation (Like Old System)
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-purple-900 mb-3">📋 Smart Outline Generation</h4>
                          
                          {/* Chapter Generation Options */}
                          <div className="space-y-3">
                            <button
                              onClick={() => generateAIOutline(1)}
                              className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <span>➕</span>
                              <span>{chapters.length === 0 ? 'Generate Next Chapter (1)' : 'Add 1 More Chapter'}</span>
                            </button>
                            
                            {(chapters.length + 3) <= 10 && (
                              <button
                                onClick={() => generateAIOutline(3)}
                                className="w-full px-4 py-3 bg-orange-400 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <span>📚</span>
                                <span>{chapters.length === 0 ? 'Generate 3 Chapters' : 'Add 3 More Chapters'}</span>
                              </button>
                            )}
                            
                            {(chapters.length + 5) <= 10 && (
                              <button
                                onClick={() => generateAIOutline(5)}
                                className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <span>📖</span>
                                <span>{chapters.length === 0 ? 'Generate 5 Chapter Outline' : 'Add 5 More Chapters'}</span>
                              </button>
                            )}
                            
                            {chapters.length === 0 && (
                              <button
                                onClick={() => generateAIOutline(10)}
                                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <span>📚</span>
                                <span>Generate Full 10 Chapter Book</span>
                              </button>
                            )}
                            
                            {chapters.length > 0 && chapters.length < 10 && (
                              <button
                                onClick={() => generateAIOutline(10 - chapters.length)}
                                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <span>📚</span>
                                <span>Fill Remaining {10 - chapters.length} Chapters</span>
                              </button>
                            )}
                          </div>
                          
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <span className="font-medium">💡 Tip:</span> {chapters.length === 0 ? 
                              'Start with 1-3 chapters to test your concept, then expand your outline as needed.' :
                              `You have ${chapters.length} chapter${chapters.length > 1 ? 's' : ''} so far. Add more to continue building your book!`
                            }
                          </div>
                        </div>

                        {/* Optional Custom Instructions */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            📝 Outline Summary (Optional - helps AI create better chapters)
                          </label>
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder={chapters.length === 0 ? 
                              `Describe your story concept, themes, or specific ideas you want included... (Leave empty for automatic generation based on "${book?.title}")` :
                              `Describe what should happen next in your story, or leave empty for AI to continue based on existing chapters...`
                            }
                            className="w-full h-24 p-3 bg-gray-50 text-gray-900 rounded border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none resize-none text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CENTER PANEL: Outline Editor for Selected Chapter */}
              {selectedChapter && (
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  {/* Chapter Header */}
                  <div className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-purple-300 focus:rounded px-2 py-1 -mx-2 -my-1 w-full"
                          placeholder="Chapter title"
                        />
                        <p className="text-gray-600">Chapter {selectedChapter.chapter_number} - Outline Mode
                          {savingChapter && <span className="text-purple-600 ml-2">💾 Saving...</span>}
                          {showSavedIndicator && <span className="text-green-600 ml-2">✅ Saved!</span>}
                          {lastSaved && !savingChapter && !showSavedIndicator && (
                            <span className="text-gray-400 ml-2 text-sm">
                              Last saved: {lastSaved.toLocaleTimeString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Outline Editor */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-purple-900 mb-2">📋 Chapter Outline</h3>
                        <p className="text-sm text-purple-700 mb-4">
                          Plan what this chapter will cover. This helps the AI understand your story structure and provide better writing assistance.
                        </p>
                      </div>
                      
                      <textarea
                        value={editOutlineContent}
                        onChange={(e) => setEditOutlineContent(e.target.value)}
                        className="w-full h-96 p-4 bg-white text-gray-900 rounded border border-purple-300 leading-relaxed focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none text-base"
                        placeholder="Describe what happens in this chapter...

Examples:
• Key plot points or events
• Character development moments  
• Important revelations or twists
• Emotional beats or themes
• Setting descriptions
• Dialogue or action highlights

The more detail you provide, the better the AI can assist with writing!"
                      />
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <span>{editOutlineContent.length} characters</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-purple-600">💡 This outline guides the AI when you switch to Write mode</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Center Panel - Outline Confirmation Screen */}
              {showOutlineConfirmation && outlinePreview.length > 0 && (
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-6 overflow-y-auto">
                  <div className="w-full">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl text-white">🤖</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Generated Your Outline!</h2>
                      <p className="text-gray-600">
                        Review the <span className="font-semibold text-blue-600">{outlinePreview.length} chapters</span> below. You can accept them as-is, or regenerate for different results.
                      </p>
                    </div>

                    {/* Chapter Preview Grid */}
                    <div className="grid gap-4 mb-6">
                      {outlinePreview.map((chapter, index) => (
                        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2">{chapter.title}</h3>
                              <p className="text-sm text-gray-600 mb-3">{chapter.summary}</p>
                              {chapter.keyPoints && chapter.keyPoints.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Key Points:</p>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {chapter.keyPoints.slice(0, 3).map((point: string, pointIndex: number) => (
                                      <li key={pointIndex} className="flex items-start gap-1">
                                        <span className="text-blue-400 mt-1">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white rounded-lg p-6 flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => {
                          setShowOutlineConfirmation(false);
                          setOutlinePreview([]);
                        }}
                        className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                      >
                        ❌ Regenerate Different Outline
                      </button>
                      <button
                        onClick={confirmOutlineAndCreateChapters}
                        disabled={isGeneratingOutline}
                        className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isGeneratingOutline ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating Chapters...
                          </>
                        ) : (
                          <>✅ Accept & Create Chapters</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Center Panel - Outline Success Screen */}
              {showOutlineSuccess && chapters.length > 0 && (
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-6">
                  <div className="max-w-3xl w-full">
                    {/* Success Message */}
                    <div className="bg-white border border-green-200 rounded-xl shadow-lg p-8 mb-6 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <span className="text-3xl">🎉</span>
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-3">Fantastic! Your Book Outline is Ready</h2>
                      <p className="text-lg text-gray-700 mb-4">
                        You now have <span className="font-semibold text-green-600">{chapters.length} chapter{chapters.length > 1 ? 's' : ''}</span> outlined with AI-generated summaries. 
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-blue-800 font-medium">
                          💡 <strong>What&apos;s Next?</strong> You can either refine your chapter outlines first, or jump straight into writing. The AI will help you every step of the way!
                        </p>
                      </div>
                    </div>

                    {/* Two-Path Approach */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Path 1: Review & Refine */}
                      <div className="bg-white rounded-xl border-2 border-purple-200 p-6 hover:border-purple-300 transition-colors">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                          <span className="text-2xl">📋</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Path 1: Review & Refine Outlines</h3>
                        <p className="text-gray-600 mb-4">
                          Take time to review and customize each chapter outline. This helps ensure your story flows exactly as you envision.
                        </p>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                            Click chapters in the left panel to view/edit
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                            Add plot details, character notes, and key scenes
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                            Use the pencil icon (✏️) to edit titles
                          </div>
                        </div>
                        <button
                          onClick={() => setShowOutlineSuccess(false)}
                          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                          📝 Review Chapters First
                        </button>
                      </div>

                      {/* Path 2: Start Writing */}
                      <div className="bg-white rounded-xl border-2 border-green-200 p-6 hover:border-green-300 transition-colors">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                          <span className="text-2xl">✍️</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Path 2: Start Writing Now</h3>
                        <p className="text-gray-600 mb-4">
                          Jump right into writing! The AI will help you develop each chapter based on the outlines already created.
                        </p>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            AI assistant provides writing suggestions
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            Auto-save keeps your work safe
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            Generate audio anytime for each chapter
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setMode('write');
                            setShowOutlineSuccess(false);
                            if (chapters.length > 0) {
                              selectChapter(chapters[0]);
                            }
                          }}
                          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                          🚀 Start Writing Chapter 1
                        </button>
                      </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        💡 Pro Tips for Success
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>The AI remembers your book&apos;s context and writing style</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>You can switch between Outline and Write modes anytime</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Use the AI assistant to overcome writer&apos;s block</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Generate audio at any time to hear your progress</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Center Panel - No Chapter Selected (when not showing success) */}
              {!selectedChapter && chapters.length > 0 && !showOutlineSuccess && (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Select a Chapter to Edit Outline</h2>
                    <p className="text-gray-600 mb-6">Choose a chapter from the sidebar to edit its outline and planning notes</p>
                    <div className="bg-purple-100 border border-purple-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-sm text-purple-800">
                        💡 <strong>Outline Mode:</strong> Plan chapter content, plot points, and structure. 
                        The AI uses these outlines to provide better writing assistance when you switch to Write mode.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* WRITE MODE - Always Editable */
            selectedChapter ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Reorganized Chapter Header */}
                <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
                  {/* Title Row with Chapter Number */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Chapter {selectedChapter.chapter_number}</span>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-xl font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1 -mx-2 -my-1 flex-1"
                      placeholder="Chapter title"
                    />
                  </div>
                  
                  {/* Action Row with Buttons and Status */}
                  <div className="flex justify-start items-center gap-4">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {savingChapter && <span className="text-blue-600">💾 Saving...</span>}
                      {showSavedIndicator && <span className="text-green-600">✅ Saved!</span>}
                      {lastSaved && !savingChapter && !showSavedIndicator && (
                        <span className="text-gray-400">
                          Last saved: {lastSaved.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <AudioGenerationButton
                        chapterId={selectedChapter.id}
                        chapterTitle={editTitle}
                        chapterContent={editContent}
                        bookId={book.id}
                        bookVoicePreference={book.voice_preference}
                        existingAudioUrl={selectedChapter.audio_url}
                        disabled={isOverLimit()}
                        onAudioGenerated={(audioUrl) => {
                          setSelectedChapter(prev => prev ? { ...prev, audio_url: audioUrl } : null);
                          fetchChapters();
                        }}
                        onVoicePreferenceSet={(voice) => {
                          setBook(prev => prev ? { ...prev, voice_preference: voice } : null);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Direct Editor - Fixed Layout */}
                <div className="flex-1 flex flex-col p-4">
                  {/* Scrollable Text Area */}
                  <div className="flex-1 mb-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className={`w-full h-full p-4 bg-white text-gray-900 rounded border leading-relaxed focus:outline-none resize-none text-base ${
                        isOverLimit() 
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                          : isNearLimit()
                          ? 'border-yellow-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                      placeholder="Start writing your chapter..."
                    />
                  </div>
                  
                  {/* Fixed Bottom Section */}
                  <div className="flex-shrink-0 space-y-3">
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
                    
                    {/* Save Button - Always Visible */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => saveChapterContent(selectedChapter.id, editTitle, editContent)}
                        disabled={savingChapter}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {savingChapter ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaSave className="mr-1" />
                            Save Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
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
          <AIAssistantChat
              book={book}
              currentChapter={selectedChapter ?? undefined}
              chapters={chapters}
              mode={mode}
              onContentSuggestion={(content) => {
                if (selectedChapter) {
                  if (mode === 'write') {
                    setEditContent(prev => prev + '\n\n' + content);
                  } else if (mode === 'outline') {
                    setEditOutlineContent(prev => prev + '\n\n' + content);
                  }
                }
              }}
              onInsertContent={(content, actionType) => {
                if (selectedChapter) {
                  if (mode === 'write') {
                    let newContent = '';
                    if (actionType === 'improve') {
                      // Replace entire content for improvement
                      newContent = content;
                      setEditContent(content);
                    } else if (actionType === 'start') {
                      // For start writing, add at beginning if empty, otherwise add at current position
                      newContent = editContent.trim() === '' ? content : editContent + '\n\n' + content;
                      setEditContent(newContent);
                    } else {
                      // Continue and other actions append to existing content
                      newContent = editContent + '\n\n' + content;
                      setEditContent(newContent);
                    }
                    
                    // Immediately save the inserted content
                    setTimeout(() => {
                      saveChapterContent(selectedChapter.id, editTitle, newContent);
                    }, 100);
                  } else if (mode === 'outline') {
                    let newOutlineContent = '';
                    if (actionType === 'improve') {
                      // Replace entire outline content for improvement
                      newOutlineContent = content;
                      setEditOutlineContent(content);
                    } else {
                      // Add to outline content
                      newOutlineContent = editOutlineContent + '\n\n' + content;
                      setEditOutlineContent(newOutlineContent);
                    }
                    
                    // Immediately save the inserted outline content
                    setTimeout(() => {
                      saveChapterOutline(selectedChapter.id, editTitle, newOutlineContent);
                    }, 100);
                  }
                }
              }}
              className="h-full"
            />
        </div>
      </div>

      {/* Floating Save Indicator */}
      {showSavedIndicator && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-pulse">
          <span className="text-lg">✅</span>
          <span className="font-medium">Content Saved!</span>
        </div>
      )}

      {/* Chapter Edit Modal */}
      {editingChapter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Chapter Summary</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Title Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editModalTitle}
                  onChange={(e) => setEditModalTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                  placeholder="Chapter title"
                />
              </div>

              {/* Summary Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary
                </label>
                <textarea
                  value={editModalSummary}
                  onChange={(e) => setEditModalSummary(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-900 bg-white"
                  placeholder="Chapter summary, outline, or key points..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editModalSummary.length} characters
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveChapterEdits}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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