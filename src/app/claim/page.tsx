'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { claimExperienceToken } from '@/services/tokenService';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';

export default function ClaimPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  
  const [claimCode, setClaimCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  
  useEffect(() => {
    // Get claim code from URL
    const code = searchParams.get('code');
    if (code) {
      setClaimCode(code);
    }
  }, [searchParams]);
  
  const handleClaim = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!claimCode.trim()) {
      toast.error('No claim code provided');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await claimExperienceToken(
        publicKey.toString(),
        claimCode
      );
      
      if (result.success && result.token) {
        setTokenDetails(result.token);
        setIsClaimed(true);
        toast.success('Token claimed successfully!');
      } else {
        toast.error(result.message || 'Failed to claim token');
      }
    } catch (error) {
      console.error('Error claiming token:', error);
      toast.error('An error occurred while claiming the token');
    } finally {
      setIsLoading(false);
    }
  };
  
  const goToChatroom = () => {
    router.push('/chat');
  };
  
  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Claim Experience Token
        </h1>
        
        {!connected ? (
          <div className="text-center my-8">
            <p className="mb-4">Connect your wallet to claim your token</p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </div>
        ) : isClaimed ? (
          <div className="text-center">
            <div className="bg-green-800/30 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold mb-2">
                {tokenDetails?.metadata?.name || 'Token'} Claimed!
              </h2>
              <p className="mb-4">{tokenDetails?.metadata?.description}</p>
              
              {tokenDetails?.metadata?.image && (
                <div className="flex justify-center mb-4">
                  <img 
                    src={tokenDetails.metadata.image} 
                    alt={tokenDetails.metadata.name}
                    className="w-48 h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <button
                onClick={goToChatroom}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Go to Chatroom
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <label htmlFor="claimCode" className="block text-sm font-medium mb-2">
                Claim Code
              </label>
              <input
                type="text"
                id="claimCode"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                placeholder="Enter claim code"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={handleClaim}
              disabled={isLoading || !claimCode.trim()}
              className={`w-full py-3 px-4 rounded-lg font-bold ${
                isLoading || !claimCode.trim() 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } transition`}
            >
              {isLoading ? 'Claiming...' : 'Claim Token'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 