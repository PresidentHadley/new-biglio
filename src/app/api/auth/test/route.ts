import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Test authentication status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    console.log('🔍 Testing authentication...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('👤 User:', user ? `${user.email} (${user.id})` : 'null');
    console.log('❌ Auth Error:', authError);
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      error: authError?.message || null,
      timestamp: new Date().toISOString(),
      cookieCount: Object.keys(cookieStore).length
    });
  } catch (error) {
    console.error('🚨 Auth test error:', error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
