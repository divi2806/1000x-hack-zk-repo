'use client';

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  serverTimestamp,
  where,
  limit,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  DocumentData,
  Firestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from './aiService';
import toast from 'react-hot-toast';

// Firebase configuration from the provided details
const firebaseConfig = {
  apiKey: "AIzaSyB2Ucd0-v6YRArpp9KKTZEdnMackshOVT8",
  authDomain: "zk-id-923f0.firebaseapp.com",
  projectId: "zk-id-923f0",
  storageBucket: "zk-id-923f0.firebasestorage.app",
  messagingSenderId: "1000593754124",
  appId: "1:1000593754124:web:8cb1a4255ac2b209270629"
};

// Initialize Firebase app
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Mock data for fallback or development
const mockMessages: Record<string, ChatMessage[]> = {
  'public': [
    {
      id: '1',
      content: 'Welcome to the public chat room! Anyone can join and chat here.',
      sender: 'System',
      timestamp: Date.now() - 3600000
    },
    {
      id: '2',
      content: 'Hi everyone! I just joined ZKChat.',
      sender: 'Alice',
      timestamp: Date.now() - 3000000
    },
    {
      id: '3',
      content: 'Welcome Alice! Do you have any questions about ZKChat?',
      sender: 'Bob',
      timestamp: Date.now() - 2700000
    },
    {
      id: '4',
      content: '@ai Can you explain how zero-knowledge proofs work?',
      sender: 'Alice',
      timestamp: Date.now() - 2400000
    },
    {
      id: '5',
      content: 'Zero-knowledge proofs (ZKPs) are cryptographic protocols that allow one party (the prover) to prove to another party (the verifier) that a statement is true without revealing any additional information. In ZKChat, ZKPs are used to verify wallet ownership and NFT possession without exposing the actual wallet address or NFT details, enhancing privacy while maintaining security.',
      sender: 'AI Assistant',
      timestamp: Date.now() - 2350000,
      isAI: true
    }
  ],
  'vip': [
    {
      id: '1',
      content: 'Welcome to the VIP chat room! Only users with the VIP Access Pass NFT can join here.',
      sender: 'System',
      timestamp: Date.now() - 2600000
    },
    {
      id: '2',
      content: 'Hey VIPs! Check out my new NFT collection launching next week.',
      sender: 'Charlie',
      timestamp: Date.now() - 2000000
    },
    {
      id: '3',
      content: 'Sounds interesting! Is there a whitelist?',
      sender: 'Diana',
      timestamp: Date.now() - 1800000
    }
  ]
};

// Flag to determine if we should use mock data instead of Firebase
let useMockData = false;

// Function to initialize Firebase
export function initializeFirebase(): { app: FirebaseApp | null; db: Firestore | null } {
  // Check if Firebase is already initialized
  if (app) return { app, db };

  try {
    console.log('Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // For development, we want to use Firebase and NOT mock data
    useMockData = false;
    
    // Enable offline persistence
    if (db && typeof window !== 'undefined') {
      try {
        enableIndexedDbPersistence(db).catch((err) => {
          console.warn('Firebase persistence failed:', err);
        });
      } catch (error) {
        console.warn('IndexedDB persistence setup failed:', error);
      }
    }
    
    console.log('Firebase initialized successfully');
    return { app, db };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    useMockData = true;
    toast.error('Failed to connect to Firebase. Using offline mode.');
    return { app: null, db: null };
  }
}

// Initialize Firebase on module load
initializeFirebase();

// Function to ensure the database is properly initialized
export async function ensureDatabaseInitialized() {
  const { db } = initializeFirebase();
  if (!db) return false;
  
  try {
    // Try to initialize basic collections if they don't exist
    const systemRef = doc(db, 'system', 'status');
    await setDoc(systemRef, {
      status: 'online',
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    // Initialize rooms if they don't exist
    const publicRoomRef = doc(db, 'rooms', 'public');
    await setDoc(publicRoomRef, {
      id: 'public',
      name: 'Public Chat',
      isPrivate: false,
      createdAt: serverTimestamp()
    }, { merge: true });
    
    const vipRoomRef = doc(db, 'rooms', 'vip');
    await setDoc(vipRoomRef, {
      id: 'vip',
      name: 'VIP Lounge',
      isPrivate: true,
      createdAt: serverTimestamp()
    }, { merge: true });
    
    // Add welcome message to public room if it doesn't have any messages
    const publicMessagesRef = collection(db, 'messages', 'public', 'roomMessages');
    const publicMessagesQuery = query(publicMessagesRef, limit(1));
    const publicSnapshot = await getDoc(doc(db, 'messages', 'public'));
    
    if (!publicSnapshot.exists()) {
      await setDoc(doc(db, 'messages', 'public'), {
        id: 'public',
        type: 'chatroom'
      });
      
      // Add a welcome message
      await addDoc(publicMessagesRef, {
        id: 'welcome_message',
        content: 'Welcome to the public chat room! Anyone can join and chat here.',
        sender: 'System',
        timestamp: Date.now(),
        roomId: 'public',
        createdAt: serverTimestamp()
      });
    }
    
    // Add welcome message to VIP room if it doesn't have any messages
    const vipMessagesRef = collection(db, 'messages', 'vip', 'roomMessages');
    const vipSnapshot = await getDoc(doc(db, 'messages', 'vip'));
    
    if (!vipSnapshot.exists()) {
      await setDoc(doc(db, 'messages', 'vip'), {
        id: 'vip',
        type: 'chatroom'
      });
      
      // Add a welcome message
      await addDoc(vipMessagesRef, {
        id: 'welcome_message',
        content: 'Welcome to the VIP chat room! Only users with the VIP Access Pass NFT can join here.',
        sender: 'System',
        timestamp: Date.now(),
        roomId: 'vip',
        createdAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database collections:', error);
    return false;
  }
}

// Add a new message to a chat room
export async function addMessage(
  roomId: string,
  content: string,
  sender: string,
  isAI = false
): Promise<ChatMessage> {
  const messageId = uuidv4();
  const timestamp = Date.now();
  
  const message: ChatMessage = {
    id: messageId,
    content,
    sender,
    timestamp,
    isAI
  };

  // If we're using mock data only, don't try Firebase
  if (useMockData) {
    if (!mockMessages[roomId]) {
      mockMessages[roomId] = [];
    }
    mockMessages[roomId].push(message);
    console.log('Using mock data - message added');
    return message;
  }
  
  // Try Firebase if we're not using mock data
  const { db } = initializeFirebase();
  if (db) {
    try {
      // Ensure parent document exists first
      const roomDocRef = doc(db, 'messages', roomId);
      await setDoc(roomDocRef, { id: roomId, type: 'chatroom' }, { merge: true });
      
      // Now add the message to the subcollection
      const messagesRef = collection(db, 'messages', roomId, 'roomMessages');
      await addDoc(messagesRef, {
        ...message,
        roomId,
        createdAt: serverTimestamp()
      });
      console.log('Message added to Firebase');
    } catch (error) {
      console.error('Error adding message to Firebase:', error);
      // Fallback to mock implementation if Firebase fails
      if (!mockMessages[roomId]) {
        mockMessages[roomId] = [];
      }
      mockMessages[roomId].push(message);
      console.log('Message added to mock data (Firebase failed)');
    }
  } else {
    // Fallback to mock data if db is null
    if (!mockMessages[roomId]) {
      mockMessages[roomId] = [];
    }
    mockMessages[roomId].push(message);
    console.log('Message added to mock data (no Firebase)');
  }

  return message;
}

// Get messages from a chat room with realtime updates
export function subscribeToMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
) {
  // Get Firebase instance
  const { db } = initializeFirebase();
  
  // Force initialization of database structure
  ensureDatabaseInitialized().catch(console.error);
  
  if (db) {
    console.log(`Subscribing to messages for room: ${roomId}`);
    try {
      // Make sure the parent document exists first
      const roomDocRef = doc(db, 'messages', roomId);
      setDoc(roomDocRef, { id: roomId, type: 'chatroom' }, { merge: true })
        .catch(error => console.error('Error ensuring room document exists:', error));
      
      // Now query the subcollection
      const messagesRef = collection(db, 'messages', roomId, 'roomMessages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
      
      // Return subscription
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        console.log(`Received ${snapshot.docs.length} messages from Firebase`);
        try {
          const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              content: data.content || '',
              sender: data.sender || 'Unknown',
              timestamp: data.timestamp || Date.now(),
              isAI: data.isAI || false
            };
          });
          
          callback(messages);
        } catch (error) {
          console.error('Error processing messages from Firebase:', error);
          if (useMockData) {
            callback(mockMessages[roomId] || []);
          }
        }
      }, (error) => {
        console.error('Error in Firebase snapshot listener:', error);
        // Fallback to mock data if there's an error
        callback(mockMessages[roomId] || []);
        useMockData = true;
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up message subscription:', error);
      useMockData = true;
      
      // If we fail to set up the subscription, immediately provide mock data
      setTimeout(() => {
        callback(mockMessages[roomId] || []);
      }, 100);
      
      // Return empty cleanup function
      return () => {
        console.log('Cleaning up mock subscription');
      };
    }
  } else {
    console.log('Firebase not initialized, using mock data');
    useMockData = true;
    
    // Mock implementation with setTimeout to simulate real-time updates
    setTimeout(() => {
      callback(mockMessages[roomId] || []);
    }, 100);
    
    // Return a fake unsubscribe function
    return () => {
      console.log('Cleaning up mock subscription');
    };
  }
}

// Check if Firebase is initialized and working
export async function checkFirebaseConnection(): Promise<boolean> {
  const { db } = initializeFirebase();
  if (!db) return false;
  
  try {
    // Try to read a document to verify connection
    const testRef = doc(db, 'system', 'status');
    await setDoc(testRef, {
      status: 'online',
      lastChecked: serverTimestamp()
    }, { merge: true });
    
    // If we got here, Firebase is working
    useMockData = false;
    return true;
  } catch (error) {
    console.error('Firebase connection check failed:', error);
    useMockData = true;
    return false;
  }
}

// Store proof data in Firestore
export async function storeProofData(
  walletAddress: string,
  proofType: string,
  proofData: any
): Promise<boolean> {
  const { db } = initializeFirebase();
  
  if (db) {
    try {
      const proofRef = doc(db, 'proofs', walletAddress, proofType, uuidv4());
      await setDoc(proofRef, {
        ...proofData,
        walletAddress,
        proofType,
        createdAt: serverTimestamp(),
        verified: true
      });
      return true;
    } catch (error) {
      console.error('Error storing proof data:', error);
      return false;
    }
  }
  
  return false;
}

// Get available chat rooms
export async function getChatRooms(): Promise<{ id: string; name: string; isPrivate: boolean; }[]> {
  const { db } = initializeFirebase();
  
  if (db && !useMockData) {
    try {
      // Ensure database is initialized
      await ensureDatabaseInitialized();
      
      // Query rooms collection
      const roomsRef = collection(db, 'rooms');
      const roomsSnapshot = await getDocs(roomsRef);
      
      // Map documents to room objects
      const rooms = roomsSnapshot.docs.map((docSnapshot: QueryDocumentSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          name: data.name || docSnapshot.id,
          isPrivate: data.isPrivate || false
        };
      });
      
      return rooms.length > 0 ? rooms : [
        { id: 'public', name: 'Public Chat', isPrivate: false },
        { id: 'vip', name: 'VIP Lounge', isPrivate: true }
      ];
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  }
  
  // Return default rooms if Firebase fails
  return [
    { id: 'public', name: 'Public Chat', isPrivate: false },
    { id: 'vip', name: 'VIP Lounge', isPrivate: true }
  ];
} 