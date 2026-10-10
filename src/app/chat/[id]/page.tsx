'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import imageCompression from 'browser-image-compression';
import { getPresignedUploadUrl } from '@/app/actions/r2-upload';
import { createVerifiedChatMessage } from '@/app/chat/actions';
import { VerifiedIcon } from '@/components/VerifiedIcon';
import { TeamRoleBadge } from '@/components/TeamRoleBadge';
import { isTeamRole, type TeamRole } from '@/lib/team/types';

interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  teamAuthorId?: string;
  text: string;
  iv?: string;
  encryptionVersion?: number;
  ciphertext?: string;
  image?: {
    url: string;
    iv: string;
    mimeType: string;
  };
  replyTo?: {
    id: string;
    senderNickname: string;
    text: string;
    ciphertext?: string;
    iv?: string;
  };
  reactions?: Record<string, string[]>;
  createdAt: any;
}

interface RoomData {
  hostId: string;
  hostNickname: string;
  hostSchool?: string;

  guestId?: string | null;
  guestNickname?: string | null;
  guestSchool?: string | null;
  hostTeamAuthorId?: string;
  guestTeamAuthorId?: string;

  hostStreak?: number;
  guestStreak?: number;

  hostLastSeenAt?: any;
  guestLastSeenAt?: any;

  status?: 'waiting' | 'active' | 'ended' | 'blocked' | 'closed';

  blockedBy?: string;

  endedBy?: string;
  endedAt?: any;
  endReason?: string;

  encryption?: {
    version?: number;
    hostPublicKey?: JsonWebKey;
    guestPublicKey?: JsonWebKey;
  };

  [key: string]: any;
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

const AVAILABLE_REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

const PINK_USER_IDS = [
  'user_grrbyvw91',
  'user_0hs9zhmrf',
];

const isPinkUser = (id?: string | null) => {
  return !!id && PINK_USER_IDS.includes(id);
};

type EncryptedData = {
  ciphertext: string;
  iv: string;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

const importRoomKey = async (base64Key: string) => {
  return crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(base64Key),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptText = async (
  text: string,
  base64Key: string
): Promise<EncryptedData> => {
  const key = await importRoomKey(base64Key);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    new TextEncoder().encode(text)
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
};

const decryptText = async (
  ciphertext: string,
  iv: string,
  base64Key: string
) => {
  const key = await importRoomKey(base64Key);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(base64ToArrayBuffer(iv)),
    },
    key,
    base64ToArrayBuffer(ciphertext)
  );

  return new TextDecoder().decode(decrypted);
};

const encryptImage = async (
  file: File,
  base64Key: string
): Promise<{
  encryptedBlob: Blob;
  iv: string;
}> => {
  const key = await importRoomKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    fileBuffer
  );

  return {
    encryptedBlob: new Blob([encrypted], {
      type: 'application/octet-stream',
    }),
    iv: arrayBufferToBase64(iv.buffer),
  };
};

const decryptImage = async (
  encryptedBuffer: ArrayBuffer,
  iv: string,
  base64Key: string,
  mimeType: string
): Promise<Blob> => {
  const key = await importRoomKey(base64Key);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(base64ToArrayBuffer(iv)),
    },
    key,
    encryptedBuffer
  );

  return new Blob([decrypted], {
    type: mimeType || 'image/webp',
  });
};

function EncryptedChatImage({
  imageData,
  roomKey,
}: {
  imageData: {
    url: string;
    iv: string;
    mimeType: string;
  };
  roomKey: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        setFailed(false);
        setSrc(null);

        const response = await fetch(imageData.url);

        if (!response.ok) {
          throw new Error(
            `Encrypted image download failed (${response.status}).`
          );
        }

        const encryptedBuffer = await response.arrayBuffer();

        const decryptedBlob = await decryptImage(
          encryptedBuffer,
          imageData.iv,
          roomKey,
          imageData.mimeType
        );

        if (cancelled) return;

        objectUrl = URL.createObjectURL(decryptedBlob);
        setSrc(objectUrl);
      } catch (error) {
        console.error('Failed to decrypt chat image:', error);

        if (!cancelled) {
          setFailed(true);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    imageData.url,
    imageData.iv,
    imageData.mimeType,
    roomKey,
  ]);

  if (failed) {
    return (
      <div className="px-3 py-2 text-xs opacity-60">
        Unable to decrypt photo.
      </div>
    );
  }

  if (!src) {
    return (
      <div className="px-3 py-2 text-xs opacity-60">
        Decrypting photo...
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Encrypted chat attachment"
      className="block max-w-full max-h-80 rounded-xl object-contain"
      loading="lazy"
    />
  );
}

type StoredECDHKeyPair = {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
};

const generateECDHKeyPair = async (): Promise<StoredECDHKeyPair> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits']
  );

  const publicKey = await crypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey
  );

  const privateKey = await crypto.subtle.exportKey(
    'jwk',
    keyPair.privateKey
  );

  return {
    publicKey,
    privateKey,
  };
};

const importECDHPrivateKey = async (
  jwk: JsonWebKey
) => {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveBits']
  );
};

const importECDHPublicKey = async (
  jwk: JsonWebKey
) => {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );
};

const deriveSharedRoomKey = async (
  privateKeyJwk: JsonWebKey,
  peerPublicKeyJwk: JsonWebKey,
  roomId: string
): Promise<string> => {
  const privateKey = await importECDHPrivateKey(
    privateKeyJwk
  );

  const peerPublicKey = await importECDHPublicKey(
    peerPublicKeyJwk
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    privateKey,
    256
  );

  // Feed the ECDH secret through HKDF instead of
  // directly using it as the AES key.
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'HKDF',
    false,
    ['deriveBits']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',

      // Bind this key to this specific room.
      salt: new TextEncoder().encode(roomId),

      info: new TextEncoder().encode(
        'tambayanslu-chat-e2ee-v1'
      ),
    },
    hkdfKey,
    256
  );

  return arrayBufferToBase64(derivedKey);
};

const Icons = {
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
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),

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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),

  ShieldAlert: () => (
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  ),

  MoreVertical: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  ),

  X: () => (
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
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),

  Reply: () => (
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
      <polyline points="9 17 4 12 9 7"></polyline>
      <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
    </svg>
  ),

  Smile: () => (
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
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
      <line x1="9" y1="9" x2="9.01" y2="9"></line>
      <line x1="15" y1="9" x2="15.01" y2="9"></line>
    </svg>
  ),

  Sun: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),

  Moon: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),

  ChevronUp: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  ),
};

export default function ChatRoomPage() {
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [teamProfiles, setTeamProfiles] = useState<Record<string, { displayName: string; role: TeamRole }>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatStatus, setChatStatus] = useState<
    'active' | 'closed' | 'blocked'
  >('active');
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [lastVisibleDoc, setLastVisibleDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('harassment');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Photo attachment state.
  // The selected image is compressed to WebP BEFORE it is encrypted/uploaded.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdateRef = useRef<number>(0);
  const initialScrollDone = useRef(false);

  const decryptFirestoreMessage = async (
    id: string,
    data: any
  ): Promise<Message> => {
    const hasEncryptedText =
      Boolean(data.ciphertext) && Boolean(data.iv);

    const hasEncryptedImage = Boolean(
      data.image?.url && data.image?.iv
    );

    // Existing plaintext messages remain backward-compatible.
    if (!hasEncryptedText && !hasEncryptedImage) {
      return {
        id,
        ...data,
        text: data.text || '',
      } as Message;
    }

    if (!roomKey) {
      return {
        id,
        ...data,
        text: hasEncryptedText
          ? '[Unable to decrypt message]'
          : '',
      } as Message;
    }

    try {
      let decryptedText = '';

      if (hasEncryptedText) {
        decryptedText = await decryptText(
          data.ciphertext,
          data.iv,
          roomKey
        );
      }

      let decryptedReply;

      if (data.replyTo) {
        let replyText = '';

        if (
          data.replyTo.ciphertext &&
          data.replyTo.iv
        ) {
          replyText = await decryptText(
            data.replyTo.ciphertext,
            data.replyTo.iv,
            roomKey
          );
        } else {
          replyText = data.replyTo.text || '';
        }

        decryptedReply = {
          id: data.replyTo.id,
          senderNickname: data.replyTo.senderNickname,
          text: replyText,
          ciphertext: data.replyTo.ciphertext,
          iv: data.replyTo.iv,
        };
      }

      return {
        id,
        ...data,
        text: decryptedText,
        replyTo: decryptedReply,
      } as Message;
    } catch (error) {
      console.warn(
        `Could not decrypt message ${id}. The message may have been encrypted with a different room key.`,
        error
      );

      return {
        id,
        ...data,
        text: hasEncryptedText
          ? '[Unable to decrypt message]'
          : '',
      } as Message;
    }
  };

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');

      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        setIsDarkMode(true);
      }
    } catch (e) {}
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;

    setIsDarkMode(nextMode);

    try {
      localStorage.setItem(
        'unsaid_dark_mode',
        JSON.stringify(nextMode)
      );
    } catch (e) {}
  };

  useEffect(() => {
    let storedId = localStorage.getItem('unsaid_chat_user_id');

    if (!storedId) {
      storedId =
        'user_' + Math.random().toString(36).substring(2, 11);

      localStorage.setItem('unsaid_chat_user_id', storedId);
    }

    setUserId(storedId);

    setNickname(
      localStorage.getItem('unsaid_chat_nickname') ||
        'Anonymous Louisian'
    );

    if (!roomId) {
      router.push('/');
    }
  }, [roomId, router]);

  useEffect(() => {
    const ids = Array.from(new Set([roomData?.hostTeamAuthorId, roomData?.guestTeamAuthorId].filter((value): value is string => typeof value === 'string' && value.length > 0)));
    setTeamProfiles({});
    const unsubscribes = ids.map((uid) => onSnapshot(doc(db, 'teamPublicProfiles', uid), (snapshot) => {
      const data = snapshot.data();
      setTeamProfiles((current) => {
        const next = { ...current };
        if (snapshot.exists() && data?.verified === true && typeof data.displayName === 'string' && isTeamRole(data.role)) next[uid] = { displayName: data.displayName, role: data.role };
        else delete next[uid];
        return next;
      });
    }, () => setTeamProfiles((current) => { const next = { ...current }; delete next[uid]; return next; })));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [roomData?.hostTeamAuthorId, roomData?.guestTeamAuthorId]);

// ==========================================
// ACTIVE CHAT PRESENCE HEARTBEAT
// ==========================================
useEffect(() => {
  if (!roomId || !userId || !roomData) return;

  if (roomData.status !== 'active') return;

  const isHost = roomData.hostId === userId;
  const isGuest = roomData.guestId === userId;

  // User doesn't belong to this room
  if (!isHost && !isGuest) return;

  const presenceField = isHost
    ? 'hostLastSeenAt'
    : 'guestLastSeenAt';

  const roomRef = doc(db, 'chatRooms', roomId);

  const sendHeartbeat = () => {
    updateDoc(roomRef, {
      [presenceField]: serverTimestamp(),
    }).catch((error) => {
      console.warn(
        'Chat heartbeat failed:',
        error
      );
    });
  };

  // Mark online immediately
  sendHeartbeat();

  // Continue heartbeat while chat is open
  const interval = setInterval(
    sendHeartbeat,
    10_000
  );

  return () => {
    clearInterval(interval);
  };
}, [
  roomId,
  userId,
  roomData?.hostId,
  roomData?.guestId,
  roomData?.status,
]);

// ==========================================
// PEER ONLINE STATUS
// ==========================================
useEffect(() => {
  if (!roomData || !userId) {
    setIsPeerOnline(false);
    return;
  }

  const isHost = roomData.hostId === userId;

  const peerLastSeen = isHost
    ? roomData.guestLastSeenAt
    : roomData.hostLastSeenAt;

  const checkPresence = () => {
    const lastSeenMs =
      peerLastSeen?.toMillis?.() ?? 0;

    const online =
      chatStatus === 'active' &&
      lastSeenMs > 0 &&
      Date.now() - lastSeenMs < 30_000;

    setIsPeerOnline(online);
  };

  // Check immediately
  checkPresence();

  // Recheck every 5 seconds
  const interval = setInterval(
    checkPresence,
    5_000
  );

  return () => {
    clearInterval(interval);
  };
}, [
  roomData?.hostLastSeenAt,
  roomData?.guestLastSeenAt,
  roomData?.hostId,
  userId,
  chatStatus,
]);

    useEffect(() => {
      if (!roomId || !userId || !roomData) return;

      let cancelled = false;

      const setupEncryption = async () => {
        try {
          const isHost = roomData.hostId === userId;

          const isGuest = roomData.guestId === userId;

          if (!isHost && !isGuest) {
            return;
          }

          const storageKey =
            `tambayan_ecdh_${roomId}_${userId}`;

          let keyPair: StoredECDHKeyPair | null = null;

          /*
           * Check if this browser already generated
           * a key pair for this room.
           */
          const stored = sessionStorage.getItem(
            storageKey
          );

          if (stored) {
            try {
              keyPair = JSON.parse(stored);
            } catch {
              sessionStorage.removeItem(storageKey);
            }
          }

          /*
           * No existing key pair?
           * Generate one.
           */
          if (!keyPair) {
            keyPair = await generateECDHKeyPair();

            sessionStorage.setItem(
              storageKey,
              JSON.stringify(keyPair)
            );
          }

          /*
           * Determine which Firestore field belongs
           * to this participant.
           */
          const myPublicKeyField = isHost
            ? 'encryption.hostPublicKey'
            : 'encryption.guestPublicKey';

          /*
           * Upload ONLY the public key.
           *
           * Private key stays inside this browser.
           */
          await updateDoc(
            doc(db, 'chatRooms', roomId),
            {
              [myPublicKeyField]: keyPair.publicKey,
              'encryption.version': 1,
            }
          );

          /*
           * Get the other participant's public key.
           */
          const peerPublicKey = isHost
            ? roomData.encryption?.guestPublicKey
            : roomData.encryption?.hostPublicKey;

          /*
           * Other participant hasn't published their
           * public key yet.
           *
           * The room listener will update roomData
           * when they do.
           */
          if (!peerPublicKey) {
            return;
          }

          /*
           * Derive the exact same AES key on
           * both devices.
           */
          const sharedKey =
            await deriveSharedRoomKey(
              keyPair.privateKey,
              peerPublicKey,
              roomId
            );

          if (!cancelled) {
            setRoomKey(sharedKey);

            console.log(
              'E2EE room key established.'
            );
          }
        } catch (error) {
          console.error(
            'Failed to establish E2EE key:',
            error
          );

          if (!cancelled) {
            setRoomKey(null);
          }
        }
      };

      setupEncryption();

      return () => {
        cancelled = true;
      };
    }, [
      roomId,
      userId,
      roomData?.hostId,
      roomData?.guestId,
      roomData?.encryption?.hostPublicKey,
      roomData?.encryption?.guestPublicKey,
    ]);

// ==========================================
// ROOM STATUS LISTENER
// ==========================================
useEffect(() => {
  if (!roomId || !userId) return;

  let isMounted = true;

  const roomRef = doc(db, 'chatRooms', roomId);

  const unsubscribeRoom = onSnapshot(
    roomRef,
    (docSnap) => {
      if (!isMounted) return;

      if (!docSnap.exists()) {
        console.error(
          'Room document disappeared:',
          roomId
        );

        setRoomData(null);
        setLoading(false);

        // IMPORTANT:
        // Do not mark the chat as closed just because
        // the document disappeared.
        return;
      }

      const data = docSnap.data() as RoomData;

      setRoomData(data);
      setLoading(false);

      if (data.status === 'blocked') {
        setChatStatus('blocked');

        setBlockedByMe(
          data.blockedBy === userId
        );

        return;
      }

      if (data.status === 'ended') {
        const validEndedBy =
          data.endedBy === data.hostId ||
          data.endedBy === data.guestId;

        if (validEndedBy) {
          console.log('Chat manually ended:', {
            endedBy: data.endedBy,
            roomId,
          });

          setChatStatus('closed');
          return;
        }

        console.warn(
          'Ignoring invalid ended state:',
          data
        );

        return;
      }

      if (data.status === 'closed') {
        console.warn(
          'LEGACY/UNKNOWN CLOSED STATUS DETECTED:',
          {
            roomId,
            data,
          }
        );

        return;
      }

      if (data.status === 'active') {
        setChatStatus('active');
        setBlockedByMe(false);
        return;
      }

      // Don't automatically assume other statuses
      // mean active or closed.
      console.warn(
        'Unknown/intermediate room status:',
        data.status
      );
    },
    (err) => {
      console.error('Room sync error:', err);

      if (isMounted) {
        setLoading(false);
      }
    }
  );

  return () => {
    isMounted = false;
    unsubscribeRoom();
  };
}, [roomId, userId]);


// ==========================================
// MESSAGE LISTENER
// ==========================================
useEffect(() => {
  if (!roomId || !userId) return;

  let isMounted = true;

  const PAGE_LIMIT = 10;

  const msgsQuery = query(
    collection(
      db,
      'chatRooms',
      roomId,
      'messages'
    ),
    orderBy('createdAt', 'desc'),
    limit(PAGE_LIMIT)
  );

  const unsubscribeMsgs = onSnapshot(
    msgsQuery,
    async (snapshot) => {
      if (!isMounted) return;

      const docs = snapshot.docs;

      if (docs.length > 0) {
        setLastVisibleDoc(
          docs[docs.length - 1]
        );

        setHasMoreMessages(
          docs.length >= PAGE_LIMIT
        );
      } else {
        setHasMoreMessages(false);
      }

      const msgs = await Promise.all(
        docs.map((messageDoc) =>
          decryptFirestoreMessage(
            messageDoc.id,
            messageDoc.data()
          )
        )
      );

      if (!isMounted) return;

      setMessages(msgs.reverse());

      if (!initialScrollDone.current) {
        initialScrollDone.current = true;

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
          });
        }, 50);
      }
    },
    (err) => {
      console.error(
        'Message sync error:',
        err
      );
    }
  );

  return () => {
    isMounted = false;
    unsubscribeMsgs();
  };
}, [roomId, userId, roomKey]);

  const handleLoadMore = async () => {
    if (!lastVisibleDoc || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);

    try {
      const olderQuery = query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisibleDoc),
        limit(30)
      );

      const snapshot = await getDocs(olderQuery);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        setLastVisibleDoc(docs[docs.length - 1]);

        if (docs.length < 30) {
          setHasMoreMessages(false);
        }

        const olderMsgs = await Promise.all(
          docs.map((messageDoc) =>
            decryptFirestoreMessage(
              messageDoc.id,
              messageDoc.data()
            )
          )
        );

        setMessages((prev) => [
          ...olderMsgs.reverse(),
          ...prev,
        ]);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Please select a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }

    // Reject very large originals before doing expensive client-side work.
    const maxOriginalSize = 10 * 1024 * 1024;

    if (selectedFile.size > maxOriginalSize) {
      alert('Image must be smaller than 10 MB.');
      e.target.value = '';
      return;
    }

    setIsCompressingImage(true);

    try {
      /*
       * IMPORTANT:
       * Compress FIRST, then encrypt the compressed WebP.
       * The original image is never uploaded to R2.
       */
      const compressedBlob = await imageCompression(
        selectedFile,
        {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/webp',
          initialQuality: 0.8,
        }
      );

      const compressedFile = new File(
        [compressedBlob],
        `chat-${Date.now()}.webp`,
        {
          type: 'image/webp',
        }
      );

      setImagePreview((currentPreview) => {
        if (currentPreview) {
          URL.revokeObjectURL(currentPreview);
        }

        return URL.createObjectURL(compressedFile);
      });

      setImageFile(compressedFile);
    } catch (error) {
      console.error('Image compression failed:', error);
      alert('Could not process this image. Please try another photo.');
      e.target.value = '';
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      return null;
    });

    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Revoke the current preview URL when this page unmounts.
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value;

    setNewMessage(val);

    if (!userId || chatStatus !== 'active') return;

    const now = Date.now();

    if (now - lastTypingUpdateRef.current > 2000) {
      lastTypingUpdateRef.current = now;

      updateDoc(doc(db, 'chatRooms', roomId), {
        [`typing_${userId}`]: true,
      }).catch(() => {});
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      lastTypingUpdateRef.current = 0;

      updateDoc(doc(db, 'chatRooms', roomId), {
        [`typing_${userId}`]: false,
      }).catch(() => {});
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const textToSend = newMessage.trim();
    const imageToSend = imageFile;

    // Allow text-only, photo-only, or photo + text.
    if ((!textToSend && !imageToSend) || !userId) return;

    if (chatStatus !== 'active') {
      alert('This conversation is no longer active.');
      return;
    }

    if (!roomKey) {
      alert('The encrypted session is not ready yet.');
      return;
    }

    const currentReply = replyingTo
      ? {
          id: replyingTo.id,
          senderNickname:
            replyingTo.senderId === userId
              ? 'You'
              : replyingTo.senderNickname,
          text:
            replyingTo.text ||
            (replyingTo.image ? '📷 Photo' : ''),
        }
      : null;
    const ownTeamAuthorId = roomData?.hostId === userId
      ? roomData.hostTeamAuthorId
      : roomData?.guestId === userId
        ? roomData.guestTeamAuthorId
        : undefined;

    setNewMessage('');
    setReplyingTo(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    lastTypingUpdateRef.current = 0;

    await updateDoc(doc(db, 'chatRooms', roomId), {
      [`typing_${userId}`]: false,
    }).catch(() => {});

    const tempId = 'temp_' + Date.now();

    /*
     * Keep text-only optimistic sending exactly like before.
     * For photo messages, wait until compression/encryption/upload finishes
     * so we never render an empty optimistic bubble.
     */
    if (!imageToSend) {
      const optimisticMessage: Message = {
        id: tempId,
        senderId: userId,
        senderNickname: nickname,
        teamAuthorId: ownTeamAuthorId,
        text: textToSend,
        replyTo: currentReply || undefined,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 50);
    }

    try {
      const messagePayload: any = {
        senderId: userId,
        senderNickname: nickname,
        encryptionVersion: 1,
        createdAt: serverTimestamp(),
      };

      // Encrypt text only when there is text.
      if (textToSend) {
        const encryptedMessage = await encryptText(
          textToSend,
          roomKey
        );

        messagePayload.ciphertext =
          encryptedMessage.ciphertext;
        messagePayload.iv = encryptedMessage.iv;
      }

      /*
       * IMAGE FLOW:
       * 1. Image was already compressed to WebP in handleImageChange.
       * 2. Encrypt that compressed WebP locally with the room key.
       * 3. Upload only the encrypted bytes to R2.
       * 4. Store only encrypted-image metadata in Firestore.
       */
      if (imageToSend) {
        setIsUploadingImage(true);

        const { encryptedBlob, iv } =
          await encryptImage(imageToSend, roomKey);

        /*
         * Keep a .webp object name/content type so this works with the
         * same R2 image presigner already used by TambayanSLU.
         * The BODY is still AES-GCM ciphertext, not a readable WebP.
         */
        const encryptedFileName =
          `chat-${roomId}-${crypto.randomUUID()}.webp`;

        const urlRes = await getPresignedUploadUrl(
          encryptedFileName,
          'image/webp'
        );

        if (
          !urlRes.success ||
          !urlRes.signedUrl ||
          !urlRes.publicUrl
        ) {
          throw new Error(
            urlRes.error ||
              'Failed to authorize encrypted photo upload.'
          );
        }

        const uploadRes = await fetch(urlRes.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/webp',
          },
          body: encryptedBlob,
        });

        if (!uploadRes.ok) {
          throw new Error(
            `Encrypted photo upload failed (${uploadRes.status}).`
          );
        }

        messagePayload.image = {
          url: urlRes.publicUrl,
          iv,
          mimeType: imageToSend.type || 'image/webp',
        };
      }

      if (currentReply) {
        const encryptedReply = await encryptText(
          currentReply.text,
          roomKey
        );

        messagePayload.replyTo = {
          id: currentReply.id,
          senderNickname: currentReply.senderNickname,
          ciphertext: encryptedReply.ciphertext,
          iv: encryptedReply.iv,
        };
      }

      if (ownTeamAuthorId) {
        const result = await createVerifiedChatMessage({
          roomId,
          encryptionVersion: 1,
          ciphertext: messagePayload.ciphertext,
          iv: messagePayload.iv,
          image: messagePayload.image,
          replyTo: messagePayload.replyTo,
        });
        if (!result.success) throw new Error(result.error || 'Could not send verified message.');
      } else {
        await addDoc(
          collection(db, 'chatRooms', roomId, 'messages'),
          messagePayload
        );
      }

      if (imageToSend) {
        handleRemoveImage();

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send encrypted message:', error);

      // Only text-only messages have an optimistic temp message.
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempId)
      );

      setNewMessage(textToSend);

      // Keep the selected compressed image so the user can retry.
      alert(
        imageToSend
          ? 'Failed to send encrypted photo. The photo is still attached so you can try again.'
          : 'Failed to send encrypted message. Please try again.'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleReaction = async (
    messageId: string,
    emoji: string
  ) => {
    if (chatStatus !== 'active') return;

    setActiveReactionPickerId(null);

    const msg = messages.find((m) => m.id === messageId);

    if (!msg || msg.id.startsWith('temp_')) return;

    const msgRef = doc(
      db,
      'chatRooms',
      roomId,
      'messages',
      messageId
    );

    const existingReactions = msg.reactions || {};
    const usersWhoReacted = existingReactions[emoji] || [];
    const hasReacted = usersWhoReacted.includes(userId);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;

        const updatedReactions = {
          ...(m.reactions || {}),
        };

        const currentList = [
          ...(updatedReactions[emoji] || []),
        ];

        if (hasReacted) {
          const filtered = currentList.filter(
            (id) => id !== userId
          );

          if (filtered.length === 0) {
            delete updatedReactions[emoji];
          } else {
            updatedReactions[emoji] = filtered;
          }
        } else {
          currentList.push(userId);
          updatedReactions[emoji] = currentList;
        }

        return {
          ...m,
          reactions: updatedReactions,
        };
      })
    );

    try {
      if (hasReacted) {
        await updateDoc(msgRef, {
          [`reactions.${emoji}`]: arrayRemove(userId),
        });
      } else {
        await updateDoc(msgRef, {
          [`reactions.${emoji}`]: arrayUnion(userId),
        });
      }
    } catch (err) {
      console.error('Failed to update reaction:', err);
    }
  };

  const handleEndChat = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to end this conversation?'
    );

    if (!confirmed) return;

    try {
      console.log('MANUAL END CHAT:', {
        roomId,
        userId,
      });

      await updateDoc(
        doc(db, 'chatRooms', roomId),
        {
          status: 'ended',
          endedBy: userId,
          endedAt: serverTimestamp(),
          endReason: 'manual',
        }
      );
    } catch (err) {
      console.error(
        'Failed to end room:',
        err
      );
    }
  };

  const handleSubmitReport = async () => {
    if (!roomData || !userId || isSubmittingReport) return;

    setIsSubmittingReport(true);

    const otherUserId =
      roomData.hostId === userId
        ? roomData.guestId
        : roomData.hostId;

    if (otherUserId) {
      const blockedUsers: string[] = JSON.parse(
        localStorage.getItem('unsaid_chat_blocked') || '[]'
      );

      if (!blockedUsers.includes(otherUserId)) {
        blockedUsers.push(otherUserId);

        localStorage.setItem(
          'unsaid_chat_blocked',
          JSON.stringify(blockedUsers)
        );
      }
    }

    try {
      if (!roomKey) {
        throw new Error(
          'Cannot submit report because the encryption key is unavailable.'
        );
      }

      /*
       * Fetch ALL messages directly from Firestore.
       *
       * They are still encrypted at this point.
       */
      const allMessagesQuery = query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('createdAt', 'asc')
      );

      const allMessagesSnapshot = await getDocs(
        allMessagesQuery
      );

      /*
       * Decrypt every message locally using this
       * participant's room key.
       */
      const allDecryptedMessages = await Promise.all(
        allMessagesSnapshot.docs.map((messageDoc) =>
          decryptFirestoreMessage(
            messageDoc.id,
            messageDoc.data()
          )
        )
      );

      /*
       * Prepare the decrypted moderation evidence.
       */
      const reportMessages = allDecryptedMessages
        .filter(
          (message) =>
            message.text !== '[Unable to decrypt message]'
        )
        .map((message) => ({
          messageId: message.id,
          senderId: message.senderId,
          senderNickname: message.senderNickname,
          text: message.text,

          replyTo: message.replyTo
            ? {
                messageId: message.replyTo.id,
                senderNickname:
                  message.replyTo.senderNickname,
                text: message.replyTo.text,
              }
            : null,
        }));

    await addDoc(collection(db, 'reports'), {
      roomId,
      reporterId: userId,
      reportedUserId: otherUserId,
      reason: selectedReason,

      evidence: {
        messages: reportMessages,
        messageCount: reportMessages.length,
      },

      createdAt: serverTimestamp(),
    });

      await updateDoc(doc(db, 'chatRooms', roomId), {
        status: 'blocked',
        blockedBy: userId,
      });

      setIsReportModalOpen(false);
    } catch (e) {
      console.error('Report processing error:', e);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`h-[100dvh] w-full flex items-center justify-center font-mono text-xs ${
          isDarkMode
            ? 'bg-neutral-950 text-neutral-400'
            : 'bg-neutral-50 text-neutral-400'
        }`}
      >
        Establishing secure session...
      </div>
    );
  }

  const isHost = roomData?.hostId === userId;

  const peerUserId = isHost
    ? roomData?.guestId
    : roomData?.hostId;

  const isPeerPink = isPinkUser(peerUserId);

  const peerNickname = isHost
    ? roomData?.guestNickname || 'Waiting...'
    : roomData?.hostNickname;
  const peerTeamAuthorId = isHost ? roomData?.guestTeamAuthorId : roomData?.hostTeamAuthorId;
  const peerTeamProfile = peerTeamAuthorId ? teamProfiles[peerTeamAuthorId] : undefined;

  const peerSchoolRaw = isHost
    ? roomData?.guestSchool
    : roomData?.hostSchool;

  const peerSchool = peerSchoolRaw
    ? SLU_SCHOOL_LABELS[peerSchoolRaw] ||
      peerSchoolRaw.toUpperCase()
    : '';

  const peerStreak = isHost
    ? roomData?.guestStreak || 0
    : roomData?.hostStreak || 0;

  const isInactive = chatStatus !== 'active';

  const isPeerTyping = peerUserId
    ? Boolean(roomData?.[`typing_${peerUserId}`])
    : false;

  return (
    <div
      className={`h-[100dvh] w-full font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white overflow-hidden relative ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      <header
        className={`shrink-0 backdrop-blur-md border-b px-3 sm:px-6 h-16 flex items-center justify-between shadow-2xs z-10 gap-2 ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800'
            : 'bg-white/95 border-neutral-200/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isPeerOnline
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-neutral-400'
            }`}
          ></div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <h2
                className={`font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate max-w-[130px] sm:max-w-xs ${
                  isDarkMode
                    ? 'text-white'
                    : 'text-neutral-900'
                }`}
              >
                <span className="hidden sm:inline">
                  Chatting with:{' '}
                </span>

                <span
                  className={
                    isInactive
                      ? 'text-neutral-500'
                      : isPeerPink
                      ? 'text-[#F79AC0]'
                      : 'text-emerald-500'
                  }
                >
                  {peerTeamProfile ? <span className="inline-flex flex-wrap items-center gap-1.5"><span>{peerTeamProfile.displayName}</span><VerifiedIcon className="h-3 w-3 text-blue-500" /><TeamRoleBadge role={peerTeamProfile.role} /></span> : peerNickname}
                </span>
              </h2>

              {peerSchool && (
                <span
                  className={`font-mono text-[9px] sm:text-[10px] px-1.5 py-0.5 border rounded shrink-0 ${
                    isDarkMode
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                  }`}
                >
                  {peerSchool}
                </span>
              )}

              {peerStreak > 0 && (
                <span
                  className={`font-mono text-[9px] sm:text-[10px] px-1.5 py-0.5 border rounded shrink-0 ${
                    isDarkMode
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                  }`}
                >
                  🔥 {peerStreak}
                </span>
              )}
            </div>

            <p
              className={`font-mono text-[9px] sm:text-[10px] ${
                isPeerOnline
                  ? 'text-emerald-500'
                  : isDarkMode
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              {isInactive
                ? 'Chat ended'
                : isPeerOnline
                ? 'Online'
                : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isInactive && (
            <button
              type="button"
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
              <div
                className={`absolute right-0 mt-2 w-48 border rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-800'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsReportModalOpen(true);
                  }}
                  className={`w-full px-4 py-2.5 text-left font-mono text-xs font-bold flex items-center space-x-2 cursor-pointer ${
                    isDarkMode
                      ? 'text-rose-400 hover:bg-rose-950/40'
                      : 'text-red-600 hover:bg-red-50'
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

      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-2xl w-full mx-auto space-y-4">
          {hasMoreMessages && (
            <div className="text-center my-3">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider border shadow-2xs cursor-pointer active:scale-95 transition-all ${
                  isDarkMode
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                    : 'bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                }`}
              >
                <Icons.ChevronUp />
                <span>
                  {isLoadingMore
                    ? 'Loading older messages...'
                    : 'Load earlier messages'}
                </span>
              </button>
            </div>
          )}

          <div className="text-center my-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[9px] sm:text-[10px] uppercase tracking-widest border text-center ${
                isDarkMode
                  ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  : 'bg-neutral-100 text-neutral-500 border-neutral-200/60'
              }`}
            >
              <Icons.Shield />
              {roomData?.hostTeamAuthorId || roomData?.guestTeamAuthorId ? 'End-to-end Encrypted Room Active' : 'End-to-end Anonymous Room Active'}
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.senderId === userId;
            const hasPinkName = isPinkUser(msg.senderId);
            const teamProfile = msg.teamAuthorId ? teamProfiles[msg.teamAuthorId] : undefined;

            const isPickerOpen =
              activeReactionPickerId === msg.id;

            let touchStartX = 0;
            let currentTranslateX = 0;

            const handleTouchStart = (
              e: React.TouchEvent
            ) => {
              touchStartX = e.touches[0].clientX;
            };

            const handleTouchMove = (
              e: React.TouchEvent
            ) => {
              const currentX = e.touches[0].clientX;
              const diff = currentX - touchStartX;

              if (diff > 0 && diff < 80) {
                currentTranslateX = diff;

                (
                  e.currentTarget as HTMLElement
                ).style.transform = `translateX(${diff}px)`;
              }
            };

            const handleTouchEnd = (
              e: React.TouchEvent
            ) => {
              const el = e.currentTarget as HTMLElement;

              el.style.transform = 'translateX(0px)';

              if (currentTranslateX > 40) {
                setReplyingTo(msg);
              }

              currentTranslateX = 0;
            };

            return (
              <div
                key={msg.id}
                className={`flex flex-col relative ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 font-mono text-[10px] mb-1 px-1 ${
                    isDarkMode
                      ? 'text-neutral-500'
                      : 'text-neutral-400'
                  }`}
                >
                  {teamProfile ? <span className="inline-flex flex-wrap items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400"><span>{isMe ? `You · ${teamProfile.displayName}` : teamProfile.displayName}</span><VerifiedIcon className="h-3 w-3 text-blue-500" /><TeamRoleBadge role={teamProfile.role} /></span> : <span
                    className={
                      hasPinkName
                        ? 'text-[#F79AC0] font-bold'
                        : ''
                    }
                  >
                    {isMe ? 'You' : msg.senderNickname}
                  </span>}
                </div>

                <div className="relative group max-w-[88%] sm:max-w-[80%]">
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={() =>
                      setReplyingTo(msg)
                    }
                    className={`px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm font-sans break-words cursor-pointer select-none transition-transform duration-150 ${
                      isMe
                        ? isDarkMode
                          ? 'bg-neutral-600 text-white rounded-br-xs'
                          : 'bg-neutral-900 text-white rounded-br-xs'
                        : isDarkMode
                        ? 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-bl-xs'
                        : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs shadow-2xs'
                    }`}
                    title="Swipe right or double tap to reply"
                  >
                    {msg.replyTo && (
                      <div
                        className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-2 text-xs opacity-90 ${
                          isMe
                            ? 'bg-black/20 border-white/70 text-white/90'
                            : isDarkMode
                            ? 'bg-neutral-950/50 border-emerald-500 text-neutral-300'
                            : 'bg-neutral-50 border-emerald-600 text-neutral-600'
                        }`}
                      >
                        <p className="font-mono text-[10px] font-bold">
                          {msg.replyTo.senderNickname}
                        </p>

                        <p className="truncate">
                          {msg.replyTo.text}
                        </p>
                      </div>
                    )}

                    {msg.image && roomKey && (
                      <div className={msg.text ? 'mb-2' : ''}>
                        <EncryptedChatImage
                          imageData={msg.image}
                          roomKey={roomKey}
                        />
                      </div>
                    )}

                    {msg.text && <p>{msg.text}</p>}
                  </div>

                  {msg.reactions &&
                    Object.keys(msg.reactions).length >
                      0 && (
                      <div
                        className={`flex flex-wrap gap-1 mt-1.5 ${
                          isMe
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {Object.entries(msg.reactions).map(
                          ([emoji, userList]) => {
                            const hasReactedHere =
                              userList.includes(userId);

                            return (
                              <button
                                key={emoji}
                                onClick={() =>
                                  handleToggleReaction(
                                    msg.id,
                                    emoji
                                  )
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] border cursor-pointer transition-transform active:scale-95 ${
                                  hasReactedHere
                                    ? isDarkMode
                                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : isDarkMode
                                    ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                                    : 'bg-white border-neutral-200 text-neutral-600 shadow-2xs hover:bg-neutral-50'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold">
                                  {userList.length}
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}

                  <div
                    className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20 ${
                      isMe ? 'right-0' : 'left-0'
                    }`}
                  >
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveReactionPickerId(
                            isPickerOpen ? null : msg.id
                          )
                        }
                        className={`p-1.5 rounded-full border shadow-sm cursor-pointer ${
                          isDarkMode
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                        title="React with emoji"
                      >
                        <Icons.Smile />
                      </button>

                      {isPickerOpen && (
                        <div
                          className={`absolute bottom-full mb-2 ${
                            isMe
                              ? 'right-0'
                              : 'left-0'
                          } p-1.5 rounded-2xl border shadow-xl flex items-center gap-1 z-30 animate-in fade-in zoom-in-95 ${
                            isDarkMode
                              ? 'bg-neutral-900 border-neutral-800'
                              : 'bg-white border-neutral-200'
                          }`}
                        >
                          {AVAILABLE_REACTIONS.map(
                            (emoji) => (
                              <button
                                key={emoji}
                                onClick={() =>
                                  handleToggleReaction(
                                    msg.id,
                                    emoji
                                  )
                                }
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm hover:scale-125 transition-transform cursor-pointer ${
                                  isDarkMode
                                    ? 'hover:bg-neutral-800'
                                    : 'hover:bg-neutral-100'
                                }`}
                              >
                                {emoji}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setReplyingTo(msg)}
                      className={`p-1.5 rounded-full border shadow-sm cursor-pointer ${
                        isDarkMode
                          ? 'bg-neutral-900 border-neutral-700 text-emerald-400 hover:bg-neutral-800'
                          : 'bg-white border-neutral-200 text-emerald-600 hover:bg-neutral-100'
                      }`}
                      title="Reply to message"
                    >
                      <Icons.Reply />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {isPeerTyping && (
            <div className="flex flex-col items-start">
              <span
                className={`font-mono text-[10px] mb-1 px-1 ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                {peerNickname}
              </span>

              <div
                className={`px-4 py-3 rounded-2xl rounded-bl-xs flex items-center space-x-1.5 ${
                  isDarkMode
                    ? 'bg-neutral-900 border border-neutral-800 text-neutral-400'
                    : 'bg-white border border-neutral-200/80 text-neutral-500 shadow-2xs'
                }`}
              >
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer
        className={`shrink-0 border-t p-3 sm:p-4 z-10 ${
          isDarkMode
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200'
        }`}
      >
        <div className="max-w-2xl mx-auto">
          {replyingTo && (
            <div
              className={`mb-2 px-3 py-2 rounded-xl flex items-center justify-between border ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700'
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className="font-mono text-[10px] font-bold text-emerald-500">
                  Replying to{' '}
                  {replyingTo.senderId === userId
                    ? 'yourself'
                    : replyingTo.senderNickname}
                </p>

                <p className="text-xs truncate">
                  {replyingTo.text ||
                    (replyingTo.image ? '📷 Photo' : '')}
                </p>
              </div>

              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 rounded-lg hover:opacity-70 cursor-pointer shrink-0"
              >
                <Icons.X />
              </button>
            </div>
          )}

          {chatStatus === 'active' ? (
            <form
              onSubmit={handleSendMessage}
              className="space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />

              {isCompressingImage && (
                <div
                  className={`px-3 py-2 rounded-xl border font-mono text-[10px] ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-500'
                  }`}
                >
                  Compressing photo to WebP...
                </div>
              )}

              {imagePreview && (
                <div
                  className={`relative inline-block max-w-full rounded-xl border p-2 ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <img
                    src={imagePreview}
                    alt="Compressed photo preview"
                    className="block max-h-40 max-w-full sm:max-w-[260px] rounded-lg object-contain"
                  />

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={
                    isCompressingImage ||
                    isUploadingImage
                  }
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg cursor-pointer disabled:opacity-50"
                    aria-label="Remove photo"
                    title="Remove photo"
                  >
                    <Icons.X />
                  </button>

                  <div className="mt-2 px-1 flex items-center justify-between gap-3">

                    <p
                      className={`font-mono text-[9px] shrink-0 ${
                        isDarkMode
                          ? 'text-emerald-500'
                          : 'text-emerald-600'
                      }`}
                    >
                      {(imageFile!.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    !roomKey ||
                    isCompressingImage ||
                    isUploadingImage
                  }
                  aria-label="Attach photo"
                  title="Attach photo"
                  className={`p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                    />
                    <circle
                      cx="8.5"
                      cy="8.5"
                      r="1.5"
                    />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  disabled={
                    isCompressingImage ||
                    isUploadingImage
                  }
                  placeholder={
                    roomKey
                      ? imageFile
                        ? 'Add a message...'
                        : 'Type your anonymous message...'
                      : 'Establishing encrypted session...'
                  }
                  className={`flex-1 min-w-0 px-4 py-3 rounded-xl border text-base sm:text-sm outline-none transition-all disabled:opacity-60 ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500'
                      : 'bg-neutral-900/0 border-neutral-200 text-neutral-900 focus:border-emerald-600'
                  }`}
                />

                <button
                  type="submit"
                  disabled={
                    (!newMessage.trim() && !imageFile) ||
                    !roomKey ||
                    isCompressingImage ||
                    isUploadingImage
                  }
                  className={`p-3 rounded-xl flex items-center justify-center font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                  }`}
                  aria-label={
                    isCompressingImage
                      ? 'Compressing photo'
                      : isUploadingImage
                      ? 'Uploading encrypted photo'
                      : 'Send message'
                  }
                >
                  {isCompressingImage || isUploadingImage ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Icons.Send />
                  )}
                </button>
              </div>

              {imagePreview && (
                <p
                  className={`px-1 font-mono text-[9px] ${
                    isDarkMode
                      ? 'text-neutral-500'
                      : 'text-neutral-400'
                  }`}
                >
                  Privacy reminder: check photos for faces, names,
                  IDs, locations, or other personal information
                  before sending.
                </p>
              )}
            </form>
          ) : (
            <div
              className={`p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-800'
                  : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <p className="font-mono text-xs text-neutral-500 text-center sm:text-left">
                {chatStatus === 'blocked'
                  ? 'Chat ended due to report/block.'
                  : 'This conversation has ended.'}
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700'
                      : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  Exit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push('/chat/queue')
                  }
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-white shadow-xs ${
                    isDarkMode
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  New Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </footer>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800 text-white'
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider mb-2">
              Block & Report User
            </h3>

            <p
              className={`text-xs mb-4 ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              Please select a reason for reporting. This will
              immediately close and block the chat session.
            </p>

            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                    selectedReason === r.id
                      ? isDarkMode
                        ? 'border-emerald-500 bg-emerald-950/30'
                        : 'border-emerald-600 bg-emerald-50/50'
                      : isDarkMode
                      ? 'border-neutral-800 bg-neutral-950'
                      : 'border-neutral-200 bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={(e) =>
                      setSelectedReason(e.target.value)
                    }
                    className="accent-emerald-500"
                  />

                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setIsReportModalOpen(false)
                }
                className={`flex-1 py-2.5 rounded-xl border font-mono text-xs font-bold cursor-pointer ${
                  isDarkMode
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmittingReport
                  ? 'Submitting...'
                  : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
