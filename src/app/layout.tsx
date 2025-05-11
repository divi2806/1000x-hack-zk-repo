import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import WalletContextProvider from '../context/WalletContextProvider';
import Navigation from '@/components/Navigation';

// Use Inter font with extended Latin character set
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ZKChat - Secure Web3 Messaging',
  description: 'Zero-knowledge proof powered chatroom with NFT access control for secure Web3 communications',
  keywords: ['web3', 'chat', 'zero knowledge', 'zkp', 'nft', 'solana', 'blockchain', 'secure messaging'],
  authors: [{ name: 'ZKChat Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://zkchat.xyz',
    title: 'ZKChat - Secure Web3 Messaging',
    description: 'Zero-knowledge proof powered chatroom with NFT access control',
    siteName: 'ZKChat',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <WalletContextProvider>
          <div className="relative min-h-screen flex flex-col">
            {/* Background effects */}
            <div className="absolute inset-0 bg-mesh-pattern opacity-5 pointer-events-none z-0"></div>
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float opacity-50 z-0"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float opacity-50 animation-delay-2000 z-0"></div>
            
            {/* Content */}
            <Navigation />
            <main className="container mx-auto px-4 py-8 flex-grow z-10 relative">
              {children}
            </main>
            <footer className="z-10 border-t border-border/30 bg-secondary-dark/50 backdrop-blur-sm py-4">
              <div className="container mx-auto px-4 text-center text-muted text-sm">
                ZKChat © {new Date().getFullYear()} | Secure Web3 Messaging
              </div>
            </footer>
          </div>
          
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'glass border border-border',
              style: {
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#F8FAFC',
                backdropFilter: 'blur(10px)',
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
} 