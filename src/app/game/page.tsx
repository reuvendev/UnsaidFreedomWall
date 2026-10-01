'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { TOPICS, getTopic } from './topics';

/* =========================================================
   TAMBAY BLUFF — STANDALONE MULTIPLAYER GAME
   Place this file at:
   src/app/game/page.tsx

   Firestore structure:
   tambayBluffRooms/{ROOM_CODE}
   tambayBluffRooms/{ROOM_CODE}/players/{userId}
   tambayBluffRooms/{ROOM_CODE}/answers/{userId}
   tambayBluffRooms/{ROOM_CODE}/votes/{userId}
   tambayBluffRooms/{ROOM_CODE}/messages/{messageId}
   tambayBluffUsers/{userId}   // topic history across rooms
========================================================= */

type GamePhase =
  | 'lobby'
  | 'answering'
  | 'discussion'
  | 'voting'
  | 'bluffer_guess'
  | 'reveal';

type RoundOutcome =
  | 'bluffer_escaped'
  | 'bluffer_guessed'
  | 'bluffer_caught'
  | null;

type RoomVisibility =
  | 'private'
  | 'public';

interface RoomData {
  hostId: string;
  phase: GamePhase;
  round: number;
  createdAt?: unknown;
  phaseEndsAt?: Timestamp | null;
  topicId?: string | null;
  blufferId?: string | null;
  guessOptionIds?: string[];
  guessedTopicId?: string | null;
  guessCorrect?: boolean | null;
  roundOutcome?: RoundOutcome;
  scoredRound?: number;
  maxPlayers?: number;
  visibility?: RoomVisibility;
  playerCount?: number;
  hostAlias?: string;
  closing?: boolean;
  joinable?: boolean;
  usedTopicIds?: string[];
  lastTopicCategory?: string | null;
}

interface PublicRoomSummary {
  code: string;
  hostAlias: string;
  playerCount: number;
  maxPlayers: number;
  createdAtMs: number;
}

interface PlayerData {
  id: string;
  alias: string;
  score: number;
  joinedAt?: unknown;
}

interface AnswerData {
  id: string;
  playerId: string;
  text: string;
  submittedAt?: unknown;
}

interface VoteData {
  id: string;
  voterId: string;
  targetId: string;
  submittedAt?: unknown;
}

interface DiscussionMessageData {
  id: string;
  playerId: string;
  alias: string;
  text: string;
  round: number;
  createdAt?: unknown;
}



const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

/*
 * Topic memory:
 * - Room history stops repeats inside one long lobby/session.
 * - User history follows the anonymous browser ID across rooms.
 * - When everything has been seen, the selector falls back to
 *   the least-seen choices and still avoids recent room topics.
 */
const ROOM_TOPIC_HISTORY_LIMIT = 120;
const USER_TOPIC_HISTORY_LIMIT = 700;

/*
 * Relaxed pacing:
 * - Players get enough time to think instead of racing the UI.
 * - Answering/voting still move early once everyone has submitted.
 * - The host can move discussion forward early when everyone is ready.
 */
const ANSWER_SECONDS = 60;
const DISCUSSION_SECONDS = 90;
const VOTING_SECONDS = 60;
const GUESS_SECONDS = 45;

const normalizeRoomCode = (
  value: string
) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

const makeRoomCode = () => {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let result = '';

  for (let i = 0; i < 6; i += 1) {
    result +=
      alphabet[
        Math.floor(
          Math.random() *
            alphabet.length
        )
      ];
  }

  return result;
};

const getOwnerId = () => {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  let id =
    localStorage.getItem(
      'unsaid_chat_user_id'
    );

  if (!id) {
    id =
      `user_${Math.random()
        .toString(36)
        .slice(2, 11)}`;

    localStorage.setItem(
      'unsaid_chat_user_id',
      id
    );
  }

  return id;
};

const shuffled = <T,>(
  values: T[]
) => {
  const copy = [...values];

  for (
    let i = copy.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      copy[i],
      copy[j],
    ] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
};

const getPhaseLabel = (
  phase: GamePhase
) => {
  switch (phase) {
    case 'lobby':
      return 'Lobby';
    case 'answering':
      return 'Answer';
    case 'discussion':
      return 'Discuss';
    case 'voting':
      return 'Vote';
    case 'bluffer_guess':
      return 'Final Guess';
    case 'reveal':
      return 'Reveal';
  }
};

function useTambayanDarkMode() {
  const [dark, setDark] =
    useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const stored =
          localStorage.getItem(
            'unsaid_dark_mode'
          );

        if (
          stored === 'true' ||
          stored === '"true"' ||
          stored === 'dark' ||
          stored === '1'
        ) {
          setDark(true);
          return;
        }

        if (
          stored === 'false' ||
          stored === '"false"' ||
          stored === 'light' ||
          stored === '0'
        ) {
          setDark(false);
          return;
        }
      } catch {
        // Fall back to page/system theme.
      }

      const html =
        document.documentElement;

      const body =
        document.body;

      if (
        html.classList.contains(
          'dark'
        ) ||
        body.classList.contains(
          'dark'
        ) ||
        html.getAttribute(
          'data-theme'
        ) === 'dark' ||
        body.getAttribute(
          'data-theme'
        ) === 'dark'
      ) {
        setDark(true);
        return;
      }

      setDark(
        window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches
      );
    };

    read();

    const observer =
      new MutationObserver(
        read
      );

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          'class',
          'data-theme',
        ],
      }
    );

    observer.observe(
      document.body,
      {
        attributes: true,
        attributeFilter: [
          'class',
          'data-theme',
        ],
      }
    );

    window.addEventListener(
      'storage',
      read
    );

    const timer =
      window.setInterval(
        read,
        500
      );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        'storage',
        read
      );

      window.clearInterval(
        timer
      );
    };
  }, []);

  return dark;
}

function Countdown({
  endsAt,
}: {
  endsAt?: Timestamp | null;
}) {
  const [now, setNow] =
    useState(Date.now());

  useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setNow(
            Date.now()
          ),
        500
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  if (!endsAt) {
    return null;
  }

  const seconds =
    Math.max(
      0,
      Math.ceil(
        (
          endsAt.toMillis() -
          now
        ) / 1000
      )
    );

  return (
    <span className="inline-flex min-w-[54px] items-center justify-center rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-mono text-[10px] font-black tabular-nums text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
      {seconds}s
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/60 px-5 py-10 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
      <p className="text-sm font-black text-neutral-900 dark:text-white">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}

export default function TambayBluffPage() {
  const isDark =
    useTambayanDarkMode();

  const [ownerId, setOwnerId] =
    useState<string | null>(
      null
    );

  const [alias, setAlias] =
    useState('');

  const [
    roomCodeInput,
    setRoomCodeInput,
  ] = useState('');

  const [
    activeRoomCode,
    setActiveRoomCode,
  ] = useState<string | null>(
    null
  );

  const [room, setRoom] =
    useState<RoomData | null>(
      null
    );

  const [players, setPlayers] =
    useState<PlayerData[]>(
      []
    );

  const [answers, setAnswers] =
    useState<AnswerData[]>(
      []
    );

  const [votes, setVotes] =
    useState<VoteData[]>(
      []
    );

  const [
    discussionMessages,
    setDiscussionMessages,
  ] = useState<DiscussionMessageData[]>(
    []
  );

  const [chatText, setChatText] =
    useState('');

  const [chatSending, setChatSending] =
    useState(false);

  const chatEndRef =
    useRef<HTMLDivElement | null>(null);

  const lastChatSentAtRef =
    useRef(0);

  const [answerText, setAnswerText] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [
    createVisibility,
    setCreateVisibility,
  ] = useState<RoomVisibility>('private');

  const [
    publicRooms,
    setPublicRooms,
  ] = useState<PublicRoomSummary[]>([]);

  const [
    publicRoomsLoading,
    setPublicRoomsLoading,
  ] = useState(true);

  const [
    publicRoomsError,
    setPublicRoomsError,
  ] = useState('');

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    copiedCode,
    setCopiedCode,
  ] = useState(false);

  const [clock, setClock] =
    useState(Date.now());

  const phaseActionRef =
    useRef<string>('');

  const leaveSentRef =
    useRef(false);

  useEffect(() => {
    const id =
      getOwnerId();

    if (!id) {
      return;
    }

    setOwnerId(id);

    const savedAlias =
      localStorage.getItem(
        'tambay_bluff_alias'
      );

    setAlias(
      savedAlias?.trim() || ''
    );

    const params =
      new URLSearchParams(
        window.location.search
      );

    const roomParam =
      normalizeRoomCode(
        params.get('room') || ''
      );

    if (roomParam) {
      setRoomCodeInput(
        roomParam
      );
    }
  }, []);

  useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setClock(
            Date.now()
          ),
        500
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  useEffect(() => {
    if (activeRoomCode) {
      return;
    }

    setPublicRoomsLoading(true);
    setPublicRoomsError('');

    const publicRoomsQuery = query(
      collection(
        db,
        'tambayBluffRooms'
      ),
      where(
        'visibility',
        '==',
        'public'
      )
    );

    const unsubscribe = onSnapshot(
      publicRoomsQuery,
      (snapshot) => {
        const nextRooms = snapshot.docs
          .map((entry) => {
            const data = entry.data() as RoomData;
            const createdAt = data.createdAt as Timestamp | undefined;

            return {
              code: entry.id,
              hostAlias:
                data.hostAlias ||
                'Anonymous Host',
              playerCount:
                data.playerCount ?? 0,
              maxPlayers:
                data.maxPlayers ||
                MAX_PLAYERS,
              createdAtMs:
                createdAt?.toMillis?.() ||
                0,
              phase: data.phase,
              closing:
                Boolean(
                  data.closing
                ),
              joinable:
                data.joinable !==
                false,
            };
          })
          .filter(
            (entry) =>
              entry.phase === 'lobby' &&
              entry.joinable &&
              !entry.closing &&
              entry.playerCount > 0 &&
              entry.playerCount <
                entry.maxPlayers
          )
          .sort(
            (a, b) =>
              b.createdAtMs -
              a.createdAtMs
          )
          .slice(0, 20)
          .map(
            ({
              phase: _phase,
              closing: _closing,
              joinable: _joinable,
              ...entry
            }) =>
              entry
          );

        setPublicRooms(nextRooms);
        setPublicRoomsLoading(false);
      },
      (error) => {
        console.error(error);
        setPublicRooms([]);
        setPublicRoomsLoading(false);
        setPublicRoomsError(
          'Public lobbies could not be loaded.'
        );
      }
    );

    return unsubscribe;
  }, [activeRoomCode]);

  useEffect(() => {
    if (
      !activeRoomCode
    ) {
      setRoom(null);
      setPlayers([]);
      setAnswers([]);
      setVotes([]);
      setDiscussionMessages([]);
      setChatText('');
      return;
    }

    const roomRef =
      doc(
        db,
        'tambayBluffRooms',
        activeRoomCode
      );

    const playersRef =
      query(
        collection(
          roomRef,
          'players'
        ),
        orderBy(
          'joinedAt',
          'asc'
        )
      );

    const answersRef =
      collection(
        roomRef,
        'answers'
      );

    const votesRef =
      collection(
        roomRef,
        'votes'
      );

    const messagesRef =
      query(
        collection(
          roomRef,
          'messages'
        ),
        orderBy(
          'createdAt',
          'asc'
        )
      );

    const unsubRoom =
      onSnapshot(
        roomRef,
        (snapshot) => {
          if (
            !snapshot.exists()
          ) {
            setMessage(
              'This room no longer exists.'
            );

            setActiveRoomCode(
              null
            );

            return;
          }

          setRoom(
            snapshot.data() as RoomData
          );
        }
      );

    const unsubPlayers =
      onSnapshot(
        playersRef,
        (snapshot) => {
          setPlayers(
            snapshot.docs.map(
              (entry) => ({
                id: entry.id,
                ...entry.data(),
              } as PlayerData)
            )
          );
        }
      );

    const unsubAnswers =
      onSnapshot(
        answersRef,
        (snapshot) => {
          setAnswers(
            snapshot.docs.map(
              (entry) => ({
                id: entry.id,
                ...entry.data(),
              } as AnswerData)
            )
          );
        }
      );

    const unsubVotes =
      onSnapshot(
        votesRef,
        (snapshot) => {
          setVotes(
            snapshot.docs.map(
              (entry) => ({
                id: entry.id,
                ...entry.data(),
              } as VoteData)
            )
          );
        }
      );

    const unsubMessages =
      onSnapshot(
        messagesRef,
        (snapshot) => {
          setDiscussionMessages(
            snapshot.docs.map(
              (entry) => ({
                id: entry.id,
                ...entry.data(),
              } as DiscussionMessageData)
            )
          );
        }
      );

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubAnswers();
      unsubVotes();
      unsubMessages();
    };
  }, [activeRoomCode]);

  const me =
    useMemo(
      () =>
        players.find(
          (player) =>
            player.id ===
            ownerId
        ) ?? null,
      [
        players,
        ownerId,
      ]
    );

  const isHost =
    Boolean(
      room &&
        ownerId &&
        room.hostId ===
          ownerId
    );

  const isBluffer =
    Boolean(
      room &&
        ownerId &&
        room.blufferId ===
          ownerId
    );

  const topic =
    getTopic(
      room?.topicId
    );

  const myAnswer =
    answers.find(
      (answer) =>
        answer.playerId ===
        ownerId
    );

  const myVote =
    votes.find(
      (vote) =>
        vote.voterId ===
        ownerId
    );

  const playerById =
    useCallback(
      (id?: string | null) =>
        players.find(
          (player) =>
            player.id === id
        ) ?? null,
      [players]
    );

  const answerByPlayer =
    useCallback(
      (id: string) =>
        answers.find(
          (answer) =>
            answer.playerId ===
            id
        ) ?? null,
      [answers]
    );

  const voteCounts =
    useMemo(() => {
      const result:
        Record<
          string,
          number
        > = {};

      votes.forEach(
        (vote) => {
          result[
            vote.targetId
          ] =
            (
              result[
                vote.targetId
              ] || 0
            ) + 1;
        }
      );

      return result;
    }, [votes]);

  const saveAlias =
    useCallback(
      (value: string) => {
        const clean =
          value
            .trim()
            .slice(0, 28);

        if (!clean) {
          return '';
        }

        localStorage.setItem(
          'tambay_bluff_alias',
          clean
        );

        return clean;
      },
      []
    );

  const currentRoundMessages =
    useMemo(
      () =>
        discussionMessages.filter(
          (chatMessage) =>
            chatMessage.round ===
            room?.round
        ),
      [
        discussionMessages,
        room?.round,
      ]
    );

  useEffect(() => {
    if (
      room?.phase !==
      'discussion'
    ) {
      return;
    }

    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [
    currentRoundMessages.length,
    room?.phase,
  ]);

  const createRoom =
    async () => {
      if (
        !ownerId ||
        busy
      ) {
        return;
      }

      if (!alias.trim()) {
        setMessage(
          'Enter an alias first.'
        );
        return;
      }

      const cleanAlias =
        saveAlias(alias);

      setAlias(cleanAlias);

      setBusy(true);
      setMessage('');

      try {
        let code = '';
        let roomRef = null;

        for (
          let attempt = 0;
          attempt < 8;
          attempt += 1
        ) {
          code =
            makeRoomCode();

          roomRef =
            doc(
              db,
              'tambayBluffRooms',
              code
            );

          const existing =
            await getDoc(
              roomRef
            );

          if (
            !existing.exists()
          ) {
            break;
          }

          roomRef = null;
        }

        if (!roomRef) {
          throw new Error(
            'Could not make a room code.'
          );
        }

        await setDoc(
          roomRef,
          {
            hostId:
              ownerId,
            phase:
              'lobby',
            round: 0,
            createdAt:
              serverTimestamp(),
            phaseEndsAt:
              null,
            topicId:
              null,
            blufferId:
              null,
            guessOptionIds:
              [],
            guessedTopicId:
              null,
            guessCorrect:
              null,
            roundOutcome:
              null,
            scoredRound: 0,
            maxPlayers:
              MAX_PLAYERS,
            visibility:
              createVisibility,
            playerCount: 1,
            hostAlias:
              cleanAlias,
            closing: false,
            joinable: true,
            usedTopicIds: [],
            lastTopicCategory:
              null,
          } satisfies RoomData
        );

        await setDoc(
          doc(
            roomRef,
            'players',
            ownerId
          ),
          {
            alias:
              cleanAlias,
            score: 0,
            joinedAt:
              serverTimestamp(),
          }
        );

        leaveSentRef.current =
          false;

        setActiveRoomCode(
          code
        );

        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}?room=${code}`
        );
      } catch (error) {
        console.error(error);

        setMessage(
          'Could not create a room. Please try again.'
        );
      } finally {
        setBusy(false);
      }
    };

  const joinRoom =
    async (
      requestedCode?: string
    ) => {
      if (
        !ownerId ||
        busy
      ) {
        return;
      }

      if (!alias.trim()) {
        setMessage(
          'Enter an alias first.'
        );
        return;
      }

      const cleanAlias =
        saveAlias(alias);

      setAlias(cleanAlias);

      const code =
        normalizeRoomCode(
          requestedCode ??
            roomCodeInput
        );

      if (
        code.length !== 6
      ) {
        setMessage(
          'Enter the 6-character room code.'
        );

        return;
      }

      setBusy(true);
      setMessage('');

      try {
        const roomRef =
          doc(
            db,
            'tambayBluffRooms',
            code
          );

        const playerRef =
          doc(
            roomRef,
            'players',
            ownerId
          );

        await runTransaction(
          db,
          async (transaction) => {
            const roomSnapshot =
              await transaction.get(
                roomRef
              );

            if (
              !roomSnapshot.exists()
            ) {
              throw new Error(
                'Room not found.'
              );
            }

            const roomData =
              roomSnapshot.data() as RoomData;

            if (
              roomData.phase !==
                'lobby' ||
              roomData.joinable ===
                false
            ) {
              throw new Error(
                'This room is no longer open for joining.'
              );
            }

            if (roomData.closing) {
              throw new Error(
                'This room is closing.'
              );
            }

            const playerSnapshot =
              await transaction.get(
                playerRef
              );

            const maxPlayers =
              roomData.maxPlayers ||
              MAX_PLAYERS;

            const currentCount =
              roomData.playerCount ??
              0;

            if (
              !playerSnapshot.exists() &&
              currentCount >=
                maxPlayers
            ) {
              throw new Error(
                'This room is full.'
              );
            }

            const existingPlayer =
              playerSnapshot.exists()
                ? playerSnapshot.data()
                : null;

            transaction.set(
              playerRef,
              {
                alias:
                  cleanAlias,
                score:
                  existingPlayer?.score ||
                  0,
                joinedAt:
                  existingPlayer?.joinedAt ||
                  serverTimestamp(),
              },
              {
                merge: true,
              }
            );

            if (
              !playerSnapshot.exists()
            ) {
              transaction.update(
                roomRef,
                {
                  playerCount:
                    increment(1),
                }
              );
            }
          }
        );

        leaveSentRef.current =
          false;

        setRoomCodeInput(code);
        setActiveRoomCode(
          code
        );

        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}?room=${code}`
        );
      } catch (error) {
        console.error(error);

        setMessage(
          error instanceof
          Error
            ? error.message
            : 'Could not join the room.'
        );
      } finally {
        setBusy(false);
      }
    };

  const clearRoundData =
    async (
      roomCode: string
    ) => {
      const roomRef =
        doc(
          db,
          'tambayBluffRooms',
          roomCode
        );

      const [
        answerDocs,
        voteDocs,
        messageDocs,
      ] =
        await Promise.all([
          getDocs(
            collection(
              roomRef,
              'answers'
            )
          ),
          getDocs(
            collection(
              roomRef,
              'votes'
            )
          ),
          getDocs(
            collection(
              roomRef,
              'messages'
            )
          ),
        ]);

      const batch =
        writeBatch(db);

      answerDocs.forEach(
        (entry) =>
          batch.delete(
            entry.ref
          )
      );

      voteDocs.forEach(
        (entry) =>
          batch.delete(
            entry.ref
          )
      );

      messageDocs.forEach(
        (entry) =>
          batch.delete(
            entry.ref
          )
      );

      await batch.commit();
    };

  const startRound =
    async () => {
      if (
        !isHost ||
        !activeRoomCode ||
        !room ||
        busy
      ) {
        return;
      }

      if (
        players.length <
        MIN_PLAYERS
      ) {
        setMessage(
          `You need at least ${MIN_PLAYERS} players to start.`
        );

        return;
      }

      setBusy(true);
      setMessage('');

      try {
        await clearRoundData(
          activeRoomCode
        );

        /*
         * Load every current player's topic memory.
         * A topic seen by fewer people gets priority.
         */
        const playerHistories =
          await Promise.all(
            players.map(
              async (player) => {
                const historyRef =
                  doc(
                    db,
                    'tambayBluffUsers',
                    player.id
                  );

                const historySnapshot =
                  await getDoc(
                    historyRef
                  );

                const data =
                  historySnapshot.exists()
                    ? historySnapshot.data()
                    : {};

                const seenTopicIds =
                  Array.isArray(
                    data.seenTopicIds
                  )
                    ? (
                        data.seenTopicIds as unknown[]
                      )
                        .filter(
                          (
                            value
                          ): value is string =>
                            typeof value ===
                            'string'
                        )
                        .slice(
                          -USER_TOPIC_HISTORY_LIMIT
                        )
                    : [];

                return {
                  player,
                  historyRef,
                  seenTopicIds,
                  seenSet:
                    new Set(
                      seenTopicIds
                    ),
                };
              }
            )
          );

        const recentRoomTopics =
          new Set(
            room.usedTopicIds ||
              []
          );

        const seenByCount =
          (candidateId: string) =>
            playerHistories.reduce(
              (
                total,
                history
              ) =>
                total +
                (
                  history.seenSet.has(
                    candidateId
                  )
                    ? 1
                    : 0
                ),
              0
            );

        /*
         * First avoid topics already used in this room.
         * If a very long-running room eventually exhausts
         * the recent history window, older topics can return.
         */
        let candidates =
          TOPICS.filter(
            (candidate) =>
              !recentRoomTopics.has(
                candidate.id
              )
          );

        if (
          candidates.length === 0
        ) {
          candidates = [...TOPICS];
        }

        /*
         * Prefer a different category from the last round.
         * This keeps several Academics/Food/etc. prompts
         * from appearing back-to-back.
         */
        if (
          room.lastTopicCategory
        ) {
          const differentCategory =
            candidates.filter(
              (candidate) =>
                candidate.category !==
                room.lastTopicCategory
            );

          if (
            differentCategory.length >
            0
          ) {
            candidates =
              differentCategory;
          }
        }

        /*
         * 0 = nobody in this room has ever seen it.
         * 1 = only one player has seen it.
         * ...
         * If everyone has eventually seen everything,
         * this naturally becomes a least-seen fallback.
         */
        const minimumSeenCount =
          Math.min(
            ...candidates.map(
              (candidate) =>
                seenByCount(
                  candidate.id
                )
            )
          );

        const freshestCandidates =
          candidates.filter(
            (candidate) =>
              seenByCount(
                candidate.id
              ) ===
              minimumSeenCount
          );

        const selectedTopic =
          shuffled(
            freshestCandidates
          )[0];

        if (!selectedTopic) {
          throw new Error(
            'No topic is available.'
          );
        }

        const selectedBluffer =
          players[
            Math.floor(
              Math.random() *
                players.length
            )
          ];

        /*
         * Final-guess decoys prefer the same category,
         * which makes the Bluffer's last chance fairer
         * than showing obviously unrelated options.
         */
        const sameCategoryDecoys =
          shuffled(
            TOPICS.filter(
              (candidate) =>
                candidate.id !==
                  selectedTopic.id &&
                candidate.category ===
                  selectedTopic.category
            )
          );

        const fallbackDecoys =
          shuffled(
            TOPICS.filter(
              (candidate) =>
                candidate.id !==
                  selectedTopic.id &&
                candidate.category !==
                  selectedTopic.category
            )
          );

        const decoys =
          [
            ...sameCategoryDecoys,
            ...fallbackDecoys,
          ]
            .slice(0, 3)
            .map(
              (candidate) =>
                candidate.id
            );

        const guessOptionIds =
          shuffled([
            selectedTopic.id,
            ...decoys,
          ]);

        const nextRoomTopicHistory =
          [
            ...(room.usedTopicIds ||
              []),
            selectedTopic.id,
          ].slice(
            -ROOM_TOPIC_HISTORY_LIMIT
          );

        await updateDoc(
          doc(
            db,
            'tambayBluffRooms',
            activeRoomCode
          ),
          {
            phase:
              'answering',
            joinable: false,
            round:
              room.round + 1,
            topicId:
              selectedTopic.id,
            blufferId:
              selectedBluffer.id,
            guessOptionIds,
            usedTopicIds:
              nextRoomTopicHistory,
            lastTopicCategory:
              selectedTopic.category,
            guessedTopicId:
              null,
            guessCorrect:
              null,
            roundOutcome:
              null,
            phaseEndsAt:
              Timestamp.fromMillis(
                Date.now() +
                  ANSWER_SECONDS *
                    1000
              ),
          }
        );

        /*
         * Save the selected topic to every current player's
         * long-term history. The array is capped so the user
         * document cannot grow forever.
         */
        try {
          const historyBatch =
            writeBatch(db);

          playerHistories.forEach(
            (history) => {
              const nextSeen =
                [
                  ...history
                    .seenTopicIds
                    .filter(
                      (topicId) =>
                        topicId !==
                        selectedTopic.id
                    ),
                  selectedTopic.id,
                ].slice(
                  -USER_TOPIC_HISTORY_LIMIT
                );

              historyBatch.set(
                history.historyRef,
                {
                  seenTopicIds:
                    nextSeen,
                  lastTopicId:
                    selectedTopic.id,
                  lastTopicCategory:
                    selectedTopic.category,
                  alias:
                    history.player.alias,
                  updatedAt:
                    serverTimestamp(),
                },
                {
                  merge: true,
                }
              );
            }
          );

          await historyBatch.commit();
        } catch (
          historyError
        ) {
          /*
           * Do not kill an active round just because history
           * could not be saved. The room history still prevents
           * immediate repeats for this lobby.
           */
          console.warn(
            'Could not save topic history:',
            historyError
          );
        }

        setAnswerText('');
      } catch (error) {
        console.error(error);

        setMessage(
          'Could not start the round.'
        );
      } finally {
        setBusy(false);
      }
    };

  const submitAnswer =
    async () => {
      if (
        !ownerId ||
        !activeRoomCode ||
        !room ||
        room.phase !==
          'answering' ||
        myAnswer
      ) {
        return;
      }

      const clean =
        answerText
          .trim()
          .slice(0, 80);

      if (!clean) {
        setMessage(
          'Type a short answer first.'
        );

        return;
      }

      setBusy(true);
      setMessage('');

      try {
        await setDoc(
          doc(
            db,
            'tambayBluffRooms',
            activeRoomCode,
            'answers',
            ownerId
          ),
          {
            playerId:
              ownerId,
            text: clean,
            submittedAt:
              serverTimestamp(),
          }
        );

        setAnswerText('');
      } catch (error) {
        console.error(error);

        setMessage(
          'Could not submit your answer.'
        );
      } finally {
        setBusy(false);
      }
    };

  const moveToDiscussion =
    useCallback(
      async () => {
        if (
          !isHost ||
          !activeRoomCode ||
          !room ||
          room.phase !==
            'answering'
        ) {
          return;
        }

        await updateDoc(
          doc(
            db,
            'tambayBluffRooms',
            activeRoomCode
          ),
          {
            phase:
              'discussion',
            phaseEndsAt:
              Timestamp.fromMillis(
                Date.now() +
                  DISCUSSION_SECONDS *
                    1000
              ),
          }
        );
      },
      [
        isHost,
        activeRoomCode,
        room,
      ]
    );

  const sendDiscussionMessage =
    async () => {
      if (
        !ownerId ||
        !activeRoomCode ||
        !room ||
        room.phase !==
          'discussion' ||
        !me ||
        chatSending
      ) {
        return;
      }

      const clean =
        chatText
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 220);

      if (!clean) {
        return;
      }

      const now = Date.now();

      if (
        now -
          lastChatSentAtRef.current <
        800
      ) {
        setMessage(
          'Wait a moment before sending another message.'
        );
        return;
      }

      setChatSending(true);
      setMessage('');

      try {
        const roomRef =
          doc(
            db,
            'tambayBluffRooms',
            activeRoomCode
          );

        const chatRef =
          doc(
            collection(
              roomRef,
              'messages'
            )
          );

        await setDoc(
          chatRef,
          {
            playerId:
              ownerId,
            alias:
              me.alias,
            text:
              clean,
            round:
              room.round,
            createdAt:
              serverTimestamp(),
          }
        );

        lastChatSentAtRef.current =
          now;
        setChatText('');
      } catch (error) {
        console.error(error);
        setMessage(
          'Could not send the message.'
        );
      } finally {
        setChatSending(false);
      }
    };

  const moveToVoting =
    useCallback(
      async () => {
        if (
          !isHost ||
          !activeRoomCode ||
          !room ||
          room.phase !==
            'discussion'
        ) {
          return;
        }

        await updateDoc(
          doc(
            db,
            'tambayBluffRooms',
            activeRoomCode
          ),
          {
            phase:
              'voting',
            phaseEndsAt:
              Timestamp.fromMillis(
                Date.now() +
                  VOTING_SECONDS *
                    1000
              ),
          }
        );
      },
      [
        isHost,
        activeRoomCode,
        room,
      ]
    );

  const submitVote =
    async (
      targetId: string
    ) => {
      if (
        !ownerId ||
        !activeRoomCode ||
        !room ||
        room.phase !==
          'voting' ||
        myVote ||
        targetId ===
          ownerId
      ) {
        return;
      }

      setBusy(true);
      setMessage('');

      try {
        await setDoc(
          doc(
            db,
            'tambayBluffRooms',
            activeRoomCode,
            'votes',
            ownerId
          ),
          {
            voterId:
              ownerId,
            targetId,
            submittedAt:
              serverTimestamp(),
          }
        );
      } catch (error) {
        console.error(error);

        setMessage(
          'Could not submit your vote.'
        );
      } finally {
        setBusy(false);
      }
    };

  const scoreRound =
    useCallback(
      async ({
        blufferWins,
        guessCorrect,
        outcome,
        guessedTopicId,
      }: {
        blufferWins: boolean;
        guessCorrect:
          boolean | null;
        outcome:
          Exclude<
            RoundOutcome,
            null
          >;
        guessedTopicId?:
          string | null;
      }) => {
        if (
          !activeRoomCode ||
          !room ||
          !room.blufferId
        ) {
          return;
        }

        const roomRef =
          doc(
            db,
            'tambayBluffRooms',
            activeRoomCode
          );

        const currentRound =
          room.round;

        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const roomSnapshot =
              await transaction.get(
                roomRef
              );

            if (
              !roomSnapshot.exists()
            ) {
              return;
            }

            const latest =
              roomSnapshot.data() as RoomData;

            if (
              (
                latest.scoredRound ||
                0
              ) >=
              currentRound
            ) {
              return;
            }

            transaction.update(
              roomRef,
              {
                phase:
                  'reveal',
                phaseEndsAt:
                  null,
                roundOutcome:
                  outcome,
                guessedTopicId:
                  guessedTopicId ??
                  null,
                guessCorrect,
                scoredRound:
                  currentRound,
              }
            );

            if (blufferWins) {
              transaction.update(
                doc(
                  roomRef,
                  'players',
                  room.blufferId!
                ),
                {
                  score:
                    increment(
                      25
                    ),
                }
              );

              return;
            }

            const correctVoters =
              votes.filter(
                (vote) =>
                  vote.targetId ===
                  room.blufferId
              );

            correctVoters.forEach(
              (vote) => {
                transaction.update(
                  doc(
                    roomRef,
                    'players',
                    vote.voterId
                  ),
                  {
                    score:
                      increment(
                        10
                      ),
                  }
                );
              }
            );
          }
        );
      },
      [
        activeRoomCode,
        room,
        votes,
      ]
    );

  const finalizeVoting =
    useCallback(
      async () => {
        if (
          !isHost ||
          !room ||
          !room.blufferId ||
          !activeRoomCode ||
          room.phase !==
            'voting'
        ) {
          return;
        }

        const counts:
          Record<
            string,
            number
          > = {};

        votes.forEach(
          (vote) => {
            counts[
              vote.targetId
            ] =
              (
                counts[
                  vote.targetId
                ] || 0
              ) + 1;
          }
        );

        const ordered =
          Object.entries(
            counts
          ).sort(
            (a, b) =>
              b[1] - a[1]
          );

        const topCount =
          ordered[0]?.[1] ||
          0;

        const topIds =
          ordered
            .filter(
              ([, count]) =>
                count ===
                topCount
            )
            .map(
              ([id]) => id
            );

        const blufferCaught =
          topCount > 0 &&
          topIds.length === 1 &&
          topIds[0] ===
            room.blufferId;

        if (
          blufferCaught
        ) {
          await updateDoc(
            doc(
              db,
              'tambayBluffRooms',
              activeRoomCode
            ),
            {
              phase:
                'bluffer_guess',
              phaseEndsAt:
                Timestamp.fromMillis(
                  Date.now() +
                    GUESS_SECONDS *
                      1000
                ),
            }
          );

          return;
        }

        await scoreRound({
          blufferWins: true,
          guessCorrect:
            null,
          outcome:
            'bluffer_escaped',
        });
      },
      [
        isHost,
        room,
        activeRoomCode,
        votes,
        scoreRound,
      ]
    );

  const submitBlufferGuess =
    async (
      selectedTopicId: string
    ) => {
      if (
        !isBluffer ||
        !room ||
        room.phase !==
          'bluffer_guess'
      ) {
        return;
      }

      const correct =
        selectedTopicId ===
        room.topicId;

      await scoreRound({
        blufferWins:
          correct,
        guessCorrect:
          correct,
        outcome:
          correct
            ? 'bluffer_guessed'
            : 'bluffer_caught',
        guessedTopicId:
          selectedTopicId,
      });
    };

  useEffect(() => {
    if (
      !isHost ||
      !room ||
      !activeRoomCode
    ) {
      return;
    }

    const phaseKey =
      `${room.round}:${room.phase}`;

    const expired =
      Boolean(
        room.phaseEndsAt &&
          room.phaseEndsAt.toMillis() <=
            clock
      );

    const markAndRun =
      (
        run: () =>
          Promise<void>
      ) => {
        if (
          phaseActionRef.current ===
          phaseKey
        ) {
          return;
        }

        phaseActionRef.current =
          phaseKey;

        void run().catch(
          (error) => {
            console.error(error);
            phaseActionRef.current =
              '';
          }
        );
      };

    if (
      room.phase ===
        'answering' &&
      (
        (
          players.length > 0 &&
          answers.length >=
            players.length
        ) ||
        expired
      )
    ) {
      markAndRun(
        moveToDiscussion
      );

      return;
    }

    if (
      room.phase ===
        'discussion' &&
      expired
    ) {
      markAndRun(
        moveToVoting
      );

      return;
    }

    if (
      room.phase ===
        'voting' &&
      (
        (
          players.length > 1 &&
          votes.length >=
            players.length
        ) ||
        expired
      )
    ) {
      markAndRun(
        finalizeVoting
      );

      return;
    }

    if (
      room.phase ===
        'bluffer_guess' &&
      expired
    ) {
      markAndRun(
        () =>
          scoreRound({
            blufferWins:
              false,
            guessCorrect:
              false,
            outcome:
              'bluffer_caught',
            guessedTopicId:
              null,
          })
      );
    }
  }, [
    isHost,
    room,
    activeRoomCode,
    players.length,
    answers.length,
    votes.length,
    clock,
    moveToDiscussion,
    moveToVoting,
    finalizeVoting,
    scoreRound,
  ]);

  useEffect(() => {
    if (!room) {
      return;
    }

    phaseActionRef.current =
      '';
  }, [
    room?.round,
    room?.phase,
  ]);

  const clearLocalRoomState =
    useCallback(() => {
      setActiveRoomCode(
        null
      );

      setRoom(null);
      setPlayers([]);
      setAnswers([]);
      setVotes([]);
      setDiscussionMessages([]);
      setAnswerText('');
      setChatText('');

      window.history.replaceState(
        null,
        '',
        window.location.pathname
      );
    }, []);

  const removePlayerAndCleanupRoom =
    useCallback(
      async ({
        roomCode,
        playerId,
      }: {
        roomCode: string;
        playerId: string;
      }) => {
        const roomRef =
          doc(
            db,
            'tambayBluffRooms',
            roomCode
          );

        const playerRef =
          doc(
            roomRef,
            'players',
            playerId
          );

        /*
         * Delete this player first, then inspect the
         * actual players subcollection instead of
         * trusting playerCount. This prevents an old
         * or incorrect counter from keeping an empty
         * room alive.
         */
        await deleteDoc(
          playerRef
        );

        const remainingPlayers =
          await getDocs(
            query(
              collection(
                roomRef,
                'players'
              ),
              orderBy(
                'joinedAt',
                'asc'
              )
            )
          );

        if (
          remainingPlayers.empty
        ) {
          /*
           * Firestore does not automatically delete
           * subcollections when a parent document is
           * deleted. Remove round data first, then
           * delete the room itself.
           */
          const [
            answerDocs,
            voteDocs,
            messageDocs,
          ] =
            await Promise.all([
              getDocs(
                collection(
                  roomRef,
                  'answers'
                )
              ),
              getDocs(
                collection(
                  roomRef,
                  'votes'
                )
              ),
              getDocs(
                collection(
                  roomRef,
                  'messages'
                )
              ),
            ]);

          const cleanupBatch =
            writeBatch(db);

          answerDocs.forEach(
            (entry) =>
              cleanupBatch.delete(
                entry.ref
              )
          );

          voteDocs.forEach(
            (entry) =>
              cleanupBatch.delete(
                entry.ref
              )
          );

          messageDocs.forEach(
            (entry) =>
              cleanupBatch.delete(
                entry.ref
              )
          );

          /*
           * This also removes any player documents
           * that may have been left behind by an
           * interrupted leave.
           */
          remainingPlayers.forEach(
            (entry) =>
              cleanupBatch.delete(
                entry.ref
              )
          );

          cleanupBatch.delete(
            roomRef
          );

          await cleanupBatch.commit();

          return {
            roomDeleted: true,
          };
        }

        const roomSnapshot =
          await getDoc(
            roomRef
          );

        if (
          !roomSnapshot.exists()
        ) {
          return {
            roomDeleted: true,
          };
        }

        const roomData =
          roomSnapshot.data() as RoomData;

        const updates: {
          playerCount: number;
          closing: boolean;
          hostId?: string;
          hostAlias?: string;
        } = {
          playerCount:
            remainingPlayers.size,
          closing: false,
        };

        if (
          roomData.hostId ===
          playerId
        ) {
          const nextHost =
            remainingPlayers.docs[0];

          updates.hostId =
            nextHost.id;

          updates.hostAlias =
            String(
              nextHost.data()
                .alias ||
                'Anonymous Host'
            );
        }

        await updateDoc(
          roomRef,
          updates
        );

        return {
          roomDeleted: false,
        };
      },
      []
    );

  /*
   * Browser/tab closing is best-effort because a page
   * can disappear before Firebase finishes a network
   * request. The normal Leave Room button below is the
   * reliable cleanup path and does not require
   * firebase-admin or extra environment variables.
   */
  useEffect(() => {
    if (
      !activeRoomCode ||
      !ownerId
    ) {
      return;
    }

    leaveSentRef.current =
      false;

    const handlePageHide = () => {
      if (
        leaveSentRef.current
      ) {
        return;
      }

      leaveSentRef.current =
        true;

      const payload =
        JSON.stringify({
          roomCode:
            activeRoomCode,
          playerId:
            ownerId,
        });

      if (
        typeof navigator !==
          'undefined' &&
        navigator.sendBeacon
      ) {
        navigator.sendBeacon(
          '/api/game/leave',
          new Blob(
            [payload],
            {
              type:
                'application/json',
            }
          )
        );
      }
    };

    window.addEventListener(
      'pagehide',
      handlePageHide
    );

    return () => {
      window.removeEventListener(
        'pagehide',
        handlePageHide
      );
    };
  }, [
    activeRoomCode,
    ownerId,
  ]);

  const leaveRoom =
    async () => {
      if (
        !ownerId ||
        !activeRoomCode
      ) {
        return;
      }

      if (
        leaveSentRef.current
      ) {
        return;
      }

      leaveSentRef.current =
        true;

      const leavingRoomCode =
        activeRoomCode;

      setBusy(true);
      setMessage('');

      try {
        const result =
          await removePlayerAndCleanupRoom({
            roomCode:
              leavingRoomCode,
            playerId:
              ownerId,
          });

        if (
          result.roomDeleted
        ) {
          console.log(
            `Tambay Bluff room ${leavingRoomCode} deleted because it has no players.`
          );
        }

        clearLocalRoomState();
      } catch (error) {
        console.error(
          'Could not clean up room:',
          error
        );

        leaveSentRef.current =
          false;

        setMessage(
          'Could not leave the room cleanly. Check your Firestore delete permissions and try again.'
        );
      } finally {
        setBusy(false);
      }
    };

  const copyRoomCode =
    async () => {
      if (
        !activeRoomCode
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          activeRoomCode
        );

        setCopiedCode(true);

        window.setTimeout(
          () =>
            setCopiedCode(
              false
            ),
          1600
        );
      } catch {
        setMessage(
          `Room code: ${activeRoomCode}`
        );
      }
    };

  const copyInvite =
    async () => {
      if (
        !activeRoomCode
      ) {
        return;
      }

      const invite =
        `${window.location.origin}${window.location.pathname}?room=${activeRoomCode}`;

      try {
        await navigator.clipboard.writeText(
          invite
        );

        setCopied(true);

        window.setTimeout(
          () =>
            setCopied(
              false
            ),
          1600
        );
      } catch {
        setMessage(
          `Room code: ${activeRoomCode}`
        );
      }
    };

  const guessedTopic =
    getTopic(
      room?.guessedTopicId
    );

  const bluffer =
    playerById(
      room?.blufferId
    );

  const sortedPlayers =
    useMemo(
      () =>
        [...players].sort(
          (a, b) =>
            b.score -
            a.score
        ),
      [players]
    );

  if (
    !ownerId
  ) {
    return (
      <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900 dark:bg-neutral-950 dark:text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
          Loading Tambay Bluff...
        </div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.09),_transparent_30%),linear-gradient(to_bottom,#fafcf9,#f4f6f4)] px-4 py-5 text-neutral-900 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.09),_transparent_28%),linear-gradient(to_bottom,#090a0a,#111313)] dark:text-white sm:px-6 sm:py-8 ${
        isDark ? 'dark' : ''
      }`}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-neutral-600 transition hover:bg-white/70 hover:text-neutral-950 dark:text-white/70 dark:hover:bg-neutral-900 dark:hover:text-white"
          >
            ← Tambayan
          </a>

          {activeRoomCode && (
            <button
              type="button"
              onClick={
                leaveRoom
              }
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-[9px] font-black uppercase tracking-wider text-neutral-600 transition hover:border-rose-200 hover:text-rose-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white/70 dark:hover:border-rose-900 dark:hover:text-rose-300"
            >
              Leave Room
            </button>
          )}
        </header>

        <section className="mb-5 overflow-hidden rounded-[28px] border border-neutral-200 bg-white/90 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <div className="border-b border-neutral-100 p-5 dark:border-neutral-800 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">
                  Tambayan Multiplayer
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
                  Tambay Bluff
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  Everyone gets the topic except one Bluffer. Give a believable answer, discuss, then vote who looks sus.
                </p>
              </div>

              {room && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-neutral-600 dark:bg-neutral-800 dark:text-white/75">
                    Round {room.round}
                  </span>

                  <span className="rounded-full bg-emerald-600 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-white">
                    {getPhaseLabel(
                      room.phase
                    )}
                  </span>

                  <Countdown
                    endsAt={
                      room.phaseEndsAt
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {!activeRoomCode ? (
            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950/55">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-white/60">
                    Create a Lobby
                  </p>

                  <label className="mt-4 block text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                    Your alias <span className="text-rose-500">*</span>
                  </label>

                  <input
                    value={alias}
                    onChange={(
                      event
                    ) =>
                      setAlias(
                        event.target.value.slice(
                          0,
                          28
                        )
                      )
                    }
                    onBlur={() => {
                      const clean =
                        alias.trim();

                      if (clean) {
                        localStorage.setItem(
                          'tambay_bluff_alias',
                          clean
                        );
                      }
                    }}
                    className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    placeholder="Enter your alias"
                    required
                    autoComplete="off"
                  />

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-900">
                    <button
                      type="button"
                      onClick={() =>
                        setCreateVisibility(
                          'private'
                        )
                      }
                      className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${
                        createVisibility ===
                        'private'
                          ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      Private
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCreateVisibility(
                          'public'
                        )
                      }
                      className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${
                        createVisibility ===
                        'public'
                          ? 'bg-white text-emerald-700 shadow-sm dark:bg-neutral-800 dark:text-emerald-300'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      Public
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      !alias.trim()
                    }
                    onClick={() =>
                      void createRoom()
                    }
                    className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 font-mono text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50"
                  >
                    {busy
                      ? 'Creating...'
                      : createVisibility ===
                        'public'
                        ? 'Create Public Lobby'
                        : 'Create Private Lobby'}
                  </button>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950/55">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-white/60">
                    Join with a Code
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    This works for both private and public rooms.
                  </p>

                  <input
                    value={
                      roomCodeInput
                    }
                    onChange={(
                      event
                    ) =>
                      setRoomCodeInput(
                        normalizeRoomCode(
                          event.target.value
                        )
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        void joinRoom();
                      }
                    }}
                    className="mt-4 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center font-mono text-xl font-black uppercase tracking-[0.28em] outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    placeholder="ABC123"
                    maxLength={6}
                  />

                  <button
                    type="button"
                    disabled={
                      busy ||
                      !alias.trim()
                    }
                    onClick={() =>
                      void joinRoom()
                    }
                    className="mt-4 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 font-mono text-[10px] font-black uppercase tracking-wider text-neutral-800 transition hover:border-emerald-300 hover:text-emerald-700 active:scale-[0.99] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-emerald-800 dark:hover:text-emerald-300"
                  >
                    {busy
                      ? 'Joining...'
                      : 'Join Room'}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950/55 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                      Public Lobbies
                    </p>
                    <h2 className="mt-1 text-xl font-black text-neutral-950 dark:text-white">
                      Pick a room and join
                    </h2>
                    {!alias.trim() && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Enter your alias above before joining a lobby.
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                    Live
                  </span>
                </div>

                {publicRoomsLoading ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    Loading public lobbies...
                  </div>
                ) : publicRoomsError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                    {publicRoomsError}
                  </div>
                ) : publicRooms.length ===
                  0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center dark:border-neutral-800">
                    <p className="text-sm font-black text-neutral-900 dark:text-white">
                      No open public lobbies yet
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Create one and be the first host.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {publicRooms.map(
                      (publicRoom) => (
                        <div
                          key={
                            publicRoom.code
                          }
                          className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-neutral-950 dark:text-white">
                                {publicRoom.hostAlias}
                              </p>
                              <p className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                                Room {publicRoom.code}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-[8px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              {publicRoom.playerCount}/{publicRoom.maxPlayers}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={
                              busy ||
                              !alias.trim()
                            }
                            onClick={() =>
                              void joinRoom(
                                publicRoom.code
                              )
                            }
                            className="mt-4 w-full rounded-xl bg-neutral-950 px-3 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-emerald-300"
                          >
                            Join Lobby
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-white/55">
                    Room Code
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xl font-black tracking-[0.18em] text-neutral-950 dark:text-white">
                      {activeRoomCode}
                    </span>

                    <span className={`rounded-full px-2 py-1 font-mono text-[7px] font-black uppercase tracking-wider ${
                      room?.visibility ===
                      'public'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}>
                      {room?.visibility ===
                      'public'
                        ? 'Public'
                        : 'Private'}
                    </span>

                    {isHost && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 font-mono text-[7px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        You host
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      copyRoomCode
                    }
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider text-neutral-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-emerald-800 dark:hover:text-emerald-300"
                  >
                    {copiedCode
                      ? 'Code Copied'
                      : 'Copy Code'}
                  </button>

                  <button
                    type="button"
                    onClick={
                      copyInvite
                    }
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider text-neutral-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-emerald-800 dark:hover:text-emerald-300"
                  >
                    {copied
                      ? 'Link Copied'
                      : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {room?.phase ===
                  'lobby' && (
                  <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-white/55">
                            Players
                          </p>

                          <h2 className="mt-1 text-xl font-black text-neutral-950 dark:text-white">
                            Waiting Room
                          </h2>
                        </div>

                        <span className="font-mono text-[10px] font-black text-neutral-500 dark:text-white/60">
                          {players.length}/{MAX_PLAYERS}
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {players.map(
                          (
                            player,
                            index
                          ) => (
                            <div
                              key={
                                player.id
                              }
                              className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/55"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-neutral-900 dark:text-white">
                                  {
                                    player.alias
                                  }
                                </p>

                                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                  {player.id ===
                                  room.hostId
                                    ? 'Host'
                                    : `Player ${index + 1}`}
                                </p>
                              </div>

                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]" />
                            </div>
                          )
                        )}
                      </div>

                      {players.length <
                        MIN_PLAYERS && (
                        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                          Need {MIN_PLAYERS -
                            players.length}{' '}
                          more player
                          {MIN_PLAYERS -
                            players.length ===
                          1
                            ? ''
                            : 's'}{' '}
                          to start.
                        </p>
                      )}
                    </div>

                    <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950/55">
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                        How it works
                      </p>

                      <p className="mt-3 text-sm font-black text-neutral-950 dark:text-white">
                        One player has no idea what the topic is.
                      </p>

                      <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                        Everyone answers, then you get a proper discussion round before voting. The Bluffer receives only a broad hint. Topics use controlled combinations and player history, so repeats are avoided even across different rooms. If caught, the Bluffer gets one final multiple-choice guess.
                      </p>

                      {isHost ? (
                        <button
                          type="button"
                          onClick={
                            startRound
                          }
                          disabled={
                            busy ||
                            players.length <
                              MIN_PLAYERS
                          }
                          className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 font-mono text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy
                            ? 'Starting...'
                            : 'Start Round'}
                        </button>
                      ) : (
                        <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-center font-mono text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-white/60">
                          Waiting for host
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {room?.phase ===
                  'answering' && (
                  <div className="mx-auto max-w-2xl">
                    <div
                      className={`rounded-[28px] border p-5 sm:p-7 ${
                        isBluffer
                          ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20'
                          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                      }`}
                    >
                      <p
                        className={`font-mono text-[9px] font-black uppercase tracking-[0.22em] ${
                          isBluffer
                            ? 'text-rose-600 dark:text-rose-300'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isBluffer
                          ? 'You are the Bluffer'
                          : topic?.category ||
                            'Topic'}
                      </p>

                      <h2 className="mt-2 text-2xl font-black leading-tight text-neutral-950 dark:text-white sm:text-3xl">
                        {isBluffer
                          ? 'You do not know the exact topic.'
                          : topic?.text}
                      </h2>

                      {isBluffer && (
                        <div className="mt-4 rounded-2xl border border-rose-200/80 bg-white/70 p-4 dark:border-rose-900/60 dark:bg-neutral-950/35">
                          <p className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
                            Your Hint
                          </p>
                          <p className="mt-1 text-sm font-black text-neutral-950 dark:text-white">
                            Category: {topic?.category || 'Random'}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                            {topic?.hint || 'Think about an everyday situation.'}
                          </p>
                        </div>
                      )}

                      <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {isBluffer
                          ? 'Use the hint to make a believable answer, but do not be too specific. You can learn more from everyone’s answers during discussion.'
                          : 'Keep it short. Too specific can make the real topic obvious to the Bluffer.'}
                      </p>
                    </div>

                    {myAnswer ? (
                      <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 text-center dark:border-neutral-800 dark:bg-neutral-900">
                        <p className="font-mono text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-white/55">
                          Your answer is locked
                        </p>

                        <p className="mt-2 text-lg font-black text-neutral-950 dark:text-white">
                          “{myAnswer.text}”
                        </p>

                        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                          {answers.length}/{players.length}{' '}
                          players answered.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:p-5">
                        <textarea
                          value={
                            answerText
                          }
                          onChange={(
                            event
                          ) =>
                            setAnswerText(
                              event.target.value.slice(
                                0,
                                80
                              )
                            )
                          }
                          placeholder="Type a short answer..."
                          rows={3}
                          className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-neutral-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-600"
                        />

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="font-mono text-[8px] font-bold text-neutral-400 dark:text-neutral-500">
                            {answerText.length}/80
                          </span>

                          <button
                            type="button"
                            onClick={
                              submitAnswer
                            }
                            disabled={
                              busy ||
                              !answerText.trim()
                            }
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40"
                          >
                            Lock Answer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {room?.phase ===
                  'discussion' && (
                  <div>
                    <div className="mb-4">
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                        Discussion
                      </p>

                      <h2 className="mt-1 text-xl font-black text-neutral-950 dark:text-white">
                        Sino ang mukhang nanghuhula?
                      </h2>

                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Read the answers, question each other in the room chat, and defend yours. Chat messages stay inside this room and are deleted with it.
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                            Answers
                          </p>
                          <span className="font-mono text-[8px] font-bold text-neutral-400 dark:text-neutral-500">
                            {players.length} players
                          </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                          {players.map(
                            (player) => {
                              const answer =
                                answerByPlayer(
                                  player.id
                                );

                              return (
                                <div
                                  key={
                                    player.id
                                  }
                                  className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                                >
                                  <p className="font-mono text-[8px] font-black uppercase tracking-wider text-neutral-500 dark:text-white/55">
                                    {player.alias}
                                  </p>

                                  <p className="mt-2 text-sm font-black leading-relaxed text-neutral-950 dark:text-white">
                                    “{answer?.text || 'No answer'}”
                                  </p>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                          <div>
                            <p className="text-sm font-black text-neutral-950 dark:text-white">
                              Room Chat
                            </p>
                            <p className="mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                              Talk it out before everyone votes.
                            </p>
                          </div>

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Live
                          </span>
                        </div>

                        <div className="max-h-[340px] min-h-[260px] overflow-y-auto px-4 py-4">
                          {currentRoundMessages.length === 0 ? (
                            <div className="flex min-h-[220px] items-center justify-center text-center">
                              <div>
                                <p className="text-sm font-black text-neutral-800 dark:text-white">
                                  No messages yet
                                </p>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                  Ask someone about their answer or defend yours.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {currentRoundMessages.map(
                                (chatMessage) => {
                                  const mine =
                                    chatMessage.playerId === ownerId;

                                  return (
                                    <div
                                      key={chatMessage.id}
                                      className={`flex ${
                                        mine
                                          ? 'justify-end'
                                          : 'justify-start'
                                      }`}
                                    >
                                      <div className="max-w-[86%]">
                                        <p
                                          className={`mb-1 px-1 font-mono text-[7px] font-black uppercase tracking-wider ${
                                            mine
                                              ? 'text-right text-emerald-700 dark:text-emerald-300'
                                              : 'text-neutral-400 dark:text-neutral-500'
                                          }`}
                                        >
                                          {mine ? 'You' : chatMessage.alias}
                                        </p>

                                        <div
                                          className={`break-words rounded-2xl px-3.5 py-2.5 text-sm font-semibold leading-relaxed ${
                                            mine
                                              ? 'rounded-br-md bg-emerald-600 text-white'
                                              : 'rounded-bl-md bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                                          }`}
                                        >
                                          {chatMessage.text}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              )}

                              <div ref={chatEndRef} />
                            </div>
                          )}
                        </div>

                        <div className="border-t border-neutral-100 p-3 dark:border-neutral-800">
                          <div className="flex items-end gap-2">
                            <textarea
                              value={chatText}
                              onChange={(event) =>
                                setChatText(
                                  event.target.value.slice(0, 220)
                                )
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === 'Enter' &&
                                  !event.shiftKey
                                ) {
                                  event.preventDefault();
                                  void sendDiscussionMessage();
                                }
                              }}
                              rows={1}
                              maxLength={220}
                              placeholder="Message the room..."
                              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm font-semibold outline-none transition placeholder:text-neutral-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-600"
                            />

                            <button
                              type="button"
                              onClick={() => void sendDiscussionMessage()}
                              disabled={chatSending || !chatText.trim()}
                              className="min-h-[44px] shrink-0 rounded-2xl bg-emerald-600 px-4 font-mono text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {chatSending ? '...' : 'Send'}
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 px-1">
                            <p className="text-[9px] text-neutral-400 dark:text-neutral-500">
                              Enter to send · Shift + Enter for a new line
                            </p>
                            <span className="font-mono text-[8px] font-bold text-neutral-400 dark:text-neutral-500">
                              {chatText.length}/220
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isHost && (
                      <button
                        type="button"
                        onClick={moveToVoting}
                        className="mt-5 w-full rounded-2xl border border-neutral-200 bg-neutral-950 px-4 py-3 font-mono text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-neutral-800 dark:border-neutral-700 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                      >
                        Vote Now
                      </button>
                    )}
                  </div>
                )}

                {room?.phase ===
                  'voting' && (
                  <div>
                    <div className="mb-4">
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
                        Vote
                      </p>

                      <h2 className="mt-1 text-xl font-black text-neutral-950 dark:text-white">
                        Who is the Bluffer?
                      </h2>

                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Take your time and compare the answers. You have up to 60 seconds, one vote, and you cannot vote for yourself.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {players.map(
                        (player) => {
                          const answer =
                            answerByPlayer(
                              player.id
                            );

                          const self =
                            player.id ===
                            ownerId;

                          const selected =
                            myVote?.targetId ===
                            player.id;

                          return (
                            <button
                              key={
                                player.id
                              }
                              type="button"
                              disabled={
                                self ||
                                Boolean(
                                  myVote
                                ) ||
                                busy
                              }
                              onClick={() =>
                                submitVote(
                                  player.id
                                )
                              }
                              className={`rounded-3xl border p-4 text-left transition ${
                                selected
                                  ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-500/10 dark:border-rose-700 dark:bg-rose-950/25'
                                  : self
                                    ? 'cursor-not-allowed border-neutral-200 bg-neutral-100/70 opacity-55 dark:border-neutral-800 dark:bg-neutral-900/60'
                                    : 'border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-rose-800'
                              }`}
                            >
                              <p className="text-sm font-black text-neutral-950 dark:text-white">
                                {
                                  player.alias
                                }
                                {self
                                  ? ' · You'
                                  : ''}
                              </p>

                              <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                                “{answer?.text ||
                                  'No answer'}”
                              </p>

                              <p className="mt-3 font-mono text-[8px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">
                                {selected
                                  ? 'Vote locked'
                                  : self
                                    ? 'Cannot vote self'
                                    : 'Vote this player'}
                              </p>
                            </button>
                          );
                        }
                      )}
                    </div>

                    {myVote && (
                      <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
                        Vote locked. Waiting for the others…
                      </p>
                    )}
                  </div>
                )}

                {room?.phase ===
                  'bluffer_guess' && (
                  <div className="mx-auto max-w-2xl">
                    <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20 sm:p-7">
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                        The Bluffer was caught
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">
                        {isBluffer
                          ? 'One last chance.'
                          : `${bluffer?.alias || 'The Bluffer'} gets one final guess.`}
                      </h2>

                      <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {isBluffer
                          ? "You have 45 seconds. Use the hint and everyone\'s answers to pick the original topic. Get it right and you steal the round."
                          : 'If they guess correctly, they still win the round.'}
                      </p>
                    </div>

                    {isBluffer ? (
                      <div className="mt-4 grid gap-3">
                        {(
                          room.guessOptionIds ||
                          []
                        ).map(
                          (
                            topicId
                          ) => {
                            const option =
                              getTopic(
                                topicId
                              );

                            if (!option) {
                              return null;
                            }

                            return (
                              <button
                                key={
                                  topicId
                                }
                                type="button"
                                onClick={() =>
                                  submitBlufferGuess(
                                    topicId
                                  )
                                }
                                className="rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-700"
                              >
                                <p className="font-mono text-[8px] font-black uppercase tracking-wider text-neutral-500 dark:text-white/50">
                                  {
                                    option.category
                                  }
                                </p>

                                <p className="mt-1 text-sm font-black text-neutral-950 dark:text-white">
                                  {
                                    option.text
                                  }
                                </p>
                              </button>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
                        <p className="text-sm font-black text-neutral-950 dark:text-white">
                          Waiting for the Bluffer…
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {room?.phase ===
                  'reveal' && (
                  <div>
                    <div
                      className={`rounded-[28px] border p-5 sm:p-7 ${
                        room.roundOutcome ===
                          'bluffer_caught'
                          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                          : 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20'
                      }`}
                    >
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-white/60">
                        Round {room.round} result
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">
                        {room.roundOutcome ===
                        'bluffer_escaped'
                          ? 'The Bluffer escaped.'
                          : room.roundOutcome ===
                              'bluffer_guessed'
                            ? 'The Bluffer stole the win.'
                            : 'The Bluffer was caught.'}
                      </h2>

                      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        <span className="font-black text-neutral-950 dark:text-white">
                          {bluffer?.alias ||
                            'Bluffer'}
                        </span>{' '}
                        was the Bluffer.
                      </p>

                      <div className="mt-4 rounded-2xl bg-white/70 p-4 dark:bg-neutral-950/50">
                        <p className="font-mono text-[8px] font-black uppercase tracking-wider text-neutral-500 dark:text-white/50">
                          Original topic
                        </p>

                        <p className="mt-1 text-sm font-black text-neutral-950 dark:text-white">
                          {topic?.text}
                        </p>

                        {room.guessedTopicId && (
                          <>
                            <p className="mt-3 font-mono text-[8px] font-black uppercase tracking-wider text-neutral-500 dark:text-white/50">
                              Bluffer guessed
                            </p>

                            <p className="mt-1 text-sm font-bold text-neutral-800 dark:text-white/85">
                              {
                                guessedTopic?.text
                              }
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.75fr]">
                      <div>
                        <p className="mb-3 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-white/55">
                          Votes
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {players.map(
                            (player) => (
                              <div
                                key={
                                  player.id
                                }
                                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-sm font-black text-neutral-950 dark:text-white">
                                    {
                                      player.alias
                                    }
                                  </p>

                                  <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-300">
                                    {voteCounts[
                                      player.id
                                    ] || 0}{' '}
                                    vote
                                    {(voteCounts[
                                      player.id
                                    ] || 0) ===
                                    1
                                      ? ''
                                      : 's'}
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                                  “{answerByPlayer(
                                    player.id
                                  )?.text ||
                                    'No answer'}”
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-white/55">
                          Scoreboard
                        </p>

                        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                          {sortedPlayers.map(
                            (
                              player,
                              index
                            ) => (
                              <div
                                key={
                                  player.id
                                }
                                className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 dark:border-neutral-800"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-mono text-[9px] font-black text-neutral-500 dark:bg-neutral-800 dark:text-white/60">
                                    {index +
                                      1}
                                  </span>

                                  <p className="truncate text-sm font-black text-neutral-950 dark:text-white">
                                    {
                                      player.alias
                                    }
                                  </p>
                                </div>

                                <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                                  {
                                    player.score
                                  }
                                </span>
                              </div>
                            )
                          )}
                        </div>

                        {isHost && (
                          <button
                            type="button"
                            onClick={
                              startRound
                            }
                            disabled={
                              busy ||
                              players.length <
                                MIN_PLAYERS
                            }
                            className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 font-mono text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-40"
                          >
                            Next Round
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {message && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {message}
          </div>
        )}

        <footer className="pb-4 text-center">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-600">
            3–8 players · anonymous aliases · real-time rooms
          </p>
        </footer>
      </div>
    </main>
  );
}
