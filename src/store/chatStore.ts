import { create } from 'zustand';
import { ChatMessage } from '@/services/aiService';
import { ProofData } from '@/services/zkService';

interface ChatRoom {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface ChatState {
  // Chat data
  messages: ChatMessage[];
  rooms: ChatRoom[];
  activeRoom: string;
  isLoadingMessages: boolean;
  
  // ZK proofs
  proofs: ProofData[];
  hasRoomAccess: boolean;
  isVerifying: boolean;
  
  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setRooms: (rooms: ChatRoom[]) => void;
  setActiveRoom: (roomId: string) => void;
  setIsLoadingMessages: (isLoading: boolean) => void;
  
  // Proof management
  setProofs: (proofs: ProofData[]) => void;
  addProof: (proof: ProofData) => void;
  setHasRoomAccess: (hasAccess: boolean) => void;
  setIsVerifying: (isVerifying: boolean) => void;
  
  // Cleanup - simplified to avoid update loops
  unsubscribe: (() => void) | null;
  setUnsubscribe: (unsub: (() => void) | null) => void;
  cleanup: () => void;
}

// Create Zustand store with a completely simplified approach
const useChatStore = create<ChatState>((set, get) => ({
  // Chat data
  messages: [],
  rooms: [
    { id: 'public', name: 'Public Chat', isPrivate: false },
    { id: 'vip', name: 'VIP Lounge', isPrivate: true }
  ],
  activeRoom: 'public',
  isLoadingMessages: false,
  
  // ZK proofs
  proofs: [],
  hasRoomAccess: false,
  isVerifying: false,
  
  // Actions
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set(state => ({ 
    messages: [...state.messages, message] 
  })),
  setRooms: (rooms) => set({ rooms }),
  setActiveRoom: (roomId) => set({ activeRoom: roomId }),
  setIsLoadingMessages: (isLoading) => set({ isLoadingMessages: isLoading }),
  
  // Proof management
  setProofs: (proofs) => set({ proofs }),
  addProof: (proof) => set(state => ({ 
    proofs: [...state.proofs, proof] 
  })),
  setHasRoomAccess: (hasAccess) => set({ hasRoomAccess: hasAccess }),
  setIsVerifying: (isVerifying) => set({ isVerifying }),
  
  // Simplified cleanup - removed nested set() calls
  unsubscribe: null,
  setUnsubscribe: (unsub) => set({ unsubscribe: unsub }),
  cleanup: () => {
    const unsub = get().unsubscribe;
    if (unsub) unsub();
    set({ messages: [], unsubscribe: null });
  }
}));

export default useChatStore; 