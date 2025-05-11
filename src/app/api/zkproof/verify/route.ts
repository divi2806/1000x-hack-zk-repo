import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getZKCompressionService } from '@/utils/zk-compression';
import { HELIUS_CONFIG, getRandomDelay } from '@/utils/apiConfig';
import NodeCache from 'node-cache';

// Create connection using config
const connection = new Connection(HELIUS_CONFIG.RPC_URL);

// Initialize ZK compression service
const zkCompressionService = getZKCompressionService(connection);

// Create a cache for verification results
const verifyCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

export async function POST(request: NextRequest) {
  try {
    // Get verification parameters from request body
    const { proof, inputs, assetId, walletAddress } = await request.json();

    console.log(`Verifying ZK proof for wallet: ${walletAddress}, assetId: ${assetId}`);

    if (!proof || !inputs) {
      return NextResponse.json(
        { error: 'Missing required verification parameters' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `verify_${walletAddress}_${assetId || inputs[0]}`;
    const cachedResult = verifyCache.get(cacheKey);
    
    if (cachedResult !== undefined) {
      console.log(`Using cached verification result: ${cachedResult ? 'verified' : 'failed'}`);
      return NextResponse.json({
        verified: !!cachedResult,
        message: cachedResult ? 'ZK proof verification successful (cached)' : 'ZK proof verification failed (cached)',
        data: {
          assetId,
          walletAddress,
          timestamp: Date.now(),
          cached: true
        }
      }, cachedResult ? { status: 200 } : { status: 401 });
    }
    
    // Add jitter to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, getRandomDelay()));

    // Initialize ZK service
    await zkCompressionService.initialize();
    
    // Verify the ZK proof
    try {
      console.log('Verifying proof...');
      const verified = await zkCompressionService.verifyProof(proof, inputs);
      
      console.log(`ZK proof verification result: ${verified}`);
      
      // Cache the result
      verifyCache.set(cacheKey, verified);
      
      if (verified) {
        return NextResponse.json({
          verified: true,
          message: 'ZK proof verification successful',
          data: {
            assetId,
            walletAddress,
            timestamp: Date.now()
          }
        });
      } else {
        return NextResponse.json({
          verified: false,
          message: 'ZK proof verification failed',
          data: {
            assetId,
            walletAddress,
            timestamp: Date.now()
          }
        }, { status: 401 });
      }
    } catch (error: any) {
      console.error('Error verifying ZK proof:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to verify ZK proof', 
          message: error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server error during ZK proof verification:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error during ZK proof verification',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 