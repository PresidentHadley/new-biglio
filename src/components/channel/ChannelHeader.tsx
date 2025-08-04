'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  FaUser, 
  FaUsers, 
  FaBook, 
  FaShareAlt, 
  FaPlus,
  FaEdit,
  FaInstagram,
  FaTwitter,
  FaFacebook,
  FaLinkedin,
  FaGlobe,
  FaCamera,
  FaCheck,
  FaTimes,
  FaSpinner
} from 'react-icons/fa';

interface Channel {
  id: string;
  handle: string; // The @username (renamed from username)
  display_name: string; // The display name (renamed from name)
  bio: string; // The description (renamed from description)
  avatar_url?: string;
  cover_url?: string;
  follower_count: number;
  following_count?: number;
  created_at: string;
  user_id: string;
  website_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  // Backward compatibility
  name?: string;
  username?: string;
  description?: string;
}

interface ChannelHeaderProps {
  channel: Channel;
  isOwner: boolean;
  bookCount: number;
  onChannelUpdate?: (updatedChannel: Partial<Channel>) => void;
  onCreateBook?: () => void;
}

export function ChannelHeader({ channel, isOwner, bookCount, onChannelUpdate, onCreateBook }: ChannelHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  // State for following
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(channel.follower_count || 0);
  const [followLoading, setFollowLoading] = useState(false);
  
  // State for editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    display_name: channel.display_name || channel.name || '',
    bio: channel.bio || channel.description || '',
    website_url: channel.website_url || '',
    instagram_url: channel.instagram_url || '',
    twitter_url: channel.twitter_url || '',
    facebook_url: channel.facebook_url || '',
    linkedin_url: channel.linkedin_url || ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  
  // State for image uploads
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Backward compatibility for field names
  const channelName = channel.display_name || channel.name || '';
  const channelHandle = channel.handle || channel.username || '';
  const channelBio = channel.bio || channel.description || '';

  // Check if user is following this channel
  const checkFollowStatus = useCallback(async () => {
    if (!user || isOwner) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('channel_id', channel.id)
        .single();
      
      if (!error && data) {
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  }, [user, channel.id, isOwner, supabase]);

  // Load follow status on mount
  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  const handleFollow = async () => {
    if (!user || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('channel_id', channel.id);
        
        if (error) throw error;
        
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            channel_id: channel.id
          });
        
        if (error) throw error;
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      // Show error toast or notification
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    const title = `${channelName} on Biglio`;
    const text = channelBio;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(url);
      });
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(url);
    }
  };

  const handleSaveField = async (field: string, value: string) => {
    if (!isOwner) return;
    
    setSaveLoading(true);
    try {
      const updateData: Record<string, string> = { [field]: value };
      
      const { error } = await supabase
        .from('channels')
        .update(updateData)
        .eq('id', channel.id);
      
      if (error) throw error;
      
      // Update local state
      onChannelUpdate?.(updateData);
      setEditingField(null);
    } catch (error) {
      console.error('Error updating channel:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    if (!file || !isOwner) return;
    
    const setUploading = type === 'avatar' ? setAvatarUploading : setCoverUploading;
    setUploading(true);
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${channel.id}/${type}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('channel-images')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('channel-images')
        .getPublicUrl(fileName);
      
      const imageUrl = urlData.publicUrl;
      
      // Update channel in database
      const updateField = type === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: updateError } = await supabase
        .from('channels')
        .update({ [updateField]: imageUrl })
        .eq('id', channel.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      onChannelUpdate?.({ [updateField]: imageUrl });
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
    } finally {
      setUploading(false);
    }
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Helper component for inline editing
  const InlineEdit = ({ 
    value, 
    field, 
    placeholder, 
    multiline = false, 
    className = "",
    renderDisplay 
  }: {
    value: string;
    field: string;
    placeholder: string;
    multiline?: boolean;
    className?: string;
    renderDisplay?: (value: string) => React.ReactNode;
  }) => {
    const isEditing = editingField === field;
    const currentValue = editValues[field as keyof typeof editValues] || value;

    if (!isOwner) {
      return renderDisplay ? renderDisplay(value) : <span className={className}>{value}</span>;
    }

    if (isEditing) {
      const InputComponent = multiline ? 'textarea' : 'input';
      return (
        <div className="flex items-center gap-2">
          <InputComponent
            type={multiline ? undefined : "text"}
            value={currentValue}
            onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
            placeholder={placeholder}
            className={`${className} border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              multiline ? 'min-h-[4rem] resize-y' : ''
            }`}
            autoFocus
          />
          <button
            onClick={() => handleSaveField(field, currentValue)}
            disabled={saveLoading}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            {saveLoading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
          </button>
          <button
            onClick={() => {
              setEditingField(null);
              setEditValues(prev => ({ ...prev, [field]: value }));
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <FaTimes />
          </button>
        </div>
      );
    }

    return (
      <div 
        onClick={() => setEditingField(field)}
        className={`${className} cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition-colors group`}
      >
        {renderDisplay ? renderDisplay(value) : value}
        {isOwner && (
          <FaEdit className="inline ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm" />
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500">
        {channel.cover_url ? (
          <Image
            src={channel.cover_url}
            alt={`${channelName} cover`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Cover upload button for owners */}
        {isOwner && (
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
            className="absolute bottom-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          >
            {coverUploading ? <FaSpinner className="animate-spin" /> : <FaCamera />}
          </button>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file, 'avatar');
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file, 'cover');
        }}
      />

      {/* Channel Info */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          
          {/* Avatar */}
          <div className="relative -mt-16 md:-mt-20">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
              {channel.avatar_url ? (
                <Image
                  src={channel.avatar_url}
                  alt={channelName}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                  <FaUser className="text-white text-4xl md:text-5xl" />
                </div>
              )}
            </div>
            
            {/* Avatar upload button for owners */}
            {isOwner && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
              >
                {avatarUploading ? <FaSpinner className="animate-spin text-sm" /> : <FaCamera className="text-sm" />}
              </button>
            )}
          </div>

          {/* Channel Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="min-w-0 flex-1">
                {/* Channel Name */}
                <InlineEdit
                  value={channelName}
                  field="display_name"
                  placeholder="Enter channel name"
                  className="text-2xl md:text-3xl font-bold text-gray-900"
                  renderDisplay={(value) => (
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
                      {value}
                    </h1>
                  )}
                />
                
                <p className="text-lg text-gray-600 mt-1">@{channelHandle}</p>
                
                {/* Stats */}
                <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FaUsers className="text-blue-500" />
                    <span className="font-medium">{followerCount.toLocaleString()}</span>
                    <span>followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaBook className="text-green-500" />
                    <span className="font-medium">{bookCount}</span>
                    <span>{bookCount === 1 ? 'book' : 'books'}</span>
                  </div>
                  <div className="text-gray-500 hidden sm:block">
                    Joined {formatJoinDate(channel.created_at)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {!isOwner && user && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-6 py-2 rounded-full font-medium transition-colors min-w-[100px] ${
                      isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {followLoading ? (
                      <FaSpinner className="animate-spin mx-auto" />
                    ) : isFollowing ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}
                
                {isOwner && (
                  <button 
                    onClick={onCreateBook || (() => router.push('/dashboard'))}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                  >
                    <FaPlus className="text-sm" />
                    <span className="hidden sm:inline">Create Book</span>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Share channel"
                >
                  <FaShareAlt className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-4">
              <InlineEdit
                value={channelBio}
                field="bio"
                placeholder="Tell people about your channel..."
                multiline={true}
                className="text-gray-700 leading-relaxed max-w-3xl"
                renderDisplay={(value) => (
                  <p className="text-gray-700 leading-relaxed max-w-3xl">
                    {value}
                  </p>
                )}
              />
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-4">
              {(channel.website_url || isOwner) && (
                <InlineEdit
                  value={channel.website_url || ''}
                  field="website_url"
                  placeholder="https://yourwebsite.com"
                  renderDisplay={(value) => value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                      title="Website"
                    >
                      <FaGlobe className="text-lg" />
                    </a>
                  ) : null}
                />
              )}
              
              {(channel.instagram_url || isOwner) && (
                <InlineEdit
                  value={channel.instagram_url || ''}
                  field="instagram_url"
                  placeholder="https://instagram.com/username"
                  renderDisplay={(value) => value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-pink-600 transition-colors"
                      title="Instagram"
                    >
                      <FaInstagram className="text-lg" />
                    </a>
                  ) : null}
                />
              )}
              
              {(channel.twitter_url || isOwner) && (
                <InlineEdit
                  value={channel.twitter_url || ''}
                  field="twitter_url"
                  placeholder="https://twitter.com/username"
                  renderDisplay={(value) => value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-blue-400 transition-colors"
                      title="X (Twitter)"
                    >
                      <FaTwitter className="text-lg" />
                    </a>
                  ) : null}
                />
              )}
              
              {(channel.facebook_url || isOwner) && (
                <InlineEdit
                  value={channel.facebook_url || ''}
                  field="facebook_url"
                  placeholder="https://facebook.com/page"
                  renderDisplay={(value) => value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-blue-700 transition-colors"
                      title="Facebook"
                    >
                      <FaFacebook className="text-lg" />
                    </a>
                  ) : null}
                />
              )}
              
              {(channel.linkedin_url || isOwner) && (
                <InlineEdit
                  value={channel.linkedin_url || ''}
                  field="linkedin_url"
                  placeholder="https://linkedin.com/in/username"
                  renderDisplay={(value) => value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-blue-800 transition-colors"
                      title="LinkedIn"
                    >
                      <FaLinkedin className="text-lg" />
                    </a>
                  ) : null}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}