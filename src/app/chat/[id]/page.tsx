'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ),
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('harassment');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Dark Mode state from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');
      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
    } catch (e) {
      // Ignore
    }
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

  // Connect to Room and Messages Listeners
  useEffect(() => {
    if (!roomId || !userId) return;

    let isMounted = true;
    const roomRef = doc(db, "chatRooms", roomId);
    
    const msgsQuery = query(
      collection(db, "chatRooms", roomId, "messages"), 
      orderBy("createdAt", "desc")
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
          // Keep security blocks active, but allow message stream to stay readable
          setChatStatus('blocked');
          if (data.blockedBy === userId) setBlockedByMe(true);
        } else if (data.status === 'closed' || data.status === 'ended') {
          // Set to closed so input disables, but do NOT unsubscribe messages so history stays viewable
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

    unsubscribeMsgs = onSnapshot(msgsQuery, (snapshot) => {
      if (!isMounted) return;
      const msgs: Message[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      setMessages(msgs.reverse());
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    });

    return () => {
      isMounted = false;
      unsubscribeRoom?.();
      unsubscribeMsgs?.();
    };
  }, [roomId, userId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend || !userId) return;

    if (chatStatus !== 'active') {
      alert("This conversation is no longer active.");
      return;
    }

    setNewMessage('');

    const tempId = 'temp_' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      senderId: userId,
      senderNickname: nickname,
      text: textToSend,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);

    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        senderId: userId,
        senderNickname: nickname,
        text: textToSend,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(textToSend);
      alert("Failed to send message. Please check your connection.");
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
  const peerNickname = isHost ? (roomData?.guestNickname || 'Waiting...') : roomData?.hostNickname;
  const peerSchoolRaw = isHost ? roomData?.guestSchool : roomData?.hostSchool;
  const peerSchool = peerSchoolRaw ? (SLU_SCHOOL_LABELS[peerSchoolRaw] || peerSchoolRaw.toUpperCase()) : '';
  const isInactive = chatStatus !== 'active';

  return (
    <div className={`h-[100dvh] w-full font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white overflow-hidden relative ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* Header */}
      <header className={`shrink-0 backdrop-blur-md border-b px-3 sm:px-6 h-16 flex items-center justify-between shadow-2xs z-10 gap-2 ${isDarkMode ? 'bg-neutral-900/95 border-neutral-800' : 'bg-white/95 border-neutral-200/80'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${chatStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <h2 className={`font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate max-w-[130px] sm:max-w-xs ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                <span className="hidden sm:inline">Chatting with: </span>
                <span className={chatStatus === 'active' ? 'text-emerald-500' : 'text-neutral-500'}>{peerNickname}</span>
              </h2>
              {peerSchool && (
                <span className={`font-mono text-[9px] sm:text-[10px] px-1.5 py-0.2 border rounded shrink-0 ${isDarkMode ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-neutral-100 text-neutral-700 border-neutral-200'}`}>
                  {peerSchool}
                </span>
              )}
            </div>
            <p className={`font-mono text-[9px] sm:text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {chatStatus === 'closed' ? 'Conversation Ended' : chatStatus === 'blocked' ? 'Terminated & Blocked' : 'Secure Anonymous Room'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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

          {/* More Dropdown */}
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
          <div className="text-center my-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[9px] sm:text-[10px] uppercase tracking-widest border text-center ${
              isDarkMode ? 'bg-neutral-900 text-neutral-400 border-neutral-800' : 'bg-neutral-100 text-neutral-500 border-neutral-200/60'
            }`}>
              <Icons.Shield /> End-to-end Anonymous Room {chatStatus === 'closed' ? 'Archived' : 'Active'}
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.senderId === userId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className={`font-mono text-[10px] mb-1 px-1 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {isMe ? 'You' : msg.senderNickname}
                </span>
                <div className={`max-w-[88%] sm:max-w-[80%] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm font-sans break-words ${
                  isMe 
                    ? isDarkMode ? 'bg-neutral-600 text-white rounded-br-xs' : 'bg-neutral-900 text-white rounded-br-xs' 
                    : isDarkMode ? 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-bl-xs' : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs shadow-2xs'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}

          {chatStatus === 'closed' && (
            <div className="text-center py-6">
              <p className={`font-mono text-xs font-bold py-2.5 px-5 rounded-xl inline-block border ${
                isDarkMode ? 'bg-neutral-900 text-neutral-400 border-neutral-800' : 'bg-neutral-100 text-neutral-500 border-neutral-200'
              }`}>
                The conversation has ended. You are viewing the chat history.
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
      <footer className={`shrink-0 border-t p-3 sm:px-6 sm:py-4 z-10 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200/80'}`}>
        {isInactive ? (
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className={`flex-1 py-3 border font-mono text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer active:scale-98 ${
                isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
              }`}
            >
              Exit (Home)
            </button>
            <button
              onClick={() => router.push('/chat/queue')}
              className={`flex-1 py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm active:scale-98 cursor-pointer ${
                isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
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
              className={`flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 border rounded-xl text-base sm:text-sm font-mono focus:outline-none shadow-2xs ${
                isDarkMode 
                  ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-emerald-500' 
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900'
              }`}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className={`px-3.5 sm:px-5 py-2.5 sm:py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm disabled:opacity-40 flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 shrink-0 ${
                isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              <span className="hidden sm:inline">Send</span>
              <Icons.Send />
            </button>
          </form>
        )}
      </footer>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2.5 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-rose-950/60' : 'bg-rose-50'}`}>
                  <Icons.ShieldAlert />
                </div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider">
                  Block & Report User
                </h3>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className={`p-1.5 rounded-xl cursor-pointer ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-500'}`}
              >
                <Icons.X />
              </button>
            </div>

            <p className={`text-xs font-sans leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              This will immediately terminate the chat, block this peer from future matching, and send a moderation report. Please select a reason:
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label 
                  key={reason.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-mono font-medium cursor-pointer ${
                    selectedReason === reason.id 
                      ? isDarkMode 
                        ? 'border-emerald-500 bg-neutral-950 text-white ring-1 ring-emerald-500/20' 
                        : 'border-neutral-900 bg-neutral-50 text-neutral-900 shadow-2xs' 
                      : isDarkMode 
                        ? 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700' 
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="reportReason" 
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-emerald-500"
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className={`flex-1 py-3 border font-mono text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer ${
                  isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={handleSubmitReport}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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