'use client';

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import toast from 'react-hot-toast';
import axios from 'axios';
import { storeProofData } from './firebaseService';

// Interfaces for ZK proof data
export interface ProofData {
  id: string;
  walletAddress: string;
  timestamp: number;
  expiresAt: number;
  verified: boolean;
  type: 'chatroom_access' | 'wallet_ownership' | 'token_ownership';
  proofBlob?: string; // Base64 encoded proof data
  publicHash?: string; // Public hash for verification
}

export interface ZkVerificationResponse {
  success: boolean;
  proofId?: string;
  message: string;
  verified?: boolean;
}

// Configuration for Solana connection with provided Helius API key
const HELIUS_API_KEY = '291a6a45-5d9a-4a2f-ba95-05df47a7c6ca';
const SOLANA_ENDPOINT = `https://api.devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const connection = new Connection(SOLANA_ENDPOINT, 'confirmed');

// API endpoints for ZK proof generation and verification
const ZK_API_BASE = '/api/zkproof';

// Local storage key for ZK proofs
const ZK_PROOFS_STORAGE_KEY = 'zkChat_proofs';

/**
 * Generate a ZK proof for wallet ownership
 * This function creates a signed message proving wallet ownership
 */
export async function generateWalletProof(walletAddress: string): Promise<ProofData> {
  try {
    console.log('Generating wallet ownership proof for:', walletAddress);
    
    // Call our API endpoint for proof generation
    const response = await axios.post(`${ZK_API_BASE}/generate`, {
      walletAddress,
      type: 'wallet_ownership',
      timestamp: Date.now()
    });
    
    // Check if the API call was successful
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to generate wallet proof');
    }
    
    const proofData: ProofData = {
      id: response.data.proofId,
      walletAddress,
      timestamp: Date.now(),
      expiresAt: response.data.expiresAt,
      verified: true,
      type: 'wallet_ownership',
      proofBlob: response.data.proofBlob,
      publicHash: extractPublicHash(response.data.proofBlob)
    };
    
    // Store proof data
    await storeProof(proofData);
    
    console.log('Generated wallet ownership proof:', proofData.id);
    return proofData;
  } catch (error) {
    console.error('Error generating wallet proof:', error);
    toast.error('Failed to generate proof');
    throw error;
  }
}

/**
 * Generate a ZK proof for chatroom access based on NFT ownership
 * This creates a ZK proof that the user has an eligible NFT without revealing which one
 */
export async function generateChatroomAccessProof(walletAddress: string): Promise<ProofData> {
  try {
    console.log('Generating chatroom access proof for:', walletAddress);
    
    // Call our API endpoint for proof generation
    const response = await axios.post(`${ZK_API_BASE}/generate`, {
      walletAddress,
      type: 'chatroom_access',
      timestamp: Date.now()
    });
    
    // Check if the API call was successful
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to generate chatroom access proof');
    }
    
    const proofData: ProofData = {
      id: response.data.proofId,
      walletAddress,
      timestamp: Date.now(),
      expiresAt: response.data.expiresAt,
      verified: true,
      type: 'chatroom_access',
      proofBlob: response.data.proofBlob,
      publicHash: extractPublicHash(response.data.proofBlob)
    };
    
    // Store proof data in both localStorage and Firebase
    await storeProof(proofData);
    
    console.log('Generated chatroom access proof:', proofData.id);
    return proofData;
  } catch (error) {
    console.error('Error generating chatroom access proof:', error);
    toast.error('Failed to generate proof for chatroom access');
    throw error;
  }
}

/**
 * Generate proof for token (NFT) ownership
 * Used for VIP room access verification
 */
export async function generateTokenOwnershipProof(
  walletAddress: string, 
  nftId: string
): Promise<ProofData> {
  try {
    console.log('Generating token ownership proof for:', walletAddress, 'token:', nftId);
    
    // Call our API endpoint for token proof generation
    const response = await axios.post(`${ZK_API_BASE}/generate`, {
      walletAddress,
      type: 'token_ownership',
      nftId,
      timestamp: Date.now()
    });
    
    // Check if the API call was successful
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to generate token ownership proof');
    }
    
    const proofData: ProofData = {
      id: response.data.proofId,
      walletAddress,
      timestamp: Date.now(),
      expiresAt: response.data.expiresAt,
      verified: true,
      type: 'token_ownership',
      proofBlob: response.data.proofBlob,
      publicHash: extractPublicHash(response.data.proofBlob)
    };
    
    // Store proof data
    await storeProof(proofData);
    
    console.log('Generated token ownership proof:', proofData.id);
    return proofData;
  } catch (error) {
    console.error('Error generating token ownership proof:', error);
    toast.error('Failed to generate token ownership proof');
    throw error;
  }
}

/**
 * Verify a previously generated proof
 */
export async function verifyProof(proofId: string): Promise<boolean> {
  try {
    // Get stored proofs first to check locally
    const storedProof = getProofById(proofId);
    
    if (!storedProof) {
      console.error('Proof not found locally:', proofId);
      return false;
    }
    
    // Check if the proof is expired
    const now = Date.now();
    if (storedProof.expiresAt < now) {
      console.error('Proof expired:', proofId);
      return false;
    }
    
    // Verify with the backend API
    const response = await axios.post(`${ZK_API_BASE}/verify`, {
      proofId,
      proofBlob: storedProof.proofBlob
    });
    
    return response.data.verified === true;
  } catch (error) {
    console.error('Error verifying proof:', error);
    return false;
  }
}

/**
 * Extract the public hash from a proof blob
 */
function extractPublicHash(proofBlob: string): string | undefined {
  try {
    const decodedProof = Buffer.from(proofBlob, 'base64').toString('utf-8');
    const proofData = JSON.parse(decodedProof);
    
    // Check if this is a Circom proof (has publicSignals field)
    if (proofData.publicSignals && proofData.publicSignals.length > 0) {
      return proofData.publicSignals[0];
    }
    
    // For simulated proofs, use the hash
    if (proofData.hash) {
      return proofData.hash;
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting public hash:', error);
    return undefined;
  }
}

/**
 * Store a proof in local storage and in Firebase if available
 */
async function storeProof(proofData: ProofData): Promise<void> {
  try {
    // Always store in localStorage first
    const proofs = getAllProofs();
    proofs.push(proofData);
    localStorage.setItem(ZK_PROOFS_STORAGE_KEY, JSON.stringify(proofs));
    console.log('Stored proof in localStorage');
    
    // Try to store in Firebase - but continue even if it fails
    try {
      await storeProofData(
        proofData.walletAddress,
        proofData.type,
        proofData
      );
      console.log('Stored proof in Firebase');
    } catch (error) {
      console.warn('Firebase storage failed, using local storage only:', error);
    }
  } catch (error) {
    console.error('Error storing proof:', error);
    
    // As a failsafe, store this specific proof directly
    try {
      const key = `proof_${proofData.id}`;
      localStorage.setItem(key, JSON.stringify(proofData));
      console.log('Stored proof in direct localStorage key');
    } catch (e) {
      console.error('Emergency localStorage storage also failed:', e);
    }
  }
}

/**
 * Get a proof by ID
 */
function getProofById(proofId: string): ProofData | undefined {
  try {
    const proofs = getAllProofs();
    return proofs.find(proof => proof.id === proofId);
  } catch (error) {
    console.error('Error getting proof by ID:', error);
    return undefined;
  }
}

/**
 * Get all stored proofs
 */
function getAllProofs(): ProofData[] {
  try {
    const storedProofs = localStorage.getItem(ZK_PROOFS_STORAGE_KEY);
    return storedProofs ? JSON.parse(storedProofs) : [];
  } catch (error) {
    console.error('Error getting all proofs:', error);
    return [];
  }
}

/**
 * Get all proofs for a specific wallet
 */
export function getWalletProofs(walletAddress: string): ProofData[] {
  try {
    const proofs = getAllProofs();
    return proofs.filter(proof => proof.walletAddress === walletAddress);
  } catch (error) {
    console.error('Error getting wallet proofs:', error);
    return [];
  }
}

/**
 * Clear expired proofs from storage
 */
export function clearExpiredProofs(): void {
  try {
    const proofs = getAllProofs();
    const now = Date.now();
    const validProofs = proofs.filter(proof => proof.expiresAt > now);
    
    if (validProofs.length !== proofs.length) {
      localStorage.setItem(ZK_PROOFS_STORAGE_KEY, JSON.stringify(validProofs));
      console.log(`Cleared ${proofs.length - validProofs.length} expired proofs`);
    }
  } catch (error) {
    console.error('Error clearing expired proofs:', error);
  }
} 