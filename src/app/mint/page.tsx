'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mintCompressedNFT, hasVipAccessPass, getCompressedNFTsByOwner } from '../../services/nftService';

// Tell Next.js this is not a static page
export const dynamic = 'force-dynamic';

export default function MintPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [isMinting, setIsMinting] = useState(false);
  const [nftMinted, setNftMinted] = useState(false);
  const [signature, setSignature] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [clientReady, setClientReady] = useState(false);
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);

  // Set client-ready state when component mounts
  useEffect(() => {
    setClientReady(true);
  }, []);

  // Check if user already has a VIP pass when wallet is connected
  useEffect(() => {
    if (!clientReady || !connected || !publicKey) return;
    
    const walletAddress = publicKey.toString();
    
    async function checkVipStatus() {
      setCheckingStatus(true);
      try {
        // Check if there's a mint signature in localStorage
        const mintSignature = localStorage.getItem(`mint_signature_${walletAddress}`);
        if (mintSignature) {
          setNftMinted(true);
          setSignature(mintSignature);
        }
        
        // Also check for owned NFTs
        const hasVip = await hasVipAccessPass(walletAddress);
        if (hasVip) {
          setNftMinted(true);
          const mintData = localStorage.getItem(`mint_data_${walletAddress}`);
          if (mintData) {
            const parsed = JSON.parse(mintData);
            setSignature(parsed.signature);
          }
        }
        
        // Get all owned NFTs for display
        const nftsResult = await getCompressedNFTsByOwner(walletAddress);
        if (nftsResult.success && nftsResult.nfts.length > 0) {
          setOwnedNFTs(nftsResult.nfts);
        }
      } catch (error) {
        console.error('Error checking VIP status:', error);
      } finally {
        setCheckingStatus(false);
      }
    }
    
    checkVipStatus();
  }, [connected, publicKey, clientReady]);

  const handleMint = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsMinting(true);
      const walletAddress = publicKey.toString();
      
      toast.loading('Minting your VIP Pass...', { id: 'minting' });
      console.log(`Starting mint for wallet: ${walletAddress}`);
      
      const result = await mintCompressedNFT(walletAddress);
      toast.dismiss('minting');
      
      if (result && result.signature) {
        setSignature(result.signature);
        setNftMinted(true);
        toast.success('VIP Pass minted successfully!');
        
        // Update owned NFTs after minting
        const nftsResult = await getCompressedNFTsByOwner(walletAddress);
        if (nftsResult.success && nftsResult.nfts.length > 0) {
          setOwnedNFTs(nftsResult.nfts);
        }
      } else {
        toast.error('Minting failed without an error. Please try again.');
      }
    } catch (error: any) {
      toast.dismiss('minting');
      console.error('Mint error:', error);
      toast.error(`Failed to mint VIP Pass: ${error.message || 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };

  // Don't render until client is ready to prevent hydration issues
  if (!clientReady) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-darker to-secondary">
      <header className="container mx-auto p-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
          <h1 className="text-xl font-bold">ZKChat</h1>
        </Link>
        <WalletMultiButton />
      </header>

      <main className="container mx-auto flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-lg w-full bg-secondary rounded-lg shadow-xl overflow-hidden">
          <div className="bg-secondary-dark p-4">
            <h1 className="text-2xl font-bold">
              {nftMinted ? 'VIP Access Pass' : 'Mint VIP Access Pass'}
            </h1>
          </div>

          <div className="p-6 space-y-6">
            <div className="aspect-square max-w-xs mx-auto bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-30"></div>
              <div className="z-10 text-center p-4">
                <div className="w-16 h-16 mx-auto bg-primary-light rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2">ZKChat VIP Pass</h2>
                <p className="text-gray-300">Exclusive access to private chat rooms and premium features.</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Benefits:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                <li>Access to private VIP chatrooms</li>
                <li>Zero-knowledge proof verification</li>
                <li>Enhanced privacy features</li>
                <li>Priority AI assistance</li>
              </ul>
            </div>

            {checkingStatus ? (
              <div className="flex justify-center p-4">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                <span className="ml-2">Checking NFT status...</span>
              </div>
            ) : nftMinted ? (
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 text-center">
                <h3 className="text-lg font-medium text-green-400 mb-2">You Already Own a VIP Pass!</h3>
                {signature && (
                  <>
                    <p className="text-sm mb-2">Transaction signature:</p>
                    <p className="text-xs font-mono bg-secondary-dark p-2 rounded-md overflow-x-auto">
                      {signature}
                    </p>
                  </>
                )}
                
                {ownedNFTs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-600/30">
                    <p className="text-sm mb-2">Your NFT Collection:</p>
                    <div className="flex items-center justify-center space-x-2">
                      {ownedNFTs.map((nft) => (
                        <div key={nft.id} className="bg-secondary-dark rounded-md p-2 w-20">
                          <div className="w-16 h-16 bg-primary/20 rounded-md mb-1 overflow-hidden">
                            <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-xs truncate">{nft.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => router.push('/chat?room=vip')}
                  className="btn btn-primary w-full mt-4"
                >
                  Go to VIP Chat
                </button>
              </div>
            ) : (
              <button
                onClick={handleMint}
                disabled={!connected || isMinting}
                className={`btn w-full ${
                  connected ? 'btn-accent' : 'btn-secondary'
                } ${isMinting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isMinting ? (
                  <span className="flex items-center justify-center">
                    <span className="w-4 h-4 mr-2 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                    Minting...
                  </span>
                ) : connected ? 'Mint VIP Pass' : 'Connect Wallet to Mint'}
              </button>
            )}

            {!connected && (
              <p className="text-sm text-gray-400 text-center">
                Please connect your wallet to mint a VIP Access Pass
              </p>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                <span className="text-primary font-bold">Note:</span> This NFT will be minted on Solana devnet and uses real zero-knowledge proof verification for privacy.
              </p>
              <details className="text-xs text-gray-500 mt-2">
                <summary className="cursor-pointer text-primary hover:underline">How do ZK proofs work in ZKChat?</summary>
                <div className="mt-2 p-2 bg-secondary-dark rounded-md">
                  <p className="mb-1">ZKChat uses an implementation of zero-knowledge proofs that:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Creates a cryptographic hash of your wallet address</li>
                    <li>Proves NFT ownership without revealing your actual wallet address</li>
                    <li>Uses the Poseidon hash function for secure commitments</li>
                    <li>Allows verification without exposing sensitive information</li>
                  </ol>
                  <p className="mt-2">
                    <span className="text-green-400">Current status:</span> Minting actual NFTs on Solana devnet with real ZK proof verification. Make sure you have SOL in your devnet wallet.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 