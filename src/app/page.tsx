'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulating loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-darker">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary animate-pulse">Loading ZKChat...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-darker to-secondary">
      <header className="container mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
          <h1 className="text-xl font-bold">ZKChat</h1>
        </div>
        <WalletMultiButton />
      </header>

      <main className="container mx-auto flex-1 p-4 md:p-8 flex flex-col md:flex-row items-center justify-center gap-12">
        <div className="md:w-1/2 space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            Secure Chatrooms with <span className="text-primary">Zero-Knowledge</span> Proofs
          </h1>
          <p className="text-xl text-gray-300">
            Join private chatrooms verified by NFT ownership and protected with ZK technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {connected ? (
              <button
                onClick={() => router.push('/chat')}
                className="btn btn-primary text-lg py-3 px-8"
              >
                Enter Chat
              </button>
            ) : (
              <button className="btn btn-secondary text-lg py-3 px-8">
                Connect Wallet to Start
              </button>
            )}
            <button
              onClick={() => router.push('/mint')}
              className="btn btn-accent text-lg py-3 px-8"
            >
              Mint VIP Pass
            </button>
          </div>
        </div>

        <div className="md:w-1/2 flex justify-center">
          <div className="relative w-80 h-80 bg-secondary-light rounded-lg shadow-xl overflow-hidden border-2 border-primary/30">
            <div className="absolute top-0 left-0 right-0 bg-secondary-dark p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="ml-4 text-sm font-mono">ZKChat Terminal</div>
              </div>
            </div>
            <div className="mt-12 p-4 font-mono text-sm text-green-400">
              <p>{`>`} Initializing ZKChat...</p>
              <p>{`>`} Connecting to Solana network...</p>
              <p>{`>`} Loading Zero-Knowledge protocols...</p>
              <p className="animate-pulse">{`>`} Secure chat ready. Connect wallet to continue.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto p-4 text-center text-gray-400 border-t border-gray-800">
        <p>© {new Date().getFullYear()} ZKChat - Powered by Solana & Light Protocol</p>
      </footer>
    </div>
  );
} 