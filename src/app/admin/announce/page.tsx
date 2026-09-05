'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  deleteDoc, 
  increment, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PostProps } from '@/app/page'; // Adjust path if needed
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../actions';

const CATEGORIES = [
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'love', label: 'Love & Connections' },
  { id: 'rants', label: 'Rants' },
  { id: 'life', label: 'City Life' },
  { id: 'others', label: 'Others' },
];

const Icons = {
  Code: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  MessageSquare: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  )
};

export default function AdminPostPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Post Form State
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('thoughts');
  const [spotifyTrackId, setSpotifyTrackId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authorAlias, setAuthorAlias] = useState<string>('Lead Developer');

  // Quick Reply States (keyed by postId)
  const [replyInputs, setReplyInputs] = useState<{ [postId: string]: string }>({});
  const [replyAliases, setReplyAliases] = useState<{ [postId: string]: string }>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Verify server-side authentication status on mount
  useEffect(() => {
    async function verify() {
      const authed = await checkAdminAuth();
      setIsAuthenticated(authed);
      if (authed) {
        setupPostsListener();
      } else {
        setLoading(false);
      }
    }
    verify();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    
    const result = await loginAdmin(formData);
    if (result.success) {
      setIsAuthenticated(true);
      setLoading(true);
      setupPostsListener();
    } else {
      setAuthError(result.error || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  const setupPostsListener = () => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: PostProps[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedDate = 'Just now';
        if (data.createdAt) {
          const dObj = data.createdAt.toDate();
          formattedDate = dObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        fetched.push({
          id: docSnap.id,
          authorAlias: data.authorAlias || 'UNSAID #00000',
          content: data.content || '',
          category: data.category || 'thoughts',
          createdAt: formattedDate,
          upvotes: data.upvotes || 0,
          replies: data.replies || 0,
          spotifyTrackId: data.spotifyTrackId || null,
        });
      });
      setPosts(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let trackIdClean = spotifyTrackId.trim();
      if (trackIdClean.includes('spotify.com/track/')) {
        const parts = trackIdClean.split('track/');
        trackIdClean = parts[1].split('?')[0];
      }

      await addDoc(collection(db, 'posts'), {
        authorAlias: authorAlias.trim() || 'Lead Developer',
        content: content.trim(),
        category,
        spotifyTrackId: trackIdClean || null,
        upvotes: 0,
        replies: 0,
        isDeveloperPost: true,
        status: 'approved',
        createdAt: serverTimestamp(),
      });

      setContent('');
      setSpotifyTrackId('');
      alert('Developer post successfully published!');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to publish post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete.');
    }
  };

  const handleQuickReplySubmit = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const replyText = replyInputs[postId];
    if (!replyText || !replyText.trim() || submittingReplyId === postId) return;

    setSubmittingReplyId(postId);
    try {
      const alias = replyAliases[postId]?.trim() || 'Lead Developer [ADMIN]';

      await addDoc(collection(db, 'posts', postId, 'replies'), {
        content: replyText.trim(),
        authorAlias: alias,
        createdAt: serverTimestamp(),
      });

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        replies: increment(1),
      });

      setReplyInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error adding admin reply:', error);
      alert('Failed to submit reply.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // Loading state while checking auth cookie
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center font-mono text-sm">
        Verifying security clearance...
      </div>
    );
  }

  // 1. Gatekeeper Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-rose-500 uppercase tracking-widest font-bold">Encrypted Gateway</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Admin Login</h1>
            <p className="text-xs font-mono text-neutral-400">Environment-secured authentication required.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                name="password"
                placeholder="Enter admin password..."
                className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-rose-500 transition-all"
                autoFocus
                required
              />
              {authError && (
                <p className="font-mono text-xs text-rose-500 mt-2">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              Authenticate Session
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="font-mono text-xs text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-wider">
              ← Return to Main App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Protected Publishing Dashboard View
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-100 selection:text-neutral-950">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Icons.Code />
            <span>Developer Publishing Portal</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <Link href="/admin" className="text-neutral-400 hover:text-white transition-colors">
              Moderation Queue
            </Link>
            <button
              onClick={handleLogout}
              className="text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
            >
              Destroy Session
            </button>
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
              Exit →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-24">
        {/* Create Post Card */}
        <div className="mb-12 p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Broadcast as Admin / Developer
          </h2>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Admin/Dev Alias
                </label>
                <input 
                  type="text"
                  value={authorAlias}
                  onChange={(e) => setAuthorAlias(e.target.value)}
                  placeholder="e.g. Lead Developer"
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white focus:outline-none focus:border-neutral-600"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Content / Announcement
              </label>
              <textarea 
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write system updates, official notes, or developer thoughts..."
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded text-sm font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Spotify Track ID or URL (Optional)
              </label>
              <input 
                type="text"
                value={spotifyTrackId}
                onChange={(e) => setSpotifyTrackId(e.target.value)}
                placeholder="e.g. 4cOdK2wGLETKBW3PvgPWqT"
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded transition-all disabled:opacity-50"
              >
                <Icons.Send />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Official Entry'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Feed Browser with Quick Management */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
            Browse & Manage All Posts ({posts.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-neutral-500 animate-pulse">
            Loading feed entries...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            No entries found.
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                      <span className="text-white font-bold">{post.authorAlias}</span>
                      <span>•</span>
                      <span>{post.createdAt}</span>
                      <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-neutral-300">
                        {post.category}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-neutral-200 line-clamp-2">
                      {post.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link 
                      href={`/post/${post.id}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-[11px] uppercase tracking-wider rounded transition-colors"
                    >
                      View Page ↗
                    </Link>
                    <button 
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                      title="Delete post"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>

                {/* Inline Admin/Dev Reply Form per post */}
                <form 
                  onSubmit={(e) => handleQuickReplySubmit(post.id, e)}
                  className="pt-3 border-t border-neutral-800/60 space-y-2.5"
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    <Icons.MessageSquare />
                    <span>Quick Admin Reply</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Alias (e.g. Lead Dev [ADMIN])"
                      value={replyAliases[post.id] || ''}
                      onChange={(e) => setReplyAliases({ ...replyAliases, [post.id]: e.target.value })}
                      className="p-2 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                    />

                    <input
                      type="text"
                      placeholder="Write administrative reply..."
                      value={replyInputs[post.id] || ''}
                      onChange={(e) => setReplyInputs({ ...replyInputs, [post.id]: e.target.value })}
                      className="sm:col-span-2 p-2 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReplyId === post.id || !replyInputs[post.id]?.trim()}
                      className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-40"
                    >
                      {submittingReplyId === post.id ? 'Sending...' : 'Post Reply'}
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}