import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import NodeCache from 'node-cache';
import { HELIUS_CONFIG, CACHE_CONFIG, getRandomDelay, getApiHeaders } from '@/utils/apiConfig';

// Create a cache with TTL from config
const nftCache = new NodeCache({ 
  stdTTL: CACHE_CONFIG.DEFAULT_TTL, 
  checkperiod: CACHE_CONFIG.SHORT_TTL 
});

export async function POST(request: NextRequest) {
  try {
    // Get the wallet address from the request body
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `nfts_${walletAddress}`;
    const cachedData = nftCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Returning cached NFT data for wallet: ${walletAddress}`);
      return NextResponse.json(cachedData);
    }

    console.log(`Getting NFTs for wallet: ${walletAddress} through backend proxy`);
    
    // Create the request to fetch NFTs owned by the wallet
    const getNftsRequest = {
      jsonrpc: '2.0',
      id: 'helius-nfts',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: walletAddress,
        page: 1,
        limit: 100,
        displayOptions: {
          showCompressedState: true
        }
      }
    };
    
    try {
      // First try using the Enhanced API which might have better performance
      try {
        // Add rate limiting with jitter
        const delay = getRandomDelay();
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const enhancedResponse = await axios.get(
          `${HELIUS_CONFIG.ENHANCED_API_URL}/addresses/${walletAddress}/transactions`,
          {
            params: {
              'api-key': HELIUS_CONFIG.API_KEY,
              type: 'NFT'
            },
            headers: getApiHeaders()
          }
        );
        
        if (enhancedResponse.data && enhancedResponse.data.length > 0) {
          // Process the enhanced API response
          const result = {
            items: enhancedResponse.data
              .filter((tx: any) => tx.type === 'NFT_MINT' || tx.type === 'COMPRESSED_NFT_MINT')
              .map((tx: any) => ({
                id: tx.tokenTransfers?.[0]?.mint || tx.signature,
                content: {
                  metadata: {
                    name: tx.description || 'NFT',
                    image: tx.events?.nft?.image || 'https://placehold.co/300'
                  }
                }
              }))
          };
          
          // Cache the result
          nftCache.set(cacheKey, result);
          
          return NextResponse.json(result);
        }
      } catch (enhancedError: any) {
        console.warn('Enhanced API failed, falling back to RPC:', enhancedError.message);
      }
      
      // Add a small delay before the fallback request
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(200)));
      
      // Fallback to standard RPC API
      const response = await axios.post(
        `https://devnet.helius-rpc.com/?api-key=${HELIUS_CONFIG.API_KEY}`,
        getNftsRequest,
        {
          headers: getApiHeaders()
        }
      );
      
      // Check if we have a valid response with results
      if (response.data && response.data.result) {
        // Cache the results
        nftCache.set(cacheKey, response.data.result);
        
        // Return the result directly
        return NextResponse.json(response.data.result);
      } else {
        // Return empty array if no results
        return NextResponse.json({ items: [] });
      }
    } catch (error: any) {
      console.error('Error getting NFTs:', error.message);
      // Return empty array in case of error
      return NextResponse.json({ items: [] }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Server error getting NFTs:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error getting NFTs',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 