'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  collection, doc, updateDoc, onSnapshot, 
  addDoc, query, orderBy, serverTimestamp 
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

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or Bullying' },
  { id: 'inappropriate', label: 'Inappropriate Content' },
  { id: 'spam', label: 'Spam or Bot Activity' },
  { id: 'other', label: 'Other' },
];

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
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
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
  
  // Typing Indicator States & Refs
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdateRef = useRef<number>(0);
  
  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('harassment');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize User session
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
    }
  }, [roomId, router]);

  // Connect to Room and Messages Listeners
  useEffect(() => {
    if (!roomId || !userId) return;

    let isMounted = true;
    const roomRef = doc(db, "chatRooms", roomId);
    const msgsQuery = query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt", "asc"));

    const unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
      if (!isMounted) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        setLoading(false);

        // Robust Peer ID resolution
        const hostId = data.hostId;
        const guestId = data.guestId;
        const currentPeerId = hostId === userId ? guestId : hostId;

        // Typing Indicator Evaluation
        const typingData = data.typing;
        if (typingData && typingData.userId === currentPeerId && typingData.userId) {
          const typingTime = Number(typingData.timestamp) || 0;
          const now = Date.now();

          if (typingTime > 0 && now - typingTime < 4000) {
            setIsPeerTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              if (isMounted) setIsPeerTyping(false);
            }, 4000);
          } else {
            setIsPeerTyping(false);
          }
        } else {
          setIsPeerTyping(false);
        }

        // Room Status Management
        if (data.status === 'blocked') {
          setChatStatus('blocked');
          if (data.blockedBy === userId) setBlockedByMe(true);
        } else if (data.status === 'closed' || data.status === 'ended') {
          setChatStatus('closed');
        }
      } else {
        setChatStatus('closed');
        setLoading(false);
      }
    }, (err) => {
      console.error("Room sync error:", err);
      setLoading(false);
    });

    const unsubscribeMsgs = onSnapshot(msgsQuery, (snapshot) => {
      if (!isMounted) return;
      const msgs: Message[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    });

    return () => {
      isMounted = false;
      unsubscribeRoom();
      unsubscribeMsgs();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [roomId, userId]);

  // Throttled Typing Dispatcher using client-side `Date.now()`
  const handleTypingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    if (chatStatus !== 'active' || !userId || !roomId) return;

    const now = Date.now();

    if (val.trim() === '') {
      updateDoc(doc(db, "chatRooms", roomId), {
        "typing.userId": null,
        "typing.timestamp": 0
      }).catch(() => {});
      return;
    }

    if (now - lastTypingUpdateRef.current > 1000) {
      lastTypingUpdateRef.current = now;
      updateDoc(doc(db, "chatRooms", roomId), {
        "typing.userId": userId,
        "typing.timestamp": now
      }).catch((err) => {
        console.debug("Typing sync skipped:", err);
      });
    }
  }, [chatStatus, userId, roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || chatStatus !== 'active') return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      await updateDoc(doc(db, "chatRooms", roomId), {
        "typing.userId": null,
        "typing.timestamp": 0
      }).catch(() => {});

      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        senderId: userId,
        senderNickname: nickname,
        text: textToSend,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleEndChat = async () => {
    if (window.confirm("Are you sure you want to end this conversation?")) {
      try {
        await updateDoc(doc(db, "chatRooms", roomId), { status: 'closed' });
        setChatStatus('closed');
      } catch (err) {
        console.error("Failed to close room:", err);
      }
    }
  };

  const handleSubmitReport = async () => {
    if (!roomData || !userId || isSubmittingReport) return;
    
    setIsSubmittingReport(true);
    const otherUserId = roomData.hostId === userId ? roomData.guestId : roomData.hostId;

    if (otherUserId) {
      const blockedUsers: string[] = JSON.parse(localStorage.getItem('unsaid_chat_blocked') || '[]');
      if (!blockedUsers.includes(otherUserId)) {
        blockedUsers.push(otherUserId);
        localStorage.setItem('unsaid_chat_blocked', JSON.stringify(blockedUsers));
      }
    }

    try {
      await addDoc(collection(db, "reports"), {
        roomId,
        reporterId: userId,
        reportedUserId: otherUserId,
        reason: selectedReason,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chatRooms", roomId), { 
        status: 'blocked',
        blockedBy: userId 
      });

      setIsReportModalOpen(false);
    } catch (e) {
      console.error("Report processing error:", e);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-neutral-50 flex items-center justify-center font-mono text-xs text-neutral-400">
        Establishing secure session...
      </div>
    );
  }

  const isHost = roomData?.hostId === userId;
  const peerNickname = isHost ? (roomData?.guestNickname || 'Waiting...') : roomData?.hostNickname;
  const peerSchoolRaw = isHost ? roomData?.guestSchool : roomData?.hostSchool;
  const peerSchool = peerSchoolRaw ? (SLU_SCHOOL_LABELS[peerSchoolRaw] || peerSchoolRaw.toUpperCase()) : '';
  const isInactive = chatStatus !== 'active';

  return (
    <div className="h-[100dvh] w-full bg-neutral-50 text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white overflow-hidden relative">
      
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
            <p className="font-mono text-[9px] sm:text-[10px] text-neutral-400">Secure Anonymous Room</p>
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

          {/* More Dropdown */}
          <div className="relative">
            <button 
              aria-label="More options"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer text-neutral-600 border border-neutral-200 bg-white"
            >
              <Icons.MoreVertical />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setIsMenuOpen(false); setIsReportModalOpen(true); }}
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

      {/* Message Feed */}
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

          {/* Typing Indicator */}
          {isPeerTyping && chatStatus === 'active' && (
            <div className="flex flex-col items-start animate-in fade-in duration-200">
              <span className="font-mono text-[10px] text-neutral-400 mb-1 px-1">{peerNickname}</span>
              <div className="bg-white text-neutral-900 border border-neutral-200/80 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}

          {chatStatus === 'closed' && (
            <div className="text-center py-6">
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

      {/* Footer / Input Area */}
      <footer className="shrink-0 bg-white border-t border-neutral-200/80 p-3 sm:p-4 z-10">
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
              onChange={handleTypingChange}
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

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 bg-rose-50 rounded-xl">
                  <Icons.ShieldAlert />
                </div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Block & Report User
                </h3>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded-xl transition-colors cursor-pointer"
              >
                <Icons.X />
              </button>
            </div>

            <p className="text-xs text-neutral-600 font-sans leading-relaxed">
              This will immediately terminate the chat, block this peer from future matching, and send a moderation report. Please select a reason:
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label 
                  key={reason.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                    selectedReason === reason.id 
                      ? 'border-neutral-900 bg-neutral-50 text-neutral-900 shadow-2xs' 
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="reportReason" 
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-neutral-900"
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={handleSubmitReport}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingReport ? 'Submitting...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}