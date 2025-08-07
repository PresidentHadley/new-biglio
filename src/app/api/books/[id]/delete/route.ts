import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { id: bookId } = await params;

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, verify the user owns this book
    const { data: book, error: bookError } = await supabase
      .from('biglios')
      .select(`
        id, 
        title, 
        channel_id,
        cover_url,
        channels!inner(user_id)
      `)
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check ownership  
    const channelUserId = book.channels && typeof book.channels === 'object' && 'user_id' in book.channels 
      ? (book.channels as { user_id: string }).user_id 
      : null;
      
    if (channelUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - not your book' }, { status: 403 });
    }

    // Delete in the correct order to handle foreign key constraints
    console.log(`🗑️ Starting deletion process for book: ${book.title}`);

    // 1. Delete all audio files from storage
    console.log('🎵 Deleting audio files...');
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, audio_url')
      .eq('biglio_id', bookId);

    if (chapters) {
      for (const chapter of chapters) {
        if (chapter.audio_url && typeof chapter.audio_url === 'string') {
          // Extract file path from URL for deletion
          const urlParts = chapter.audio_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `${bookId}/${fileName}`;
          
          await supabase.storage
            .from('audio-files')
            .remove([filePath]);
        }
      }
    }

    // 2. Delete all chapters (this will cascade to related data)
    console.log('📖 Deleting chapters...');
    const { error: chaptersError } = await supabase
      .from('chapters')
      .delete()
      .eq('biglio_id', bookId);

    if (chaptersError) {
      console.error('Error deleting chapters:', chaptersError);
      return NextResponse.json({ error: 'Failed to delete chapters' }, { status: 500 });
    }

    // 3. Delete social interactions (likes, saves, comments)
    console.log('❤️ Deleting social interactions...');
    
    // Delete likes
    await supabase
      .from('likes')
      .delete()
      .eq('biglio_id', bookId);

    // Delete saves
    await supabase
      .from('saves')
      .delete()
      .eq('biglio_id', bookId);

    // Delete comments
    await supabase
      .from('comments')
      .delete()
      .eq('biglio_id', bookId);

    // 4. Delete the book cover image from storage
    console.log('🖼️ Deleting cover image...');
    if (book.cover_url && typeof book.cover_url === 'string') {
      const urlParts = book.cover_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `book-covers/${fileName}`;
      
      await supabase.storage
        .from('book-covers')
        .remove([filePath]);
    }

    // 5. Finally, delete the book itself
    console.log('📚 Deleting book record...');
    const { error: bookDeleteError } = await supabase
      .from('biglios')
      .delete()
      .eq('id', bookId);

    if (bookDeleteError) {
      console.error('Error deleting book:', bookDeleteError);
      return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
    }

    console.log(`✅ Successfully deleted book: ${book.title}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Book deleted successfully',
      deletedBook: {
        id: bookId,
        title: book.title
      }
    });

  } catch (error) {
    console.error('Error in delete book API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
