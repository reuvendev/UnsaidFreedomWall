'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  checkAdminAuth,
  loginAdmin,
  logoutAdmin,
} from '../actions';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  active: boolean;
  status?: 'active' | 'closed';
  createdAt?: any;
}

const makeOptionId = () =>
  `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export default function AdminPollsPage() {
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean | null>(null);

  const [authError, setAuthError] =
    useState('');

  const [polls, setPolls] =
    useState<Poll[]>([]);

  const [question, setQuestion] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [options, setOptions] =
    useState<string[]>(['', '']);

  const [saving, setSaving] =
    useState(false);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      const authed =
        await checkAdminAuth();

      setIsAuthenticated(authed);
    }

    verify();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const pollsQuery = query(
      collection(db, 'polls'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      pollsQuery,
      (snapshot) => {
        const nextPolls: Poll[] =
          snapshot.docs.map((pollDoc) => {
            const data = pollDoc.data();

            return {
              id: pollDoc.id,
              question:
                data.question || '',
              description:
                data.description || '',
              options:
                Array.isArray(data.options)
                  ? data.options
                  : [],
              active:
                data.active === true,
              status:
                data.status || 'closed',
              createdAt:
                data.createdAt,
            };
          });

        setPolls(nextPolls);
      },
      (error) => {
        console.error(
          'Failed to load polls:',
          error
        );
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setAuthError('');

    const formData =
      new FormData(e.currentTarget);

    const result =
      await loginAdmin(formData);

    if (result.success) {
      setIsAuthenticated(true);
    } else {
      setAuthError(
        result.error ||
          'Authentication failed'
      );
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  const updateOption = (
    index: number,
    value: string
  ) => {
    setOptions((current) =>
      current.map((option, i) =>
        i === index
          ? value
          : option
      )
    );
  };

  const addOption = () => {
    if (options.length >= 6) return;

    setOptions((current) => [
      ...current,
      '',
    ]);
  };

  const removeOption = (
    index: number
  ) => {
    if (options.length <= 2) return;

    setOptions((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  };

  const createPoll = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const cleanQuestion =
      question.trim();

    const cleanOptions =
      options
        .map((option) =>
          option.trim()
        )
        .filter(Boolean);

    if (!cleanQuestion) {
      alert('Enter a poll question.');
      return;
    }

    if (cleanOptions.length < 2) {
      alert(
        'Add at least two poll options.'
      );
      return;
    }

    if (
      new Set(
        cleanOptions.map((option) =>
          option.toLowerCase()
        )
      ).size !== cleanOptions.length
    ) {
      alert(
        'Poll options must be unique.'
      );
      return;
    }

    setSaving(true);

    try {
      await addDoc(
        collection(db, 'polls'),
        {
          question:
            cleanQuestion,
          description:
            description.trim(),
          options:
            cleanOptions.map(
              (text) => ({
                id: makeOptionId(),
                text,
                votes: 0,
              })
            ),
          active: false,
          status: 'closed',
          createdAt:
            serverTimestamp(),
        }
      );

      setQuestion('');
      setDescription('');
      setOptions(['', '']);
    } catch (error) {
      console.error(
        'Failed to create poll:',
        error
      );

      alert(
        'Failed to create poll.'
      );
    } finally {
      setSaving(false);
    }
  };

  const activatePoll = async (
    pollId: string
  ) => {
    setProcessingId(pollId);

    try {
      const snapshot =
        await getDocs(
          collection(db, 'polls')
        );

      const batch =
        writeBatch(db);

      snapshot.docs.forEach(
        (pollDoc) => {
          batch.update(
            pollDoc.ref,
            {
              active:
                pollDoc.id === pollId,
              status:
                pollDoc.id === pollId
                  ? 'active'
                  : 'closed',
            }
          );
        }
      );

      await batch.commit();
    } catch (error) {
      console.error(
        'Failed to activate poll:',
        error
      );

      alert(
        'Failed to activate poll.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const closePoll = async (
    pollId: string
  ) => {
    setProcessingId(pollId);

    try {
      await updateDoc(
        doc(db, 'polls', pollId),
        {
          active: false,
          status: 'closed',
        }
      );
    } catch (error) {
      console.error(
        'Failed to close poll:',
        error
      );

      alert(
        'Failed to close poll.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const removePoll = async (
    pollId: string
  ) => {
    if (
      !confirm(
        'Delete this poll permanently?'
      )
    ) {
      return;
    }

    setProcessingId(pollId);

    try {
      await deleteDoc(
        doc(db, 'polls', pollId)
      );
    } catch (error) {
      console.error(
        'Failed to delete poll:',
        error
      );

      alert(
        'Failed to delete poll.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center font-mono text-xs">
        Verifying security clearance...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-8">
          <p className="mb-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">
            Encrypted Gateway
          </p>

          <h1 className="text-center text-2xl font-black">
            Poll Administration
          </h1>

          <p className="mt-2 text-center text-xs text-neutral-500">
            Admin authentication required.
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-4"
          >
            <input
              type="password"
              name="password"
              required
              autoFocus
              placeholder="Enter admin password..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm outline-none focus:border-rose-500"
            />

            {authError && (
              <p className="text-xs text-rose-500">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-white py-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-950"
            >
              Authenticate Session
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-500">
              TambayanSLU
            </p>
            <h1 className="text-sm font-bold">
              Poll Administration
            </h1>
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider">
            <Link
              href="/admin/central"
              className="text-neutral-400 hover:text-white"
            >
              Admin Central
            </Link>

            <button
              onClick={handleLogout}
              className="text-rose-400 hover:text-rose-300"
            >
              Destroy Session
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <div className="mb-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                New Poll
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Ask the community.
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Create a poll here, then activate it when you want it to appear on the Freedom Wall.
              </p>
            </div>

            <form
              onSubmit={createPoll}
              className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5"
            >
              <div>
                <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Question
                </label>

                <input
                  value={question}
                  onChange={(e) =>
                    setQuestion(
                      e.target.value
                    )
                  }
                  maxLength={180}
                  placeholder="What should we ask today?"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Description (optional)
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  maxLength={280}
                  rows={3}
                  placeholder="Add a little context..."
                  className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Options
                  </label>

                  <span className="font-mono text-[9px] text-neutral-600">
                    2–6 options
                  </span>
                </div>

                <div className="space-y-2">
                  {options.map(
                    (option, index) => (
                      <div
                        key={index}
                        className="flex gap-2"
                      >
                        <input
                          value={option}
                          onChange={(e) =>
                            updateOption(
                              index,
                              e.target.value
                            )
                          }
                          maxLength={100}
                          placeholder={`Option ${
                            index + 1
                          }`}
                          className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                        />

                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeOption(
                                index
                              )
                            }
                            className="rounded-xl border border-neutral-800 px-3 text-neutral-500 hover:border-rose-500/40 hover:text-rose-400"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>

                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400"
                  >
                    + Add option
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-emerald-500 py-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving
                  ? 'Creating...'
                  : 'Create Poll'}
              </button>
            </form>
          </section>

          <section>
            <div className="mb-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Poll Library
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Manage polls
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Only one poll can be active on the Wall at a time.
              </p>
            </div>

            <div className="space-y-4">
              {polls.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-600">
                  No polls yet.
                </div>
              ) : (
                polls.map((poll) => {
                  const totalVotes =
                    poll.options.reduce(
                      (total, option) =>
                        total +
                        (Number(
                          option.votes
                        ) || 0),
                      0
                    );

                  const busy =
                    processingId ===
                    poll.id;

                  return (
                    <article
                      key={poll.id}
                      className={`rounded-2xl border p-5 ${
                        poll.active
                          ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
                          : 'border-neutral-800 bg-neutral-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider ${
                                poll.active
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-neutral-800 text-neutral-500'
                              }`}
                            >
                              {poll.active
                                ? 'Live'
                                : 'Closed'}
                            </span>

                            <span className="font-mono text-[9px] uppercase text-neutral-600">
                              {totalVotes}{' '}
                              {totalVotes === 1
                                ? 'vote'
                                : 'votes'}
                            </span>
                          </div>

                          <h3 className="font-bold leading-snug">
                            {poll.question}
                          </h3>

                          {poll.description && (
                            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                              {
                                poll.description
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {poll.options.map(
                          (option) => {
                            const percentage =
                              totalVotes > 0
                                ? Math.round(
                                    ((Number(
                                      option.votes
                                    ) ||
                                      0) /
                                      totalVotes) *
                                      100
                                  )
                                : 0;

                            return (
                              <div
                                key={
                                  option.id
                                }
                                className="flex items-center justify-between gap-4 rounded-lg bg-neutral-950/60 px-3 py-2 text-xs"
                              >
                                <span className="text-neutral-300">
                                  {
                                    option.text
                                  }
                                </span>

                                <span className="shrink-0 font-mono text-neutral-500">
                                  {
                                    option.votes
                                  }{' '}
                                  ·{' '}
                                  {
                                    percentage
                                  }
                                  %
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-800/70 pt-4">
                        {poll.active ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              closePoll(
                                poll.id
                              )
                            }
                            className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400 disabled:opacity-50"
                          >
                            Close Poll
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              activatePoll(
                                poll.id
                              )
                            }
                            className="rounded-lg bg-emerald-500 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-950 disabled:opacity-50"
                          >
                            Make Live
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            removePoll(
                              poll.id
                            )
                          }
                          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-rose-400 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
