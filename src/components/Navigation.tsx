'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import the WalletMultiButton with SSR disabled to avoid hydration issues
const WalletMultiButtonDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Set mounted to true when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Navigation links
  const links = [
    { name: 'Home', href: '/' },
    { name: 'Chat', href: '/chat' },
    { name: 'Tokens', href: '/tokens' },
    { name: 'Mint NFT', href: '/mint' },
  ];
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  // Placeholder button for server-side rendering
  const WalletButtonPlaceholder = () => (
    <button className="bg-secondary hover:bg-secondary-light transition-all duration-200 border border-white/10 hover:border-primary/30 rounded-lg py-2 px-4 shadow-lg hover:shadow-primary/20">
      Connect Wallet
    </button>
  );
  
  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-secondary-dark/80 backdrop-blur-lg shadow-lg' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                {/* Logo SVG */}
                <div className="relative w-8 h-8">
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M12 2L20 7V17L12 22L4 17V7L12 2Z" 
                      stroke="url(#paint0_linear)" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M12 11L16 8.5V13.5L12 16L8 13.5V8.5L12 11Z" 
                      fill="url(#paint1_linear)" 
                    />
                    <defs>
                      <linearGradient id="paint0_linear" x1="4" y1="22" x2="20" y2="2" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8B5CF6" />
                        <stop offset="1" stopColor="#06B6D4" />
                      </linearGradient>
                      <linearGradient id="paint1_linear" x1="8" y1="16" x2="16" y2="8.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8B5CF6" />
                        <stop offset="1" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span className="text-xl font-bold text-gradient">ZKChat</span>
              </Link>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-1">
              {links.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? 'text-white'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {link.name}
                  {isActive(link.href) && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
                      layoutId="navbar-indicator"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              {mounted ? (
                <WalletMultiButtonDynamic className="!bg-secondary hover:!bg-secondary-light !transition-all !duration-200 !border !border-white/10 hover:!border-primary/30 !rounded-lg !py-2 !shadow-lg hover:!shadow-primary/20" />
              ) : (
                <WalletButtonPlaceholder />
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              {mounted ? (
                <WalletMultiButtonDynamic className="!bg-secondary hover:!bg-secondary-light !transition-all !duration-200 !border !border-white/10 !rounded-lg !py-2 !text-sm" />
              ) : (
                <WalletButtonPlaceholder />
              )}
              <button
                type="button"
                className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-muted hover:text-white hover:bg-secondary transition-colors duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <svg
                    className="block h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu with animation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className="md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-secondary/80 backdrop-blur-sm shadow-lg rounded-b-lg border-t border-white/5">
              {links.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? 'bg-primary/10 text-white border-l-2 border-primary'
                      : 'text-muted hover:bg-secondary-light hover:text-white'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
} 