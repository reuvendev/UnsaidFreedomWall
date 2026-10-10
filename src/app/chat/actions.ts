'use server';

import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/team/firebase-admin';
import { getServerTeamSession } from '@/lib/team/team-server';

const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export async function claimVerifiedChatIdentity(input: { roomId: string; anonymousUserId: string; nonce: string }) {
  const session = await getServerTeamSession();
  if (!session) return { success: false, error: 'Your Team session is no longer active.' };
  const roomId = String(input.roomId || '').slice(0, 200);
  const anonymousUserId = String(input.anonymousUserId || '').slice(0, 128);
  const nonce = String(input.nonce || '').slice(0, 200);
  if (!roomId || !anonymousUserId || nonce.length < 20) return { success: false, error: 'Invalid chat identity request.' };

  try {
    const roomRef = adminDb().collection('chatRooms').doc(roomId);
    await adminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(roomRef);
      const room = snapshot.data();
      if (!snapshot.exists || !['waiting', 'active'].includes(room?.status)) throw new Error('This chat room is no longer available.');
      const hash = digest(nonce);
      if (room?.hostId === anonymousUserId && room?.hostTeamClaimHash === hash) {
        transaction.update(roomRef, { hostTeamAuthorId: session.uid, hostTeamClaimHash: FieldValue.delete() });
      } else if (room?.guestId === anonymousUserId && room?.guestTeamClaimHash === hash) {
        transaction.update(roomRef, { guestTeamAuthorId: session.uid, guestTeamClaimHash: FieldValue.delete() });
      } else {
        throw new Error('Could not verify your participant slot.');
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not attach your Team identity.' };
  }
}

type VerifiedMessageInput = {
  roomId: string;
  encryptionVersion: number;
  ciphertext?: string;
  iv?: string;
  image?: { url: string; iv: string; mimeType: string };
  replyTo?: { id: string; senderNickname: string; ciphertext: string; iv: string };
};

const bounded = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max;

export async function createVerifiedChatMessage(input: VerifiedMessageInput) {
  const session = await getServerTeamSession();
  if (!session) return { success: false, error: 'Your Team session is no longer active.' };
  if (!bounded(input.roomId, 200) || input.encryptionVersion !== 1) return { success: false, error: 'Invalid encrypted message.' };
  if (input.ciphertext && (!bounded(input.ciphertext, 50_000) || !bounded(input.iv, 200))) return { success: false, error: 'Invalid encrypted text.' };
  if (input.image && (!bounded(input.image.url, 1500) || !bounded(input.image.iv, 200) || !bounded(input.image.mimeType, 100))) return { success: false, error: 'Invalid encrypted image.' };
  if (!input.ciphertext && !input.image) return { success: false, error: 'The message is empty.' };
  if (input.replyTo && (!bounded(input.replyTo.id, 200) || !bounded(input.replyTo.senderNickname, 80) || !bounded(input.replyTo.ciphertext, 5000) || !bounded(input.replyTo.iv, 200))) return { success: false, error: 'Invalid encrypted reply.' };

  try {
    const db = adminDb();
    const roomRef = db.collection('chatRooms').doc(input.roomId);
    const roomSnapshot = await roomRef.get();
    const room = roomSnapshot.data();
    if (!roomSnapshot.exists || room?.status !== 'active') return { success: false, error: 'This conversation is no longer active.' };
    const isHost = room.hostTeamAuthorId === session.uid;
    const isGuest = room.guestTeamAuthorId === session.uid;
    if (!isHost && !isGuest) return { success: false, error: 'Verified identity was not enabled for this chat.' };
    const senderId = isHost ? room.hostId : room.guestId;
    if (typeof senderId !== 'string') return { success: false, error: 'Participant identity is unavailable.' };

    await roomRef.collection('messages').add({
      senderId,
      senderNickname: session.displayName,
      teamAuthorId: session.uid,
      encryptionVersion: 1,
      createdAt: FieldValue.serverTimestamp(),
      ...(input.ciphertext ? { ciphertext: input.ciphertext, iv: input.iv } : {}),
      ...(input.image ? { image: input.image } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    return { success: true };
  } catch {
    return { success: false, error: 'Could not send the verified message.' };
  }
}
