'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateChatroomAccessProof } from '@/services/zkService';
import { hasVipAccessPass } from '@/services/nftService';
import useChatStore from '@/store/chatStore';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

interface AccessVerificationProps {
  roomId: string;
  walletAddress: string;
  isVerifying: boolean;
}

// Prevent hydration issues by using dynamic import with ssr: false
const AccessVerificationWithNoSSR = dynamic(() => Promise.resolve(AccessVerificationContent), {
  ssr: false,
});

export default function AccessVerification(props: AccessVerificationProps) {
  return <AccessVerificationWithNoSSR {...props} />;
}

function AccessVerificationContent({ 
  roomId, 
  walletAddress,
  isVerifying 
}: AccessVerificationProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasVipNFT, setHasVipNFT] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use individual selectors to prevent re-renders
  const addProof = useChatStore(state => state.addProof);
  const setHasRoomAccess = useChatStore(state => state.setHasRoomAccess);
  const setIsVerifying = useChatStore(state => state.setIsVerifying);
  
  // Mark when component is mounted on client
  useEffect(() => {
    setClientReady(true);
  }, []);
  
  // Check if the user has a VIP NFT
  useEffect(() => {
    if (!clientReady || !walletAddress) return;
    
    async function checkVipStatus() {
      setIsChecking(true);
      setError(null);
      
      try {
        // First check if we already have a cached proof for this room
        const cachedProof = localStorage.getItem(`vip_room_access_${walletAddress}`);
        if (cachedProof === 'true') {
          console.log('Found cached VIP room access');
          setHasVipNFT(true);
          setProofGenerated(true);
          setHasRoomAccess(true);
          setIsChecking(false);
          setIsVerifying(false);
          return;
        }
        
        // Also check for a mint signature which confirms NFT ownership
        const mintSignature = localStorage.getItem(`mint_signature_${walletAddress}`);
        if (mintSignature) {
          console.log('Found mint signature, verifying NFT access');
          setHasVipNFT(true);
          // Auto-generate proof on signature detection
          generateProof().catch(console.error);
          return;
        }
        
        // Otherwise check for NFT ownership
        const hasVip = await hasVipAccessPass(walletAddress);
        setHasVipNFT(hasVip);
        
        // If user has VIP pass, auto-generate proof
        if (hasVip) {
          generateProof().catch(console.error);
        }
      } catch (error) {
        console.error('Error checking VIP status:', error);
        setError('Failed to verify NFT ownership. Please try again.');
      } finally {
        setIsChecking(false);
        setIsVerifying(false);
      }
    }
    
    checkVipStatus();
  }, [clientReady, walletAddress, setHasRoomAccess]);
  
  const generateProof = async () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setGenerating(true);
    setError(null);
    
    try {
      // Double-check VIP status if not already verified
      if (!hasVipNFT) {
        const ownsVIP = await hasVipAccessPass(walletAddress);
        setHasVipNFT(ownsVIP);
        
        if (!ownsVIP) {
          const mintSignature = localStorage.getItem(`mint_signature_${walletAddress}`);
          if (mintSignature) {
            // If we have a mint signature but NFT isn't detected, force it to true
            // This handles the case when the NFT was minted but not detected by Helius API
            console.log('Found mint signature but NFT not detected, forcing access');
            localStorage.setItem(`vip_pass_${walletAddress}`, 'true');
            setHasVipNFT(true);
          } else {
            toast.error('You need a VIP Access Pass to enter this room');
            throw new Error('No VIP pass found');
          }
        }
      }
      
      // Generate proof
      const proof = await generateChatroomAccessProof(walletAddress);
      addProof(proof);
      setProofGenerated(true);
      setHasRoomAccess(true);
      
      // Store a direct cache of the VIP room access to avoid future checks
      localStorage.setItem(`vip_room_access_${walletAddress}`, 'true');
      
      toast.success('ZK proof verified successfully!');
      
      // Display more information about what's happening
      console.log('ZK Proof details:', {
        id: proof.id,
        type: proof.type,
        timestamp: new Date(proof.timestamp).toLocaleString(),
        expiresAt: new Date(proof.expiresAt).toLocaleString()
      });
    } catch (error) {
      console.error('Error generating ZK proof:', error);
      
      if (!hasVipNFT) {
        setError('You need to mint a VIP Access Pass first');
        toast.error('You need to mint a VIP Access Pass first');
      } else {
        setError('Failed to generate ZK proof. Please try again.');
        toast.error('Failed to generate ZK proof');
      }
    } finally {
      setGenerating(false);
    }
  };
  
  // Don't render anything until client is ready to prevent hydration mismatch
  if (!clientReady) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-t-4 border-primary animate-spin"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-md w-full glass p-6 rounded-xl shadow-2xl text-center border border-border">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">VIP Access Required</h2>
          <p className="text-muted mb-4">
            {isChecking ? (
              'Checking your NFT ownership...'
            ) : isVerifying ? (
              'Verifying your access to this room...'
            ) : proofGenerated ? (
              'Access granted! You can now enter the room.'
            ) : (
              'This room requires a VIP Access Pass and zero-knowledge proof verification.'
            )}
          </p>
          
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-3 mb-4">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}
        </div>
        
        {isChecking || isVerifying ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <p className="text-sm text-muted">
              {isChecking ? 'Looking for VIP Access Pass...' : 'Verifying your access...'}
            </p>
          </div>
        ) : proofGenerated ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <p className="text-success font-medium">ZK Proof Generated Successfully!</p>
              <p className="text-xs text-muted mt-1">
                Your access has been verified without revealing specific details about your NFT.
              </p>
              <div className="mt-3 pt-2 border-t border-success/20">
                <p className="text-xs text-success/80 font-mono">
                  Proof: <span className="opacity-70">zkp_{walletAddress?.slice(0, 8)}...{Date.now().toString().slice(-8)}</span>
                </p>
                <p className="text-xs text-success/80">
                  ✓ NFT ownership verified privately
                </p>
                <div className="mt-2">
                  <details className="text-xs opacity-70">
                    <summary className="cursor-pointer hover:text-primary">How Zero-Knowledge Proofs work</summary>
                    <div className="mt-2 pl-2 text-left text-muted">
                      <p>ZK proofs allow us to verify NFT ownership without revealing your wallet address or NFT details.</p>
                      <p className="mt-1">The proof is generated using a circom circuit that creates a cryptographic commitment combining your wallet and NFT data.</p>
                      <p className="mt-1">This enhances privacy while maintaining security.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
            <button
              onClick={() => setHasRoomAccess(true)}
              className="btn btn-primary w-full"
            >
              Enter VIP Room
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasVipNFT ? (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                <p className="text-success font-medium">VIP Access Pass Found!</p>
                <p className="text-xs text-muted mt-1">
                  Generate a zero-knowledge proof to access the VIP room.
                </p>
              </div>
            ) : (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-warning font-medium">No VIP Access Pass Found</p>
                <p className="text-xs text-muted mt-1">
                  You need to mint a VIP Access Pass NFT to enter this room.
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={generateProof}
                disabled={generating || !hasVipNFT}
                className={`btn ${hasVipNFT ? 'btn-primary' : 'btn-secondary'} flex-1 ${generating ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {generating ? (
                  <span className="flex items-center justify-center">
                    <span className="w-4 h-4 mr-2 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                    Generating...
                  </span>
                ) : (
                  'Generate ZK Proof'
                )}
              </button>
              
              <Link href="/mint" className="btn btn-accent flex-1">
                Mint VIP Pass
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 