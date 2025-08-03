'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function OutlineRedirect() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  // Redirect to the new unified 3-panel editor in outline mode
  useEffect(() => {
    if (bookId) {
      router.replace(`/book/${bookId}?mode=outline`);
    }
  }, [bookId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="text-gray-900 mt-4">Redirecting to new unified editor...</p>
      </div>
    </div>
  );
}