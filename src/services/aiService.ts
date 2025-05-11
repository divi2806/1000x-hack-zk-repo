'use client';

// Type definitions
export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  isAI?: boolean;
}

// Generate AI response to user query
export async function generateAIResponse(
  prompt: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  try {
    console.log('AI request:', prompt);
    
    // Use simple mock responses instead of relying on external API
    return getMockAIResponse(prompt);
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // If there's an error, return a fallback response
    return "I'm having trouble connecting to my knowledge base right now. Please try again in a moment.";
  }
}

// Function to generate mock AI responses based on keywords
function getMockAIResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // ZK-related queries
  if (lowerQuery.includes('zero-knowledge') || lowerQuery.includes('zk') || lowerQuery.includes('proof')) {
    return "Zero-knowledge proofs (ZKPs) are cryptographic methods that allow one party to prove to another that a statement is true without revealing any additional information. In ZKChat, we use ZKPs to verify NFT ownership without revealing the specific details of your wallet or tokens, enhancing privacy while maintaining security.";
  }
  
  // NFT-related queries
  if (lowerQuery.includes('nft') || lowerQuery.includes('token')) {
    return "Non-Fungible Tokens (NFTs) are unique digital assets stored on a blockchain. In ZKChat, we use NFTs as access passes to exclusive chat rooms. Our VIP NFTs grant access to private channels while maintaining your privacy through zero-knowledge proofs.";
  }
  
  // Solana-related queries
  if (lowerQuery.includes('solana')) {
    return "Solana is a high-performance blockchain known for its fast transaction speeds and low fees. ZKChat is built on Solana to provide a seamless, real-time messaging experience with integrated Web3 features like NFT-gated access and zero-knowledge proofs for privacy.";
  }
  
  // Chat-related queries
  if (lowerQuery.includes('chat') || lowerQuery.includes('message')) {
    return "ZKChat combines the convenience of modern messaging with the security and privacy of blockchain technology. Public rooms are available to everyone, while VIP rooms require ownership of special NFT access passes, verified through zero-knowledge proofs to protect your privacy.";
  }
  
  // Privacy-related queries
  if (lowerQuery.includes('privacy') || lowerQuery.includes('secure')) {
    return "Privacy is a core feature of ZKChat. We use zero-knowledge proofs to verify your eligibility for VIP rooms without exposing your wallet details or specific NFT ownership. This means you can participate in exclusive conversations while maintaining anonymity.";
  }
  
  // Help or generic queries
  if (lowerQuery.includes('help') || lowerQuery.includes('how to')) {
    return "Welcome to ZKChat! To get started, connect your Solana wallet using the button in the top right. You can join the public chat immediately, or mint a VIP Access Pass NFT to join exclusive rooms. Use '@ai' followed by your question to ask me anything about ZKChat, NFTs, or zero-knowledge proofs.";
  }
  
  // Default response for any other query
  return "I'm ZKChat's AI assistant. I can help answer questions about zero-knowledge proofs, NFTs, and how to use this application. For specific topics, try asking about 'ZK proofs', 'NFT access', 'privacy features', or 'how to use ZKChat'.";
}

// Function to detect if a message is directed to the AI assistant
export function isAICommand(message: string): boolean {
  const normalizedMessage = message.trim().toLowerCase();
  
  // Check for @ai mention or /ask command
  return normalizedMessage.startsWith('@ai') || 
         normalizedMessage.startsWith('/ask');
}

// Process the message to extract the actual query to the AI
export function extractAIQuery(message: string): string {
  let normalizedMessage = message.trim();
  
  if (normalizedMessage.toLowerCase().startsWith('@ai')) {
    return normalizedMessage.substring(3).trim();
  }
  
  if (normalizedMessage.toLowerCase().startsWith('/ask')) {
    return normalizedMessage.substring(4).trim();
  }
  
  return normalizedMessage;
}

// Generate a prompt for the AI based on a context
export function generatePrompt(query: string, context?: string): string {
  let prompt = query;
  
  // Add context information and guidelines for the AI
  // You could customize this based on user permissions, etc.
  if (context) {
    prompt = `${context}\n\nQuery: ${query}`;
  }
  
  return prompt;
} 