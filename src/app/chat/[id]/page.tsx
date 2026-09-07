'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  collection, doc, updateDoc, onSnapshot, 
  addDoc, query, orderBy, limit, startAfter, getDocs, serverTimestamp, arrayUnion, arrayRemove, DocumentData, QueryDocumentSnapshot, setDoc, deleteDoc, increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  text: string;
  replyTo?: {
    id: string;
    senderNickname: string;
    text: string;
  };
  reactions?: Record<string, string[]>;
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

const AVAILABLE_REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

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
  ),
  Reply: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7"></polyline>
      <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
    </svg>
  ),
  Smile: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
      <line x1="9" y1="9" x2="9.01" y2="9"></line>
      <line x1="15" y1="9" x2="15.01" y2="9"></line>
    </svg>
  ),
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
  ChevronUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
};

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  const [roomData, setRoomData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatStatus, setChatStatus] = useState<'active' | 'closed' | 'blocked'>('active');
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeCount, setActiveCount] = useState<number>(1); // Real-time active users count
  
  // Pagination State
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('harassment');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdateRef = useRef<number>(0);
  const initialScrollDone = useRef(false);

  // Initialize Dark Mode state
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');
      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
    } catch (e) {}
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      localStorage.setItem('unsaid_dark_mode', JSON.stringify(nextMode));
    } catch (e) {}
  };

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

  // Real-time Presence Tracker Effect (Active Users Counter inside Room)
  useEffect(() => {
    if (!userId) return;

    const sessionId = 'session_' + userId + '_' + roomId;
    const presenceRef = doc(db, 'activePresence', sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, {
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } catch (err) {}
    };

    updatePresence();
    const heartbeatInterval = setInterval(updatePresence, 30000);

    const handleUnload = () => {
      deleteDoc(presenceRef).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);

    const presenceQuery = query(collection(db, 'activePresence'));
    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      const now = Date.now();
      let count = 0;
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lastSeen) {
          const lastSeenTime = data.lastSeen.toMillis ? data.lastSeen.toMillis() : new Date(data.lastSeen).getTime();
          if (now - lastSeenTime < 60000) {
            count++;
          }
        }
      });

      setActiveCount(Math.max(1, count));
    });

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(presenceRef).catch(() => {});
      unsubscribePresence();
    };
  }, [userId, roomId]);

  // Connect to Room and Initial Messages Snapshot
  useEffect(() => {
    if (!roomId || !userId) return;

    let isMounted = true;
    const roomRef = doc(db, "chatRooms", roomId);
    
    const PAGE_LIMIT = 10;
    const msgsQuery = query(
      collection(db, "chatRooms", roomId, "messages"), 
      orderBy("createdAt", "desc"),
      limit(PAGE_LIMIT)
    );

    let unsubscribeRoom: (() => void) | undefined;
    let unsubscribeMsgs: (() => void) | undefined;

    unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
      if (!isMounted) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        setLoading(false);

        if (data.status === 'blocked') {
          setChatStatus('blocked');
          if (data.blockedBy === userId) setBlockedByMe(true);
          unsubscribeRoom?.();
          unsubscribeMsgs?.();
        } else if (data.status === 'closed' || data.status === 'ended') {
          setChatStatus('closed');
          unsubscribeRoom?.();
          unsubscribeMsgs?.();
        }
      } else {
        setChatStatus('closed');
        setLoading(false);
        unsubscribeRoom?.();
        unsubscribeMsgs?.();
      }
    }, (err) => {
      console.error("Room sync error:", err);
      setLoading(false);
    });

    unsubscribeMsgs = onSnapshot(msgsQuery, (snapshot) => {
      if (!isMounted) return;
      
      const docs = snapshot.docs;
      if (docs.length > 0) {
        setLastVisibleDoc(docs[docs.length - 1]);
        setHasMoreMessages(docs.length >= PAGE_LIMIT);
      } else {
        setHasMoreMessages(false);
      }

      const msgs: Message[] = docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs.reverse());
      
      if (!initialScrollDone.current) {
        initialScrollDone.current = true;
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }, 50);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeRoom?.();
      unsubscribeMsgs?.();
    };
  }, [roomId, userId]);

  // Load Earlier Messages (Pagination Handler)
  const handleLoadMore = async () => {
    if (!lastVisibleDoc || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const olderQuery = query(
        collection(db, "chatRooms", roomId, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(30)
      );

      const snapshot = await getDocs(olderQuery);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        setLastVisibleDoc(docs[docs.length - 1]);
        if (docs.length < 30) {
          setHasMoreMessages(false);
        }

        const olderMsgs: Message[] = docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(prev => [...olderMsgs.reverse(), ...prev]);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    if (!userId || chatStatus !== 'active') return;

    const now = Date.now();
    if (now - lastTypingUpdateRef.current > 2000) {
      lastTypingUpdateRef.current = now;
      updateDoc(doc(db, "chatRooms", roomId), {
        [`typing_${userId}`]: true
      }).catch(() => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingUpdateRef.current = 0;
      updateDoc(doc(db, "chatRooms", roomId), {
        [`typing_${userId}`]: false
      }).catch(() => {});
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend || !userId) return;

    if (chatStatus !== 'active') {
      alert("This conversation is no longer active.");
      return;
    }

    const currentReply = replyingTo ? {
      id: replyingTo.id,
      senderNickname: replyingTo.senderId === userId ? 'You' : replyingTo.senderNickname,
      text: replyingTo.text,
    } : null;

    setNewMessage('');
    setReplyingTo(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    lastTypingUpdateRef.current = 0;
    await updateDoc(doc(db, "chatRooms", roomId), {
      [`typing_${userId}`]: false
    }).catch(() => {});

    const tempId = 'temp_' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      senderId: userId,
      senderNickname: nickname,
      text: textToSend,
      replyTo: currentReply || undefined,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);

    try {
      const messagePayload: any = {
        senderId: userId,
        senderNickname: nickname,
        text: textToSend,
        createdAt: serverTimestamp()
      };
      if (currentReply) {
        messagePayload.replyTo = currentReply;
      }

      await addDoc(collection(db, "chatRooms", roomId, "messages"), messagePayload);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(textToSend);
      alert("Failed to send message. Please check your connection.");
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (chatStatus !== 'active') return;
    setActiveReactionPickerId(null);

    const msg = messages.find(m => m.id === messageId);
    if (!msg || msg.id.startsWith('temp_')) return;

    const msgRef = doc(db, "chatRooms", roomId, "messages", messageId);
    const existingReactions = msg.reactions || {};
    const usersWhoReacted = existingReactions[emoji] || [];
    const hasReacted = usersWhoReacted.includes(userId);

    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const updatedReactions = { ...(m.reactions || {}) };
      const currentList = [...(updatedReactions[emoji] || [])];
      if (hasReacted) {
        const filtered = currentList.filter(id => id !== userId);
        if (filtered.length === 0) delete updatedReactions[emoji];
        else updatedReactions[emoji] = filtered;
      } else {
        currentList.push(userId);
        updatedReactions[emoji] = currentList;
      }
      return { ...m, reactions: updatedReactions };
    }));

    try {
      if (hasReacted) {
        await updateDoc(msgRef, {
          [`reactions.${emoji}`]: arrayRemove(userId)
        });
      } else {
        await updateDoc(msgRef, {
          [`reactions.${emoji}`]: arrayUnion(userId)
        });
      }
    } catch (err) {
      console.error("Failed to update reaction:", err);
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
      <div className={`h-[100dvh] w-full flex items-center justify-center font-mono text-xs ${isDarkMode ? 'bg-neutral-950 text-neutral-400' : 'bg-neutral-50 text-neutral-400'}`}>
        Establishing secure session...
      </div>
    );
  }

  const isHost = roomData?.hostId === userId;
  const peerUserId = isHost ? roomData?.guestId : roomData?.hostId;
  const peerNickname = isHost ? (roomData?.guestNickname || 'Waiting...') : roomData?.hostNickname;
  const peerSchoolRaw = isHost ? roomData?.guestSchool : roomData?.hostSchool;
  const peerSchool = peerSchoolRaw ? (SLU_SCHOOL_LABELS[peerSchoolRaw] || peerSchoolRaw.toUpperCase()) : '';
  const isInactive = chatStatus !== 'active';
  const isPeerTyping = peerUserId ? Boolean(roomData?.[`typing_${peerUserId}`]) : false;

  return (
    <div className={`h-[100dvh] w-full font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white overflow-hidden relative ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* Header */}
      <header className={`shrink-0 backdrop-blur-md border-b px-3 sm:px-6 h-16 flex items-center justify-between shadow-2xs z-10 gap-2 ${isDarkMode ? 'bg-neutral-900/95 border-neutral-800' : 'bg-white/95 border-neutral-200/80'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isInactive ? 'bg-neutral-400' : 'bg-emerald-500 animate-pulse'}`}></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <h2 className={`font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate max-w-[130px] sm:max-w-xs ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                <span className="hidden sm:inline">Chatting with: </span>
                <span className={isInactive ? 'text-neutral-500' : 'text-emerald-500'}>{peerNickname}</span>
              </h2>
              {peerSchool && (
                <span className={`font-mono text-[9px] sm:text-[10px] px-1.5 py-0.5 border rounded shrink-0 ${isDarkMode ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-neutral-100 text-neutral-700 border-neutral-200'}`}>
                  {peerSchool}
                </span>
              )}
            </div>
            <p className={`font-mono text-[9px] sm:text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>Secure Anonymous Room</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Real-time Online Counter Badge */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider border ${
            isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700 shadow-2xs'
          }`}>
          </div>

          {!isInactive && (
            <button
              onClick={handleEndChat}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 border font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg cursor-pointer active:scale-95 ${
                isDarkMode 
                  ? 'bg-neutral-800 hover:bg-rose-950/50 text-neutral-300 hover:text-rose-400 border-neutral-700' 
                  : 'bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-600 border-neutral-200'
              }`}
            >
              End Chat
            </button>
          )}

          <div className="relative">
            <button 
              aria-label="More options"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-1.5 sm:p-2 rounded-xl cursor-pointer border ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' 
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Icons.MoreVertical />
            </button>

            {isMenuOpen && (
              <div className={`absolute right-0 mt-2 w-48 border rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
              }`}>
                <button
                  onClick={() => { setIsMenuOpen(false); setIsReportModalOpen(true); }}
                  className={`w-full px-4 py-2.5 text-left font-mono text-xs font-bold flex items-center space-x-2 cursor-pointer ${
                    isDarkMode ? 'text-rose-400 hover:bg-rose-950/40' : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Icons.ShieldAlert />
                  <span>Block & Report</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={toggleDarkMode}
            aria-label="Toggle Dark Mode"
            className={`p-2 rounded-xl border cursor-pointer ${
              isDarkMode 
                ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' 
                : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
          </button>
        </div>
      </header>

      {/* Message Feed */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-2xl w-full mx-auto space-y-4">
          
          {hasMoreMessages && (
            <div className="text-center my-3">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider border shadow-2xs cursor-pointer active:scale-95 transition-all ${
                  isDarkMode 
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800' 
                    : 'bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                }`}
              >
                <Icons.ChevronUp />
                <span>{isLoadingMore ? 'Loading older messages...' : 'Load earlier messages'}</span>
              </button>
            </div>
          )}

          <div className="text-center my-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[9px] sm:text-[10px] uppercase tracking-widest border text-center ${
              isDarkMode ? 'bg-neutral-900 text-neutral-400 border-neutral-800' : 'bg-neutral-100 text-neutral-500 border-neutral-200/60'
            }`}>
              <Icons.Shield /> End-to-end Anonymous Room Active
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.senderId === userId;
            const isPickerOpen = activeReactionPickerId === msg.id;

            let touchStartX = 0;
            let currentTranslateX = 0;

            const handleTouchStart = (e: React.TouchEvent) => {
              touchStartX = e.touches[0].clientX;
            };

            const handleTouchMove = (e: React.TouchEvent) => {
              const currentX = e.touches[0].clientX;
              const diff = currentX - touchStartX;
              if (diff > 0 && diff < 80) {
                currentTranslateX = diff;
                (e.currentTarget as HTMLElement).style.transform = `translateX(${diff}px)`;
              }
            };

            const handleTouchEnd = (e: React.TouchEvent) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateX(0px)';
              if (currentTranslateX > 40) {
                setReplyingTo(msg);
              }
              currentTranslateX = 0;
            };

            return (
              <div key={msg.id} className={`flex flex-col relative ${isMe ? 'items-end' : 'items-start'}`}>
                <span className={`font-mono text-[10px] mb-1 px-1 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {isMe ? 'You' : msg.senderNickname}
                </span>
                
                <div className="relative group max-w-[88%] sm:max-w-[80%]">
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={() => setReplyingTo(msg)}
                    className={`px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm font-sans break-words cursor-pointer select-none transition-transform duration-150 ${
                      isMe 
                        ? isDarkMode ? 'bg-neutral-600 text-white rounded-br-xs' : 'bg-neutral-900 text-white rounded-br-xs' 
                        : isDarkMode ? 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-bl-xs' : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs shadow-2xs'
                    }`}
                    title="Swipe right or double tap to reply"
                  >
                    {msg.replyTo && (
                      <div className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-2 text-xs opacity-90 ${
                        isMe 
                          ? 'bg-black/20 border-white/70 text-white/90' 
                          : isDarkMode ? 'bg-neutral-950/50 border-emerald-500 text-neutral-300' : 'bg-neutral-50 border-emerald-600 text-neutral-600'
                      }`}>
                        <p className="font-mono text-[10px] font-bold">{msg.replyTo.senderNickname}</p>
                        <p className="truncate">{msg.replyTo.text}</p>
                      </div>
                    )}

                    <p>{msg.text}</p>
                  </div>

                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions).map(([emoji, userList]) => {
                        const hasReactedHere = userList.includes(userId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] border cursor-pointer transition-transform active:scale-95 ${
                              hasReactedHere 
                                ? isDarkMode ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700' : 'bg-white border-neutral-200 text-neutral-600 shadow-2xs hover:bg-neutral-50'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-bold">{userList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}>
                    <div className="relative">
                      <button
                        onClick={() => setActiveReactionPickerId(isPickerOpen ? null : msg.id)}
                        className={`p-1.5 rounded-full border shadow-sm cursor-pointer ${
                          isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                        title="React with emoji"
                      >
                        <Icons.Smile />
                      </button>

                      {isPickerOpen && (
                        <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} p-1.5 rounded-2xl border shadow-xl flex items-center gap-1 z-30 animate-in fade-in zoom-in-95 ${
                          isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                        }`}>
                          {AVAILABLE_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm hover:scale-125 transition-transform cursor-pointer ${
                                isDarkMode ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setReplyingTo(msg)}
                      className={`p-1.5 rounded-full border shadow-sm cursor-pointer ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700 text-emerald-400 hover:bg-neutral-800' : 'bg-white border-neutral-200 text-emerald-600 hover:bg-neutral-100'
                      }`}
                      title="Reply to message"
                    >
                      <Icons.Reply />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {isPeerTyping && (
            <div className="flex flex-col items-start">
              <span className={`font-mono text-[10px] mb-1 px-1 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {peerNickname}
              </span>
              <div className={`px-4 py-3 rounded-2xl rounded-bl-xs flex items-center space-x-1.5 ${
                isDarkMode ? 'bg-neutral-900 border border-neutral-800 text-neutral-400' : 'bg-white border border-neutral-200/80 text-neutral-500 shadow-2xs'
              }`}>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          {chatStatus === 'closed' && (
            <div className="text-center py-6">
              <p className={`font-mono text-xs font-bold py-2.5 px-5 rounded-xl inline-block border ${
                isDarkMode ? 'bg-neutral-900 text-neutral-400 border-neutral-800' : 'bg-neutral-100 text-neutral-500 border-neutral-200'
              }`}>
                The conversation has ended.
              </p>
            </div>
          )}

          {chatStatus === 'blocked' && (
            <div className="text-center py-6 space-y-3 px-4">
              <div className={`inline-block p-3 border rounded-2xl ${isDarkMode ? 'bg-rose-950/40 border-rose-900/50 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                <Icons.ShieldAlert />
              </div>
              <p className={`font-mono text-xs font-bold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
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
      <footer className={`shrink-0 border-t p-3 sm:px-6 sm:py-4 z-10 flex flex-col gap-2 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200/80'}`}>
        {replyingTo && (
          <div className={`max-w-2xl mx-auto w-full px-3 py-2 rounded-xl border flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2 ${
            isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
          }`}>
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono font-bold text-emerald-600">Replying to {replyingTo.senderId === userId ? 'yourself' : replyingTo.senderNickname}:</span>
              <span className="truncate opacity-80">{replyingTo.text}</span>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-lg hover:bg-neutral-500/10 cursor-pointer"
            >
              <Icons.X />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto w-full flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            disabled={isInactive}
            placeholder={isInactive ? "Chat has ended..." : "Type a secure message..."}
            className={`flex-1 px-4 py-3 rounded-xl border font-sans text-sm focus:outline-hidden transition-all ${
              isInactive 
                ? 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800' 
                : isDarkMode 
                  ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500' 
                  : 'bg-neutral-100 border-neutral-200 text-neutral-900 focus:border-emerald-600'
            }`}
          />
          <button
            type="submit"
            disabled={isInactive || !newMessage.trim()}
            className={`px-4 sm:px-5 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              isInactive || !newMessage.trim()
                ? 'opacity-40 cursor-not-allowed bg-neutral-300 dark:bg-neutral-800 text-neutral-500'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-sm'
            }`}
          >
            <span className="hidden sm:inline">Send</span>
            <Icons.Send />
          </button>
        </form>
      </footer>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`max-w-md w-full border rounded-2xl p-6 space-y-6 shadow-2xl ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-rose-500">
                <Icons.ShieldAlert /> Block & Report User
              </h3>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-500/10 cursor-pointer"
              >
                <Icons.X />
              </button>
            </div>

            <p className={`font-mono text-xs leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Reporting this user will immediately terminate the conversation, block them from matching with you again, and log a report for safety moderation.
            </p>

            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold uppercase tracking-wider opacity-80">Reason for report</label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label 
                    key={reason.id} 
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedReason === reason.id 
                        ? isDarkMode ? 'bg-neutral-800 border-rose-500/50 text-white' : 'bg-rose-50/50 border-rose-300 text-neutral-900'
                        : isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="reportReason" 
                      value={reason.id} 
                      checked={selectedReason === reason.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="accent-rose-500"
                    />
                    <span className="font-sans text-xs font-semibold">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className={`flex-1 py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-xl border cursor-pointer ${
                  isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className="flex-1 py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-xl bg-rose-600 hover:bg-rose-500 text-white active:scale-95 cursor-pointer shadow-sm transition-all"
              >
                {isSubmittingReport ? 'Submitting...' : 'Confirm Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}