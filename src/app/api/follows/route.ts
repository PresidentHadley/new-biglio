import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST /api/follows - Toggle follow on a channel
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channel_id } = await request.json();

    if (!channel_id) {
      return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_user_id', user.id)
      .eq('followed_channel_id', channel_id)
      .single();

    if (existingFollow) {
      // Unfollow - remove the follow
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_user_id', user.id)
        .eq('followed_channel_id', channel_id);

      if (deleteError) {
        throw deleteError;
      }

      // Decrement follower count
      const { error: updateError } = await supabase
        .rpc('decrement_channel_follower_count', { channel_id: channel_id });

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ 
        following: false,
        message: 'Unfollowed'
      });
    } else {
      // Follow - add the follow
      const { error: insertError } = await supabase
        .from('follows')
        .insert({
          follower_user_id: user.id,
          followed_channel_id: channel_id
        });

      if (insertError) {
        throw insertError;
      }

      // Increment follower count
      const { error: updateError } = await supabase
        .rpc('increment_channel_follower_count', { channel_id: channel_id });

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ 
        following: true,
        message: 'Following'
      });
    }
  } catch (error) {
    console.error('Follow toggle error:', error);
    return NextResponse.json({ 
      error: 'Failed to toggle follow' 
    }, { status: 500 });
  }
}

// GET /api/follows?channel_id=xxx - Check if user follows a channel
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ following: false });
    }

    const { searchParams } = new URL(request.url);
    const channel_id = searchParams.get('channel_id');

    if (!channel_id) {
      return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
    }

    const { data: follow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_user_id', user.id)
      .eq('followed_channel_id', channel_id)
      .single();

    return NextResponse.json({ following: !!follow });
  } catch (error) {
    console.error('Check follow error:', error);
    return NextResponse.json({ following: false });
  }
}