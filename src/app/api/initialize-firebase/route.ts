import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2Ucd0-v6YRArpp9KKTZEdnMackshOVT8",
  authDomain: "zk-id-923f0.firebaseapp.com",
  projectId: "zk-id-923f0",
  storageBucket: "zk-id-923f0.firebasestorage.app",
  messagingSenderId: "1000593754124",
  appId: "1:1000593754124:web:8cb1a4255ac2b209270629"
};

export async function GET() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Create a system status document for connection testing
    await setDoc(doc(db, 'system', 'status'), {
      status: 'online',
      lastUpdated: serverTimestamp()
    });
    
    // Ensure parent documents exist for both rooms
    await setDoc(doc(db, 'messages', 'public'), {
      id: 'public',
      type: 'chatroom'
    }, { merge: true });
    
    await setDoc(doc(db, 'messages', 'vip'), {
      id: 'vip',
      type: 'chatroom'
    }, { merge: true });
    
    // Check if messages already exist in public room
    const publicMessagesRef = collection(db, 'messages', 'public', 'roomMessages');
    const publicMessagesSnapshot = await getDocs(query(publicMessagesRef, limit(1)));
    
    // Only add welcome message if collection is empty
    if (publicMessagesSnapshot.empty) {
      await addDoc(publicMessagesRef, {
        id: 'welcome_message',
        content: 'Welcome to the public chat room! Anyone can join and chat here.',
        sender: 'System',
        timestamp: Date.now(),
        roomId: 'public',
        createdAt: serverTimestamp()
      });
      console.log('Added welcome message to public room');
    }
    
    // Check if messages already exist in VIP room
    const vipMessagesRef = collection(db, 'messages', 'vip', 'roomMessages');
    const vipMessagesSnapshot = await getDocs(query(vipMessagesRef, limit(1)));
    
    // Only add welcome message if collection is empty
    if (vipMessagesSnapshot.empty) {
      await addDoc(vipMessagesRef, {
        id: 'welcome_message',
        content: 'Welcome to the VIP chat room! Only users with the VIP Access Pass NFT can join here.',
        sender: 'System',
        timestamp: Date.now(),
        roomId: 'vip',
        createdAt: serverTimestamp()
      });
      console.log('Added welcome message to VIP room');
    }
    
    // Initialize rooms collection
    await setDoc(doc(db, 'rooms', 'public'), {
      id: 'public',
      name: 'Public Chat',
      isPrivate: false,
      createdAt: serverTimestamp()
    }, { merge: true });
    
    await setDoc(doc(db, 'rooms', 'vip'), {
      id: 'vip',
      name: 'VIP Lounge',
      isPrivate: true,
      createdAt: serverTimestamp()
    }, { merge: true });
    
    return NextResponse.json({
      success: true,
      message: 'Firebase database initialized successfully'
    });
  } catch (error: any) {
    console.error('Error initializing Firebase database:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
} 