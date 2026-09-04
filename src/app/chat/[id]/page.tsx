'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  collection, doc, updateDoc, onSnapshot, 
  addDoc, query, orderBy, serverTimestamp, getDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  text: string;
  createdAt: any;
}

const SLU_SCHOOL_LABELS: Record<string, string> = {
  samcis: 'SAMCIS',
  sea: 'SEA',
  som: 'SOM',
  sonahbs: 'SONAHBS',
  stela: 'STELA',
};

const Icons = {
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  )
};

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [roomData, setRoomData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedId = localStorage.getItem('unsaid_chat_user_id');
    if (!storedId) {
      storedId = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('unsaid_chat_user_id', storedId);
    }
    setUserId(storedId);
    setNickname(localStorage.getItem('unsaid_chat_nickname') || 'Anonymous Louisian');

    if (!roomId) return;

    let isMounted = true;
    let unsubscribeRoom: (() => void) | null = null;
    let unsubscribeMsgs: (() => void) | null = null;

    const safetyTimer = setTimeout(() => {
      if (isMounted && loading) {
        alert('Connection timeout or room expired. Returning home.');
        router.push('/');
      }
    }, 4000);

    const initRoom = async () => {
      const roomRef = doc(db, "chatRooms", roomId);
      
      try {
        const snap = await getDoc(roomRef);
        if (snap.exists() && isMounted) {
          setRoomData(snap.data());
          setLoading(false);
        } else if (!snap.exists() && isMounted) {
          alert('This chat room no longer exists.');
          router.push('/');
          return;
        }
      } catch (err) {
        console.error("Error fetching room initial state:", err);
      }

      unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRoomData(data);
          setLoading(false);

          if (data.status === 'closed') {
            alert('The chat session has ended.');
            router.push('/');
          }
        }
      });

      const msgsQuery = query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt", "asc"));
      unsubscribeMsgs = onSnapshot(msgsQuery, (snapshot) => {
        if (!isMounted) return;
        const msgs: Message[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      });
    };

    initRoom();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeMsgs) unsubscribeMsgs();
    };
  }, [roomId, router, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        senderId: userId,
        senderNickname: nickname,
        text: textToSend,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleEndChat = async () => {
    if (confirm("Are you sure you want to end this conversation?")) {
      try {
        await updateDoc(doc(db, "chatRooms", roomId), { status: 'closed' });
      } catch (err) {
        console.error(err);
      }
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-neutral-50 flex items-center justify-center font-mono text-xs text-neutral-400">
        Loading secure room...
      </div>
    );
  }

  const isHost = roomData?.hostId === userId;
  const peerNickname = isHost ? (roomData?.guestNickname || 'Waiting for peer...') : roomData?.hostNickname;
  const peerSchoolRaw = isHost ? roomData?.guestSchool : roomData?.hostSchool;
  const peerSchool = peerSchoolRaw ? (SLU_SCHOOL_LABELS[peerSchoolRaw] || peerSchoolRaw.toUpperCase()) : '';

  return (
    <div className="h-[100dvh] w-full bg-neutral-50 text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 h-16 flex items-center justify-between shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-900">
                Chatting with: <span className="text-emerald-600">{peerNickname}</span>
              </h2>
              {peerSchool && (
                <span className="font-mono text-[10px] px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded">
                  {peerSchool}
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] text-neutral-400">Secure 1:1 SLU Campus Session</p>
          </div>
        </div>

        <button
          onClick={handleEndChat}
          className="px-3 sm:px-4 py-2 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-600 border border-neutral-200 font-mono text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
        >
          End Chat
        </button>
      </header>

      {/* Message Feed Container */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl w-full mx-auto space-y-4">
          <div className="text-center my-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-500 rounded-full font-mono text-[10px] uppercase tracking-widest border border-neutral-200/60">
              <Icons.Shield /> End-to-end Anonymous Room Active
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.senderId === userId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="font-mono text-[10px] text-neutral-400 mb-1 px-1">
                  {isMe ? 'You' : msg.senderNickname}
                </span>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-sans break-words ${
                  isMe 
                    ? 'bg-neutral-900 text-white rounded-br-xs' 
                    : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs shadow-2xs'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message Input Box */}
      <footer className="shrink-0 bg-white border-t border-neutral-200/80 p-3 sm:p-4 z-10 safe-area-bottom">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message anonymously..."
            className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all shadow-2xs"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 sm:px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm disabled:opacity-40 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Send</span>
            <Icons.Send />
          </button>
        </form>
      </footer>
    </div>
  );
}