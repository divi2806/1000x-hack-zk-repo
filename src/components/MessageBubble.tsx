'use client';

import { useState } from 'react';
import { ChatMessage } from '@/services/aiService';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  animationDelay?: number;
}

export default function MessageBubble({ message, isCurrentUser, animationDelay = 0 }: MessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
           ' • ' + 
           date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  const toggleTimestamp = () => {
    setShowTimestamp(!showTimestamp);
  };
  
  const isAI = message.sender === 'AI Assistant' || message.isAI;
  const isSystem = message.sender === 'System';
  
  // Animation variants
  const bubbleVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.3,
        delay: animationDelay,
        ease: "easeOut" 
      }
    }
  };
  
  // If it's a system message, display it centered
  if (isSystem) {
    return (
      <motion.div 
        className="flex justify-center my-3"
        initial="hidden"
        animate="visible"
        variants={bubbleVariants}
      >
        <div className="max-w-xs text-center bg-secondary-dark/60 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-muted border border-white/5">
          {message.content}
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}
      initial="hidden"
      animate="visible"
      variants={bubbleVariants}
      layout
    >
      <div
        className={`max-w-sm md:max-w-md rounded-2xl px-4 py-3 shadow-lg ${
          isCurrentUser
            ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-br-none'
            : isAI
            ? 'bg-gradient-to-br from-accent to-accent-hover text-white rounded-bl-none'
            : 'bg-secondary-light/90 backdrop-blur-sm text-white rounded-bl-none border border-white/5'
        } transition-all duration-200 hover:shadow-xl`}
        onClick={toggleTimestamp}
      >
        {!isCurrentUser && !isAI && (
          <div className="text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary-light animate-pulse"></div>
            {message.sender}
          </div>
        )}
        
        {isAI && (
          <div className="flex items-center text-xs font-semibold text-white mb-1">
            <div className="flex items-center justify-center bg-white/10 rounded-full w-4 h-4 mr-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            AI Assistant
          </div>
        )}
        
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        
        {showTimestamp && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-xs mt-2 ${isCurrentUser || isAI ? 'text-white/70' : 'text-gray-400'}`}
          >
            {formatTimestamp(message.timestamp)}
          </motion.div>
        )}
        
        {/* ZK proof indicator for users */}
        {!isAI && !isSystem && (
          <div className="flex justify-end mt-1">
            <div className="text-xs flex items-center">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className={`${isCurrentUser || isAI ? 'text-white/80' : 'text-gray-300'}`}>
                  ZK verified
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
} 