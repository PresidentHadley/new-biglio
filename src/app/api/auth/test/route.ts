import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Test authentication status
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ 
      cookies: async () => await cookies() 
    });
    

    
    console.log('🔍 Testing authentication...');
    console.log('🍪 Cookie store ready');
    
    // Test session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📄 Session:', session ? 'exists' : 'null');
    console.log('❌ Session Error:', sessionError);
    
    // Then test user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 User:', user ? `${user.email} (${user.id})` : 'null');
    console.log('❌ Auth Error:', authError);
    
    return NextResponse.json({
      authenticated: !!user,
      hasSession: !!session,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      session: session ? {
        expires_at: session.expires_at,
        token_type: session.token_type
      } : null,
      authError: authError?.message || null,
      sessionError: sessionError?.message || null,
      timestamp: new Date().toISOString(),
      cookieCount: 0,
      cookieNames: [],
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin')
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
