'use client';

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction, 
  Keypair, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  createAllocTreeIx,
  ValidDepthSizePair,
  SPL_NOOP_PROGRAM_ID,
} from '@solana/spl-account-compression';
import { 
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createMintToCollectionV1Instruction,
  MetadataArgs, 
} from '@metaplex-foundation/mpl-bubblegum';
import toast from 'react-hot-toast';
import axios from 'axios';

// Configuration
const SOLANA_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_ENDPOINT, 'confirmed');

// Key for local storage of token data
const TOKEN_STORAGE_KEY = 'zkChat_tokens';

// Types for token data
export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes?: {
    trait_type: string;
    value: string;
  }[];
}

export interface TokenData {
  id: string;
  mint: string;
  metadata: TokenMetadata;
  creator: string;
  owner?: string;
  createdAt: number;
  claimable: boolean;
  claimedAt?: number;
  claimCode?: string;
}

/**
 * Create a new experience token (cToken)
 * @param creator Creator wallet address
 * @param metadata Token metadata
 * @returns The created token data
 */
export async function createExperienceToken(
  creator: string,
  metadata: TokenMetadata
): Promise<TokenData> {
  try {
    console.log('Creating experience token for:', creator);
    console.log('Metadata:', metadata);

    // In a production implementation, this would:
    // 1. Mint a compressed NFT using the Metaplex Bubblegum program
    // 2. Store the token data on-chain in a compressed format
    // 3. Return the token data with a mint address

    // Generate a unique claim code
    const claimCode = generateClaimCode();
    
    // Create token data
    const tokenData: TokenData = {
      id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      mint: new PublicKey(Keypair.generate().publicKey).toString(),
      metadata,
      creator,
      createdAt: Date.now(),
      claimable: true,
      claimCode
    };

    // Store token data
    storeToken(tokenData);

    console.log('Created token:', tokenData.id);
    return tokenData;
  } catch (error) {
    console.error('Error creating experience token:', error);
    throw error;
  }
}

/**
 * Claim an experience token with a claim code
 * @param claimer Claimer wallet address
 * @param claimCode Token claim code
 * @returns Success status and claimed token data
 */
export async function claimExperienceToken(
  claimer: string,
  claimCode: string
): Promise<{ success: boolean; token?: TokenData; message?: string }> {
  try {
    console.log('Claiming token with code:', claimCode, 'for wallet:', claimer);

    // Find the token with the given claim code
    const tokens = getAllTokens();
    const token = tokens.find(t => t.claimCode === claimCode && t.claimable);

    if (!token) {
      return { 
        success: false, 
        message: 'Invalid claim code or token already claimed' 
      };
    }

    // In a production implementation, this would:
    // 1. Verify the claim code on-chain
    // 2. Transfer the compressed NFT to the claimer
    // 3. Update the token data on-chain

    // Update token data
    const updatedToken: TokenData = {
      ...token,
      owner: claimer,
      claimable: false,
      claimedAt: Date.now()
    };

    // Update in storage
    updateToken(updatedToken);

    console.log('Token claimed:', updatedToken.id);
    return { success: true, token: updatedToken };
  } catch (error) {
    console.error('Error claiming token:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error claiming token' 
    };
  }
}

/**
 * Get all tokens created by a specific creator
 * @param creator Creator wallet address
 * @returns Array of tokens created by the creator
 */
export function getCreatorTokens(creator: string): TokenData[] {
  try {
    const tokens = getAllTokens();
    return tokens.filter(token => token.creator === creator);
  } catch (error) {
    console.error('Error getting creator tokens:', error);
    return [];
  }
}

/**
 * Get all tokens owned by a specific wallet
 * @param owner Owner wallet address
 * @returns Array of tokens owned by the wallet
 */
export function getWalletTokens(owner: string): TokenData[] {
  try {
    const tokens = getAllTokens();
    return tokens.filter(token => token.owner === owner);
  } catch (error) {
    console.error('Error getting wallet tokens:', error);
    return [];
  }
}

/**
 * Generate a QR code claim URL for a token
 * @param token Token data
 * @returns URL to claim the token
 */
export function generateTokenClaimUrl(token: TokenData): string {
  if (!token.claimCode) {
    throw new Error('Token has no claim code');
  }
  
  // Format: https://yourdomain.com/claim?code=CLAIMCODE
  // For local development: http://localhost:3000/claim?code=CLAIMCODE
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/claim?code=${token.claimCode}`;
}

// Private helper functions

/**
 * Generate a random claim code
 * @returns Random claim code
 */
function generateClaimCode(): string {
  // Format: 6 alphanumeric characters, uppercase for better readability
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Store a token in local storage
 * @param token Token data
 */
function storeToken(token: TokenData): void {
  const tokens = getAllTokens();
  tokens.push(token);
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Update a token in local storage
 * @param updatedToken Updated token data
 */
function updateToken(updatedToken: TokenData): void {
  const tokens = getAllTokens();
  const index = tokens.findIndex(t => t.id === updatedToken.id);
  
  if (index !== -1) {
    tokens[index] = updatedToken;
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }
}

/**
 * Get all tokens from local storage
 * @returns Array of all tokens
 */
function getAllTokens(): TokenData[] {
  try {
    const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    return storedTokens ? JSON.parse(storedTokens) : [];
  } catch (error) {
    console.error('Error getting all tokens:', error);
    return [];
  }
} 