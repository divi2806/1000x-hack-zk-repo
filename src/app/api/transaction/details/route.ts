import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import NodeCache from 'node-cache';
import { HELIUS_CONFIG, CACHE_CONFIG, getRandomDelay, getApiHeaders } from '@/utils/apiConfig';

// Create a cache with TTL from config
const txCache = new NodeCache({ 
  stdTTL: CACHE_CONFIG.EXTENDED_TTL, 
  checkperiod: CACHE_CONFIG.DEFAULT_TTL 
});

export async function POST(request: NextRequest) {
  try {
    // Get the signature from the request body
    const { signature } = await request.json();

    if (!signature) {
      return NextResponse.json(
        { error: 'Transaction signature is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `tx_details_${signature}`;
    const cachedData = txCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Returning cached transaction details for signature: ${signature}`);
      return NextResponse.json(cachedData);
    }

    console.log(`Getting transaction details for signature: ${signature} through backend proxy`);
    
    try {
      // Add random delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      
      // Call Helius Enhanced API to get transaction details
      const response = await axios.get(
        `${HELIUS_CONFIG.ENHANCED_API_URL}/transactions`,
        {
          params: {
            'api-key': HELIUS_CONFIG.API_KEY,
            transactions: [signature]
          },
          headers: getApiHeaders()
        }
      );
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Cache the result
        txCache.set(cacheKey, response.data);
        
        return NextResponse.json(response.data);
      } else {
        // Try alternative method if first one fails
        try {
          const altResponse = await axios.post(
            `https://devnet.helius-rpc.com/?api-key=${HELIUS_CONFIG.API_KEY}`,
            {
              jsonrpc: '2.0',
              id: 'helius-tx',
              method: 'getTransaction',
              params: [
                signature,
                {
                  encoding: 'json',
                  maxSupportedTransactionVersion: 0
                }
              ]
            },
            {
              headers: getApiHeaders()
            }
          );
          
          if (altResponse.data && altResponse.data.result) {
            // Cache the result
            txCache.set(cacheKey, altResponse.data.result);
            
            return NextResponse.json(altResponse.data.result);
          }
        } catch (err) {
          console.warn('Alternative transaction details method failed:', err);
        }
        
        return NextResponse.json({ 
          error: 'No transaction details found',
          signature
        });
      }
    } catch (error: any) {
      console.error('Error getting transaction details:', error.message);
      return NextResponse.json({ 
        error: 'Failed to get transaction details',
        signature,
        message: error.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Server error getting transaction details:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error getting transaction details',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 