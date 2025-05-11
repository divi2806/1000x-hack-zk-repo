'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Chatroom from './Chatroom';
import RoomSelector from './RoomSelector';
import AccessVerification from './AccessVerification';
import useChatStore from '@/store/chatStore';
import { getChatRooms, checkFirebaseConnection, ensureDatabaseInitialized } from '@/services/firebaseService';
import toast from 'react-hot-toast';

export default function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { publicKey } = useWallet();
  const [clientReady, setClientReady] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [rooms, setRooms] = useState([
    { id: 'public', name: 'Public Chat', isPrivate: false },
    { id: 'vip', name: 'VIP Lounge', isPrivate: true }
  ]);
  
  // Chat store state
  const activeRoom = useChatStore(state => state.activeRoom);
  const setActiveRoom = useChatStore(state => state.setActiveRoom);
  const hasRoomAccess = useChatStore(state => state.hasRoomAccess);
  const setHasRoomAccess = useChatStore(state => state.setHasRoomAccess);
  const isVerifying = useChatStore(state => state.isVerifying);
  const setIsVerifying = useChatStore(state => state.setIsVerifying);
  const cleanup = useChatStore(state => state.cleanup);
  
  // Mark when component is mounted on client
  useEffect(() => {
    setClientReady(true);
    
    // Initialize Firebase and check connection
    async function initFirebase() {
      setIsInitializing(true);
      try {
        // First check if Firebase connection is working
        const isConnected = await checkFirebaseConnection();
        setIsFirebaseConnected(isConnected);
        
        if (isConnected) {
          console.log('Firebase connection successful');
          
          // Initialize database collections
          const initialized = await ensureDatabaseInitialized();
          if (initialized) {
            console.log('Database collections initialized successfully');
            setConnectionError(null);
          } else {
            console.error('Failed to initialize database collections');
            setConnectionError('Database structure could not be initialized. Some features may be limited.');
          }
        } else {
          console.error('Firebase connection failed');
          setConnectionError('Could not connect to the database. Using offline mode.');
          toast.error('Database connection failed. Using offline mode.');
        }
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setConnectionError('Error connecting to the database. Using offline mode.');
        setIsFirebaseConnected(false);
        toast.error('Error initializing database. Using offline mode.');
      } finally {
        setIsInitializing(false);
      }
    }
    
    initFirebase();
  }, []);
  
  // Get room ID from URL or default to 'public'
  useEffect(() => {
    if (!clientReady) return;
    
    const roomId = searchParams?.get('room') || 'public';
    setActiveRoom(roomId);
    
    // Check if room requires verification
    const selectedRoom = rooms.find(r => r.id === roomId);
    const needsVerification = selectedRoom?.isPrivate || false;
    
    // Reset room access for private rooms
    if (needsVerification) {
      setHasRoomAccess(false);
      setIsVerifying(true);
    } else {
      setHasRoomAccess(true);
      setIsVerifying(false);
    }
    
    // Clean up messages when switching rooms
    cleanup();
  }, [searchParams, clientReady, setActiveRoom, rooms, cleanup, setHasRoomAccess, setIsVerifying]);
  
  // Fetch available rooms from Firebase
  useEffect(() => {
    if (!clientReady || isInitializing) return;
    
    async function fetchRooms() {
      try {
        const availableRooms = await getChatRooms();
        setRooms(availableRooms);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        // Use default rooms if fetch fails
      }
    }
    
    fetchRooms();
  }, [clientReady, isInitializing]);
  
  // Handle room selection
  const handleSelectRoom = (roomId: string) => {
    router.push(`/chat?room=${roomId}`);
  };
  
  // Handle retry connection
  const handleRetryConnection = async () => {
    setIsInitializing(true);
    setConnectionError(null);
    
    try {
      toast.loading('Reconnecting to database...');
      const isConnected = await checkFirebaseConnection();
      setIsFirebaseConnected(isConnected);
      
      if (isConnected) {
        const initialized = await ensureDatabaseInitialized();
        if (initialized) {
          toast.success('Connected to database successfully!');
          setConnectionError(null);
          
          // Refresh rooms
          const availableRooms = await getChatRooms();
          setRooms(availableRooms);
        } else {
          setConnectionError('Database structure could not be initialized.');
          toast.error('Database structure could not be initialized.');
        }
      } else {
        setConnectionError('Could not connect to the database. Using offline mode.');
        toast.error('Database connection failed.');
      }
    } catch (error) {
      console.error('Error retrying connection:', error);
      setConnectionError('Error connecting to the database. Using offline mode.');
      toast.error('Connection error. Using offline mode.');
    } finally {
      setIsInitializing(false);
      toast.dismiss();
    }
  };
  
  // Don't render anything until client is ready to prevent hydration mismatch
  if (!clientReady || isInitializing) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-t-4 border-primary animate-spin"></div>
        </div>
        <div className="ml-4 text-muted">
          {isInitializing ? 'Connecting to database...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Show database connection error if applicable
  if (connectionError) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 h-full">
        {/* Room selector for larger screens */}
        <div className="hidden md:block md:col-span-1 border-r border-border bg-secondary/30 backdrop-blur-sm">
          <RoomSelector
            rooms={rooms}
            activeRoom={activeRoom}
            onSelectRoom={handleSelectRoom}
          />
        </div>
        
        {/* Chat area with connection error */}
        <div className="col-span-1 md:col-span-3 h-full">
          <div className="flex flex-col h-full rounded-xl overflow-hidden bg-secondary-dark/30 backdrop-blur-sm border border-border p-8">
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-6 bg-error/5 border border-error/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-error mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold mb-2">Database Connection Error</h3>
                <p className="text-muted mb-4">{connectionError}</p>
                <p className="text-sm text-muted mb-4">
                  You can still use the chat in offline mode. Some features may be limited.
                </p>
                <button 
                  onClick={handleRetryConnection}
                  className="btn btn-error"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPrivateRoom = rooms.find(r => r.id === activeRoom)?.isPrivate || false;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 h-full">
      {/* Room selector for larger screens */}
      <div className="hidden md:block md:col-span-1 border-r border-border bg-secondary/30 backdrop-blur-sm">
        <RoomSelector
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={handleSelectRoom}
        />
      </div>
      
      {/* Chat area */}
      <div className="col-span-1 md:col-span-3 h-full">
        {isPrivateRoom && !hasRoomAccess ? (
          <AccessVerification 
            roomId={activeRoom} 
            walletAddress={publicKey?.toString() || ''}
            isVerifying={isVerifying}
          />
        ) : (
          <Chatroom />
        )}
      </div>
    </div>
  );
} 