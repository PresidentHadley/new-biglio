// Curated stock images for book covers organized by genre
// These are high-quality, royalty-free images optimized for book covers

export interface StockImage {
  id: string;
  url: string;
  title: string;
  genre: string;
  keywords: string[];
  aspectRatio: 'portrait';
  credit?: string;
}

export const stockImages: StockImage[] = [
  // Business & Self-Help
  {
    id: 'business-01',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop&crop=center',
    title: 'Professional Portrait',
    genre: 'Business',
    keywords: ['business', 'professional', 'leadership', 'success'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },
  {
    id: 'business-02', 
    url: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&h=1200&fit=crop&crop=center',
    title: 'Growth Chart',
    genre: 'Business',
    keywords: ['business', 'growth', 'success', 'analytics'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },
  {
    id: 'selfhelp-01',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1200&fit=crop&crop=center',
    title: 'Mountain Sunrise',
    genre: 'Self-Help',
    keywords: ['motivation', 'inspiration', 'growth', 'mindfulness'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },
  {
    id: 'selfhelp-02',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=1200&fit=crop&crop=center',
    title: 'Peaceful Path',
    genre: 'Self-Help',
    keywords: ['peace', 'meditation', 'wellness', 'journey'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },

  // Fantasy & Science Fiction
  {
    id: 'fantasy-01',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=1200&fit=crop&crop=center',
    title: 'Mystical Forest',
    genre: 'Fantasy',
    keywords: ['fantasy', 'magic', 'mystical', 'adventure'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },
  {
    id: 'scifi-01',
    url: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=1200&fit=crop&crop=center',
    title: 'Cosmic Space',
    genre: 'Science Fiction',
    keywords: ['space', 'future', 'technology', 'cosmic'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },

  // Romance & Young Adult
  {
    id: 'romance-01',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=1200&fit=crop&crop=center',
    title: 'Romantic Sunset',
    genre: 'Romance',
    keywords: ['romance', 'love', 'emotional', 'dreamy'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },
  {
    id: 'ya-01',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop&crop=center',
    title: 'Young Adventure',
    genre: 'Young Adult',
    keywords: ['youth', 'adventure', 'coming-of-age', 'discovery'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },

  // Mystery & Thriller
  {
    id: 'mystery-01',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=1200&fit=crop&crop=center',
    title: 'Dark Alley',
    genre: 'Mystery',
    keywords: ['mystery', 'dark', 'suspense', 'investigation'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },
  {
    id: 'thriller-01',
    url: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=1200&fit=crop&crop=center',
    title: 'Dramatic Shadows',
    genre: 'Thriller',
    keywords: ['thriller', 'suspense', 'dramatic', 'tension'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },

  // Non-Fiction & Educational  
  {
    id: 'history-01',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop&crop=center',
    title: 'Ancient Architecture',
    genre: 'History',
    keywords: ['history', 'heritage', 'culture', 'knowledge'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },
  {
    id: 'science-01',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=1200&fit=crop&crop=center',
    title: 'Scientific Discovery',
    genre: 'Science',
    keywords: ['science', 'research', 'discovery', 'innovation'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  },

  // Children's & Family
  {
    id: 'children-01',
    url: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=1200&fit=crop&crop=center',
    title: 'Colorful Playground',
    genre: "Children's",
    keywords: ['children', 'playful', 'colorful', 'fun'],
    aspectRatio: 'portrait',
    credit: 'Unsplash'
  }
];

// Helper functions to filter stock images
export const getStockImagesByGenre = (genre: string): StockImage[] => {
  return stockImages.filter(img => 
    img.genre.toLowerCase() === genre.toLowerCase() ||
    img.keywords.some(keyword => keyword.toLowerCase().includes(genre.toLowerCase()))
  );
};

export const getAllGenres = (): string[] => {
  return [...new Set(stockImages.map(img => img.genre))].sort();
};

export const searchStockImages = (query: string): StockImage[] => {
  const searchTerm = query.toLowerCase();
  return stockImages.filter(img => 
    img.title.toLowerCase().includes(searchTerm) ||
    img.genre.toLowerCase().includes(searchTerm) ||
    img.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
  );
};