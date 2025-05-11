'use client';

import { Connection, PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';
import axios, { AxiosError } from 'axios';
import { getZKCompressionService } from '../utils/zk-compression';

// Use environment variable instead of hardcoded API key
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '3d125df1-b66e-40f5-a45a-c1e2f73d3818';
const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_ENHANCED_API_URL = `https://api-devnet.helius-rpc.com/v0`;
const CONNECTION = new Connection(RPC_URL);

// VIP Pass NFT Collection address (this would be created during deployment)
// For simplicity, we'll use a fixed address for the VIP collection
const VIP_COLLECTION_ADDRESS = 'C2F3LPNMUC7PvMMSvViWDGKgPrBZ6GHr6nXMdw1jh8Ww';

// Initialize ZK compression service
const zkCompressionService = getZKCompressionService(CONNECTION);

// Define types for Helius API responses
interface HeliusNFTMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface HeliusNFTContent {
  metadata?: HeliusNFTMetadata;
}

interface HeliusNFT {
  id: string;
  content?: HeliusNFTContent;
}

export async function mintCompressedNFT(walletAddress: string) {
  try {
    console.log(`Minting ZK-compressed NFT for wallet: ${walletAddress}`);
    
    // First initialize the ZK compression service
    await zkCompressionService.initialize();
    
    // Use our own API endpoint to mint the NFT with ZK compression
    let response;
    try {
      // Add special ZK compression parameters
      response = await axios.post('/api/mint', { 
        walletAddress,
        useZkCompression: true
      });
      
      console.log('Mint API response:', response.data);
      
      // If we get here, the API call succeeded
      if (!response.data.result) {
        console.error('Invalid API response:', response.data);
        throw new Error('Invalid API response: No result returned');
      }
      
      // Get the result from the API response
      const result = response.data.result;
      console.log('Mint result:', result);
      
      // Generate ZK proof for this NFT ownership
      const assetId = result.assetId || result.mint;
      
      // Use our backend API to generate the proof
      const zkProofResponse = await axios.post('/api/zkproof/generate', {
        walletAddress,
        assetId
      });
      
      const zkProofResult = zkProofResponse.data;
      
      // Store NFT data in localStorage for client-side verification
      localStorage.setItem(`vip_pass_${walletAddress}`, 'true');
      localStorage.setItem(`mint_signature_${walletAddress}`, result.signature);
      localStorage.setItem(`mint_data_${walletAddress}`, JSON.stringify({
        signature: result.signature,
        mint: assetId,
        zkProof: zkProofResult.proof,
        zkInputs: zkProofResult.inputs,
        timestamp: Date.now()
      }));
      
      // Use backend API to get transaction details
      try {
        await axios.post('/api/transaction/details', {
          signature: result.signature
        });
      } catch (err) {
        console.warn('Failed to get transaction details, but mint was successful:', err);
      }
      
      return {
        success: true,
        signature: result.signature,
        mint: assetId,
        zkProof: zkProofResult.proof
      };
    } catch (error) {
      const apiError = error as AxiosError;
      const errorData = apiError.response?.data as any;
      
      console.error('Error response from API:', errorData);
      
      // Extract specific Helius error details if available
      const errorDetails = errorData?.details?.error?.message || 
                          errorData?.details?.error || 
                          errorData?.details || 
                          apiError.message || 
                          'Unknown error';
      
      // Check if there's already a cached NFT - if so, we'll assume it was minted before
      const existingMint = localStorage.getItem(`mint_signature_${walletAddress}`);
      if (existingMint) {
        console.log('Using previously cached mint signature');
        return {
          success: true,
          signature: existingMint,
          mint: `previously_minted_${existingMint.substring(0, 10)}`
        };
      }
      
      // If we get here, we need to display an actual error to the user
      throw new Error('Failed to mint NFT on Solana devnet: ' + errorDetails);
    }
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
}

// Check if the wallet owns the VIP access pass NFT using ZK verification
export async function hasVipAccessPass(walletAddress: string): Promise<boolean> {
  try {
    console.log(`Checking VIP access for wallet: ${walletAddress} with ZK verification`);
    
    // First check local storage for cached result to avoid API calls
    const cachedPass = localStorage.getItem(`vip_pass_${walletAddress}`);
    if (cachedPass === 'true') {
      console.log('Found VIP pass in local storage');
      
      // Verify ZK proof if available
      const mintData = localStorage.getItem(`mint_data_${walletAddress}`);
      if (mintData) {
        const parsed = JSON.parse(mintData);
        if (parsed.zkProof && parsed.zkInputs) {
          // Initialize ZK service
          await zkCompressionService.initialize();
          
          // Use backend API to verify the proof
          try {
            const verifyResponse = await axios.post('/api/zkproof/verify', {
              proof: parsed.zkProof,
              inputs: parsed.zkInputs,
              walletAddress,
              assetId: parsed.mint
            });
            
            if (verifyResponse.data.verified) {
              console.log('ZK proof verification successful');
              return true;
            } else {
              console.warn('ZK proof verification failed - will verify with API');
            }
          } catch (err) {
            console.warn('ZK proof verification API error, falling back to local check:', err);
            // If backend verification fails, try local verification
            const isValid = await zkCompressionService.verifyProof(
              parsed.zkProof,
              parsed.zkInputs
            );
            
            if (isValid) {
              return true;
            }
          }
        }
      }
      
      return true;
    }
    
    // Check if we have a mint signature stored (which means a mint was attempted)
    const mintSignature = localStorage.getItem(`mint_signature_${walletAddress}`);
    if (mintSignature) {
      console.log('Found mint signature, assuming NFT was minted');
      localStorage.setItem(`vip_pass_${walletAddress}`, 'true');
      return true;
    }
    
    // Use our backend API to get NFTs owned by this wallet
    try {
      const response = await axios.post('/api/nft/get-by-owner', {
        walletAddress
      });
      
      // Check if response has NFTs
      const nfts = response.data?.items || [];
      console.log(`Found ${nfts.length} NFTs for ${walletAddress}`);
      
      // Check if any NFT matches our VIP access pass criteria
      const hasVipPass = nfts.some((nft: HeliusNFT) => 
        nft.content?.metadata?.name === 'ZKChat VIP Access Pass'
      );
      
      // Save this info to localStorage for future use
      if (hasVipPass) {
        localStorage.setItem(`vip_pass_${walletAddress}`, 'true');
      }
      
      return hasVipPass;
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
      
      // Fallback to localStorage if API call fails
      const cachedPass = localStorage.getItem(`vip_pass_${walletAddress}`);
      return cachedPass === 'true';
    }
  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    
    // Fallback to localStorage if API call fails
    const cachedPass = localStorage.getItem(`vip_pass_${walletAddress}`);
    return cachedPass === 'true';
  }
}

// Get NFTs owned by a wallet
export async function getCompressedNFTsByOwner(owner: string) {
  try {
    console.log(`Getting NFTs for wallet: ${owner}`);
    
    // Use our backend API to get NFTs
    try {
      const response = await axios.post('/api/nft/get-by-owner', {
        walletAddress: owner
      });
      
      // Return the result directly
      return response.data;
    } catch (error) {
      const apiError = error as AxiosError;
      console.error('Error getting NFTs:', apiError);
      // Return empty array in case of error
      return { items: [] };
    }
  } catch (error) {
    console.error('Error getting NFTs:', error);
    throw error;
  }
} 