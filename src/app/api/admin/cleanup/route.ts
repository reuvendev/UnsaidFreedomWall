import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/FirebaseAdmin';

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    const db = getFirestore(adminApp);
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const twoMinutesAgo = now - 2 * 60 * 1000;

    const roomsSnapshot = await db.collection('chatRooms').get();

    let deletedRooms = 0;

    for (const roomDoc of roomsSnapshot.docs) {
      const data = roomDoc.data();
      const createdAt = data.createdAt?.toDate?.()?.getTime?.();

      if (!createdAt) continue;

      const isStaleWaiting =
        data.status === 'waiting' && createdAt < twoMinutesAgo;

      const isExpiredClosed =
        (data.status === 'closed' || data.status === 'ended') &&
        createdAt < twentyFourHoursAgo;

      const shouldDelete =
        (action === 'purge_stale' && isStaleWaiting) ||
        (action === 'delete_expired' && isExpiredClosed) ||
        (action === 'full_sweep' && (isStaleWaiting || isExpiredClosed));

      if (shouldDelete) {
        // IMPORTANT:
        // recursiveDelete removes the room document AND every subcollection,
        // including chatRooms/{roomId}/messages.
        await db.recursiveDelete(roomDoc.ref);
        deletedRooms++;
      }
    }

    return NextResponse.json({
      success: true,
      deletedRooms,
    });
  } catch (error) {
    console.error('Admin cleanup failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete database cleanup.',
      },
      { status: 500 }
    );
  }
}
