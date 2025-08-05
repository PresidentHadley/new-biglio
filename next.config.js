/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  images: {
    domains: [
      'localhost',
      'hdvadrswlzmjtlfkdewu.supabase.co', // Your Supabase storage domain
      'images.unsplash.com', // For stock images
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Biglio',
    NEXT_PUBLIC_APP_DESCRIPTION: 'Instagram for Audiobooks',
  },
};

module.exports = withPWA(nextConfig);