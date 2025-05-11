'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { subscribeToMessages, addMessage as addFirebaseMessage } from '@/services/firebaseService';
import { generateWalletProof, ProofData } from '@/services/zkService';
import { generateAIResponse, isAICommand, extractAIQuery, ChatMessage } from '@/services/aiService';
import useChatStore from '@/store/chatStore';
import MessageBubble from '../components/MessageBubble';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Prevent hydration issues by using dynamic import with ssr: false
const ChatroomWithNoSSR = dynamic(() => Promise.resolve(ChatroomContent), {
  ssr: false,
});

export default function Chatroom() {
  return <ChatroomWithNoSSR />;
}

function ChatroomContent() {
  const { publicKey } = useWallet();
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [clientReady, setClientReady] = useState(false);
  
  // Chat store state - simplified for better stability
  const messages = useChatStore(state => state.messages);
  const setMessages = useChatStore(state => state.setMessages);
  const activeRoom = useChatStore(state => state.activeRoom);
  const isLoadingMessages = useChatStore(state => state.isLoadingMessages);
  const setIsLoadingMessages = useChatStore(state => state.setIsLoadingMessages);
  const proofs = useChatStore(state => state.proofs);
  const addProof = useChatStore(state => state.addProof);
  const unsubscribe = useChatStore(state => state.unsubscribe);
  const setUnsubscribe = useChatStore(state => state.setUnsubscribe);
  
  // Mark when component is mounted on client
  useEffect(() => {
    setClientReady(true);
  }, []);
  
  // Subscribe to messages for the active room
  useEffect(() => {
    if (!activeRoom || !clientReady) return;
    
    // Handle new messages
    const handleNewMessages = (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
      setIsLoadingMessages(false);
    };
    
    // Set loading state only once at the beginning
    setIsLoadingMessages(true);
    
    // Cleanup previous subscription
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    
    // Create new subscription
    const newUnsubscribe = subscribeToMessages(activeRoom, handleNewMessages);
    setUnsubscribe(newUnsubscribe);
    
    // Cleanup on unmount
    return () => {
      if (newUnsubscribe) {
        newUnsubscribe();
      }
    };
  }, [activeRoom, clientReady, setMessages, setIsLoadingMessages, setUnsubscribe]);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Generate ZK proof for wallet ownership if needed
  useEffect(() => {
    if (!publicKey || !clientReady) return;
    
    const walletAddress = publicKey.toString();
    const existingProof = proofs.find(
      p => p.walletAddress === walletAddress && p.type === 'wallet_ownership'
    );
    
    if (!existingProof) {
      generateWalletProof(walletAddress)
        .then(proof => addProof(proof))
        .catch(error => console.error('Error generating wallet proof:', error));
    }
  }, [publicKey, proofs, addProof, clientReady]);

  // Handle sending a new message
  const sendMessage = async () => {
    if (!inputValue.trim() || !publicKey) return;
    
    setSending(true);
    const content = inputValue.trim();
    setInputValue('');
    
    try {
      const senderName = `User_${publicKey.toString().slice(0, 4)}`;
      
      // Check if it's a command for the AI
      if (isAICommand(content)) {
        // User's message
        await addFirebaseMessage(activeRoom, content, senderName);
        
        // Extract the actual query
        const query = extractAIQuery(content);
        
        // Generate AI response
        const aiResponse = await generateAIResponse(query, messages);
        
        // Add AI response to the chat
        await addFirebaseMessage(activeRoom, aiResponse, 'AI Assistant', true);
      } else {
        // Regular message
        await addFirebaseMessage(activeRoom, content, senderName);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      
      // Focus the input field
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Don't render anything until client is ready to prevent hydration mismatch
  if (!clientReady) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-t-4 border-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10V14L11 12L7 10Z" fill="currentColor" />
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden bg-secondary-dark/30 backdrop-blur-sm border border-border">
      {/* Room header */}
      <div className="px-6 py-4 bg-secondary/90 backdrop-blur-md border-b border-border flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {activeRoom === 'public' ? (
              <>
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                Public Chat
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                VIP Lounge
              </>
            )}
          </h2>
          <p className="text-xs text-muted">
            {activeRoom === 'public' 
              ? 'Public room - Everyone can join'
              : 'Private room - VIP Access Pass required'}
          </p>
        </div>
        
        {publicKey && (
          <div className="flex items-center py-1 px-3 bg-secondary-light/50 backdrop-blur-sm rounded-full border border-border">
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="w-2.5 h-2.5 bg-success rounded-full"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 bg-success rounded-full animate-ping opacity-75"></div>
              </div>
              <div className="text-xs font-mono">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
        <AnimatePresence mode="wait">
          {isLoadingMessages ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col justify-center items-center h-full gap-3"
            >
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <p className="text-muted text-sm">Loading messages...</p>
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col justify-center items-center h-full gap-4 text-center p-6"
            >
              <div className="w-24 h-24 text-muted opacity-30">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 12H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 12H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M16 12H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">No messages yet</h3>
                <p className="text-muted max-w-md">
                  Be the first to start the conversation in this room. Use @ai to interact with the AI assistant.
                </p>
              </div>
              <div className="mt-2">
                <button 
                  onClick={() => inputRef.current?.focus()}
                  className="btn btn-secondary text-sm"
                >
                  Start Chatting
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={publicKey ? message.sender.includes(publicKey.toString().slice(0, 4)) : false}
                  animationDelay={index * 0.05}
                />
              ))}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Input area */}
      <div className="p-4 bg-secondary/80 backdrop-blur-md border-t border-border">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeRoom === 'public'
                ? "Type a message or use @ai to ask the AI assistant..."
                : "VIP room: Type message or @ai command..."
            }
            className="flex-1 input bg-secondary-dark/80 border-white/5 focus:border-primary/50 py-3 px-4 placeholder:text-muted"
            disabled={sending}
          />
          <motion.button
            onClick={sendMessage}
            disabled={!inputValue.trim() || sending}
            whileTap={{ scale: 0.95 }}
            className={`btn rounded-full w-12 h-12 flex items-center justify-center shadow-lg ${
              !inputValue.trim() || sending ? 'btn-disabled' : 'btn-primary'
            }`}
          >
            {sending ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </motion.button>
        </div>
        <div className="mt-2 px-1">
          <p className="text-xs text-muted">
            {publicKey ? (
              <>
                <span className="inline-flex items-center mr-1">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pro tip:
                </span>
                Use <span className="text-primary font-medium">@ai</span> followed by your question to interact with the AI assistant
              </>
            ) : (
              <>
                <span className="inline-flex items-center mr-1 text-warning">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Connect your wallet to start chatting
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
} 