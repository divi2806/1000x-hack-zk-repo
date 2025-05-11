import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getZKCompressionService } from '@/utils/zk-compression';
import { HELIUS_CONFIG, getRandomDelay } from '@/utils/apiConfig';
import NodeCache from 'node-cache';

// Create connection using config
const connection = new Connection(HELIUS_CONFIG.RPC_URL);

// Initialize ZK compression service
const zkCompressionService = getZKCompressionService(connection);

// Create a cache for proof results
const proofCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export async function POST(request: NextRequest) {
  try {
    // Get generation parameters from request body
    const { walletAddress, assetId } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log(`Generating ZK proof for wallet: ${walletAddress}, assetId: ${assetId || 'N/A'}`);
    
    // Check cache first
    const cacheKey = `proof_${walletAddress}_${assetId || 'default'}`;
    const cachedProof = proofCache.get(cacheKey);
    
    if (cachedProof) {
      console.log('Returning cached ZK proof');
      return NextResponse.json(cachedProof);
    }
    
    // Add jitter to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    
    // Initialize ZK service
    await zkCompressionService.initialize();
    
    try {
      // Generate the ZK proof
      const zkProofResult = await zkCompressionService.generateProof(
        walletAddress,
        assetId || 'zkchat-vip-access'
      );
      
      console.log('ZK proof generated successfully');
      
      // Prepare the response with proof data
      const response = {
        success: true,
        proof: zkProofResult.proof,
        inputs: zkProofResult.inputs,
        data: {
          walletAddress,
          assetId: assetId || 'zkchat-vip-access',
          timestamp: Date.now()
        }
      };
      
      // Cache the result
      proofCache.set(cacheKey, response);
      
      return NextResponse.json(response);
    } catch (error: any) {
      console.error('Error generating ZK proof:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to generate ZK proof', 
          message: error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server error during ZK proof generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error during ZK proof generation',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 