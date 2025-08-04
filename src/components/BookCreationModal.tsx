'use client';

import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

interface BookCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookData: BookFormData) => Promise<void>;
  isCreating?: boolean;
}

export interface BookFormData {
  title: string;
  description: string;
  book_type: 'fiction' | 'non-fiction' | '';
  genre: string;
  target_audience: string[];
  reading_level?: string;
}

const GENRES = [
  'Business', 'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Romance',
  'Horror', 'Historical Fiction', 'Young Adult', "Children's", 'Memoir',
  'Biography', 'Self-Help', 'History', 'Travel', 'Cooking', 'Art', 'Music',
  'Technology', 'Science', 'Design', 'Health & Wellness', 'Other'
];

const TARGET_AUDIENCES = [
  { id: 'children', label: 'Children (Ages 5-8)' },
  { id: 'middle-grade', label: 'Middle Grade (Ages 8-12)' },
  { id: 'young-adult', label: 'Young Adult (Ages 12-18)' },
  { id: 'new-adult', label: 'New Adult (Ages 18-25)' },
  { id: 'adult', label: 'Adult' },
  { id: 'all-ages', label: 'All Ages' }
];

export function BookCreationModal({ isOpen, onClose, onSubmit, isCreating = false }: BookCreationModalProps) {
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    description: '',
    book_type: '',
    genre: '',
    target_audience: ['adult'], // Default to adult
    reading_level: 'intermediate'
  });

  const [errors, setErrors] = useState<{[K in keyof BookFormData]?: string | string[]}>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: {[K in keyof BookFormData]?: string | string[]} = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.book_type) newErrors.book_type = 'Book type is required';
    if (!formData.genre) newErrors.genre = 'Genre is required';
    if (formData.target_audience.length === 0) newErrors.target_audience = ['At least one target audience is required'];

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        title: '',
        description: '',
        book_type: '',
        genre: '',
        target_audience: ['adult'],
        reading_level: 'intermediate'
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating book:', error);
    }
  };

  const toggleTargetAudience = (audienceId: string) => {
    setFormData(prev => ({
      ...prev,
      target_audience: prev.target_audience.includes(audienceId)
        ? prev.target_audience.filter(id => id !== audienceId)
        : [...prev.target_audience, audienceId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Biglio</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Enter basic information for your new biglio. After creation, you&apos;ll be taken to the outline editor where you can use AI to generate your book outline.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Book Title */}
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Book Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
              placeholder="Enter your book title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{Array.isArray(errors.title) ? errors.title[0] : errors.title}</p>}
          </div>

          {/* Book Type */}
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Book Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.book_type}
              onChange={(e) => setFormData(prev => ({ ...prev, book_type: e.target.value as 'fiction' | 'non-fiction' }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
            >
              <option value="">Select type...</option>
              <option value="fiction">Fiction</option>
              <option value="non-fiction">Non-Fiction</option>
            </select>
            {errors.book_type && <p className="text-red-500 text-sm mt-1">{Array.isArray(errors.book_type) ? errors.book_type[0] : errors.book_type}</p>}
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Genre <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.genre}
              onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
            >
              <option value="">Select a genre</option>
              {GENRES.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            {errors.genre && <p className="text-red-500 text-sm mt-1">{Array.isArray(errors.genre) ? errors.genre[0] : errors.genre}</p>}
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Target Audience <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TARGET_AUDIENCES.map(audience => (
                <label key={audience.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.target_audience.includes(audience.id)}
                    onChange={() => toggleTargetAudience(audience.id)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{audience.label}</span>
                </label>
              ))}
            </div>
            {errors.target_audience && <p className="text-red-500 text-sm mt-1">{Array.isArray(errors.target_audience) ? errors.target_audience[0] : errors.target_audience}</p>}
          </div>

          {/* Book Description */}
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Book Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none text-gray-900 bg-white"
              placeholder="Brief description of your book (optional)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {isCreating ? 'Creating...' : 'Create Biglio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}