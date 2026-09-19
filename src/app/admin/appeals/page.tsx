'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

import {
  loginAdmin,
  logoutAdmin,
  checkAdminAuth,
} from '../actions';

interface Appeal {
  id: string;
  userId: string;
  message: string;

  status:
    | 'pending'
    | 'approved'
    | 'denied';

  createdAt: string;
  moderatorNote?: string;

  isBanned: boolean;
  bannedNickname?: string;
  banReason?: string;
  bannedAt?: string;
}

const Icons = {
  Shield: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),

  Check: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),

  Close: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),

  Copy: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        width="14"
        height="14"
        x="8"
        y="8"
        rx="2"
        ry="2"
      />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
};

export default function AdminAppealsPage() {
  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState<boolean | null>(null);

  const [
    authError,
    setAuthError,
  ] = useState('');

  const [
    appeals,
    setAppeals,
  ] = useState<Appeal[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(null);

  const [
    copiedId,
    setCopiedId,
  ] = useState<string | null>(null);

  const [
    moderatorNotes,
    setModeratorNotes,
  ] = useState<Record<string, string>>({});

  /* =========================================================
     AUTHENTICATION
  ========================================================= */

  useEffect(() => {
    async function verify() {
      try {
        const authed =
          await checkAdminAuth();

        setIsAuthenticated(authed);

        if (!authed) {
          setLoading(false);
        }
      } catch (error) {
        console.error(
          'Failed to verify admin:',
          error
        );

        setIsAuthenticated(false);
        setLoading(false);
      }
    }

    verify();
  }, []);

  /* =========================================================
     APPEALS LISTENER
  ========================================================= */

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);

    const appealsQuery = query(
      collection(db, 'appeals'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      appealsQuery,

      async (snapshot) => {
        try {
          const loadedAppeals =
            await Promise.all(
              snapshot.docs.map(
                async (docSnap) => {
                  const data =
                    docSnap.data();

                  /* -------------------------
                     Appeal date
                  ------------------------- */

                  let formattedDate =
                    'Just now';

                  if (
                    data.createdAt?.toDate
                  ) {
                    const date =
                      data.createdAt.toDate();

                    formattedDate =
                      date.toLocaleDateString(
                        [],
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      ) +
                      ' at ' +
                      date.toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      );
                  }

                  const userId =
                    data.userId ||
                    'Unknown';

                  /* -------------------------
                     Check bannedUsers
                  ------------------------- */

                  let isBanned = false;

                  let bannedNickname =
                    '';

                  let banReason = '';

                  let bannedAt = '';

                  if (
                    userId !== 'Unknown'
                  ) {
                    try {
                      const banRef = doc(
                        db,
                        'bannedUsers',
                        userId
                      );

                      const banSnap =
                        await getDoc(
                          banRef
                        );

                      if (
                        banSnap.exists()
                      ) {
                        const banData =
                          banSnap.data();

                        isBanned = true;

                        bannedNickname =
                          banData.nickname ||
                          '';

                        banReason =
                          banData.reason ||
                          '';

                        if (
                          banData.bannedAt
                        ) {
                          let banDate:
                            | Date
                            | null = null;

                          if (
                            typeof banData
                              .bannedAt
                              ?.toDate ===
                            'function'
                          ) {
                            banDate =
                              banData.bannedAt.toDate();
                          } else if (
                            banData.bannedAt
                          ) {
                            const parsed =
                              new Date(
                                banData.bannedAt
                              );

                            if (
                              !Number.isNaN(
                                parsed.getTime()
                              )
                            ) {
                              banDate =
                                parsed;
                            }
                          }

                          if (banDate) {
                            bannedAt =
                              banDate.toLocaleDateString(
                                [],
                                {
                                  month:
                                    'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              ) +
                              ' at ' +
                              banDate.toLocaleTimeString(
                                [],
                                {
                                  hour:
                                    '2-digit',
                                  minute:
                                    '2-digit',
                                }
                              );
                          }
                        }
                      }
                    } catch (error) {
                      console.error(
                        `Failed to check ban for ${userId}:`,
                        error
                      );
                    }
                  }

                  return {
                    id: docSnap.id,

                    userId,

                    message:
                      data.message ||
                      '',

                    status:
                      data.status ||
                      'pending',

                    createdAt:
                      formattedDate,

                    moderatorNote:
                      data.moderatorNote ||
                      '',

                    isBanned,

                    bannedNickname,

                    banReason,

                    bannedAt,
                  } as Appeal;
                }
              )
            );

          setAppeals(
            loadedAppeals
          );

          setLoading(false);
        } catch (error) {
          console.error(
            'Error loading appeals:',
            error
          );

          setLoading(false);
        }
      },

      (error) => {
        console.error(
          'Error listening to appeals:',
          error
        );

        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  /* =========================================================
     LOGIN
  ========================================================= */

  const handleLoginSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setAuthError('');

    const formData =
      new FormData(
        e.currentTarget
      );

    const result =
      await loginAdmin(
        formData
      );

    if (result.success) {
      setIsAuthenticated(true);
      setLoading(true);
    } else {
      setAuthError(
        result.error ||
          'Authentication failed'
      );
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    async () => {
      await logoutAdmin();

      setIsAuthenticated(
        false
      );
    };

  /* =========================================================
     COPY USER ID
  ========================================================= */

  const handleCopyUserId =
    async (
      appeal: Appeal
    ) => {
      try {
        await navigator.clipboard.writeText(
          appeal.userId
        );

        setCopiedId(
          appeal.id
        );

        setTimeout(() => {
          setCopiedId(null);
        }, 2000);
      } catch (error) {
        console.error(
          'Failed to copy user ID:',
          error
        );
      }
    };

  /* =========================================================
     APPROVE + UNBAN
  ========================================================= */

  const handleApprove =
    async (
      appeal: Appeal
    ) => {
      if (
        !appeal.userId ||
        appeal.userId === 'Unknown'
      ) {
        alert(
          'This appeal does not contain a valid user ID.'
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Approve this appeal and remove the global ban?\n\n` +
            `Nickname: ${
              appeal.bannedNickname ||
              'Unknown'
            }\n` +
            `User ID: ${appeal.userId}\n\n` +
            `The user will be allowed to use Anonymous Chat again.`
        );

      if (!confirmed) {
        return;
      }

      setProcessingId(
        appeal.id
      );

      try {
        const appealRef = doc(
          db,
          'appeals',
          appeal.id
        );

        const banRef = doc(
          db,
          'bannedUsers',
          appeal.userId
        );

        /*
         * Batch ensures that:
         *
         * 1. The ban is removed.
         * 2. The appeal becomes approved.
         *
         * Both succeed together.
         */

        const batch =
          writeBatch(db);

        batch.delete(banRef);

        batch.update(
          appealRef,
          {
            status:
              'approved',

            moderatorNote:
              moderatorNotes[
                appeal.id
              ]?.trim() || '',

            reviewedAt:
              serverTimestamp(),
          }
        );

        await batch.commit();

        alert(
          'Appeal approved. The user has been globally unbanned.'
        );
      } catch (error) {
        console.error(
          'Error approving appeal:',
          error
        );

        alert(
          'Failed to approve the appeal and remove the ban.'
        );
      } finally {
        setProcessingId(
          null
        );
      }
    };

  /* =========================================================
     DENY APPEAL
  ========================================================= */

  const handleDeny =
    async (
      appeal: Appeal
    ) => {
      const confirmed =
        window.confirm(
          `Deny this appeal?\n\n` +
            `User ID: ${appeal.userId}\n\n` +
            `The user's global ban will remain active.`
        );

      if (!confirmed) {
        return;
      }

      setProcessingId(
        appeal.id
      );

      try {
        const appealRef = doc(
          db,
          'appeals',
          appeal.id
        );

        const batch =
          writeBatch(db);

        /*
         * Do NOT touch bannedUsers.
         * Only mark the appeal denied.
         */

        batch.update(
          appealRef,
          {
            status:
              'denied',

            moderatorNote:
              moderatorNotes[
                appeal.id
              ]?.trim() || '',

            reviewedAt:
              serverTimestamp(),
          }
        );

        await batch.commit();

        alert(
          'Appeal denied. The global ban remains active.'
        );
      } catch (error) {
        console.error(
          'Error denying appeal:',
          error
        );

        alert(
          'Failed to deny the appeal.'
        );
      } finally {
        setProcessingId(
          null
        );
      }
    };

  /* =========================================================
     AUTH CHECK
  ========================================================= */

  if (
    isAuthenticated === null
  ) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center font-mono text-sm">
        Verifying security
        clearance...
      </div>
    );
  }

  /* =========================================================
     LOGIN SCREEN
  ========================================================= */

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex items-center justify-center p-6">

        <div className="w-full max-w-md p-8 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl space-y-6">

          <div className="text-center space-y-2">

            <span className="font-mono text-xs text-rose-500 uppercase tracking-widest font-bold">
              Encrypted Gateway
            </span>

            <h1 className="text-2xl font-black tracking-tight text-white">
              Appeal Moderation
            </h1>

            <p className="text-xs font-mono text-neutral-400">
              Environment-secured
              authentication required.
            </p>

          </div>

          <form
            onSubmit={
              handleLoginSubmit
            }
            className="space-y-4"
          >

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
                <p className="font-mono text-xs text-rose-500 mt-2">
                  {authError}
                </p>
              )}

            </div>

            <button
              type="submit"
              className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Authenticate Session
            </button>

          </form>

          <div className="text-center pt-2">

            <Link
              href="/"
              className="font-mono text-xs text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-wider"
            >
              ← Return to Main App
            </Link>

          </div>

        </div>
      </div>
    );
  }

  /* =========================================================
     COUNTS
  ========================================================= */

  const pendingCount =
    appeals.filter(
      (appeal) =>
        appeal.status ===
        'pending'
    ).length;

  const approvedCount =
    appeals.filter(
      (appeal) =>
        appeal.status ===
        'approved'
    ).length;

  const deniedCount =
    appeals.filter(
      (appeal) =>
        appeal.status ===
        'denied'
    ).length;

  /* =========================================================
     DASHBOARD
  ========================================================= */

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">

      {/* NAVBAR */}

      <header className="sticky top-0 z-50 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-800">

        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-amber-400">

            <Icons.Shield />

            <span>
              Appeal Queue
              {' '}
              ({pendingCount})
            </span>

          </div>

          <div className="flex items-center gap-4 font-mono text-xs">

            <Link
              href="/admin/moderation"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Posts
            </Link>

            <Link
              href="/admin/reports"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Reports
            </Link>

            <Link
              href="/admin/portal"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Developer Portal
            </Link>

            <button
              onClick={
                handleLogout
              }
              className="text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Destroy Session
            </button>

          </div>

        </div>

      </header>

      <main className="max-w-4xl mx-auto px-6 pt-10 pb-24">

        {/* TITLE */}

        <div className="mb-8">

          <h1 className="text-2xl font-black tracking-tight text-white mb-2">
            Ban Appeals
          </h1>

          <p className="text-xs font-mono text-neutral-400">
            Review appeals submitted by
            globally restricted Anonymous
            Chat users.
          </p>

        </div>

        {/* STATS */}

        <div className="grid grid-cols-3 gap-3 mb-8">

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">

            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Pending
            </p>

            <p className="text-2xl font-black text-amber-400 mt-1">
              {pendingCount}
            </p>

          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">

            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Approved
            </p>

            <p className="text-2xl font-black text-emerald-400 mt-1">
              {approvedCount}
            </p>

          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">

            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Denied
            </p>

            <p className="text-2xl font-black text-rose-400 mt-1">
              {deniedCount}
            </p>

          </div>

        </div>

        {/* CONTENT */}

        {loading ? (

          <div className="py-12 text-center font-mono text-xs text-neutral-500 animate-pulse">
            Loading appeals...
          </div>

        ) : appeals.length === 0 ? (

          <div className="py-16 text-center font-mono text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            No appeals have been
            submitted.
          </div>

        ) : (

          <div className="space-y-5">

            {appeals.map(
              (appeal) => {
                const isProcessing =
                  processingId ===
                  appeal.id;

                return (
                  <article
                    key={
                      appeal.id
                    }
                    className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg"
                  >

                    {/* CARD HEADER */}

                    <div className="px-5 py-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">

                      <div>

                        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                          Anonymous User
                        </p>

                        <div className="flex items-center gap-2">

                          <code className="text-xs text-neutral-200 break-all">
                            {
                              appeal.userId
                            }
                          </code>

                          <button
                            onClick={() =>
                              handleCopyUserId(
                                appeal
                              )
                            }
                            className="text-neutral-500 hover:text-white cursor-pointer"
                            title="Copy User ID"
                          >
                            <Icons.Copy />
                          </button>

                          {copiedId ===
                            appeal.id && (
                            <span className="font-mono text-[9px] text-emerald-400">
                              Copied
                            </span>
                          )}

                        </div>

                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-md border font-mono text-[10px] font-bold uppercase tracking-wider ${
                          appeal.status ===
                          'pending'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : appeal.status ===
                                'approved'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}
                      >
                        {
                          appeal.status
                        }
                      </span>

                    </div>

                    {/* BODY */}

                    <div className="p-5">

                      {/* BAN INFORMATION */}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">

                        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">

                          <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                            Ban Status
                          </p>

                          <p
                            className={`font-mono text-xs font-bold ${
                              appeal.isBanned
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {appeal.isBanned
                              ? 'Globally Banned'
                              : 'Not Currently Banned'}
                          </p>

                        </div>

                        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">

                          <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                            Chat Nickname
                          </p>

                          <p className="text-xs text-neutral-300 break-all">
                            {
                              appeal.bannedNickname ||
                              'Unknown'
                            }
                          </p>

                        </div>

                      </div>

                      {/* BANNED DATE */}

                      {appeal.bannedAt && (

                        <div className="mb-5">

                          <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                            Banned
                          </p>

                          <p className="font-mono text-xs text-neutral-400">
                            {
                              appeal.bannedAt
                            }
                          </p>

                        </div>

                      )}

                      {/* ORIGINAL BAN REASON */}

                      {appeal.banReason && (

                        <div className="mb-6 bg-rose-500/5 border border-rose-500/20 rounded-lg p-4">

                          <p className="font-mono text-[9px] uppercase tracking-widest text-rose-400 mb-2">
                            Original Ban Reason
                          </p>

                          <p className="text-xs leading-relaxed text-neutral-300">
                            {
                              appeal.banReason
                            }
                          </p>

                        </div>

                      )}

                      {/* APPEAL MESSAGE */}

                      <div>

                        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
                          Appeal Message
                        </p>

                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-200">
                          {
                            appeal.message
                          }
                        </p>

                        <p className="mt-4 font-mono text-[10px] text-neutral-600">
                          Submitted{' '}
                          {
                            appeal.createdAt
                          }
                        </p>

                      </div>

                      {/* MODERATOR NOTE */}

                      {appeal.status ===
                        'pending' && (

                        <div className="mt-6">

                          <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">

                            Moderator Note

                            <span className="normal-case tracking-normal font-normal">
                              {' '}
                              (optional)
                            </span>

                          </label>

                          <textarea
                            value={
                              moderatorNotes[
                                appeal.id
                              ] || ''
                            }
                            onChange={(
                              e
                            ) =>
                              setModeratorNotes(
                                (
                                  prev
                                ) => ({
                                  ...prev,

                                  [appeal.id]:
                                    e.target
                                      .value,
                                })
                              )
                            }
                            placeholder="Internal note about this decision..."
                            rows={3}
                            maxLength={
                              500
                            }
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
                          />

                        </div>

                      )}

                      {/* EXISTING NOTE */}

                      {appeal.status !==
                        'pending' &&
                        appeal.moderatorNote && (

                          <div className="mt-5 bg-neutral-950 border border-neutral-800 rounded-lg p-4">

                            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-2">
                              Moderator Note
                            </p>

                            <p className="text-xs text-neutral-400 whitespace-pre-wrap">
                              {
                                appeal.moderatorNote
                              }
                            </p>

                          </div>

                        )}

                    </div>

                    {/* ACTIONS */}

                    {appeal.status ===
                      'pending' && (

                      <div className="px-5 py-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">

                        <div className="font-mono text-[10px]">

                          {appeal.isBanned ? (

                            <span className="text-rose-400">
                              User is currently
                              globally banned.
                            </span>

                          ) : (

                            <span className="text-amber-400">
                              No active global ban
                              was found for this ID.
                            </span>

                          )}

                        </div>

                        <div className="flex flex-wrap items-center gap-3">

                          <button
                            onClick={() =>
                              handleDeny(
                                appeal
                              )
                            }
                            disabled={
                              isProcessing
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-mono text-[11px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >

                            <Icons.Close />

                            Deny Appeal

                          </button>

                          <button
                            onClick={() =>
                              handleApprove(
                                appeal
                              )
                            }
                            disabled={
                              isProcessing ||
                              !appeal.isBanned
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-mono text-[11px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >

                            <Icons.Check />

                            {isProcessing
                              ? 'Processing...'
                              : 'Approve & Unban'}

                          </button>

                        </div>

                      </div>

                    )}

                  </article>
                );
              }
            )}

          </div>

        )}

      </main>

    </div>
  );
}