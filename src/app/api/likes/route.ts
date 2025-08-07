import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST /api/likes - Toggle like on a biglio
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    console.log('🔍 Likes API: Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('👤 Likes API User:', user ? `${user.email} (${user.id})` : 'null');
    console.log('❌ Likes API Auth Error:', authError);

    if (authError || !user) {
      console.log('🚨 Likes API: Returning 401 - No user or auth error');
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasUser: !!user,
          authError: authError?.message || null,
          timestamp: new Date().toISOString()
        }
      }, { status: 401 });
    }

    const { biglio_id } = await request.json();

    if (!biglio_id) {
      return NextResponse.json({ error: 'biglio_id is required' }, { status: 400 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('biglio_id', biglio_id)
      .single();

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('biglio_id', biglio_id);

      if (deleteError) {
        throw deleteError;
      }

      // Decrement like count
      const { error: updateError } = await supabase
        .rpc('decrement_biglio_like_count', { biglio_id: biglio_id });

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ 
        liked: false,
        message: 'Like removed'
      });
    } else {
      // Like - add the like
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          biglio_id: biglio_id
        });

      if (insertError) {
        throw insertError;
      }

      // Increment like count
      const { error: updateError } = await supabase
        .rpc('increment_biglio_like_count', { biglio_id: biglio_id });

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ 
        liked: true,
        message: 'Like added'
      });
    }
  } catch (error) {
    console.error('Like toggle error:', error);
    return NextResponse.json({ 
      error: 'Failed to toggle like' 
    }, { status: 500 });
  }
}

// GET /api/likes?biglio_id=xxx - Check if user has liked a biglio
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ liked: false });
    }

    const { searchParams } = new URL(request.url);
    const biglio_id = searchParams.get('biglio_id');

    if (!biglio_id) {
      return NextResponse.json({ error: 'biglio_id is required' }, { status: 400 });
    }

    const { data: like } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('biglio_id', biglio_id)
      .single();

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    console.error('Check like error:', error);
    return NextResponse.json({ liked: false });
  }
}