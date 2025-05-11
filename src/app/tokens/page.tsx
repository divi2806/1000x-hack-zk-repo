'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createExperienceToken, getCreatorTokens, generateTokenClaimUrl, TokenData, TokenMetadata } from '@/services/tokenService';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export default function TokensPage() {
  const { publicKey, connected } = useWallet();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  
  // Form state for creating a new token
  const [tokenForm, setTokenForm] = useState<TokenMetadata>({
    name: '',
    symbol: 'cTKN',
    description: '',
    image: 'https://placehold.co/400x400/5d4fff/ffffff?text=cToken',
    attributes: []
  });
  
  // Load creator's tokens
  useEffect(() => {
    if (connected && publicKey) {
      loadTokens();
    }
  }, [connected, publicKey]);
  
  const loadTokens = () => {
    if (!publicKey) return;
    
    try {
      const creatorTokens = getCreatorTokens(publicKey.toString());
      setTokens(creatorTokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast.error('Failed to load your tokens');
    }
  };
  
  const handleCreateToken = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!tokenForm.name || !tokenForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setCreatingToken(true);
    
    try {
      const newToken = await createExperienceToken(
        publicKey.toString(),
        tokenForm
      );
      
      toast.success(`Token "${newToken.metadata.name}" created successfully!`);
      
      // Add the new token to the list
      setTokens([newToken, ...tokens]);
      
      // Clear the form
      setTokenForm({
        name: '',
        symbol: 'cTKN',
        description: '',
        image: 'https://placehold.co/400x400/5d4fff/ffffff?text=cToken',
        attributes: []
      });
      
      // Show the token details
      setSelectedToken(newToken);
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Failed to create token');
    } finally {
      setCreatingToken(false);
    }
  };
  
  const handleSelectToken = (token: TokenData) => {
    setSelectedToken(token);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Experience Tokens</h1>
      
      {!connected ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="mb-4">Connect your wallet to manage your experience tokens</p>
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: token list */}
          <div className="col-span-1 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Tokens</h2>
            
            {tokens.length > 0 ? (
              <div className="space-y-4">
                {tokens.map((token) => (
                  <div 
                    key={token.id}
                    onClick={() => handleSelectToken(token)}
                    className={`p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition ${
                      selectedToken?.id === token.id ? 'bg-gray-700 border border-indigo-500' : 'bg-gray-900'
                    }`}
                  >
                    <h3 className="font-medium">{token.metadata.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{token.metadata.description}</p>
                    <div className="flex justify-between mt-2 text-sm">
                      <span>{token.claimable ? 'Claimable' : 'Claimed'}</span>
                      <span>{new Date(token.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">You haven't created any tokens yet</p>
            )}
            
            <button
              onClick={() => setSelectedToken(null)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Create New Token
            </button>
          </div>
          
          {/* Right column: create or view token */}
          <div className="col-span-1 lg:col-span-2 bg-gray-800 rounded-lg p-6">
            {selectedToken ? (
              // Token details view
              <div>
                <h2 className="text-2xl font-semibold mb-4">{selectedToken.metadata.name}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <img 
                      src={selectedToken.metadata.image} 
                      alt={selectedToken.metadata.name}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Description</h3>
                      <p>{selectedToken.metadata.description}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Status</h3>
                      <p>{selectedToken.claimable ? 'Available for claiming' : 'Already claimed'}</p>
                    </div>
                    
                    {selectedToken.claimable && selectedToken.claimCode && (
                      <>
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-gray-400 mb-2">Claim Code</h3>
                          <div className="flex items-center space-x-2">
                            <div className="bg-gray-700 px-4 py-2 rounded-lg font-mono">
                              {selectedToken.claimCode}
                            </div>
                            <button
                              onClick={() => copyToClipboard(selectedToken.claimCode!)}
                              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-gray-400 mb-2">Claim URL</h3>
                          <div className="flex items-center space-x-2">
                            <div className="bg-gray-700 px-4 py-2 rounded-lg text-sm overflow-x-auto whitespace-nowrap max-w-full">
                              {generateTokenClaimUrl(selectedToken)}
                            </div>
                            <button
                              onClick={() => copyToClipboard(generateTokenClaimUrl(selectedToken))}
                              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition flex-shrink-0"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <h3 className="text-sm font-medium text-gray-400 mb-2">QR Code</h3>
                          <div className="bg-white p-4 rounded-lg inline-block">
                            <QRCodeSVG 
                              value={generateTokenClaimUrl(selectedToken)} 
                              size={200}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Create token form
              <div>
                <h2 className="text-2xl font-semibold mb-4">Create Experience Token</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Token Name *</label>
                    <input
                      type="text"
                      value={tokenForm.name}
                      onChange={(e) => setTokenForm({...tokenForm, name: e.target.value})}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                      placeholder="e.g. VIP Access Token"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Symbol</label>
                    <input
                      type="text"
                      value={tokenForm.symbol}
                      onChange={(e) => setTokenForm({...tokenForm, symbol: e.target.value})}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                      placeholder="e.g. cTKN"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description *</label>
                    <textarea
                      value={tokenForm.description}
                      onChange={(e) => setTokenForm({...tokenForm, description: e.target.value})}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white h-24"
                      placeholder="Describe what this token provides access to"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Image URL</label>
                    <input
                      type="text"
                      value={tokenForm.image}
                      onChange={(e) => setTokenForm({...tokenForm, image: e.target.value})}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                      placeholder="https://example.com/image.png"
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateToken}
                    disabled={creatingToken || !tokenForm.name || !tokenForm.description}
                    className={`w-full py-3 px-4 rounded-lg font-bold mt-4 ${
                      creatingToken || !tokenForm.name || !tokenForm.description
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    } transition`}
                  >
                    {creatingToken ? 'Creating...' : 'Create Token'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 