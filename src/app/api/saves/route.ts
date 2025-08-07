import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST /api/saves - Toggle save on a biglio
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { biglio_id } = await request.json();

    if (!biglio_id) {
      return NextResponse.json({ error: 'biglio_id is required' }, { status: 400 });
    }

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('biglio_id', biglio_id)
      .single();

    if (existingSave) {
      // Unsave - remove the save
      const { error: deleteError } = await supabase
        .from('saves')
        .delete()
        .eq('user_id', user.id)
        .eq('biglio_id', biglio_id);

      if (deleteError) {
        throw deleteError;
      }

      // Decrement save count
      const { error: updateError } = await supabase
        .rpc('decrement_biglio_save_count', { biglio_id: biglio_id });

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ 
        saved: false,
        message: 'Save removed'
      });
    } else {
      // Save - add the save
      const { error: insertError } = await supabase
        .from('saves')
        .insert({
          user_id: user.id,
          biglio_id: biglio_id
        });

      if (insertError) {
        throw insertError;
      }

      // Increment save count
      const { error: updateError } = await supabase
        .rpc('increment_biglio_save_count', { biglio_id: biglio_id });

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ 
        saved: true,
        message: 'Save added'
      });
    }
  } catch (error) {
    console.error('Save toggle error:', error);
    return NextResponse.json({ 
      error: 'Failed to toggle save' 
    }, { status: 500 });
  }
}

// GET /api/saves?biglio_id=xxx - Check if user has saved a biglio
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ saved: false });
    }

    const { searchParams } = new URL(request.url);
    const biglio_id = searchParams.get('biglio_id');

    if (!biglio_id) {
      return NextResponse.json({ error: 'biglio_id is required' }, { status: 400 });
    }

    const { data: save } = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('biglio_id', biglio_id)
      .single();

    return NextResponse.json({ saved: !!save });
  } catch (error) {
    console.error('Check save error:', error);
    return NextResponse.json({ saved: false });
  }
}