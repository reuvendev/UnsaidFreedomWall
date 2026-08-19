'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, query, orderBy, getDocs, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PostData {
  id: string;
  authorAlias: string;
  content: string;
  category: string;
  createdAt: string;
  upvotes: number;
  repliesCount: number;
}

interface ReplyData {
  id: string;
  authorAlias: string;
  content: string;
  createdAt: string;
}

const Icons = {
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill={filled ? "currentColor" : "none"} 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Message: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<PostData | null>(null);
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingLocked, setVotingLocked] = useState(false);

  useEffect(() => {
    try {
      const storedVotes = localStorage.getItem('unsaid_voted_posts');
      if (storedVotes && postId) {
        const parsed = JSON.parse(storedVotes);
        if (parsed[postId]) {
          setHasVoted(true);
        }
      }
    } catch (e) {
      // Ignore storage errors
    }

    async function fetchPostAndReplies() {
      if (!postId) return;
      try {
        // Fetch specific post document
        const postDocRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postDocRef);

        if (postSnap.exists()) {
          const data = postSnap.data();
          
          let formattedPostDate = "Recently";
          if (data.createdAt) {
            const dateObj = data.createdAt.toDate();
            formattedPostDate = dateObj.toLocaleDateString([], { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }) + ' at ' + dateObj.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }

          setPost({
            id: postSnap.id,
            authorAlias: data.authorAlias || "UNSAID #00000",
            content: data.content || "",
            category: data.category || "thoughts",
            createdAt: formattedPostDate,
            upvotes: data.upvotes || 0,
            repliesCount: data.replies || 0,
          });

          // Fetch nested replies subcollection
          const repliesQuery = query(collection(db, "posts", postId, "replies"), orderBy("createdAt", "asc"));
          const replySnap = await getDocs(repliesQuery);
          const fetchedReplies: ReplyData[] = [];

          replySnap.forEach((rSnap) => {
            const rData = rSnap.data();
            
            let formattedReplyDate = "Just now";
            if (rData.createdAt) {
              const rDateObj = rData.createdAt.toDate();
              formattedReplyDate = rDateObj.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              }) + ' at ' + rDateObj.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
            }

            fetchedReplies.push({
              id: rSnap.id,
              authorAlias: rData.authorAlias || "UNSAID #99999",
              content: rData.content || "",
              createdAt: formattedReplyDate,
            });
          });

          setReplies(fetchedReplies);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching post detail:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPostAndReplies();
  }, [postId, router]);

  const handleVoteToggle = async () => {
    if (!post || votingLocked) return;
    setVotingLocked(true);

    const voteChange = hasVoted ? -1 : 1;

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { upvotes: increment(voteChange) });
      
      const newHasVoted = !hasVoted;
      setHasVoted(newHasVoted);

      try {
        const storedVotes = JSON.parse(localStorage.getItem('unsaid_voted_posts') || '{}');
        if (newHasVoted) {
          storedVotes[postId] = true;
        } else {
          delete storedVotes[postId];
        }
        localStorage.setItem('unsaid_voted_posts', JSON.stringify(storedVotes));
      } catch (e) {
        // Ignore storage errors
      }

      setPost({ 
        ...post, 
        upvotes: Math.max(0, post.upvotes + voteChange) 
      });
    } catch (error) {
      console.error("Error updating vote:", error);
    } finally {
      setVotingLocked(false);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const randomId = Math.floor(10000 + Math.random() * 90000);
      const replyData = {
        content: replyContent.trim(),
        authorAlias: `UNSAID #${randomId}`,
        createdAt: serverTimestamp(),
      };

      // Add to subcollection under this post
      const docRef = await addDoc(collection(db, "posts", postId, "replies"), replyData);

      // Increment reply count on main post document
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { replies: increment(1) });

      // Current formatted date/time for instant local feedback
      const nowFormatted = new Date().toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ' at ' + new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Update local state
      setReplies((prev) => [
        ...prev,
        {
          id: docRef.id,
          authorAlias: replyData.authorAlias,
          content: replyData.content,
          createdAt: nowFormatted,
        },
      ]);

      if (post) {
        setPost({ ...post, repliesCount: post.repliesCount + 1 });
      }

      setReplyContent('');
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("Failed to submit reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs text-neutral-400 animate-pulse">
        Loading entry...
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            UNSAID.
          </Link>
          <Link 
            href="/" 
            className="font-mono text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-wider"
          >
            ← Back to Feed
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        {/* Main Post Card */}
        <article className="p-6 bg-white border border-neutral-200 rounded-lg shadow-2xs mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
              <span className="font-bold text-neutral-900">{post.authorAlias}</span>
              <span className="text-neutral-300">•</span>
              <span className="text-neutral-400">{post.createdAt}</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded">
              {post.category}
            </span>
          </div>
          
          <p className="text-xl md:text-2xl font-medium text-neutral-900 mb-6 leading-relaxed">
            {post.content}
          </p>

          <div className="flex items-center gap-6 font-mono text-xs font-semibold pt-4 border-t border-neutral-100">
            <button 
              onClick={handleVoteToggle}
              disabled={votingLocked}
              className={`flex items-center gap-2 transition-colors ${
                votingLocked ? "opacity-50 cursor-not-allowed" : ""
              } ${
                hasVoted 
                  ? "text-rose-500 hover:text-rose-600" 
                  : "text-neutral-500 hover:text-rose-500"
              }`}
            >
              <Icons.Heart filled={hasVoted} />
              <span>{post.upvotes} {post.upvotes === 1 ? 'Upvote' : 'Upvotes'}</span>
            </button>
            <div className="flex items-center gap-2 text-neutral-500">
              <Icons.Message />
              <span>{post.repliesCount} {post.repliesCount === 1 ? 'Reply' : 'Replies'}</span>
            </div>
          </div>
        </article>

        {/* Reply Submission Box */}
        <form onSubmit={handleAddReply} className="mb-12 space-y-4">
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-700">
            Leave an Anonymous Reply
          </label>
          <textarea
            rows={3}
            maxLength={300}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Add your thoughts to this entry..."
            className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all text-sm leading-relaxed resize-none"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !replyContent.trim()}
              className="px-5 py-2.5 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
            >
              {isSubmitting ? 'Replying...' : 'Post Reply'}
            </button>
          </div>
        </form>

        {/* Replies List */}
        <div className="space-y-6">
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400 pb-2 border-b border-neutral-200">
            Discussion ({replies.length})
          </h3>

          {replies.map((reply) => (
            <div key={reply.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                <span className="font-bold text-neutral-800">{reply.authorAlias}</span>
                <span className="text-neutral-400">{reply.createdAt}</span>
              </div>
              <p className="text-sm md:text-base text-neutral-700 leading-relaxed">
                {reply.content}
              </p>
            </div>
          ))}

          {replies.length === 0 && (
            <p className="font-mono text-xs text-neutral-400 text-center py-6">
              No replies yet. Be the first to join the conversation.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}