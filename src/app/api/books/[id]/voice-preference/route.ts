import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { voicePreference } = await request.json();
    const { id: bookId } = await params;

    if (!voicePreference || !['male', 'female'].includes(voicePreference)) {
      return NextResponse.json(
        { error: 'Valid voice preference (male/female) is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Update the book's voice preference
    const { error } = await supabase
      .from('biglios')
      .update({ voice_preference: voicePreference })
      .eq('id', bookId);

    if (error) {
      console.error('Error updating voice preference:', error);
      return NextResponse.json(
        { error: 'Failed to update voice preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in voice preference API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}