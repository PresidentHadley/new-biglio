import { Metadata } from 'next';
import { FaPlay, FaHeart, FaComment, FaBookmark } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'Biglio - Instagram for Audiobooks',
  description: 'Discover amazing audiobook stories and connect with creators',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Biglio</h1>
          <div className="flex space-x-4">
            <button className="text-white hover:text-gray-300">
              <FaHeart size={24} />
            </button>
            <button className="text-white hover:text-gray-300">
              <FaComment size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Instagram-style Feed */}
      <main className="max-w-md mx-auto">
        {/* Sample Biglio Card */}
        <div className="bg-black border-b border-gray-800">
          {/* Creator Header */}
          <div className="flex items-center px-4 py-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            <div className="ml-3">
              <p className="text-white font-semibold text-sm">@storyteller</p>
              <p className="text-gray-400 text-xs">5 minutes ago</p>
            </div>
          </div>

          {/* Book Cover */}
          <div className="relative aspect-square bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold mb-2">The Midnight Chronicles</h3>
                <p className="text-sm opacity-90">Chapter 1: The Beginning</p>
                <button className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 hover:bg-opacity-30 transition-all">
                  <FaPlay className="text-white text-xl ml-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex space-x-4">
              <button className="text-white hover:text-red-500 transition-colors">
                <FaHeart size={24} />
              </button>
              <button className="text-white hover:text-blue-500 transition-colors">
                <FaComment size={24} />
              </button>
            </div>
            <button className="text-white hover:text-yellow-500 transition-colors">
              <FaBookmark size={24} />
            </button>
          </div>

          {/* Engagement Info */}
          <div className="px-4 pb-3">
            <p className="text-white font-semibold text-sm">1,234 likes</p>
            <p className="text-white text-sm mt-1">
              <span className="font-semibold">@storyteller</span> Just dropped the first chapter of my new series! What do you think? 🎧✨
            </p>
            <p className="text-gray-400 text-sm mt-1">View all 89 comments</p>
          </div>
        </div>

        {/* Welcome Message for Beta */}
        <div className="p-6 text-center">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-3">Welcome to Biglio V2</h2>
            <p className="text-white text-sm mb-4">
              The Instagram experience for audiobooks is coming soon! This is just the beginning.
            </p>
            <button className="bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
              Join Beta
            </button>
          </div>
          
          <div className="text-gray-400 text-sm">
            <p>🎯 Infinite scroll discovery</p>
            <p>🎵 Instant audio playback</p>
            <p>📱 Mobile-first PWA experience</p>
            <p>👥 Multi-channel creation</p>
          </div>
        </div>
      </main>
    </div>
  );
}