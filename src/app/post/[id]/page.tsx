'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkForDoxxing } from '@/lib/antiDoxx';
import { censorText } from '@/lib/moderation';
import imageCompression from 'browser-image-compression';
import { getPresignedUploadUrl } from '@/app/actions/r2-upload';
import { Image } from 'lucide-react';

interface PostData {
  id: string;
  authorAlias: string;
  content: string;
  category: string;
  createdAt: string;
  upvotes: number;
  repliesCount: number;
  spotifyTrackId?: string;
  imageUrl?: string;
  isDeveloperPost?: boolean;
}

interface ReplyData {
  id: string;
  authorAlias: string;
  content: string;
  createdAt: string;
  imageUrl?: string;
}

const Icons = {
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),

  Message: () => (
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),

  Flag: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
};

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech or symbols',
  'Explicit or sensitive content',
  'Spam or misleading',
  'Doxxing / personal info',
  'Other',
];

const USER_ID_KEY = 'unsaid_chat_user_id';

function getAnonymousUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId =
      'user_' +
      Math.random().toString(36).substring(2, 11);

    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

// Component to handle third-party ad banner injection safely
function BannerAd({ isDarkMode }: { isDarkMode: boolean }) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bannerRef.current) return;

    bannerRef.current.innerHTML = '';

    const confScript = document.createElement('script');

    confScript.text = `
      atOptions = {
        'key' : '2c7e18080e4e82b954dd29fff1dc3355',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');

    invokeScript.src =
      'https://plentyhelium.com/2c7e18080e4e82b954dd29fff1dc3355/invoke.js';

    invokeScript.async = true;

    bannerRef.current.appendChild(confScript);
    bannerRef.current.appendChild(invokeScript);
  }, []);

  return (
    <div className="my-6 w-full flex flex-col items-center">
      <div
        className={`font-mono text-[9px] uppercase tracking-widest mb-1.5 ${
          isDarkMode
            ? 'text-neutral-600'
            : 'text-neutral-400'
        }`}
      >
        Advertisement
      </div>

      <div className="overflow-hidden w-full flex justify-center">
        <div
          ref={bannerRef}
          className="min-w-[320px] min-h-[50px] flex items-center justify-center"
        />
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  // =========================================================
  // REPLY IMAGE STATE
  // =========================================================

  const replyFileInputRef =
    useRef<HTMLInputElement>(null);

  const [replyImageFile, setReplyImageFile] =
    useState<File | null>(null);

  const [replyImagePreview, setReplyImagePreview] =
    useState<string | null>(null);

  const [isCompressingReplyImage, setIsCompressingReplyImage] =
    useState(false);

  // =========================================================
  // PAGE STATE
  // =========================================================

  const [post, setPost] =
    useState<PostData | null>(null);

  const [replies, setReplies] =
    useState<ReplyData[]>([]);

  const [replyContent, setReplyContent] =
    useState('');

  const [replyError, setReplyError] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [hasVoted, setHasVoted] =
    useState(false);

  const [votingLocked, setVotingLocked] =
    useState(false);

  const [isDarkMode, setIsDarkMode] =
    useState<boolean>(false);

  // =========================================================
  // REPORT MODAL STATE
  // =========================================================

  const [reportModalOpen, setReportModalOpen] =
    useState(false);

  const [reportingTarget, setReportingTarget] =
    useState<{
      type: 'post' | 'reply';
      id: string;
      snippet: string;
    } | null>(null);

  const [selectedReason, setSelectedReason] =
    useState(REPORT_REASONS[0]);

  const [customReason, setCustomReason] =
    useState('');

  const [isSubmittingReport, setIsSubmittingReport] =
    useState(false);

  // =========================================================
  // DARK MODE
  // =========================================================

  useEffect(() => {
    const checkTheme = () => {
      try {
        const storedTheme =
          localStorage.getItem('unsaid_dark_mode');

        if (storedTheme !== null) {
          setIsDarkMode(JSON.parse(storedTheme));
        } else if (
          window.matchMedia &&
          window.matchMedia(
            '(prefers-color-scheme: dark)'
          ).matches
        ) {
          setIsDarkMode(true);
        }
      } catch (e) {
        // Ignore storage errors
      }
    };

    checkTheme();

    window.addEventListener(
      'storage',
      checkTheme
    );

    const interval = setInterval(
      checkTheme,
      300
    );

    return () => {
      window.removeEventListener(
        'storage',
        checkTheme
      );

      clearInterval(interval);
    };
  }, []);

  // =========================================================
  // REPLY IMAGE HANDLER
  // IMPORTANT: THIS MUST BE INSIDE THE COMPONENT
  // =========================================================

  const handleReplyImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Make sure only supported image types are accepted
    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(file.type)
    ) {
      setReplyError(
        'Please select a JPG, PNG, or WebP image.'
      );

      if (replyFileInputRef.current) {
        replyFileInputRef.current.value = '';
      }

      return;
    }

    setReplyError('');
    setIsCompressingReplyImage(true);

    try {
      // Same compression settings used for post images
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
      };

      const compressedBlob =
        await imageCompression(
          file,
          compressionOptions
        );

      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(
          /\.[^/.]+$/,
          ''
        ) + '.webp',
        {
          type: compressedBlob.type,
        }
      );

      console.log(
        `Reply image: ${(file.size / 1024).toFixed(
          1
        )} KB → ${(compressedFile.size / 1024).toFixed(
          1
        )} KB`
      );

      // Revoke previous preview URL
      if (replyImagePreview) {
        URL.revokeObjectURL(
          replyImagePreview
        );
      }

      const previewUrl =
        URL.createObjectURL(
          compressedFile
        );

      setReplyImageFile(
        compressedFile
      );

      setReplyImagePreview(
        previewUrl
      );
    } catch (error) {
      console.error(
        'Error compressing reply image:',
        error
      );

      setReplyError(
        'Failed to process the image. Please try another image.'
      );

      setReplyImageFile(null);
      setReplyImagePreview(null);

      if (replyFileInputRef.current) {
        replyFileInputRef.current.value = '';
      }
    } finally {
      setIsCompressingReplyImage(false);
    }
  };

  // =========================================================
  // REMOVE REPLY IMAGE
  // =========================================================

  const removeReplyImage = () => {
    if (replyImagePreview) {
      URL.revokeObjectURL(
        replyImagePreview
      );
    }

    setReplyImageFile(null);
    setReplyImagePreview(null);

    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = '';
    }
  };

  // =========================================================
  // CLEAN UP IMAGE PREVIEW WHEN COMPONENT UNMOUNTS
  // =========================================================

  useEffect(() => {
    return () => {
      if (replyImagePreview) {
        URL.revokeObjectURL(
          replyImagePreview
        );
      }
    };
  }, [replyImagePreview]);

  // =========================================================
  // LOAD POST + REPLIES
  // =========================================================

  useEffect(() => {
    try {
      const storedVotes =
        localStorage.getItem(
          'unsaid_voted_posts'
        );

      if (storedVotes && postId) {
        const parsed =
          JSON.parse(storedVotes);

        if (parsed[postId]) {
          setHasVoted(true);
        }
      }
    } catch (e) {
      // Ignore storage errors
    }

    if (!postId) return;

    // -------------------------------------------------------
    // MAIN POST LISTENER
    // -------------------------------------------------------

    const postRef = doc(
      db,
      'posts',
      postId
    );

    const unsubscribePost =
      onSnapshot(
        postRef,
        (postSnap) => {
          if (postSnap.exists()) {
            const data =
              postSnap.data();

            let formattedPostDate =
              'Recently';

            if (data.createdAt) {
              const dateObj =
                data.createdAt.toDate();

              formattedPostDate =
                dateObj.toLocaleDateString(
                  [],
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }
                ) +
                ' at ' +
                dateObj.toLocaleTimeString(
                  [],
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );
            }

            setPost({
              id: postSnap.id,
              authorAlias:
                data.authorAlias ||
                'Louisian #00000',
              content:
                data.content || '',
              category:
                data.category ||
                'thoughts',
              createdAt:
                formattedPostDate,
              upvotes:
                data.upvotes || 0,
              repliesCount:
                data.replies || 0,
              spotifyTrackId:
                data.spotifyTrackId ||
                undefined,
              imageUrl:
                data.imageUrl ||
                undefined,
              isDeveloperPost:
                data.isDeveloperPost ||
                false,
            });
          } else {
            router.push('/');
          }

          setLoading(false);
        },
        (error) => {
          console.error(
            'Error listening to post changes:',
            error
          );

          setLoading(false);
        }
      );

    // -------------------------------------------------------
    // REPLIES LISTENER
    // -------------------------------------------------------

    const repliesQuery = query(
      collection(
        db,
        'posts',
        postId,
        'replies'
      ),
      orderBy(
        'createdAt',
        'desc'
      )
    );

    const unsubscribeReplies =
      onSnapshot(
        repliesQuery,
        (replySnap) => {
          const fetchedReplies: ReplyData[] =
            [];

          replySnap.forEach(
            (rSnap) => {
              const rData =
                rSnap.data();

              let formattedReplyDate =
                'Just now';

              if (rData.createdAt) {
                const rDateObj =
                  rData.createdAt.toDate();

                formattedReplyDate =
                  rDateObj.toLocaleDateString(
                    [],
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  ) +
                  ' at ' +
                  rDateObj.toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  );
              }

              fetchedReplies.push({
                id: rSnap.id,
                authorAlias:
                  rData.authorAlias ||
                  'Louisian #99999',
                content:
                  rData.content || '',
                createdAt:
                  formattedReplyDate,
                imageUrl:
                  rData.imageUrl ||
                  undefined,
              });
            }
          );

          setReplies(
            fetchedReplies
          );
        },
        (error) => {
          console.error(
            'Error listening to replies:',
            error
          );
        }
      );

    return () => {
      unsubscribePost();
      unsubscribeReplies();
    };
  }, [postId, router]);

  // =========================================================
  // VOTE
  // =========================================================

  const handleVoteToggle =
    async () => {
      if (!post || votingLocked)
        return;

      setVotingLocked(true);

      const voteChange =
        hasVoted ? -1 : 1;

      try {
        const postRef = doc(
          db,
          'posts',
          postId
        );

        await updateDoc(
          postRef,
          {
            upvotes:
              increment(
                voteChange
              ),
          }
        );

        const newHasVoted =
          !hasVoted;

        setHasVoted(
          newHasVoted
        );

        try {
          const storedVotes =
            JSON.parse(
              localStorage.getItem(
                'unsaid_voted_posts'
              ) || '{}'
            );

          if (newHasVoted) {
            storedVotes[
              postId
            ] = true;
          } else {
            delete storedVotes[
              postId
            ];
          }

          localStorage.setItem(
            'unsaid_voted_posts',
            JSON.stringify(
              storedVotes
            )
          );
        } catch (e) {
          // Ignore storage errors
        }
      } catch (error) {
        console.error(
          'Error updating vote:',
          error
        );
      } finally {
        setVotingLocked(
          false
        );
      }
    };

  // =========================================================
  // ADD REPLY
  // =========================================================

  const handleAddReply =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (
        !replyContent.trim() ||
        isSubmitting ||
        isCompressingReplyImage
      ) {
        return;
      }

      setReplyError('');

      // -----------------------------------------------------
      // DOXXING CHECK
      // -----------------------------------------------------

      const doxxingResult =
        checkForDoxxing(
          replyContent
        );

      if (
        doxxingResult &&
        doxxingResult.hasPotentialDoxx
      ) {
        setReplyError(
          `Reply blocked due to sensitive personal information (${doxxingResult.matchedPatterns.join(
            ', '
          )}). Please keep it anonymous and safe.`
        );

        return;
      }

      setIsSubmitting(true);

      try {
        const randomId =
          Math.floor(
            10000 +
              Math.random() *
                90000
          );

        const sanitizedContent =
          censorText(
            replyContent.trim()
          );

        const userId =
          getAnonymousUserId();

        // ---------------------------------------------------
        // UPLOAD IMAGE TO R2
        // ---------------------------------------------------

        let imageUrl:
          | string
          | null = null;

        if (replyImageFile) {
          const urlRes =
            await getPresignedUploadUrl(
              replyImageFile.name,
              replyImageFile.type
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

          const uploadRes =
            await fetch(
              urlRes.signedUrl,
              {
                method: 'PUT',
                headers: {
                  'Content-Type':
                    replyImageFile.type,
                },
                body: replyImageFile,
              }
            );

          if (!uploadRes.ok) {
            throw new Error(
              'Failed to upload reply image to Cloudflare R2.'
            );
          }

          imageUrl =
            urlRes.publicUrl;
        }

        // ---------------------------------------------------
        // CREATE REPLY DATA
        // ---------------------------------------------------

        const replyData = {
          content:
            sanitizedContent,

          authorAlias:
            `Louisian #${randomId}`,

          userId,

          createdAt:
            serverTimestamp(),

          // Only add imageUrl when there is an image
          ...(imageUrl && {
            imageUrl,
          }),
        };

        // ---------------------------------------------------
        // SAVE REPLY
        // ---------------------------------------------------

        await addDoc(
          collection(
            db,
            'posts',
            postId,
            'replies'
          ),
          replyData
        );

        // ---------------------------------------------------
        // UPDATE REPLY COUNT
        // ---------------------------------------------------

        const postRef =
          doc(
            db,
            'posts',
            postId
          );

        await updateDoc(
          postRef,
          {
            replies:
              increment(1),
          }
        );

        // ---------------------------------------------------
        // RESET FORM
        // ---------------------------------------------------

        setReplyContent('');

        removeReplyImage();
      } catch (error) {
        console.error(
          'Error adding reply:',
          error
        );

        setReplyError(
          'Failed to submit reply. Please try again.'
        );
      } finally {
        setIsSubmitting(
          false
        );
      }
    };

  // =========================================================
  // REPORT MODAL
  // =========================================================

  const openReportModal = (
    type: 'post' | 'reply',
    id: string,
    snippet: string
  ) => {
    setReportingTarget({
      type,
      id,
      snippet,
    });

    setSelectedReason(
      REPORT_REASONS[0]
    );

    setCustomReason('');

    setReportModalOpen(true);
  };

  // =========================================================
  // SUBMIT REPORT
  // =========================================================

  const handleReportSubmit =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (
        !reportingTarget ||
        isSubmittingReport
      ) {
        return;
      }

      setIsSubmittingReport(
        true
      );

      const finalReason =
        selectedReason ===
          'Other' &&
        customReason.trim()
          ? customReason.trim()
          : selectedReason;

      try {
        await addDoc(
          collection(
            db,
            'reports'
          ),
          {
            postId,

            contentType:
              reportingTarget.type,

            replyId:
              reportingTarget.type ===
              'reply'
                ? reportingTarget.id
                : null,

            reason:
              finalReason,

            contentSnippet:
              reportingTarget.snippet,

            createdAt:
              serverTimestamp(),

            status:
              'pending',
          }
        );

        alert(
          'Report submitted successfully. Thank you for keeping the community safe.'
        );

        setReportModalOpen(
          false
        );
      } catch (error) {
        console.error(
          'Error submitting report:',
          error
        );

        alert(
          'Failed to submit report. Please try again.'
        );
      } finally {
        setIsSubmittingReport(
          false
        );
      }
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center font-mono text-xs ${
          isDarkMode
            ? 'bg-neutral-950 text-neutral-500'
            : 'bg-white text-neutral-400'
        }`}
      >
        Loading entry...
      </div>
    );
  }

  if (!post) return null;

  // =========================================================
  // ADMIN / DEV DETECTION
  // =========================================================

  const isPostAdminOrDev =
    post.isDeveloperPost ||
    post.authorAlias
      .toLowerCase()
      .includes('admin') ||
    post.authorAlias
      .toLowerCase()
      .includes('developer') ||
    post.authorAlias
      .toLowerCase()
      .includes('dev');

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className={`min-h-screen font-sans ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100 selection:bg-neutral-100 selection:text-neutral-950'
          : 'bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white'
      }`}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isDarkMode
            ? 'bg-neutral-950/85 border-neutral-800'
            : 'bg-white/85 border-neutral-200'
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className={`font-mono text-xl font-black tracking-tighter hover:opacity-75 ${
              isDarkMode
                ? 'text-white'
                : 'text-neutral-900'
            }`}
          >
            TAMBAYAN.
          </Link>

          <Link
            href="/"
            className={`font-mono text-xs font-semibold uppercase tracking-wider ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            ← Back to Feed
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8 pb-24">

        {/* ===================================================
            OPTIONAL AD
        =================================================== */}

        {/* 
        <BannerAd isDarkMode={isDarkMode} />
        */}

        {/* ===================================================
            MAIN POST
        =================================================== */}

        <article
          className={`p-6 border rounded-lg mb-10 relative mt-4 ${
            isDarkMode
              ? 'bg-neutral-900/50 border-neutral-800'
              : 'bg-white border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
              <span
                className={`font-bold ${
                  isPostAdminOrDev
                    ? 'text-emerald-500'
                    : isDarkMode
                    ? 'text-white'
                    : 'text-neutral-900'
                }`}
              >
                {post.authorAlias}
              </span>

              {isPostAdminOrDev && (
                <span
                  className={`border px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest ${
                    isDarkMode
                      ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  ADMIN / DEV
                </span>
              )}

              <span
                className={
                  isDarkMode
                    ? 'text-neutral-700'
                    : 'text-neutral-300'
                }
              >
                •
              </span>

              <span
                className={
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }
              >
                {post.createdAt}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded ${
                  isDarkMode
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {post.category}
              </span>

              <button
                onClick={() =>
                  openReportModal(
                    'post',
                    post.id,
                    post.content
                  )
                }
                className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                  isDarkMode
                    ? 'text-neutral-500 hover:text-rose-400'
                    : 'text-neutral-400 hover:text-rose-600'
                }`}
                title="Report post"
              >
                <Icons.Flag />
                <span>Report</span>
              </button>
            </div>
          </div>

          <p
            className={`text-xl md:text-2xl font-medium mb-6 leading-relaxed ${
              isDarkMode
                ? 'text-neutral-100'
                : 'text-neutral-900'
            }`}
          >
            {post.content}
          </p>

          {/* POST IMAGE */}

          {post.imageUrl && (
            <div className="mb-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
              <img
                src={post.imageUrl}
                alt="Attached image"
                loading="lazy"
                className="w-full max-h-[600px] object-contain"
              />
            </div>
          )}

          {/* SPOTIFY */}

          {post.spotifyTrackId && (
            <div className="mb-6">
              <iframe
                src={`https://open.spotify.com/embed/track/${post.spotifyTrackId}?utm_source=generator&theme=${
                  isDarkMode ? '1' : '0'
                }`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="encrypted-media"
                className={`rounded-lg border ${
                  isDarkMode
                    ? 'border-neutral-800'
                    : 'border-neutral-100'
                }`}
              />
            </div>
          )}

          {/* POST ACTIONS */}

          <div
            className={`flex items-center gap-6 font-mono text-xs font-semibold pt-4 border-t ${
              isDarkMode
                ? 'border-neutral-800'
                : 'border-neutral-100'
            }`}
          >
            <button
              onClick={handleVoteToggle}
              disabled={votingLocked}
              className={`flex items-center gap-2 ${
                votingLocked
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              } ${
                hasVoted
                  ? 'text-rose-500 hover:text-rose-600'
                  : isDarkMode
                  ? 'text-neutral-400 hover:text-rose-400'
                  : 'text-neutral-500 hover:text-rose-500'
              }`}
            >
              <Icons.Heart
                filled={hasVoted}
              />

              <span>
                {post.upvotes}{' '}
                {post.upvotes === 1
                  ? 'Upvote'
                  : 'Upvotes'}
              </span>
            </button>

            <div
              className={`flex items-center gap-2 ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              <Icons.Message />

              <span>
                {post.repliesCount}{' '}
                {post.repliesCount === 1
                  ? 'Reply'
                  : 'Replies'}
              </span>
            </div>
          </div>
        </article>

        {/* ===================================================
            REPLY FORM
        =================================================== */}

        <form
          onSubmit={handleAddReply}
          className="mb-12 space-y-4"
        >
          <label
            className={`block font-mono text-xs font-bold uppercase tracking-wider ${
              isDarkMode
                ? 'text-neutral-300'
                : 'text-neutral-700'
            }`}
          >
            Leave an Anonymous Reply
          </label>

          <textarea
            rows={3}
            maxLength={300}
            value={replyContent}
            onChange={(e) => {
              setReplyContent(
                e.target.value
              );

              if (replyError) {
                setReplyError('');
              }
            }}
            placeholder="Add your thoughts to this entry..."
            className={`w-full p-4 border rounded-lg text-sm leading-relaxed resize-none focus:outline-none ${
              replyError
                ? 'border-rose-500 focus:border-rose-500'
                : isDarkMode
                ? 'bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:bg-neutral-950 focus:border-neutral-700'
                : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900'
            }`}
            required
          />

          {/* HIDDEN IMAGE INPUT */}

          <input
            type="file"
            ref={replyFileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handleReplyImageChange
            }
            className="hidden"
          />

          {/* IMAGE PREVIEW */}

          {replyImagePreview && (
            <div
              className={`relative w-fit rounded-lg border overflow-hidden ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900'
                  : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <img
                src={replyImagePreview}
                alt="Reply preview"
                className="max-h-48 max-w-full rounded-lg object-contain"
              />

              <button
                type="button"
                onClick={
                  removeReplyImage
                }
                disabled={isSubmitting}
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white hover:bg-black disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          )}

          {/* ERROR */}

          {replyError && (
            <div
              className={`p-3 border rounded-md font-mono text-xs ${
                isDarkMode
                  ? 'bg-rose-950/50 border-rose-900 text-rose-400'
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}
            >
              {replyError}
            </div>
          )}

          {/* FORM ACTIONS */}

          <div className="flex justify-end items-center gap-2">
            {/* IMAGE BUTTON */}

            <button
              type="button"
              onClick={() =>
                replyFileInputRef.current?.click()
              }
              disabled={
                isSubmitting ||
                isCompressingReplyImage
              }
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Add image"
              title="Add image"
            >
              <Image
                size={20}
                strokeWidth={2}
              />
            </button>

            {/* SUBMIT BUTTON */}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !replyContent.trim() ||
                isCompressingReplyImage
              }
              className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded active:scale-95 shadow-sm disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              {isSubmitting
                ? 'Replying...'
                : isCompressingReplyImage
                ? 'Processing...'
                : 'Post Reply'}
            </button>
          </div>
        </form>

        {/* ===================================================
            REPLIES
        =================================================== */}

        <div className="space-y-6">
          <h3
            className={`font-mono text-xs font-bold uppercase tracking-widest pb-2 border-b ${
              isDarkMode
                ? 'text-neutral-500 border-neutral-800'
                : 'text-neutral-400 border-neutral-200'
            }`}
          >
            Discussion ({replies.length})
          </h3>

          {replies.map((reply) => {
            const isReplyAdminOrDev =
              reply.authorAlias
                .toLowerCase()
                .includes('admin') ||
              reply.authorAlias
                .toLowerCase()
                .includes(
                  'developer'
                ) ||
              reply.authorAlias
                .toLowerCase()
                .includes('dev');

            return (
              <div
                key={reply.id}
                className={`p-4 border rounded-lg space-y-2 relative ${
                  isDarkMode
                    ? 'bg-neutral-900/40 border-neutral-800'
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                {/* REPLY HEADER */}

                <div
                  className={`flex items-center justify-between font-mono text-[10px] uppercase tracking-wider ${
                    isDarkMode
                      ? 'text-neutral-500'
                      : 'text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold ${
                        isReplyAdminOrDev
                          ? 'text-emerald-500'
                          : isDarkMode
                          ? 'text-neutral-300'
                          : 'text-neutral-800'
                      }`}
                    >
                      {reply.authorAlias}
                    </span>

                    {isReplyAdminOrDev && (
                      <span
                        className={`border px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest ${
                          isDarkMode
                            ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        ADMIN / DEV
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={
                        isDarkMode
                          ? 'text-neutral-600'
                          : 'text-neutral-400'
                      }
                    >
                      {reply.createdAt}
                    </span>

                    <button
                      onClick={() =>
                        openReportModal(
                          'reply',
                          reply.id,
                          reply.content
                        )
                      }
                      className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                        isDarkMode
                          ? 'text-neutral-500 hover:text-rose-400'
                          : 'text-neutral-400 hover:text-rose-600'
                      }`}
                      title="Report reply"
                    >
                      <Icons.Flag />
                      <span>
                        Report
                      </span>
                    </button>
                  </div>
                </div>

                {/* REPLY TEXT */}

                {reply.content && (
                  <p
                    className={`text-sm md:text-base leading-relaxed ${
                      isDarkMode
                        ? 'text-neutral-300'
                        : 'text-neutral-700'
                    }`}
                  >
                    {reply.content}
                  </p>
                )}

                {/* REPLY IMAGE */}

                {reply.imageUrl && (
                  <div
                    className={`mt-3 overflow-hidden rounded-lg border ${
                      isDarkMode
                        ? 'border-neutral-800'
                        : 'border-neutral-200'
                    }`}
                  >
                    <img
                      src={reply.imageUrl}
                      alt="Attached image"
                      loading="lazy"
                      className="w-full max-h-[500px] object-contain"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {replies.length === 0 && (
            <p
              className={`font-mono text-xs text-center py-6 ${
                isDarkMode
                  ? 'text-neutral-600'
                  : 'text-neutral-400'
              }`}
            >
              No replies yet. Be the first to join the conversation.
            </p>
          )}
        </div>
      </main>

      {/* =====================================================
          REPORT MODAL
      ===================================================== */}

      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`border rounded-xl max-w-md w-full p-6 shadow-xl ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800 text-white'
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <h3
              className={`font-mono text-sm font-bold uppercase tracking-wider mb-2 ${
                isDarkMode
                  ? 'text-white'
                  : 'text-neutral-900'
              }`}
            >
              Report{' '}
              {reportingTarget?.type ===
              'post'
                ? 'Post'
                : 'Reply'}
            </h3>

            <p
              className={`text-xs mb-4 line-clamp-2 ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              &ldquo;
              {reportingTarget?.snippet}
              &rdquo;
            </p>

            <form
              onSubmit={
                handleReportSubmit
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                {REPORT_REASONS.map(
                  (reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 text-xs font-mono cursor-pointer ${
                        isDarkMode
                          ? 'text-neutral-300'
                          : 'text-neutral-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason}
                        checked={
                          selectedReason ===
                          reason
                        }
                        onChange={() =>
                          setSelectedReason(
                            reason
                          )
                        }
                        className={
                          isDarkMode
                            ? 'accent-white'
                            : 'accent-neutral-900'
                        }
                      />

                      <span>
                        {reason}
                      </span>
                    </label>
                  )
                )}
              </div>

              {selectedReason ===
                'Other' && (
                <input
                  type="text"
                  placeholder="Please specify..."
                  value={
                    customReason
                  }
                  onChange={(e) =>
                    setCustomReason(
                      e.target.value
                    )
                  }
                  className={`w-full p-2.5 border rounded text-xs font-mono focus:outline-none ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-500'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-neutral-900'
                  }`}
                  required
                />
              )}

              <div
                className={`flex items-center justify-end gap-3 pt-4 border-t ${
                  isDarkMode
                    ? 'border-neutral-800'
                    : 'border-neutral-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setReportModalOpen(
                      false
                    )
                  }
                  className={`px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmittingReport
                  }
                  className={`px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded disabled:opacity-50 ${
                    isDarkMode
                      ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {isSubmittingReport
                    ? 'Submitting...'
                    : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}