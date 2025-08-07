import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { biglio_id, content, parent_comment_id } = await request.json();

    if (!biglio_id || !content) {
      return NextResponse.json({ 
        error: 'biglio_id and content are required' 
      }, { status: 400 });
    }

    if (content.trim().length === 0 || content.length > 2000) {
      return NextResponse.json({ 
        error: 'Comment must be between 1 and 2000 characters' 
      }, { status: 400 });
    }

    // Insert the comment
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        biglio_id: biglio_id,
        content: content.trim(),
        parent_comment_id: parent_comment_id || null
      })
      .select(`
        *,
        user:users(id, email),
        channel:channels!inner(handle, display_name, avatar_url)
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    // Increment comment count on the biglio
    const { error: updateBiglioError } = await supabase
      .rpc('increment_biglio_comment_count', { biglio_id: biglio_id });

    if (updateBiglioError) {
      console.error('Failed to update biglio comment count:', updateBiglioError);
    }

    // If this is a reply, increment reply count on parent comment
    if (parent_comment_id) {
      const { error: updateParentError } = await supabase
        .rpc('increment_comment_reply_count', { comment_id: parent_comment_id });

      if (updateParentError) {
        console.error('Failed to update parent comment reply count:', updateParentError);
      }
    }

    return NextResponse.json({ 
      comment,
      message: 'Comment created successfully'
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ 
      error: 'Failed to create comment' 
    }, { status: 500 });
  }
}

// GET /api/comments?biglio_id=xxx - Get comments for a biglio
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const biglio_id = searchParams.get('biglio_id');
    const parent_comment_id = searchParams.get('parent_comment_id');

    if (!biglio_id) {
      return NextResponse.json({ error: 'biglio_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('comments')
      .select(`
        *,
        user:users(id, email),
        channel:channels!inner(handle, display_name, avatar_url)
      `)
      .eq('biglio_id', biglio_id)
      .order('created_at', { ascending: false });

    // If parent_comment_id is provided, get replies; otherwise get top-level comments
    if (parent_comment_id) {
      query = query.eq('parent_comment_id', parent_comment_id);
    } else {
      query = query.is('parent_comment_id', null);
    }

    const { data: comments, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch comments' 
    }, { status: 500 });
  }
}