/**
 * Book Type Detection Utility
 * Based on the old Biglio system logic for automatic Fiction/Non-Fiction classification
 */

export type BookType = 'fiction' | 'non-fiction';

/**
 * Determines if a genre is primarily fiction or non-fiction
 * Based on the old system's proven logic
 */
export function detectBookType(genre?: string): BookType {
  if (!genre) return 'fiction';
  
  const genreLower = genre.toLowerCase();
  
  // Explicit fiction genres (to avoid false positives)
  const fictionGenres = [
    'science fiction', 'sci-fi', 'fantasy', 'mystery', 'thriller', 'suspense',
    'romance', 'horror', 'historical fiction', 'young adult', 'ya',
    "children's", 'adventure', 'drama', 'literary fiction', 'crime fiction',
    'dystopian', 'utopian', 'steampunk', 'cyberpunk', 'urban fantasy',
    'paranormal', 'magical realism', 'western', 'cozy mystery',
    'psychological thriller', 'action', 'espionage', 'war fiction',
    'coming of age', 'family saga', 'gothic', 'noir', 'comedy',
    'satire', 'alternate history', 'space opera', 'epic fantasy',
    'contemporary fiction', 'women\'s fiction', 'lgbtq fiction'
  ];
  
  // Non-fiction genres
  const nonFictionGenres = [
    'biography', 'autobiography', 'memoir', 'history', 'true crime',
    'business', 'self-help', 'health', 'fitness', 'cooking', 'travel',
    'science', 'technology', 'philosophy', 'religion', 'spirituality',
    'politics', 'current events', 'economics', 'psychology', 'sociology',
    'education', 'parenting', 'relationships', 'personal development',
    'how-to', 'guide', 'reference', 'textbook', 'academic',
    'journalism', 'essay', 'nature', 'environment', 'sports',
    'music', 'art', 'culture', 'language', 'communication',
    'leadership', 'management', 'investing', 'finance', 'career',
    'productivity', 'motivation', 'mindfulness', 'meditation',
    'nutrition', 'medicine', 'wellness', 'lifestyle'
  ];
  
  // Check for explicit non-fiction keywords first
  for (const nfGenre of nonFictionGenres) {
    if (genreLower.includes(nfGenre)) {
      return 'non-fiction';
    }
  }
  
  // Check for fiction keywords
  for (const fGenre of fictionGenres) {
    if (genreLower.includes(fGenre)) {
      return 'fiction';
    }
  }
  
  // Default to fiction for ambiguous cases
  return 'fiction';
}

/**
 * Get writing style guidance based on book type
 */
export function getWritingStyleGuidance(bookType: BookType): string {
  if (bookType === 'non-fiction') {
    return `Write in a conversational, engaging tone. Use "you" to address readers personally. Share insights like you're having a friendly conversation. Break complex concepts into simple language. Ask rhetorical questions. Use analogies and metaphors. Avoid academic jargon - keep it human and approachable. AUDIOBOOK RULES: Spell out ALL numbers and dates (forty percent not 40%, twenty twenty-three not 2023). Never use bullet points - write in flowing paragraphs with spoken transitions like "First," "Next," "Additionally." Only provide examples when specifically requested. Keep sentences under 800 characters for audio compatibility.`;
  } else {
    return `Focus on storytelling, character development, plot progression, emotional engagement, and narrative flow. Create immersive scenes and compelling dialogue. AUDIOBOOK RULES: Spell out ALL numbers and dates in dialogue and narration. Avoid list-like formatting - keep prose flowing naturally. Write for the ear, not the eye. Keep sentences under 800 characters for audio compatibility - use natural breaks and pauses in your narrative.`;
  }
}

/**
 * Get outline structure guidance based on book type
 */
export function getOutlineGuidance(bookType: BookType): string {
  if (bookType === 'non-fiction') {
    return `Structure should be logical and progressive, with each chapter building on the previous one. Focus on teaching concepts, providing frameworks, and offering practical applications.`;
  } else {
    return `Structure should follow a narrative arc with clear beginning, middle, and end. Introduce characters and conflict early, build tension through the middle, and provide satisfying resolution.`;
  }
}

/**
 * Get target audience considerations based on book type
 */
export function getAudienceConsiderations(bookType: BookType, targetAudience?: string[]): string {
  const audienceText = targetAudience && targetAudience.length > 0 
    ? `Target audience: ${targetAudience.join(', ')}.` 
    : '';
  
  if (bookType === 'non-fiction') {
    return `${audienceText} Consider the reader's knowledge level and provide appropriate context. Use examples and case studies that resonate with your audience.`;
  } else {
    return `${audienceText} Consider age-appropriate themes, complexity, and emotional content. Develop relatable characters and situations for your audience.`;
  }
}