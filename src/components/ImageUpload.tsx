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
  minWidth?: number;
  minHeight?: number;
  targetWidth?: number;
  targetHeight?: number;
  compressionQuality?: number;
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
  aspectRatio = 'free',
  minWidth = 200,
  minHeight = 200,
  targetWidth = 800,
  targetHeight = 1200,
  compressionQuality = 0.8
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

  const validateImageDimensions = (img: HTMLImageElement): string | null => {
    if (img.width < minWidth || img.height < minHeight) {
      return `Image must be at least ${minWidth}x${minHeight} pixels`;
    }

    // Check aspect ratio constraints for specific types
    if (aspectRatio === 'portrait') {
      const ratio = img.width / img.height;
      if (ratio < 0.6 || ratio > 0.8) {
        return 'Please use a portrait image (3:4 or 2:3 aspect ratio works best)';
      }
    } else if (aspectRatio === 'square') {
      const ratio = img.width / img.height;
      if (ratio < 0.9 || ratio > 1.1) {
        return 'Please use a square image';
      }
    } else if (aspectRatio === 'landscape') {
      const ratio = img.width / img.height;
      if (ratio < 1.3 || ratio > 2.0) {
        return 'Please use a landscape image (16:9 or 4:3 aspect ratio works best)';
      }
    }

    return null;
  };

  const compressAndResizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        // Validate dimensions first
        const dimensionError = validateImageDimensions(img);
        if (dimensionError) {
          reject(new Error(dimensionError));
          return;
        }

        // Calculate target dimensions maintaining aspect ratio
        let { width, height } = img;
        
        // Resize to target dimensions if larger
        if (width > targetWidth || height > targetHeight) {
          const ratio = Math.min(targetWidth / width, targetHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Create new file with compressed data
            const compressedFile = new File([blob], file.name, {
              type: 'image/webp', // Convert to WebP for better performance
              lastModified: Date.now(),
            });
            
            console.log(`📸 Image compressed: ${file.size} bytes → ${compressedFile.size} bytes`);
            resolve(compressedFile);
          },
          'image/webp',
          compressionQuality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const generateFileName = (originalName: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const baseName = originalName.split('.')[0] || 'image';
    
    if (folder) {
      return `${folder}/${timestamp}-${random}-${baseName}.webp`;
    }
    return `${timestamp}-${random}-${baseName}.webp`;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Basic file validation
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setUploading(true);

      // Compress and resize image (includes dimension validation)
      const processedFile = await compressAndResizeImage(file);
      
      // Create preview from processed file
      const objectUrl = URL.createObjectURL(processedFile);
      setPreviewUrl(objectUrl);

      // Generate unique filename
      const fileName = generateFileName(file.name);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, processedFile, {
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
      console.log(`📊 Original: ${file.size} bytes → Compressed: ${processedFile.size} bytes`);
      
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
      
      // Notify parent component
      onImageUploaded(publicUrl);
      
    } catch (err) {
      console.error('❌ Error processing/uploading image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image. Please try again.';
      setError(errorMessage);
      
      // Reset preview on error
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