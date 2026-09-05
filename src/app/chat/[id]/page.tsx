'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ),
  ShieldAlert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  ),
  MoreVertical: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  )
};

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  const [roomData, setRoomData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatStatus, setChatStatus] = useState<'active' | 'closed' | 'blocked'>('active');
  const [blockedByMe, setBlockedByMe] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedId = localStorage.getItem('unsaid_chat_user_id');
    if (!storedId) {
      storedId = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('unsaid_chat_user_id', storedId);
    }
    setUserId(storedId);
    setNickname(localStorage.getItem('unsaid_chat_nickname') || 'Anonymous Louisian');

    if (!roomId) {
      router.push('/');
      return;
    }

    let isMounted = true;
    let unsubscribeRoom: (() => void) | null = null;
    let unsubscribeMsgs: (() => void) | null = null;

    const initRoom = async () => {
      const roomRef = doc(db, "chatRooms", roomId);
      
      try {
        const snap = await getDoc(roomRef);
        if (!isMounted) return;

        if (snap.exists()) {
          const data = snap.data();
          
          if (data.status === 'blocked') {
            setChatStatus('blocked');
            if (data.blockedBy === storedId) {
              setBlockedByMe(true);
            }
          } else if (data.status === 'closed' || data.status === 'ended') {
            setChatStatus('closed');
          }

          setRoomData(data);
          setLoading(false);
        } else {
          setChatStatus('closed');
          setLoading(false);
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

          if (data.status === 'blocked') {
            setChatStatus('blocked');
            if (data.blockedBy === storedId) {
              setBlockedByMe(true);
            }
          } else if (data.status === 'closed' || data.status === 'ended') {
            setChatStatus('closed');
          }
        } else {
          setChatStatus('closed');
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
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeMsgs) unsubscribeMsgs();
    };
  }, [roomId, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || chatStatus !== 'active') return;

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
      setChatStatus('closed');
    }
  };

  const handleBlockUser = async () => {
    if (!roomData || !userId) return;
    
    const otherUserId = roomData.hostId === userId ? roomData.guestId : roomData.hostId;
    
    setIsMenuOpen(false);
    if (!confirm("Are you sure you want to block and report this user? This will end the chat immediately and prevent future matches with them.")) {
      return;
    }

    if (otherUserId) {
      const blockedUsers: string[] = JSON.parse(localStorage.getItem('unsaid_chat_blocked') || '[]');
      if (!blockedUsers.includes(otherUserId)) {
        blockedUsers.push(otherUserId);
        localStorage.setItem('unsaid_chat_blocked', JSON.stringify(blockedUsers));
      }
    }

    try {
      await addDoc(collection(db, "reports"), {
        roomId: roomId,
        reporterId: userId,
        reportedUserId: otherUserId,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chatRooms", roomId), { 
        status: 'blocked',
        blockedBy: userId 
      });
    } catch (e) {
      console.error("Error reporting/blocking user:", e);
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
  const peerNickname = isHost ? (roomData?.guestNickname || 'Waiting...') : roomData?.hostNickname;
  const peerSchoolRaw = isHost ? roomData?.guestSchool : roomData?.hostSchool;
  const peerSchool = peerSchoolRaw ? (SLU_SCHOOL_LABELS[peerSchoolRaw] || peerSchoolRaw.toUpperCase()) : '';

  const isInactive = chatStatus !== 'active';

  return (
    <div className="h-[100dvh] w-full bg-neutral-50 text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-3 sm:px-6 h-16 flex items-center justify-between shadow-2xs z-10 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isInactive ? 'bg-neutral-400' : 'bg-emerald-500 animate-pulse'}`}></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <h2 className="font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-900 truncate max-w-[130px] sm:max-w-xs">
                <span className="hidden sm:inline">Chatting with: </span>
                <span className={isInactive ? 'text-neutral-500' : 'text-emerald-600'}>{peerNickname}</span>
              </h2>
              {peerSchool && (
                <span className="font-mono text-[9px] sm:text-[10px] px-1.5 py-0.2 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded shrink-0">
                  {peerSchool}
                </span>
              )}
            </div>
            <p className="font-mono text-[9px] sm:text-[10px] text-neutral-400">Anonymous Chat</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isInactive && (
            <button
              onClick={handleEndChat}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-600 border border-neutral-200 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95"
            >
              End Chat
            </button>
          )}

          {/* More Dropdown Menu for Block & Report */}
          <div className="relative">
            <button 
              aria-label="More options"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer text-neutral-600 border border-neutral-200 bg-white"
            >
              <Icons.MoreVertical />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50">
                <button
                  onClick={handleBlockUser}
                  className="w-full px-4 py-2.5 text-left font-mono text-xs font-bold text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Icons.ShieldAlert />
                  <span>Block & Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Message Feed Container */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-2xl w-full mx-auto space-y-4">
          <div className="text-center my-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-500 rounded-full font-mono text-[9px] sm:text-[10px] uppercase tracking-widest border border-neutral-200/60 text-center">
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
                <div className={`max-w-[88%] sm:max-w-[80%] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm font-sans break-words ${
                  isMe 
                    ? 'bg-neutral-900 text-white rounded-br-xs' 
                    : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs shadow-2xs'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}

          {chatStatus === 'closed' && (
            <div className="text-center py-6 space-y-3">
              <p className="font-mono text-xs text-neutral-500 font-bold bg-neutral-100 py-2.5 px-5 rounded-xl inline-block border border-neutral-200">
                The conversation has ended.
              </p>
            </div>
          )}

          {chatStatus === 'blocked' && (
            <div className="text-center py-6 space-y-3 px-4">
              <div className="inline-block p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600">
                <Icons.ShieldAlert />
              </div>
              <p className="font-mono text-xs text-rose-600 font-bold">
                {blockedByMe 
                  ? "You have blocked this user. The conversation has been securely terminated." 
                  : "This user has blocked you. The conversation has been securely terminated."}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Action Footer */}
      <footer className="shrink-0 bg-white border-t border-neutral-200/80 p-3 sm:p-4 z-10 safe-area-bottom">
        {isInactive ? (
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-98"
            >
              Exit (Home)
            </button>
            <button
              onClick={() => router.push('/chat/queue')}
              className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
            >
              Find New Match
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-base sm:text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all shadow-2xs"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm disabled:opacity-40 flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <span className="hidden sm:inline">Send</span>
              <Icons.Send />
            </button>
          </form>
        )}
      </footer>
  </div>
  );
}