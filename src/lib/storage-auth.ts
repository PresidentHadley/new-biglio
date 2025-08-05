// Storage Authentication with Custom Role
// This creates JWT tokens with storage_manager role for uploads

import jwt from 'jsonwebtoken';

// Get JWT secret from environment
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️ SUPABASE_JWT_SECRET not found in environment variables');
}

/**
 * Generate a JWT token with storage_manager role for the current user
 * This allows bypassing RLS policies for storage operations
 */
export function generateStorageManagerToken(userId: string): string {
  if (!JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET environment variable is required');
  }

  const payload = {
    role: 'storage_manager',
    sub: userId,
    iss: 'supabase',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Create a Supabase client with storage manager permissions
 * Use this for storage operations that need elevated permissions
 */
export function createStorageManagerClient(userId: string) {
  const { createClient } = require('@/lib/supabase');
  const storageToken = generateStorageManagerToken(userId);
  
  const supabase = createClient();
  
  // Override the session with storage manager token
  supabase.auth.session = () => ({
    access_token: storageToken,
    token_type: 'bearer',
    user: { id: userId }
  });

  return supabase;
}