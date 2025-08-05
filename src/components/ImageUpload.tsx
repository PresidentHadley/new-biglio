'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { FaCamera, FaSpinner, FaTimes } from 'react-icons/fa';
import Image from 'next/image';

interface ImageUploadProps {
  bucket: 'book-covers' | 'profile-images';
  folder?: string; // e.g., user ID, book ID, etc.
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  className?: string;
  placeholder?: string;
  acceptedTypes?: string;
  maxSizeMB?: number;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'free';
}

export function ImageUpload({
  bucket,
  folder,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  className = '',
  placeholder = 'Upload image',
  acceptedTypes = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
  aspectRatio = 'free'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    if (!acceptedTypes.split(',').some(type => file.type === type.trim())) {
      return 'Please upload a valid image file (JPG, PNG, or WebP)';
    }

    return null;
  };

  const generateFileName = (file: File): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    
    if (folder) {
      return `${folder}/${timestamp}-${random}.${extension}`;
    }
    return `${timestamp}-${random}.${extension}`;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      setUploading(true);

      // Generate unique filename
      const fileName = generateFileName(file);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log(`✅ Image uploaded successfully to ${bucket}:`, publicUrl);
      
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
      
      // Notify parent component
      onImageUploaded(publicUrl);
      
    } catch (err) {
      console.error('❌ Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
      
      // Reset preview on error
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      // Extract filename from URL for deletion
      const urlParts = currentImageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (fileName && folder) {
        const fullPath = `${folder}/${fileName}`;
        await supabase.storage.from(bucket).remove([fullPath]);
      }
      
      setPreviewUrl(null);
      onImageRemoved?.();
      
    } catch (err) {
      console.error('❌ Error removing image:', err);
      // Still remove from UI even if deletion fails
      setPreviewUrl(null);
      onImageRemoved?.();
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square';
      case 'landscape': return 'aspect-video';
      case 'portrait': return 'aspect-[3/4]';
      default: return '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-lg border-2 border-dashed border-gray-300 
          hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100
          ${uploading ? 'cursor-not-allowed opacity-50' : ''}
          ${getAspectRatioClass()}
          ${previewUrl ? 'border-solid border-transparent' : ''}
        `}
      >
        {previewUrl ? (
          // Image preview
          <div className="relative w-full h-full">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* Remove button */}
            {onImageRemoved && !uploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Remove image"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            )}

            {/* Upload overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
              <div className="text-white opacity-0 hover:opacity-100 transition-opacity">
                <FaCamera className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm">Change</p>
              </div>
            </div>
          </div>
        ) : (
          // Upload placeholder
          <div className="flex flex-col items-center justify-center h-full p-6 text-center min-h-[120px]">
            {uploading ? (
              <>
                <FaSpinner className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <FaCamera className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">{placeholder}</p>
                <p className="text-xs text-gray-500">
                  {acceptedTypes.includes('jpeg') && 'JPG, '}
                  {acceptedTypes.includes('png') && 'PNG, '}
                  {acceptedTypes.includes('webp') && 'WebP '}
                  up to {maxSizeMB}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}