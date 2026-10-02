'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../actions';

interface PendingPost {
  id: string;
  authorAlias: string;
  content: string;
  category: string;
  createdAt: string;
  spotifyTrackId?: string;
  imageUrl?: string;
  moderationOriginalContent?: string;
}

const Icons = {
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
    </svg>
  ),
  Save: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  )
};

export default function AdminModerationPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  // Verify server-side authentication status on mount
  useEffect(() => {
    async function verify() {
      const authed = await checkAdminAuth();
      setIsAuthenticated(authed);
      if (authed) {
        setupPendingPostsListener();
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
      setupPendingPostsListener();
    } else {
      setAuthError(result.error || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  const setupPendingPostsListener = () => {
    const q = query(
      collection(db, "posts"), 
      where("status", "==", "pending"), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts: PendingPost[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedDate = "Just now";
        if (data.createdAt) {
          const dObj = data.createdAt.toDate();
          formattedDate = dObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        posts.push({
          id: docSnap.id,
          authorAlias: data.authorAlias || "Anonymous Louisian",
          content: data.content || "",
          category: data.category || "thoughts",
          createdAt: formattedDate,
          spotifyTrackId: data.spotifyTrackId || null,
          imageUrl: data.imageUrl || data.image || null,
          moderationOriginalContent: data.moderationOriginalContent ?? data.content ?? "",
        });
      });

      setPendingPosts(posts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pending posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const startEditing = (post: PendingPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (post: PendingPost) => {
    const trimmedContent = editContent.trim();

    if (!trimmedContent && !post.imageUrl && !post.spotifyTrackId) {
      alert("An entry cannot be empty.");
      return;
    }

    setProcessingId(post.id);
    try {
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, {
        content: trimmedContent,
        moderationEdited: trimmedContent !== post.moderationOriginalContent,
        moderationOriginalContent: post.moderationOriginalContent ?? post.content,
        moderationEditedAt: serverTimestamp(),
      });

      setEditingId(null);
      setEditContent("");
    } catch (error) {
      console.error("Error saving moderated entry:", error);
      alert("Failed to save changes.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (post: PendingPost) => {
    const isCurrentlyEditing = editingId === post.id;
    const contentToPublish = isCurrentlyEditing ? editContent.trim() : post.content.trim();

    if (!contentToPublish && !post.imageUrl && !post.spotifyTrackId) {
      alert("An entry cannot be empty.");
      return;
    }

    setProcessingId(post.id);
    try {
      const postRef = doc(db, "posts", post.id);
      const originalContent = post.moderationOriginalContent ?? post.content;

      await updateDoc(postRef, {
        content: contentToPublish,
        status: 'approved',
        moderationEdited: contentToPublish !== originalContent,
        moderationOriginalContent: originalContent,
        moderatedAt: serverTimestamp(),
      });

      if (isCurrentlyEditing) {
        setEditingId(null);
        setEditContent("");
      }
    } catch (error) {
      console.error("Error approving post:", error);
      alert("Failed to approve entry.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to reject and delete this entry?")) return;
    
    setProcessingId(id);
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete entry.");
    } finally {
      setProcessingId(null);
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
            <h1 className="text-2xl font-black tracking-tight text-white">Admin Moderation</h1>
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

  // 2. Protected Moderation Dashboard View
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-100 selection:text-neutral-950">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
            <Icons.Shield />
            <span>Moderation Queue ({pendingPosts.length})</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <Link href="/admin/portal" className="text-neutral-400 hover:text-white transition-colors">
              Developer Portal
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
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">
            Pending Submissions
          </h1>
          <p className="text-xs font-mono text-neutral-400">
            Review and edit user-submitted entries before publishing them to the public feed.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-neutral-500 animate-pulse">
            Loading pending submissions...
          </div>
        ) : pendingPosts.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            🎉 All caught up! There are no pending entries to review.
          </div>
        ) : (
          <div className="space-y-6">
            {pendingPosts.map((post) => {
              const isProcessing = processingId === post.id;

              return (
                <div 
                  key={post.id} 
                  className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                      <span className="text-white font-bold">{post.authorAlias}</span>
                      <span>•</span>
                      <span>{post.createdAt}</span>
                    </div>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">
                      {post.category}
                    </span>
                  </div>

                  {editingId === post.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`edit-${post.id}`}
                          className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-bold"
                        >
                          Moderation edit
                        </label>
                        <span className="font-mono text-[10px] text-neutral-500">
                          {editContent.length} characters
                        </span>
                      </div>
                      <textarea
                        id={`edit-${post.id}`}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                        disabled={isProcessing}
                        className="w-full resize-y rounded-lg border border-amber-500/30 bg-neutral-950 p-3 text-sm font-medium leading-relaxed text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-amber-400 disabled:opacity-60"
                        placeholder="Edit the entry before publishing..."
                        autoFocus
                      />
                      <p className="font-mono text-[10px] leading-relaxed text-neutral-500">
                        Changes are made for moderation purposes. The original submission is retained in Firestore under <span className="text-neutral-400">moderationOriginalContent</span>.
                      </p>
                    </div>
                  ) : (
                    post.content && (
                      <p className="text-sm font-medium text-neutral-200 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>
                    )
                  )}

                  {/* Render Uploaded Image if available */}
                  {post.imageUrl && (
                    <div className="relative rounded-lg overflow-hidden border border-neutral-800/80 bg-neutral-950 flex items-center justify-center">
                      <img
                        src={post.imageUrl}
                        alt="User uploaded attachment"
                        className="max-h-96 w-auto object-contain rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Render Spotify Embed if available */}
                  {post.spotifyTrackId && (
                    <div>
                      <iframe
                        src={`https://open.spotify.com/embed/track/${post.spotifyTrackId}?utm_source=generator&theme=0`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="encrypted-media"
                        className="rounded border border-neutral-800"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-3 border-t border-neutral-800/60 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {editingId === post.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(post)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-mono text-[11px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                          >
                            <Icons.Save />
                            <span>{isProcessing ? 'Saving...' : 'Save Changes'}</span>
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-mono text-[11px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                          >
                            <Icons.X />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(post)}
                          disabled={isProcessing || editingId !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-mono text-[11px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-40"
                        >
                          <Icons.Edit />
                          <span>Edit Entry</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-mono text-[11px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                      >
                        <Icons.Trash />
                        <span>Reject & Delete</span>
                      </button>

                      <button
                        onClick={() => handleApprove(post)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-mono text-[11px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                      >
                        <Icons.Check />
                        <span>{isProcessing ? 'Processing...' : editingId === post.id ? 'Publish Edited Entry' : 'Approve & Publish'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}