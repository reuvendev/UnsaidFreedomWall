import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/FirebaseAdmin';

export async function DELETE() {
  try {
    const db = getFirestore(adminApp);

    const roomsSnapshot = await db.collection('chatRooms').get();

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const roomDoc of roomsSnapshot.docs) {
      const data = roomDoc.data();

      // Only delete closed/ended rooms older than 24 hours
      if (
        (data.status === 'closed' || data.status === 'ended') &&
        data.createdAt
      ) {
        const createdAt = data.createdAt.toDate().getTime();

        if (createdAt < twentyFourHoursAgo) {
          // Recursively deletes the room AND all subcollections/messages
          await db.recursiveDelete(roomDoc.ref);

          deletedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} expired chat rooms and their messages.`,
    });
  } catch (error) {
    console.error('Failed to delete expired chats:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete expired chats.',
      },
      { status: 500 }
    );
  }
}