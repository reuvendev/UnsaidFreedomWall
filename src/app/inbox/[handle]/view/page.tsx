'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {  
  doc,  
  getDoc,  
  collection,  
  query,  
  orderBy,  
  limit,  
  startAfter,  
  getDocs,  
  deleteDoc,  
  DocumentData,  
  QueryDocumentSnapshot  
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import * as htmlToImage from 'html-to-image';

interface Message {
  id: string;
  content: string;
  spotifyTrackId: string | null;
  createdAt: Timestamp | null;
}

const PAGE_SIZE = 10;

const Icons = {
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Share: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
      <polyline points="16 6 12 2 8 6"></polyline>
      <line x1="12" y1="2" x2="12" y2="15"></line>
    </svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  )
};

export default function InboxViewerPage() {
  const params = useParams();
  const handle = params.handle as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [copied, setCopied] = useState(false);

  // Story Card Modal State (For Individual Messages)
  const [activeStoryMessage, setActiveStoryMessage] = useState<Message | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const storyCardRef = useRef<HTMLDivElement>(null);

  // Link Share Story Card Modal State (For the promotional link share card)
  const [isLinkStoryModalOpen, setIsLinkStoryModalOpen] = useState(false);
  const [isGeneratingLinkStory, setIsGeneratingLinkStory] = useState(false);
  const linkStoryCardRef = useRef<HTMLDivElement>(null);

  // Check if browser already has a saved token for this handle
  useEffect(() => {
    async function verifyCachedSession() {
      if (!handle) return;
      const savedPasscode = localStorage.getItem(`inbox_auth_${handle}`);
      if (savedPasscode) {
        try {
          const inboxRef = doc(db, 'inboxes', handle);
          const inboxSnap = await getDoc(inboxRef);
          if (inboxSnap.exists() && inboxSnap.data().passcode === savedPasscode) {
            setIsAuthenticated(true);
            fetchInitialMessages();
          }
        } catch (err) {
          console.error("Session check failed:", err);
        }
      }
      setCheckingAuth(false);
    }
    verifyCachedSession();
  }, [handle]);

  // Authenticate user with PIN code
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setCheckingAuth(true);

    try {
      const inboxRef = doc(db, 'inboxes', handle);
      const inboxSnap = await getDoc(inboxRef);

      if (!inboxSnap.exists()) {
        setAuthError('This inbox does not exist.');
        setCheckingAuth(false);
        return;
      }

      const correctPasscode = inboxSnap.data().passcode;
      if (passcode.trim() === correctPasscode) {
        localStorage.setItem(`inbox_auth_${handle}`, correctPasscode);
        setIsAuthenticated(true);
        fetchInitialMessages();
      } else {
        setAuthError('Incorrect secret passcode. Try again.');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setAuthError('Failed to authenticate.');
    } finally {
      setCheckingAuth(false);
    }
  };

  // Fetch initial batch of messages (latest 10)
  const fetchInitialMessages = async () => {
    setLoadingMessages(true);
    try {
      const q = query(
        collection(db, 'inboxes', handle, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const querySnapshot = await getDocs(q);
      const fetched: Message[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          content: data.content || '',
          spotifyTrackId: data.spotifyTrackId || null,
          createdAt: data.createdAt || null,
        });
      });

      setMessages(fetched);
      
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      setLastVisible(lastDoc);
      
      setHasMore(querySnapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch next batch of messages
  const fetchMoreMessages = async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, 'inboxes', handle, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const querySnapshot = await getDocs(q);
      const fetched: Message[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          content: data.content || '',
          spotifyTrackId: data.spotifyTrackId || null,
          createdAt: data.createdAt || null,
        });
      });

      setMessages((prev) => [...prev, ...fetched]);
      
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      setLastVisible(lastDoc);
      
      setHasMore(querySnapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Delete individual message
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'inboxes', handle, 'messages', msgId));
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Download Individual Message Story Image
  const handleDownloadStory = async () => {
    if (!storyCardRef.current) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await htmlToImage.toPng(storyCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `unsaid-note-${handle}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate story image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Download Link Share Story Image
  const handleDownloadLinkStory = async () => {
    if (!linkStoryCardRef.current) return;
    setIsGeneratingLinkStory(true);
    try {
      const dataUrl = await htmlToImage.toPng(linkStoryCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `unsaid-link-${handle}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate link story image:', err);
    } finally {
      setIsGeneratingLinkStory(false);
    }
  };

  // Copy link helper
  const handleCopyLink = () => {
    const link = `${window.location.origin}/inbox/${handle}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Native share helper
  const handleNativeShare = async () => {
    const shareUrl = `${window.location.origin}/inbox/${handle}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Send me an anonymous message!`,
          text: `Drop a secret thought or confession to @${handle} on UNSAID:`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed silently
      }
    } else {
      handleCopyLink();
    }
  };

  // Dynamic font sizing helper based on character length
  const getDynamicFontSize = (text: string) => {
    const length = text.length;
    if (length > 250) return 'text-xs leading-relaxed';
    if (length > 150) return 'text-sm leading-relaxed';
    if (length > 80) return 'text-base leading-normal';
    return 'text-lg sm:text-xl leading-normal';
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-xs text-neutral-400 animate-pulse">
        Checking clearance...
      </div>
    );
  }

  // 1. Password Protection Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white text-neutral-900 font-sans flex flex-col justify-between">
        <header className="border-b border-neutral-200 px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-600">
            ← UNSAID Feed
          </Link>
          <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">Restricted Access</span>
        </header>

        <main className="max-w-md mx-auto px-6 py-16 w-full flex-1 flex flex-col justify-center">
          <div className="p-8 border border-neutral-200 rounded-2xl bg-neutral-50/50 space-y-6 shadow-xs">
            <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center mx-auto">
              <Icons.Lock />
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Unlock @{handle}</h1>
              <p className="text-xs font-mono text-neutral-500">
                Enter your secret passcode to view incoming notes.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-600">
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter secret passcode..."
                className="w-full p-4 bg-white border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-neutral-900"
                required
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                Access Inbox
              </button>
            </form>
          </div>
        </main>

        <footer className="py-6 text-center font-mono text-[11px] text-neutral-400">
          Secure End-to-End Inbox • UNSAID
        </footer>
      </div>
    );
  }

  // 2. Inbox Dashboard Viewer
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-tighter text-neutral-900">
          <span>@{handle}&apos;s Dashboard</span>
          <span className="text-neutral-300">•</span>
          <span className="text-emerald-700 font-semibold">{messages.length} Loaded</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/inbox/${handle}`}
            target="_blank"
            className="font-mono text-xs font-semibold text-neutral-500 hover:text-neutral-900 uppercase tracking-wider"
          >
            Public Link ↗
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem(`inbox_auth_${handle}`);
              setIsAuthenticated(false);
            }}
            className="font-mono text-xs text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider"
          >
            Lock Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">Secret Archive</h1>
            <p className="text-xs font-mono text-neutral-500 mt-1">Confidential messages sent straight to your custom link.</p>
          </div>
          <button
            onClick={fetchInitialMessages}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono text-xs font-bold uppercase rounded-lg transition-colors"
          >
            Refresh Feed
          </button>
        </div>

        {/* Share Card Component */}
        <div className="bg-white border-2 border-neutral-900 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-neutral-900 text-white font-mono text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl tracking-widest">
            Share Link Card
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
              Spread your link
            </span>
            <h3 className="font-bold text-base text-neutral-900">Collect more anonymous responses!</h3>
            <p className="text-xs text-neutral-500 font-mono mt-1">
              Share your custom link on social media to let friends drop secrets.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <span className="font-mono text-xs text-neutral-700 truncate flex-1 select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/inbox/${handle}` : `unsaid.sbs/@${handle}`}
            </span>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-neutral-900 text-white font-mono text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors uppercase tracking-wider shrink-0"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsLinkStoryModalOpen(true)}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Icons.Share />
              <span>Create Story Link Card</span>
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 border border-neutral-200"
            >
              <span>Share ↗</span>
            </button>
          </div>
        </div>

        {loadingMessages ? (
          <div className="py-20 text-center font-mono text-xs text-neutral-400 animate-pulse">
            Decrypting messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 border border-dashed border-neutral-200 rounded-2xl text-center space-y-3 bg-neutral-50/50">
            <p className="font-mono text-sm text-neutral-400">No messages yet.</p>
            <p className="text-xs font-mono text-neutral-500 max-w-xs mx-auto">
              Share your custom link on your socials to start collecting notes!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-xs space-y-4 hover:border-neutral-900 transition-all"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                    <span>
                      {msg.createdAt 
                        ? msg.createdAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : 'Just now'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveStoryMessage(msg)}
                        className="inline-flex items-center gap-1 text-neutral-900 hover:text-emerald-700 font-bold transition-colors bg-neutral-100 px-2.5 py-1 rounded-md"
                        title="Create Story Card"
                      >
                        <Icons.Share />
                        <span>Story Card</span>
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-700 transition-colors"
                        title="Delete message"
                      >
                        <Icons.Trash />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-neutral-900 text-base leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.content}
                  </p>

                  {msg.spotifyTrackId && (
                    <div className="pt-2">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${msg.spotifyTrackId}?utm_source=generator&theme=0`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="encrypted-media"
                        className="rounded-xl border border-neutral-100"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load More Button Section */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  onClick={fetchMoreMessages}
                  disabled={loadingMore}
                  className="w-full py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-neutral-200 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading More Notes...' : 'Load More Messages ↓'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Instagram Story Card Generator Modal (For Individual Messages) */}
      {activeStoryMessage && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl border border-neutral-200 flex flex-col items-center">
            
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-xs font-bold text-neutral-900 uppercase tracking-widest">Story Post Card</span>
              <button 
                onClick={() => setActiveStoryMessage(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Story Card Render Target (9:16 Aspect Ratio optimized look) */}
            <div 
              ref={storyCardRef}
              className="w-full aspect-[9/16] bg-neutral-950 text-white rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl border border-neutral-800"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-neutral-800 rounded-full blur-2xl opacity-50 pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-neutral-900 rounded-full blur-2xl opacity-50 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white text-neutral-950 rounded-full font-black text-[10px] flex items-center justify-center tracking-tighter">
                    U
                  </div>
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-neutral-400">UNSAID SECRETS</span>
                </div>
                <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider">
                  @{handle}
                </span>
              </div>

              {/* Dynamic font size application */}
              <div className="relative z-10 my-auto py-4 space-y-3">
                <div className="inline-block px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full font-mono text-[9px] text-neutral-400 uppercase tracking-widest">
                  Anonymous Note
                </div>
                <p className={`text-white font-medium font-sans tracking-tight whitespace-pre-wrap ${getDynamicFontSize(activeStoryMessage.content)}`}>
                  &quot;{activeStoryMessage.content}&quot;
                </p>
              </div>

              <div className="relative z-10 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-xl p-3 text-center space-y-1 shrink-0">
                <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">Send a secret note to</p>
                <p className="font-mono text-xs font-bold text-white tracking-tight">unsaid.sbs/@{handle}</p>
              </div>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={handleDownloadStory}
                disabled={isGeneratingImage}
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Icons.Download />
                <span>{isGeneratingImage ? 'Rendering Image...' : 'Download Story Card (PNG)'}</span>
              </button>
              <p className="text-[10px] font-mono text-center text-neutral-400">
                Save and post directly to your Instagram or Facebook Stories!
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Instagram Story Card Generator Modal (For Profile Link Sharing) */}
      {isLinkStoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl border border-neutral-200 flex flex-col items-center">
            
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-xs font-bold text-neutral-900 uppercase tracking-widest">Profile Link Story Card</span>
              <button 
                onClick={() => setIsLinkStoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Link Share Story Card Render Target (9:16 Aspect Ratio optimized look) */}
            <div 
              ref={linkStoryCardRef}
              className="w-full aspect-[9/16] bg-neutral-950 text-white rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl border border-neutral-800 text-center"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-neutral-800 rounded-full blur-2xl opacity-50 pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-neutral-900 rounded-full blur-2xl opacity-50 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-white text-neutral-950 rounded-full font-black text-[10px] flex items-center justify-center tracking-tighter">
                  U
                </div>
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-neutral-400">UNSAID SECRETS</span>
              </div>

              <div className="relative z-10 my-auto space-y-4 px-2">
                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl mx-auto flex items-center justify-center text-xl font-bold font-mono">
                  @{handle}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold tracking-tight text-white">Send me an anonymous message!</h2>
                  <p className="text-xs font-mono text-neutral-400">
                    Drop a secret thought, question, or confession. Everything stays completely anonymous.
                  </p>
                </div>
              </div>

              <div className="relative z-10 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl p-4 space-y-2">
                <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">Tap my link</p>
                <p className="font-mono text-xs font-bold text-white tracking-tight">[Put Your Link Here]</p>
              </div>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={handleDownloadLinkStory}
                disabled={isGeneratingLinkStory}
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Icons.Download />
                <span>{isGeneratingLinkStory ? 'Rendering Image...' : 'Download Link Story Card (PNG)'}</span>
              </button>
              <p className="text-[10px] font-mono text-center text-neutral-400">
                Post this to your IG story so followers can easily open your link!
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}