'use client';

import { useState } from 'react';
import Image from 'next/image';
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
  FaGlobe
} from 'react-icons/fa';

interface Channel {
  id: string;
  name: string;
  username: string;
  description: string;
  avatar_url: string;
  cover_url: string;
  follower_count: number;
  following_count: number;
  book_count: number;
  created_at: string;
  user_id: string;
  website_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
}

interface ChannelHeaderProps {
  channel: Channel;
  isOwner: boolean;
  bookCount: number;
}

export function ChannelHeader({ channel, isOwner, bookCount }: ChannelHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(channel.follower_count || 0);

  const handleFollow = async () => {
    // TODO: Implement follow/unfollow logic
    setIsFollowing(!isFollowing);
    setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    navigator.share?.({
      title: `${channel.name} on Biglio`,
      text: channel.description,
      url: window.location.href
    }).catch(() => {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    });
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Cover Image */}
      {channel.cover_url && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <Image
            src={channel.cover_url}
            alt={`${channel.name} cover`}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      {/* Channel Info */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          
          {/* Avatar */}
          <div className="relative -mt-16 md:-mt-20">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
              {channel.avatar_url ? (
                <Image
                  src={channel.avatar_url}
                  alt={channel.name}
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
          </div>

          {/* Channel Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  {channel.name}
                </h1>
                <p className="text-lg text-gray-600">@{channel.username}</p>
                
                {/* Stats */}
                <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FaUsers className="text-blue-500" />
                    <span className="font-medium">{followerCount.toLocaleString()}</span>
                    <span>followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaBook className="text-green-500" />
                    <span className="font-medium">{bookCount}</span>
                    <span>books</span>
                  </div>
                  <div className="text-gray-500">
                    Joined {formatJoinDate(channel.created_at)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {!isOwner && (
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-2 rounded-full font-medium transition-colors ${
                      isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                
                {isOwner && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors">
                    <FaPlus className="text-sm" />
                    Create Book
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <FaShareAlt className="text-gray-600" />
                </button>

                {isOwner && (
                  <button className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors">
                    <FaEdit className="text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            {channel.description && (
              <p className="mt-4 text-gray-700 leading-relaxed max-w-3xl">
                {channel.description}
              </p>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-4">
              {channel.website_url && (
                <a
                  href={channel.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <FaGlobe className="text-lg" />
                </a>
              )}
              {channel.instagram_url && (
                <a
                  href={channel.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-pink-600 transition-colors"
                >
                  <FaInstagram className="text-lg" />
                </a>
              )}
              {channel.twitter_url && (
                <a
                  href={channel.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-400 transition-colors"
                >
                  <FaTwitter className="text-lg" />
                </a>
              )}
              {channel.facebook_url && (
                <a
                  href={channel.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-700 transition-colors"
                >
                  <FaFacebook className="text-lg" />
                </a>
              )}
              {channel.linkedin_url && (
                <a
                  href={channel.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-800 transition-colors"
                >
                  <FaLinkedin className="text-lg" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}