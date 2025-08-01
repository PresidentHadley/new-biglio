/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      'localhost',
      // Add your Supabase storage domain here
      // 'your-project.supabase.co',
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Biglio',
    NEXT_PUBLIC_APP_DESCRIPTION: 'Instagram for Audiobooks',
  },
};

module.exports = withPWA(nextConfig);