'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  increment,
  updateDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { PostProps } from '@/app/page';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../actions';

import imageCompression from 'browser-image-compression';
import { getPresignedUploadUrl } from '@/app/actions/r2-upload';

const CATEGORIES = [
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'love', label: 'Love & Connections' },
  { id: 'rants', label: 'Rants' },
  { id: 'life', label: 'City Life' },
  { id: 'others', label: 'Others' },
];

const PAGE_SIZE = 10;

const Icons = {
  Code: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),

  Trash: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),

  Send: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),

  MessageSquare: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  ),
  Pin: () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 17v5" />
    <path d="M5 9l3-3 1-4h6l1 4 3 3" />
    <path d="M5 9h14" />
    <path d="M8 9v4l-2 2h12l-2-2V9" />
  </svg>
),

PinOff: () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 17v5" />
    <path d="M5 9l3-3 1-4h6l1 4 3 3" />
    <path d="M5 9h14" />
    <path d="M8 9v4l-2 2h12l-2-2V9" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
),
};

export default function AdminPostPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    null
  );

  const [authError, setAuthError] = useState<string>('');
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Create post
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('thoughts');
  const [spotifyTrackId, setSpotifyTrackId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authorAlias, setAuthorAlias] =
    useState<string>('Lead Developer');

  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Replies
  const [replyInputs, setReplyInputs] = useState<{
    [postId: string]: string;
  }>({});

  const [replyAliases, setReplyAliases] = useState<{
    [postId: string]: string;
  }>({});

  const [submittingReplyId, setSubmittingReplyId] =
    useState<string | null>(null);

  // =========================
  // AUTH CHECK
  // =========================

  useEffect(() => {
    async function verify() {
      const authed = await checkAdminAuth();

      setIsAuthenticated(authed);

      if (authed) {
        fetchInitialPosts();
      } else {
        setLoading(false);
      }
    }

    verify();
  }, []);

  // =========================
  // LOGIN
  // =========================

  const handleLoginSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setAuthError('');

    const formData = new FormData(e.currentTarget);

    const result = await loginAdmin(formData);

    if (result.success) {
      setIsAuthenticated(true);
      setLoading(true);

      fetchInitialPosts();
    } else {
      setAuthError(result.error || 'Authentication failed');
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  // =========================
  // FORMAT POST
  // =========================

  const formatPost = (
    docSnap: QueryDocumentSnapshot<DocumentData>
  ): PostProps => {
    const data = docSnap.data();

    let formattedDate = 'Just now';

    if (data.createdAt) {
      const dObj = data.createdAt.toDate();

      formattedDate =
        dObj.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        }) +
        ' at ' +
        dObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
    }

    return {
      id: docSnap.id,
      authorAlias: data.authorAlias || 'UNSAID #00000',
      content: data.content || '',
      category: data.category || 'thoughts',
      createdAt: formattedDate,
      upvotes: data.upvotes || 0,
      replies: data.replies || 0,
      spotifyTrackId: data.spotifyTrackId || undefined,
      imageUrl: data.imageUrl || undefined,
      isPinned: data.isPinned || false,
    };
  };

  // =========================
  // FETCH INITIAL POSTS
  // =========================

  const fetchInitialPosts = async () => {
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);

      const fetched: PostProps[] = [];

      snapshot.forEach((docSnap) => {
        fetched.push(formatPost(docSnap));
      });

      setLastVisible(
        snapshot.docs[snapshot.docs.length - 1] || null
      );

      setHasMore(snapshot.docs.length === PAGE_SIZE);

      setPosts(fetched);
    } catch (error) {
      console.error(
        'Error fetching initial posts:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD MORE
  // =========================

  const handleLoadMore = async () => {
    if (!lastVisible || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        firestoreLimit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);

      const fetched: PostProps[] = [];

      snapshot.forEach((docSnap) => {
        fetched.push(formatPost(docSnap));
      });

      setLastVisible(
        snapshot.docs[snapshot.docs.length - 1] || null
      );

      setHasMore(snapshot.docs.length === PAGE_SIZE);

      setPosts((prev) => [...prev, ...fetched]);
    } catch (error) {
      console.error(
        'Error loading more posts:',
        error
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  // =========================
  // IMAGE SELECT
  // =========================

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;

    setImageFile(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview('');
    }
  };

  // =========================
  // REMOVE IMAGE
  // =========================

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  // =========================
  // CREATE DEVELOPER POST
  // =========================

  const handleCreatePost = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // =========================
      // CLEAN SPOTIFY ID
      // =========================

      let trackIdClean = spotifyTrackId.trim();

      if (trackIdClean.includes('spotify.com/track/')) {
        const parts = trackIdClean.split('track/');

        trackIdClean = parts[1].split('?')[0];
      }

      // =========================
      // IMAGE UPLOAD
      // =========================

      let imageUrl: string | null = null;

      if (imageFile) {
        const compressionOptions = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp',
        };

        // Compress image
        const compressedBlob = await imageCompression(
          imageFile,
          compressionOptions
        );

        // Convert to WebP file
        const compressedFile = new File(
          [compressedBlob],
          imageFile.name.replace(/\.[^/.]+$/, '') + '.webp',
          {
            type: compressedBlob.type,
          }
        );

        // Get R2 presigned URL
        const urlRes = await getPresignedUploadUrl(
          compressedFile.name,
          compressedFile.type
        );

        if (
          !urlRes.success ||
          !urlRes.signedUrl ||
          !urlRes.publicUrl
        ) {
          throw new Error(
            urlRes.error ||
              'Failed to authorize image upload.'
          );
        }

        // Upload to Cloudflare R2
        const uploadRes = await fetch(
          urlRes.signedUrl,
          {
            method: 'PUT',
            headers: {
              'Content-Type': compressedFile.type,
            },
            body: compressedFile,
          }
        );

        if (!uploadRes.ok) {
          throw new Error(
            'Failed to upload image to Cloudflare R2.'
          );
        }

        imageUrl = urlRes.publicUrl;
      }

      // =========================
      // CREATE FIRESTORE POST
      // =========================

      await addDoc(collection(db, 'posts'), {
        authorAlias:
          authorAlias.trim() || 'Lead Developer',

        content: content.trim(),

        category,

        spotifyTrackId:
          trackIdClean || null,

        imageUrl,

        upvotes: 0,

        replies: 0,

        isDeveloperPost: true,

        status: 'approved',

        createdAt: serverTimestamp(),
      });

      // =========================
      // RESET FORM
      // =========================

      setContent('');
      setSpotifyTrackId('');
      setImageFile(null);
      setImagePreview('');

      alert(
        'Developer post successfully published!'
      );

      fetchInitialPosts();
    } catch (error) {
      console.error(
        'Error creating post:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to publish post.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async ( postId: string, currentlyPinned: boolean ) => { try { const postRef = doc(db, 'posts', postId); await updateDoc(postRef, { isPinned: !currentlyPinned, }); setPosts((prev) => prev.map((post) => post.id === postId ? { ...post, isPinned: !currentlyPinned, } : post ) ); } catch (error) { console.error( 'Error updating pin status:', error ); alert( currentlyPinned ? 'Failed to unpin post.' : 'Failed to pin post.' ); } };

  // =========================
  // DELETE POST
  // =========================

  const handleDeletePost = async (
    postId: string
  ) => {
    if (
      !confirm(
        'Are you sure you want to delete this post?'
      )
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, 'posts', postId)
      );

      setPosts((prev) =>
        prev.filter(
          (p) => p.id !== postId
        )
      );
    } catch (error) {
      console.error(
        'Error deleting post:',
        error
      );

      alert('Failed to delete.');
    }
  };

  // =========================
  // QUICK REPLY
  // =========================

  const handleQuickReplySubmit = async (
    postId: string,
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const replyText = replyInputs[postId];

    if (
      !replyText ||
      !replyText.trim() ||
      submittingReplyId === postId
    ) {
      return;
    }

    setSubmittingReplyId(postId);

    try {
      const alias =
        replyAliases[postId]?.trim() ||
        'Lead Developer [ADMIN]';

      await addDoc(
        collection(
          db,
          'posts',
          postId,
          'replies'
        ),
        {
          content: replyText.trim(),
          authorAlias: alias,
          createdAt: serverTimestamp(),
        }
      );

      const postRef = doc(
        db,
        'posts',
        postId
      );

      await updateDoc(postRef, {
        replies: increment(1),
      });

      setReplyInputs((prev) => ({
        ...prev,
        [postId]: '',
      }));

      // Update local reply count
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                replies:
                  (post.replies || 0) + 1,
              }
            : post
        )
      );
    } catch (error) {
      console.error(
        'Error adding admin reply:',
        error
      );

      alert('Failed to submit reply.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // =========================
  // LOGIN UI
  // =========================

  if (isAuthenticated === false) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Icons.Code />
              </div>

              <div>
                <h1 className="text-lg font-semibold">
                  Admin Portal
                </h1>

                <p className="text-xs text-neutral-500 font-mono">
                  Tambayan SLU
                </p>
              </div>
            </div>

            <form
              onSubmit={handleLoginSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  required
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-neutral-600"
                  placeholder="Enter admin password"
                />
              </div>

              {authError && (
                <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-white text-black rounded-lg py-3 text-sm font-semibold hover:bg-neutral-200 transition"
              >
                Login
              </button>
            </form>

            <Link
              href="/"
              className="block text-center text-xs text-neutral-500 hover:text-white mt-5"
            >
              ← Back to website
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================
  // LOADING
  // =========================

  if (
    isAuthenticated === null ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-sm text-neutral-500 font-mono">
          Loading admin portal...
        </div>
      </main>
    );
  }

  // =========================
  // DASHBOARD
  // =========================

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* HEADER */}
      <header className="border-b border-neutral-800 sticky top-0 z-30 bg-neutral-950/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center">
              <Icons.Code />
            </div>

            <div>
              <h1 className="font-semibold text-sm">
                Admin Portal
              </h1>

              <p className="text-[10px] text-neutral-500 font-mono">
                TAMBAYAN SLU
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              View Site
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs px-3 py-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* CREATE POST */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Create Developer Post
            </h2>

            <p className="text-xs text-neutral-500 mt-1">
              Posts created here are automatically approved.
            </p>
          </div>

          <form
            onSubmit={handleCreatePost}
            className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-5"
          >
            {/* AUTHOR */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Author Alias
              </label>

              <input
                type="text"
                value={authorAlias}
                onChange={(e) =>
                  setAuthorAlias(e.target.value)
                }
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white outline-none focus:border-neutral-600"
                placeholder="Lead Developer"
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Category
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white outline-none focus:border-neutral-600"
              >
                {CATEGORIES.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CONTENT */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Content
              </label>

              <textarea
                value={content}
                onChange={(e) =>
                  setContent(e.target.value)
                }
                required
                rows={6}
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white outline-none focus:border-neutral-600 resize-y"
                placeholder="Write your developer post..."
              />
            </div>

            {/* IMAGE */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Image
                <span className="text-neutral-600 ml-1">
                  (Optional)
                </span>
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded file:bg-neutral-800 file:text-neutral-200 file:font-mono file:text-xs file:cursor-pointer"
              />

              {imagePreview && (
                <div className="mt-3 relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                  <img
                    src={imagePreview}
                    alt="Image preview"
                    className="w-full max-h-[400px] object-contain"
                  />

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-black/80 border border-neutral-700 text-xs text-white hover:bg-black transition"
                  >
                    Remove
                  </button>
                </div>
              )}

              <p className="text-[10px] text-neutral-600 mt-2 font-mono">
                Images are automatically compressed and converted to WebP before uploading.
              </p>
            </div>

            {/* SPOTIFY */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Spotify Track
                <span className="text-neutral-600 ml-1">
                  (Optional)
                </span>
              </label>

              <input
                type="text"
                value={spotifyTrackId}
                onChange={(e) =>
                  setSpotifyTrackId(e.target.value)
                }
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white outline-none focus:border-neutral-600"
                placeholder="Spotify track ID or URL"
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !content.trim()
              }
              className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-lg py-3 text-sm font-semibold hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Icons.Send />

              {isSubmitting
                ? imageFile
                  ? 'Uploading & Publishing...'
                  : 'Publishing...'
                : 'Publish Developer Post'}
            </button>
          </form>
        </section>

        {/* POSTS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                Posts
              </h2>

              <p className="text-xs text-neutral-500 mt-1">
                Manage recent posts and replies.
              </p>
            </div>

            <span className="text-xs font-mono text-neutral-600">
              {posts.length} loaded
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="border border-neutral-800 rounded-xl p-10 text-center text-sm text-neutral-500">
              No posts found.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="border border-neutral-800 bg-neutral-900 rounded-xl p-5"
                >
                  {/* POST HEADER */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {post.authorAlias}
                        </span>

                        {post.authorAlias
                          .includes('Lead Developer') && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white text-black">
                            Developer
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-600 font-mono">
                        <span>
                          {post.createdAt}
                        </span>

                        <span>•</span>

                        <span>
                          {post.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
  <button
    onClick={() =>
      handleTogglePin(
        post.id,
        post.isPinned || false
      )
    }
    className={`p-2 transition ${
      post.isPinned
        ? 'text-amber-400 hover:text-amber-300'
        : 'text-neutral-600 hover:text-amber-400'
    }`}
    title={
      post.isPinned
        ? 'Unpin post'
        : 'Pin post'
    }
  >
    {post.isPinned ? (
      <Icons.PinOff />
    ) : (
      <Icons.Pin />
    )}
  </button>

  <button
    onClick={() =>
      handleDeletePost(post.id)
    }
    className="p-2 text-neutral-600 hover:text-red-400 transition"
    title="Delete post"
  >
    <Icons.Trash />
  </button>
</div>
                  </div>

                  {/* CONTENT */}
                  <div className="mt-4">
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  </div>

                  {/* IMAGE */}
                  {post.imageUrl && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                      <img
                        src={post.imageUrl}
                        alt="Post attachment"
                        loading="lazy"
                        className="w-full max-h-[500px] object-contain"
                      />
                    </div>
                  )}

                  {/* SPOTIFY */}
                  {post.spotifyTrackId && (
                    <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase mb-1">
                        Spotify Track
                      </div>

                      <div className="text-xs text-neutral-300 font-mono break-all">
                        {post.spotifyTrackId}
                      </div>
                    </div>
                  )}

                  {/* STATS */}
                  <div className="flex items-center gap-4 mt-4 text-[10px] font-mono text-neutral-600">
                    <span>
                      {post.upvotes || 0} upvotes
                    </span>

                    <span>
                      {post.replies || 0} replies
                    </span>

                    <span>
                      ID: {post.id}
                    </span>
                  </div>

                  {/* QUICK REPLY */}
                  <div className="mt-5 pt-5 border-t border-neutral-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Icons.MessageSquare />

                      <span className="text-xs font-semibold text-neutral-300">
                        Quick Reply
                      </span>
                    </div>

                    <form
                      onSubmit={(e) =>
                        handleQuickReplySubmit(
                          post.id,
                          e
                        )
                      }
                      className="space-y-3"
                    >
                      <input
                        type="text"
                        value={
                          replyAliases[
                            post.id
                          ] || ''
                        }
                        onChange={(e) =>
                          setReplyAliases(
                            (prev) => ({
                              ...prev,
                              [post.id]:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white outline-none focus:border-neutral-600"
                        placeholder="Reply alias (default: Lead Developer [ADMIN])"
                      />

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={
                            replyInputs[
                              post.id
                            ] || ''
                          }
                          onChange={(e) =>
                            setReplyInputs(
                              (prev) => ({
                                ...prev,
                                [post.id]:
                                  e.target.value,
                              })
                            )
                          }
                          className="flex-1 p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white outline-none focus:border-neutral-600"
                          placeholder="Write a reply..."
                        />

                        <button
                          type="submit"
                          disabled={
                            submittingReplyId ===
                              post.id ||
                            !(
                              replyInputs[
                                post.id
                              ] || ''
                            ).trim()
                          }
                          className="px-4 py-2.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          {submittingReplyId ===
                          post.id
                            ? '...'
                            : 'Reply'}
                        </button>
                      </div>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* LOAD MORE */}
          {hasMore && posts.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-5 py-2.5 rounded-lg border border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-40 transition"
              >
                {isLoadingMore
                  ? 'Loading...'
                  : 'Load More'}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-[10px] text-neutral-700 font-mono mt-8">
              No more posts.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}