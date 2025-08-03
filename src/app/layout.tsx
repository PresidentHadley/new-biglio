import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../styles/SmartContactWidget.css';
import { AIProvider } from '@/context/AIContext';
import { AuthProvider } from '@/context/AuthContext';
import { ModernNavBar } from '@/components/ModernNavBar';
import SmartContactWidget from '@/components/SmartContactWidget';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Biglio - Instagram for Audiobooks',
  description: 'Discover, create, and share audiobook experiences',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <AIProvider>
            <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
              <ModernNavBar />
              {children}
              <SmartContactWidget />
            </div>
          </AIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}