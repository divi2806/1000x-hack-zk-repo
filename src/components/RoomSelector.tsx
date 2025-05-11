'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface RoomSelectorProps {
  rooms: Room[];
  activeRoom: string;
  onSelectRoom: (roomId: string) => void;
}

export default function RoomSelector({ rooms, activeRoom, onSelectRoom }: RoomSelectorProps) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, number>>({
    public: 5,
    vip: 3,
  });

  // Mock updating online users 
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => ({
        public: Math.floor(Math.random() * 10) + 3,
        vip: Math.floor(Math.random() * 5) + 1,
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-secondary-dark">
        <h2 className="text-lg font-bold">Chat Rooms</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-700">
          {rooms.map((room) => (
            <li key={room.id}>
              <button
                onClick={() => onSelectRoom(room.id)}
                className={`w-full p-4 text-left flex items-center justify-between transition-colors ${
                  activeRoom === room.id
                    ? 'bg-primary/20 border-l-4 border-primary'
                    : 'hover:bg-secondary-dark'
                }`}
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    {room.isPrivate ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{room.name}</div>
                    <div className="text-xs text-gray-400">
                      {room.isPrivate ? 'VIP Access Only' : 'Open to Everyone'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                    onlineUsers[room.id] > 0 ? 'bg-green-400' : 'bg-gray-400'
                  }`}></span>
                  <span>{onlineUsers[room.id] || 0}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-4 bg-secondary-dark mt-auto">
        <Link 
          href="/mint" 
          className="block w-full py-2 px-4 text-center bg-accent hover:bg-orange-600 rounded text-white transition-colors"
        >
          Mint VIP Pass
        </Link>
      </div>
    </div>
  );
} 