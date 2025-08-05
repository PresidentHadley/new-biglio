'use client';

import { useState, useEffect } from 'react';
import { FaUpload, FaImages, FaSearch, FaTimes, FaCheck } from 'react-icons/fa';
import Image from 'next/image';
import { ImageUpload } from './ImageUpload';
import { stockImages, getStockImagesByGenre, searchStockImages, type StockImage } from '@/data/stockImages';

interface ImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (imageUrl: string) => void;
  currentImageUrl?: string;
  userFolder?: string;
  genre?: string;
  bucket: 'book-covers' | 'profile-images';
  title?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'free';
}

type TabType = 'stock' | 'upload';

export function ImagePicker({
  isOpen,
  onClose,
  onImageSelected,
  currentImageUrl,
  userFolder,
  genre,
  bucket,
  title = 'Choose Image',
  aspectRatio = 'portrait'
}: ImagePickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [selectedStockImage, setSelectedStockImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredImages, setFilteredImages] = useState<StockImage[]>([]);

  // Initialize filtered images
  useEffect(() => {
    if (!isOpen) return;

    if (searchQuery.trim()) {
      setFilteredImages(searchStockImages(searchQuery));
    } else if (genre) {
      setFilteredImages(getStockImagesByGenre(genre));
    } else {
      setFilteredImages(stockImages);
    }
  }, [isOpen, searchQuery, genre]);

  const handleStockImageSelect = (imageUrl: string) => {
    setSelectedStockImage(imageUrl);
  };

  const handleConfirmStockImage = () => {
    if (selectedStockImage) {
      onImageSelected(selectedStockImage);
      onClose();
    }
  };

  const handleUploadComplete = (imageUrl: string) => {
    onImageSelected(imageUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-500 w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 transition-colors ${
              activeTab === 'stock'
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <FaImages className="w-5 h-5" />
            <span className="font-medium">Stock Images</span>
            <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
              {filteredImages.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 transition-colors ${
              activeTab === 'upload'
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <FaUpload className="w-5 h-5" />
            <span className="font-medium">Upload Custom</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {activeTab === 'stock' ? (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search stock images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                />
              </div>

              {/* Genre Filter Info */}
              {genre && !searchQuery && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Filtered by genre:</strong> {genre} • {filteredImages.length} images available
                  </p>
                </div>
              )}

              {/* Stock Images Grid */}
              {filteredImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredImages.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => handleStockImageSelect(image.url)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden transition-all hover:shadow-lg ${
                        selectedStockImage === image.url
                          ? 'ring-4 ring-purple-500 shadow-lg'
                          : 'hover:shadow-md'
                      }`}
                    >
                      <div className="aspect-[3/4] relative">
                        <Image
                          src={image.url}
                          alt={image.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                        />
                        {selectedStockImage === image.url && (
                          <div className="absolute inset-0 bg-purple-500 bg-opacity-30 flex items-center justify-center">
                            <div className="bg-purple-500 rounded-full p-2">
                              <FaCheck className="text-white w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{image.title}</h4>
                        <p className="text-gray-500 text-xs">{image.genre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaImages className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? `No images match "${searchQuery}". Try a different search term.`
                      : 'No stock images available for this genre.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Your Own Image</h3>
                <p className="text-gray-600 mb-6">
                  Upload a custom image that represents your book perfectly.
                </p>
              </div>
              
              <ImageUpload
                bucket={bucket}
                folder={userFolder}
                currentImageUrl={currentImageUrl}
                onImageUploaded={handleUploadComplete}
                placeholder="Upload your image"
                aspectRatio={aspectRatio}
                maxSizeMB={3}
                minWidth={400}
                minHeight={600}
                targetWidth={800}
                targetHeight={1200}
                compressionQuality={0.85}
                className="max-w-md mx-auto"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'stock' && (
          <div className="border-t border-gray-200 p-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {selectedStockImage ? 'Click "Use This Image" to confirm your selection' : 'Select an image from above'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStockImage}
                  disabled={!selectedStockImage}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use This Image
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}