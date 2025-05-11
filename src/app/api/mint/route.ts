import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Connection } from '@solana/web3.js';
import { getZKCompressionService } from '@/utils/zk-compression';
import { HELIUS_CONFIG, getApiHeaders, getRandomDelay } from '@/utils/apiConfig';

// Create connection using config
const connection = new Connection(HELIUS_CONFIG.RPC_URL);

// Initialize ZK compression service
const zkCompressionService = getZKCompressionService(connection);

export async function POST(request: NextRequest) {
  try {
    // Get the wallet address from the request body
    const { walletAddress, useZkCompression } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log(`Starting ZK-compressed NFT mint process for wallet: ${walletAddress}`);
    
    // Initialize ZK compression service if requested
    if (useZkCompression) {
      await zkCompressionService.initialize();
      console.log('ZK compression service initialized for minting');
    }

    // Create the request to mint a compressed NFT via Helius API
    const mintRequest = {
      jsonrpc: '2.0',
      id: 'helius-mint',
      method: 'mintCompressedNft',
      params: {
        name: 'ZKChat VIP Access Pass',
        symbol: 'ZKVIP',
        description: 'This NFT provides access to VIP chatrooms in ZKChat with real zero-knowledge proof verification and compression',
        owner: walletAddress,
        delegate: walletAddress,
        sellerFeeBasisPoints: 500, // 5% royalty
        creators: [
          {
            address: walletAddress,
            share: 100
          }
        ],
        imageUrl: 'https://placehold.co/400x400/5d4fff/ffffff?text=ZKChat+VIP',
        externalUrl: 'https://zkchat.app',
        attributes: [
          { trait_type: 'Access Level', value: 'VIP' },
          { trait_type: 'Chatroom Access', value: 'All' },
          { trait_type: 'Expiration', value: 'Never' },
          { trait_type: 'ZK Compression', value: 'Enabled' }
        ],
        confirmTransaction: true
      }
    };

    console.log('Sending ZK-compressed mint request with parameters:', JSON.stringify(mintRequest.params));
    
    try {
      // Add jitter to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      
      // Make the API call to mint the NFT with proper headers
      const response = await axios.post(
        `https://devnet.helius-rpc.com/?api-key=${HELIUS_CONFIG.API_KEY}`, 
        mintRequest, 
        { headers: getApiHeaders() }
      );
      
      // Log the successful response
      console.log('Mint API response:', JSON.stringify(response.data));
      
      // Add ZK compression verification details if enabled
      let responseData = response.data;
      if (useZkCompression && response.data.result?.assetId) {
        const assetId = response.data.result.assetId;
        console.log(`Generated asset ID: ${assetId}, preparing ZK verification metadata`);
        
        // Add additional ZK verification metadata
        responseData.zkCompression = {
          enabled: true,
          timestamp: Date.now(),
          assetId: assetId
        };
      }
      
      // Return the result to the client
      return NextResponse.json(responseData);
    } catch (error: any) {
      // Handle Axios errors with detailed logging
      console.error('Helius API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        error: error.toString()
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to mint NFT via Helius API', 
          details: error.response?.data || error.message
        },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error: any) {
    // Handle general errors
    console.error('Server error during NFT minting:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error during NFT minting',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 