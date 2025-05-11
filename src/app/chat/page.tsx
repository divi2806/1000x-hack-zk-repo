import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Chatroom from '@/components/Chatroom';
import AccessVerification from '@/components/AccessVerification';
import dynamic from 'next/dynamic';

// Use dynamic import for the chat page to prevent hydration issues
const ChatPageContent = dynamic(() => import('@/components/ChatPageContent'), {
  ssr: false
});

// Chat page component
export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ChatPageContent />
      </div>
    </div>
  );
} 