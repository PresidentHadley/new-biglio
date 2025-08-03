'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaBars, FaBell, FaSearch, FaEdit } from 'react-icons/fa';
import { ModernSideNav } from './ModernSideNav';
import { AuthModal } from './AuthModal';
import { useAuth } from '@/context/AuthContext';

// ModernNavBar now manages its own auth state

export function ModernNavBar() {
  const { user, signOut } = useAuth();
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const isAuthenticated = !!user;

  const openSideNav = () => setIsSideNavOpen(true);
  const closeSideNav = () => setIsSideNavOpen(false);

  return (
    <>
      {/* Fixed Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-30 h-16">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left: Menu Button */}
          <button
            onClick={openSideNav}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open navigation menu"
          >
            <FaBars className="text-gray-700 dark:text-gray-300" size={20} />
          </button>

          {/* Center: Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"
          >
            Biglio
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
              V2
            </span>
          </Link>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Search (visible on larger screens) */}
            <button
              className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Search"
            >
              <FaSearch className="text-gray-700 dark:text-gray-300" size={18} />
            </button>

            {/* Write/Create Button */}
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              <FaEdit size={16} />
              <span className="hidden md:inline">Write</span>
            </Link>

            {/* Mobile Write Button */}
            <Link
              href="/dashboard"
              className="sm:hidden p-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all"
              aria-label="Write new book"
            >
              <FaEdit size={18} />
            </Link>

            {/* Notifications (if authenticated) */}
            {isAuthenticated && (
              <button
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
              >
                <FaBell className="text-gray-700 dark:text-gray-300" size={18} />
                {/* Notification Badge */}
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
            )}

            {/* User Avatar (if authenticated) */}
            {isAuthenticated && user && (
              <button
                onClick={openSideNav}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center overflow-hidden"
                aria-label="Open user menu"
              >
                <span className="text-white text-sm font-bold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Side Navigation Panel */}
      <ModernSideNav
        isOpen={isSideNavOpen}
        onClose={closeSideNav}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={signOut}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />

      {/* Spacer to prevent content from being hidden under fixed navbar */}
      <div className="h-16" />
    </>
  );
}