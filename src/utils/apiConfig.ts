/**
 * Central configuration for all API keys and endpoints
 * This allows for easier management of environment variables and API configurations
 */

// Helius API configuration
export const HELIUS_CONFIG = {
  // API Key - use environment variable with fallback
  API_KEY: process.env.HELIUS_API_KEY || '3d125df1-b66e-40f5-a45a-c1e2f73d3818',
  
  // Public API Key for client-side use
  PUBLIC_API_KEY: process.env.NEXT_PUBLIC_HELIUS_API_KEY || '3d125df1-b66e-40f5-a45a-c1e2f73d3818',
  
  // RPC Endpoints
  RPC_URL: `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || '3d125df1-b66e-40f5-a45a-c1e2f73d3818'}`,
  
  // Enhanced API Endpoints
  ENHANCED_API_URL: 'https://api-devnet.helius-rpc.com/v0',
  
  // Solana network to use
  NETWORK: 'devnet',
};

// Cache configuration
export const CACHE_CONFIG = {
  // Default TTL for most cached items (5 minutes)
  DEFAULT_TTL: 300,
  
  // Extended TTL for transaction details (30 minutes)
  EXTENDED_TTL: 1800,
  
  // Short TTL for frequently changing data (1 minute)
  SHORT_TTL: 60,
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // Maximum requests per minute
  MAX_REQUESTS_PER_MINUTE: 30,
  
  // Cooldown period in milliseconds
  COOLDOWN_MS: 2000,
  
  // Enable jitter to spread out requests
  ENABLE_JITTER: true,
  
  // Maximum jitter in milliseconds
  MAX_JITTER_MS: 500,
};

// Helper function to add jitter to API calls
export function getRandomDelay(maxDelay = RATE_LIMIT_CONFIG.MAX_JITTER_MS): number {
  return Math.floor(Math.random() * maxDelay);
}

// Helper to create standard headers for API requests
export function getApiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'ZKChat/1.0',
  };
} 