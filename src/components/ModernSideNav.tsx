'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FaHome, 
  FaUser, 
  // FaEdit, // Commented out unused import 
  FaUsers, 
  FaInfoCircle,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaBell,
  FaCog,
  FaBook,
  FaHeart,
  FaBookmark,
  FaSearch
} from 'react-icons/fa';

interface ModernSideNavProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    username?: string;
    email?: string;
    avatar?: string;
  } | null;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  requireAuth?: boolean;
  badge?: number;
  divider?: boolean;
}

export function ModernSideNav({ 
  isOpen, 
  onClose, 
  user, 
  isAuthenticated = false,
  onSignIn,
  onSignOut 
}: ModernSideNavProps) {
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // Swipe left to close (diff > 50 means swipe left)
    if (diff > 50) {
      onClose();
    }
    
    setTouchStart(null);
  };

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: FaHome
    },
    {
      id: 'search',
      label: 'Search',
      href: '/search',
      icon: FaSearch
    },
    {
      id: 'notifications',
      label: 'Notifications',
      href: '/notifications',
      icon: FaBell,
      requireAuth: true,
      badge: 3 // Example badge count
    },
    {
      id: 'divider-1',
      label: '',
      icon: FaHome,
      divider: true
    },
    {
      id: 'dashboard',
      label: 'My Books',
      href: '/dashboard',
      icon: FaBook,
      requireAuth: true
    },
    {
      id: 'channel',
      label: 'My Channel',
      href: user?.username ? `/channel/${user.username}` : '/channel',
      icon: FaUser,
      requireAuth: true
    },
    {
      id: 'saved',
      label: 'Saved',
      href: '/saved',
      icon: FaBookmark,
      requireAuth: true
    },
    {
      id: 'liked',
      label: 'Liked',
      href: '/liked',
      icon: FaHeart,
      requireAuth: true
    },
    {
      id: 'divider-2',
      label: '',
      icon: FaHome,
      divider: true
    },
    {
      id: 'channels',
      label: 'Explore Channels',
      href: '/channels',
      icon: FaUsers
    },
    {
      id: 'about',
      label: 'About',
      href: '/about',
      icon: FaInfoCircle
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: FaCog,
      requireAuth: true
    }
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    }
    onClose();
  };

  const handleSignInClick = () => {
    onSignIn?.();
    onClose();
  };

  const handleSignOutClick = () => {
    onSignOut?.();
    onClose();
  };

  return (
    <>
      {/* Background Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Biglio</h1>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
              V2
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FaTimes className="text-gray-600 dark:text-gray-400" size={20} />
          </button>
        </div>

        {/* User Profile Section */}
        {isAuthenticated && user ? (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  @{user.email?.split('@')[0] || 'username'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            {/* Sign Out Button */}
            <button
              onClick={() => {
                onSignOut?.();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
            >
              <FaSignOutAlt size={16} />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSignInClick}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              <FaSignInAlt size={18} />
              Sign In to Biglio
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            // Skip auth-required items if not authenticated
            if (item.requireAuth && !isAuthenticated) return null;
            
            // Render divider
            if (item.divider) {
              return (
                <div key={item.id} className="my-2 border-t border-gray-200 dark:border-gray-700" />
              );
            }

            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <div key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    onClick={() => handleNavClick(item)}
                    className={`flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      isActive 
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-2 border-purple-600' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      isActive 
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-r-2 border-purple-600' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          {isAuthenticated ? (
            <button
              onClick={handleSignOutClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <FaSignOutAlt size={18} />
              Sign Out
            </button>
          ) : (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              Sign in to access all features
            </div>
          )}
        </div>
      </div>
    </>
  );
}